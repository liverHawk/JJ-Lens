#!/usr/bin/env bash
# ==============================================================================
# Release Automation Script for jj-lens
#
# Usage:
#   pnpm run release patch                  # Bump patch (0.0.1 -> 0.0.2)
#   pnpm run release minor                  # Bump minor (0.0.1 -> 0.1.0)
#   pnpm run release major                  # Bump major (0.0.1 -> 1.0.0)
#   pnpm run release current                # Release with current version in package.json
#   pnpm run release 0.2.0                  # Release with specific version
#   pnpm run release current --pre-release  # Publish as Beta / Pre-Release
#   pnpm run release patch --pre-release    # Bump patch & publish as Beta / Pre-Release
#
# Documentation: docs/release.md
# ==============================================================================
set -e

BUMP_TYPE="patch"
PRE_RELEASE=false

for arg in "$@"; do
  case "$arg" in
    --pre-release|--prerelease|--beta|beta)
      PRE_RELEASE=true
      ;;
    *)
      BUMP_TYPE="$arg"
      ;;
  esac
done

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" && "$BUMP_TYPE" != "current" && ! "$BUMP_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ Error: Invalid bump type or version: '$BUMP_TYPE'"
  echo "Usage: pnpm run release [patch|minor|major|current|<version>] [--pre-release]"
  exit 1
fi

USE_JJ=false
if [[ -d ".jj" ]] && command -v jj >/dev/null 2>&1; then
  USE_JJ=true
fi

# 1. ブランチ / ブックマーク & 未コミット変更の事前チェック
if [[ "$USE_JJ" == "true" ]]; then
  MAIN_IN_ANCESTORS=$(jj log -r 'main & (@ | @-)' --no-graph -T 'commit_id' 2>/dev/null || true)
  if [[ -z "$MAIN_IN_ANCESTORS" ]]; then
    echo "❌ Error: Release command requires the 'main' bookmark on @ or @-."
    echo "Please move 'main' to the release target before releasing."
    exit 1
  fi
  JJ_DIFF=$(jj diff --stat 2>/dev/null | head -n 1 || true)
  if [[ -n "$JJ_DIFF" ]]; then
    echo "❌ Error: Working copy (@) has uncommitted changes. Please run 'jj commit' or 'jj new' before releasing."
    exit 1
  fi
else
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "❌ Error: Release command can only be run on the 'main' branch (current branch: '$CURRENT_BRANCH')."
    echo "Please merge your PR into 'main' and switch to 'main' before releasing."
    exit 1
  fi
  if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: Working tree has uncommitted changes. Please commit or stash them before releasing."
    exit 1
  fi
fi

# 2. テスト・型チェック・リント・フォーマットの事前チェック
echo "==> [1/6] Running pretest (compile, typecheck, lint, format:check) & test..."
pnpm run pretest
pnpm test
pnpm run format:check

# 3. バージョンの決定 (current の場合は繰り上げせず既存バージョンを使用)
if [[ "$BUMP_TYPE" == "current" ]]; then
  VERSION=$(node -p "require('./package.json').version")
  TAG="v$VERSION"
  echo "==> [2/6] Using current version: $VERSION ($TAG)"
  if [[ "$USE_JJ" == "true" ]]; then
    TARGET_COMMIT=$(jj log -r 'if(empty, @-, @)' --no-graph -T 'commit_id')
    jj bookmark set main -r "$TARGET_COMMIT"
    if ! git rev-parse "$TAG" >/dev/null 2>&1; then
      echo "Creating git tag $TAG..."
      git tag -a "$TAG" -m "Release $TAG" "$TARGET_COMMIT"
    fi
  else
    if ! git rev-parse "$TAG" >/dev/null 2>&1; then
      echo "Creating git tag $TAG..."
      git tag -a "$TAG" -m "Release $TAG"
    fi
  fi
else
  echo "==> [2/6] Bumping version ($BUMP_TYPE)..."
  if [[ "$USE_JJ" == "true" ]]; then
    pnpm version "$BUMP_TYPE" --no-git-tag-version
    pnpm run format
    VERSION=$(node -p "require('./package.json').version")
    TAG="v$VERSION"
    jj commit -m "chore: release $TAG"
    TARGET_COMMIT=$(jj log -r '@-' --no-graph -T 'commit_id')
    jj bookmark set main -r "$TARGET_COMMIT"
    git tag -a "$TAG" -m "Release $TAG" "$TARGET_COMMIT"
  else
    pnpm version "$BUMP_TYPE" -m "chore: release v%s"
    VERSION=$(node -p "require('./package.json').version")
    TAG="v$VERSION"
  fi
fi

VSIX="jj-lens-$VERSION.vsix"
PRE_FLAG=""
GH_PRE_FLAG=""
if [[ "$PRE_RELEASE" == "true" ]]; then
  PRE_FLAG="--pre-release"
  GH_PRE_FLAG="--prerelease"
  echo "==> Target release: $TAG ($VSIX) [Beta / Pre-Release]"
else
  echo "==> Target release: $TAG ($VSIX)"
fi

# 4. リモートへコミットとタグを push
echo "==> [3/6] Pushing commit and tag to GitHub..."
if [[ "$USE_JJ" == "true" ]]; then
  jj git push --bookmark main
  git push origin "$TAG"
else
  git push origin HEAD
  git push origin "$TAG"
fi

# 5. vsix パッケージのビルド
echo "==> [4/6] Packaging vsix..."
pnpm exec vsce package --no-dependencies $PRE_FLAG --out "$VSIX"

# 6. GitHub Releases に vsix を添付してリリース作成
echo "==> [5/6] Creating GitHub Release..."
if gh release view "$TAG" >/dev/null 2>&1; then
  echo "GitHub Release $TAG already exists, uploading $VSIX asset..."
  gh release upload "$TAG" "$VSIX" --clobber
else
  gh release create "$TAG" "$VSIX" --title "$TAG" --generate-notes $GH_PRE_FLAG
fi

# 7. 各マーケットプレイスに公開
echo "==> [6/6] Publishing to Marketplaces..."

echo "--> Publishing to VS Code Marketplace..."
if ! pnpm exec vsce publish $PRE_FLAG --packagePath "$VSIX"; then
  echo "⚠️ Warning: VS Code Marketplace publish failed. (Have you run 'pnpm exec vsce login purple-hawk'?)"
fi

echo "--> Publishing to Open VSX..."
if ! pnpm exec ovsx publish $PRE_FLAG "$VSIX"; then
  echo "⚠️ Warning: Open VSX publish failed. (Have you run 'pnpm exec ovsx login'?)"
fi

echo ""
echo "🎉 Release process for $TAG completed!"
