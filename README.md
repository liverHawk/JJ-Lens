# JJ Lens

[English](#english) | [日本語](#japanese)

---

<a id="english"></a>

## 🌐 English

See, operate and understand [Jujutsu](https://jj-vcs.github.io/jj/) (`jj`) from VS Code: a visual commit graph with drag-and-drop operations and Before/After previews, plus illustrated guides for people coming from Git. The UI is available in Japanese and English.

### ✨ Features

1. **Sidebar (JJ Lens icon in the Activity Bar)**
   - **Working Copy (`@`)**: Shows the change ID (with shortest unique prefix highlighted), description, bookmarks, conflict state of `@`, and its changed files. Click a file for an editable diff; inline buttons open the file, discard its changes, describe `@`, or commit it.
   - **Quick Actions & Guide**: Opens JJ Lens Studio, runs everyday operations (`new`, `commit`, `describe`, `squash`, `absorb`, `undo`, `git fetch`/`push`), and jumps straight to a guide section.

2. **Status Bar Integration**
   - Displays `jj: @ <change id> "<subject>"` in the status bar — click to open **JJ Lens Studio**.

3. **JJ Lens Studio (Editor Area Webview)**
   - Run **JJ Lens: Open JJ Lens Studio** for a full-featured visual interface with four tabs, a language switch (`日本語` / `English`), and a bottom command bar:
     - **Visual Graph & GUI**:
       - An SVG commit graph with colored lanes; `@` has a green ring, immutable revisions a lock, conflicts a red badge, and empty changes a dashed node. Bookmarks and tags are colored pills.
       - A revset filter with one-click preset chips (`trunk()..@`, `mine()`, `all()`, `conflicts()`, `mutable()`).
       - Drag a revision onto another (or `Ctrl`/`⌘`-click a second one) to rebase (`-s` / `-r` / `-b`), squash, create a merge, or parallelize. Each action shows the **current graph next to the predicted result** and the exact `jj` command before anything runs.
       - The revision inspector edits multi-line descriptions, commits `@`, and operates on files: tick files to split them off (`jj split`, in series or parallel), move them to another revision (`jj squash --from --into`), or discard them. It also manages bookmarks and shows the evolution log (`jj evolog`).
     - **Operations Timeline**: Visualizes `jj op log` as an interactive timeline with one-click **Undo** and **Restore to here**.
     - **Concepts & Command Atlas**: Five illustrated core concepts (working copy = commit, change ID vs. commit ID, bookmarks, auto-rebase, first-class conflicts) and a Before/After diagram for every major command.
     - **Recipes, Git Comparison & Revsets**: A Git-to-`jj` comparison table, goal-based recipes with run buttons, and a revset cheat sheet whose entries can be applied directly to the graph.

4. **Command Learning Bar**
   - Hover any button or revision to see the exact `jj` CLI command it executes, explanations for each flag/option, and a one-click copy button.

### 📋 Requirements

- `jj` ([Jujutsu](https://jj-vcs.github.io/jj/)) must be installed (developed against `0.47`).
- The workspace folder must contain a Jujutsu repository (`.jj`).

### ⚙️ Settings

| Setting            | Default | Description                                                         |
| ------------------ | ------- | ------------------------------------------------------------------- |
| `jj-lens.jjPath`   | `jj`    | Path to the `jj` executable.                                        |
| `jj-lens.revset`   | `""`    | Revset shown in the graph. Empty uses jj's default (`revsets.log`). |
| `jj-lens.logLimit` | `200`   | Maximum number of revisions and operations to load.                 |

### ⌨️ Major Commands

All commands are available in the Command Palette (`F1` or `Ctrl+Shift+P` / `Cmd+Shift+P`) under `JJ Lens: …`:

| Command                                                    | Description                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `JJ Lens: Open JJ Lens Studio`                             | Open the interactive visual graph, inspector, timeline, and guide |
| `JJ Lens: New Change`                                      | Create a new change (`jj new`)                                    |
| `JJ Lens: New Merge Change…`                               | Create a merge change from multiple parents                       |
| `JJ Lens: Commit (Describe @ and Start a New Change)…`     | Describe `@` and create a new working copy change (`jj commit`)   |
| `JJ Lens: Describe…`                                       | Edit a revision's description (`jj describe`)                     |
| `JJ Lens: Edit (Make Working Copy)…`                       | Switch the working copy (`@`) to a selected revision (`jj edit`)  |
| `JJ Lens: Squash into Parent`                              | Squash changes into the parent revision (`jj squash`)             |
| `JJ Lens: Absorb into Earlier Changes`                     | Automatically absorb changes into stack ancestors (`jj absorb`)   |
| `JJ Lens: Split by File…`                                  | Split selected files into a separate revision (`jj split`)        |
| `JJ Lens: Rebase…` / `Parallelize…` / `Duplicate…`         | Rewrite or duplicate revisions interactively                      |
| `JJ Lens: Create or Move Bookmark…` / `Delete Bookmark…`   | Manage Jujutsu bookmarks (`jj bookmark`)                          |
| `JJ Lens: Git Fetch` / `Git Push` / `Git Push a Revision…` | Synchronize with Git remotes (`jj git fetch` / `jj git push`)     |
| `JJ Lens: Undo Last Operation`                             | Undo the last Jujutsu operation (`jj undo`)                       |

### ⚠️ Known Limitations

- The Before/After prediction is computed from the revisions on screen; revisions outside the current revset are not taken into account.
- Splitting and moving work on whole files, not on hunks.
- Squashing two described revisions keeps the destination's description.
- Only the first `jj` repository found among the workspace folders is shown.
- Diffs of merge revisions compare against the first parent only.

---

<a id="japanese"></a>

## 🇯🇵 日本語

**JJ Lens** は、[Jujutsu](https://jj-vcs.github.io/jj/)（`jj`）を VS Code 上で視覚的に理解・操作できる拡張機能です。ドラッグ＆ドロップ操作や実行前後の **Before / After プレビュー** を備えたビジュアルコミットグラフに加え、Git ユーザー向けの図解ガイドを搭載しています。UI は日本語と英語の切り替えに対応しています。

### ✨ 主な機能 (Features)

1. **サイドバー（アクティビティバーの JJ Lens アイコン）**
   - **Working Copy (`@`)**: 現在の作業コピー（`@`）の Change ID（最短ユニークプレフィックスを強調表示）・説明文・ブックマーク・コンフリクト状態・変更ファイル一覧を表示します。ファイルをクリックすると編集可能な Diff を開け、インラインボタンからファイルを開く・変更破棄・説明編集・コミットを即座に行えます。
   - **Quick Actions & Guide**: JJ Lens Studio の起動や、日常的な操作（`new`, `commit`, `describe`, `squash`, `absorb`, `undo`, `git fetch`/`push`）の実行、ガイドの各トピックへの直接ジャンプが可能です。

2. **ステータスバー連携**
   - ステータスバーに `jj: @ <change id> "<subject>"` を常時表示し、クリックひとつで **JJ Lens Studio** を開けます。

3. **JJ Lens Studio（エディタ領域の統合 Webview パネル）**
   - **JJ Lens: Open JJ Lens Studio** を実行すると、4つのタブ・言語切替スイッチ（`日本語` / `English`）・下部コマンドバーを備えた統合パネルが開きます。
     - **Visual Graph & GUI（ビジュアルグラフ & インスペクタ）**:
       - 色分けされたレーンを持つ SVG コミットグラフを表示します（`@` は緑のリング、イミュータブルなリビジョンは鍵アイコン、コンフリクトは赤バッジ、空のチェンジは破線ノード、ブックマークやタグはカラーピルで表示）。
       - ワンクリックのプリセットチップ（`trunk()..@`, `mine()`, `all()`, `conflicts()`, `mutable()`）付き Revset フィルタ。
       - リビジョンを別のリビジョンへドラッグ＆ドロップ（または `Ctrl`/`⌘`+クリックで2つ選択）することで、Rebase（`-s` / `-r` / `-b`）・Squash・マージ作成・並列化（Parallelize）を実行可能。実行前に **現在のグラフと予測される結果グラフの Before / After 比較** および実行される `jj` コマンドを確認できます。
       - インスペクタでは複数行の説明文（Description）編集、`@` のコミット、ファイル単位の分割（`jj split`：直列または並列）・別リビジョンへの移動（`jj squash --from --into`）・変更破棄、ブックマーク管理、変更履歴（`jj evolog`）の確認が可能です。
     - **Operations Timeline（オペレーション履歴）**: `jj op log` をタイムライン表示し、ワンクリックでの **Undo** や任意時点への **Restore to here（復元）** が行えます。
     - **Concepts & Command Atlas（概念図解 & コマンド図鑑）**: Jujutsu の5つの核心概念（作業コピー＝コミット、Change ID と Commit ID の違い、ブックマーク、自動リベース、ファーストクラス・コンフリクト）と主要コマンドの Before / After 図解を収録しています。
     - **Recipes, Git Comparison & Revsets（レシピ・Git比較・Revset早見表）**: Git と `jj` の対応表、目的別の実践レシピ（実行ボタン付き）、グラフに即適用できる Revset チートシートを備えています。

4. **コマンド学習バー (Command Learning Bar)**
   - ボタンやリビジョンにマウスオーバーすると、対応する `jj` CLI コマンドと各オプションの意味が下部バーに表示され、ワンクリックでコピーできます。

### 📋 動作要件 (Requirements)

- `jj`（[Jujutsu](https://jj-vcs.github.io/jj/)）がインストールされていること（`0.47` 向けに開発）。
- ワークスペースフォルダが Jujutsu リポジトリ（`.jj`）内にあること。

### ⚙️ 設定 (Settings)

| 設定項目           | デフォルト値 | 説明                                                                             |
| ------------------ | ------------ | -------------------------------------------------------------------------------- |
| `jj-lens.jjPath`   | `jj`         | `jj` 実行ファイルのパス。                                                        |
| `jj-lens.revset`   | `""`         | グラフに表示する Revset。空欄の場合は `jj` のデフォルト（`revsets.log`）を使用。 |
| `jj-lens.logLimit` | `200`        | 読み込むリビジョンおよびオペレーション履歴の最大件数。                           |

### ⌨️ 主なコマンド (Commands)

コマンドパレット（`F1` または `Ctrl+Shift+P` / `Cmd+Shift+P`）から `JJ Lens: …` で実行できます。

| コマンド                                                   | 説明                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| `JJ Lens: Open JJ Lens Studio`                             | ビジュアルグラフ・インスペクタ・タイムライン・ガイドを統合表示 |
| `JJ Lens: New Change`                                      | 新しいチェンジを作成（`jj new`）                               |
| `JJ Lens: New Merge Change…`                               | 複数の親リビジョンを指定してマージチェンジを作成               |
| `JJ Lens: Commit (Describe @ and Start a New Change)…`     | `@` に説明を付けて新しい作業コピーを開始（`jj commit`）        |
| `JJ Lens: Describe…`                                       | リビジョンの説明文を編集（`jj describe`）                      |
| `JJ Lens: Edit (Make Working Copy)…`                       | 指定したリビジョンを作業コピー（`@`）にする（`jj edit`）       |
| `JJ Lens: Squash into Parent`                              | 変更を親リビジョンへ統合（`jj squash`）                        |
| `JJ Lens: Absorb into Earlier Changes`                     | 変更を祖先の適切なチェンジへ自動吸収（`jj absorb`）            |
| `JJ Lens: Split by File…`                                  | 選択したファイルを別リビジョンへ分割（`jj split`）             |
| `JJ Lens: Rebase…` / `Parallelize…` / `Duplicate…`         | リビジョンのリベース・並列化・複製                             |
| `JJ Lens: Create or Move Bookmark…` / `Delete Bookmark…`   | ブックマークの作成・移動・削除（`jj bookmark`）                |
| `JJ Lens: Git Fetch` / `Git Push` / `Git Push a Revision…` | Git リモートとの同期（`jj git fetch` / `jj git push`）         |
| `JJ Lens: Undo Last Operation`                             | 直前の操作を取り消す（`jj undo`）                              |

### ⚠️ 既知の制限事項 (Known Limitations)

- Before / After の予測グラフは画面上に読み込まれているリビジョンから計算されるため、現在の Revset 外にあるリビジョンは考慮されません。
- ファイルの分割（Split）および移動（Move）はファイル単位で動作し、ハンク単位の指定には未対応です。
- 説明文がある2つのリビジョンを Squash した場合、統合先（destination）の説明文が維持されます。
- マルチプルワークスペースの場合、最初に見つかった `jj` リポジトリのみが表示されます。
- マージリビジョンの Diff は第1親（first parent）との比較のみを表示します。

---

## 🛠 Development / 開発コマンド

```sh
pnpm install
pnpm run typecheck   # tsgo
pnpm run lint        # oxlint
pnpm run format      # oxfmt
pnpm test            # launches a VS Code instance; some tests need jj on PATH
```

Press `F5` in VS Code to launch an Extension Development Host. The design is described in [docs/plan.md](docs/plan.md) and release workflow in [docs/release.md](docs/release.md).
