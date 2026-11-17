---
name: jj-lens-release-workflow
description: >-
  End-to-end PR creation, self-review, release documentation preparation
  (SemVer classification, CHANGELOG.md, bilingual README.md), and release
  execution workflow for the JJ Lens VS Code extension using Jujutsu (jj).
  Use when the user asks to create a PR, review changes, prepare a release
  (vX.Y.Z), update CHANGELOG/README for a new version, or publish a release.
---

# JJ Lens PR, Review & Release Workflow

## Overview

Automates the end-to-end post-implementation workflow for the **JJ Lens** VS Code extension (`jj-lens`) using **Jujutsu (`jj`)**:

1. Local formatting, linting, typechecking, compilation, and test verification
2. Bookmark creation, `jj git push`, and GitHub Pull Request creation
3. Self-review of the PR diff, automated fix application, and CI verification
4. SemVer version bump classification (`major` / `minor` / `patch`) and synchronized updates to `CHANGELOG.md` and bilingual `README.md` (English & Japanese)
5. User approval gate before merging the PR and running `pnpm run release <level>`

## Dependencies

None (uses repository scripts in `package.json`, `scripts/release.sh`, `jj`, and `gh` CLI).

## Quick Start

Trigger this skill with prompts such as:

- 「PRを作ってレビューして」
- 「v0.1.0のためのファイル変更（CHANGELOG / README）をお願いします」
- 「PR作成からリリース準備まで進めて」

## Workflow

### 1. Local Verification (`format`, `pretest`, `test`)

1. Run formatting, compilation, typechecking, linting, and the VS Code extension test suite:
   ```bash
   pnpm run format && pnpm run pretest && pnpm test
   ```
2. **Error Handling**: If compilation (`tsc`), typechecking (`tsgo`), linting (`oxlint`), formatting (`oxfmt --check`), or any unit test fails, diagnose the root cause, fix the code or test automatically, and re-run until all checks pass.

### 2. Bookmark & Pull Request Creation (using Jujutsu)

1. Check status with `jj status` and `jj log`.
2. Commit changes in small logical increments with `Co-Authored-By:` trailer:
   ```bash
   jj commit -m $'<type>: <summary>\n\nCo-Authored-By: ...'
   ```
3. Set a descriptive bookmark on `@-` and push via `jj git push`:
   ```bash
   jj bookmark set <bookmark-name> -r @-
   jj git push --bookmark <bookmark-name> --allow-new
   ```
4. Create a GitHub Pull Request against `main` using `gh pr create`:
   ```bash
   gh pr create --base main --head <bookmark-name> --title "<type>: <summary>" --body "## Summary
   - ...

   ## Test Plan
   - \`pnpm run typecheck\`
   - \`pnpm run lint\`
   - \`pnpm run format:check\`
   - \`pnpm test\`"
   ```

### 3. Self-Review & CI Verification

1. Inspect the full diff (`jj diff --from main --to @-`) and check for edge cases and test coverage.
2. Check GitHub Actions CI status:
   ```bash
   gh pr checks <pr-number>
   ```
3. Present a structured review report to the user.

### 4. SemVer Classification & Release Documentation (`CHANGELOG.md` & `README.md`)

1. Determine the appropriate SemVer level based on changes since the last tag:
   - **`major`**: Breaking changes to existing configuration keys, commands, or behavior.
   - **`minor`**: Backwards-compatible new features or new configuration properties in `package.json`.
   - **`patch`**: Backwards-compatible bug fixes, performance improvements, or internal refactoring.
2. Update `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format:
   - Insert `## [X.Y.Z] - YYYY-MM-DD` right below `## [Unreleased]`.
   - Categorize entries under `### Added`, `### Changed`, or `### Fixed`.
3. Update `README.md` in **both English (`## 🌐 English`) and Japanese (`## 🇯🇵 日本語`)** sections:
   - Add or update feature bullets under `### ✨ Features` and `### ✨ 主な機能 (Features)`.
   - If any settings were added or modified in `package.json`, update both the `### ⚙️ Settings` table and the `### ⚙️ 設定 (Settings)` table so every `jj-lens.*` property is documented in both languages.
4. Run formatter verification after editing documentation:
   ```bash
   pnpm run format && pnpm run format:check
   ```

### 5. Approval Gate & Release Execution (`scripts/release.sh`)

1. **Mandatory Approval Gate**: Always ask the user for confirmation before merging the PR and running the release script.
2. Once approved by the user:
   - Ensure `main` bookmark is on the release target (`@-` or `@`) with a clean working copy.
   - Run the release script:
     ```bash
     pnpm run release <patch|minor|major|current>
     ```
   - `scripts/release.sh` automatically runs `pretest` and `test`, bumps `package.json` version (unless `current`), creates the release commit and `vX.Y.Z` tag, pushes to `origin`, builds the `.vsix` bundle (`jj-lens-X.Y.Z.vsix`), creates the GitHub Release, and publishes to VS Code Marketplace / Open VSX.
