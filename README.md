# JJ Lens

See, operate and understand [Jujutsu](https://jj-vcs.github.io/jj/) from VS Code: a visual commit graph with drag-and-drop operations and Before/After previews, plus illustrated guides for people coming from Git. The UI is available in Japanese and English.

## What you get

### Sidebar (JJ Lens icon in the activity bar)

- **Working Copy (@)**: the change ID (shortest unique prefix highlighted), description, bookmarks and conflict state of `@`, and its changed files. Click a file for an editable diff; inline buttons open the file, discard its changes, describe `@` or commit it.
- **Quick Actions & Guide**: opens JJ Lens Studio, runs everyday operations (new, commit, describe, squash, absorb, undo, git fetch/push), and jumps straight to a guide section.

### Status bar

`jj: @ <change id> "<subject>"` — click to open JJ Lens Studio.

### JJ Lens Studio (editor area)

Run **JJ Lens: Open JJ Lens Studio**. Four tabs, a language switch (日本語 / English) and a command bar at the bottom:

1. **Visual Graph & GUI**
   - An SVG commit graph with coloured lanes; `@` has a green ring, immutable revisions a lock, conflicts a red badge, empty changes a dashed node. Bookmarks and tags are coloured pills.
   - A revset filter with one-click chips (`trunk()..@`, `mine()`, `all()`, `conflicts()`, `mutable()`).
   - Drag a revision onto another (or Ctrl/⌘-click a second one) to rebase (`-s` / `-r` / `-b`), squash, create a merge, or parallelize. Each shows the **current graph next to the predicted result** and the exact `jj` command before anything runs.
   - The inspector edits multi-line descriptions, commits `@`, and works on files: tick files to split them off (`jj split`, in series or parallel), move them to another revision (`jj squash --from --into`), or discard them. It also manages bookmarks and shows the evolution log.
2. **Operations Timeline**: `jj op log` as a timeline, with undo and "restore to here".
3. **Concepts & Command Atlas**: five illustrated concepts (working copy = commit, change ID vs commit ID, bookmarks, auto-rebase, first-class conflicts) and a Before/After diagram for every major command.
4. **Recipes, Git Comparison & Revsets**: a Git-to-jj table, goal-based recipes with run buttons, and a revset cheat sheet whose entries apply to the graph.

**Command learning bar**: hover any button or revision and the bar shows the `jj` command it stands for, what each option means, and a copy button.

Everything is also in the command palette under `JJ Lens: …`.

## Requirements

`jj` must be installed (developed against 0.47). The workspace folder must be inside a jj repository.

## Settings

| Setting            | Default | Description                                                         |
| ------------------ | ------- | ------------------------------------------------------------------- |
| `jj-lens.jjPath`   | `jj`    | Path to the jj executable.                                          |
| `jj-lens.revset`   | (empty) | Revset shown in the graph. Empty uses jj's default (`revsets.log`). |
| `jj-lens.logLimit` | `200`   | Maximum number of revisions and operations to load.                 |

## Known limitations

- The Before/After prediction is computed from the revisions on screen; revisions outside the current revset are not taken into account.
- Splitting and moving work on whole files, not on hunks.
- Squashing two described revisions keeps the destination's description.
- Only the first jj repository found among the workspace folders is shown.
- Diffs of merge revisions compare against the first parent only.

## Development

```sh
pnpm install
pnpm run typecheck   # tsgo
pnpm run lint        # oxlint
pnpm run format      # oxfmt
pnpm test            # launches a VS Code instance; some tests need jj on PATH
```

Press `F5` in VS Code to launch an Extension Development Host. The design is described in [docs/plan.md](docs/plan.md).
