# JJ Lens

Browse the [Jujutsu](https://jj-vcs.github.io/jj/) log, inspect changes, and run jj actions without leaving VS Code.

## Features

- **Log view** (JJ Lens icon in the activity bar): revisions from `jj log`, with change ID, bookmarks, author and age. The working copy, immutable revisions, merges and conflicts each get their own icon.
- **Changed files**: expand a revision to see its files; click one to open a diff. Files in the working copy open against the file on disk, so the right side stays editable.
- **Actions** from the view toolbar, the revision context menu, or the command palette (`JJ Lens: …`):
  - New change, edit, describe, abandon, duplicate
  - Squash into parent, rebase (revision, with descendants, or whole branch)
  - Create/move/delete bookmarks
  - Git fetch, git push (all tracked bookmarks, or one revision)
  - Discard the changes to a single file
  - Undo the last operation
- **Operations view**: the `jj op log`, with "Restore to This Operation".
- The views refresh automatically when the repository changes, including after jj commands run in a terminal.

## Requirements

`jj` must be installed (developed against 0.47). The workspace folder must be inside a jj repository.

## Settings

| Setting            | Default | Description                                                       |
| ------------------ | ------- | ----------------------------------------------------------------- |
| `jj-lens.jjPath`   | `jj`    | Path to the jj executable.                                        |
| `jj-lens.revset`   | (empty) | Revset shown in the log. Empty uses jj's default (`revsets.log`). |
| `jj-lens.logLimit` | `200`   | Maximum number of revisions and operations to load.               |

## Known limitations

- The log is a flat list in jj's order; the commit graph is not drawn.
- Only the first jj repository found among the workspace folders is shown.
- Diffs of merge revisions compare against the first parent only.

## Development

```sh
pnpm install
pnpm run typecheck   # tsgo
pnpm run lint        # oxlint
pnpm run format      # oxfmt
pnpm test   # launches a VS Code instance; some tests need jj on PATH
```

Press `F5` in VS Code to launch an Extension Development Host.
