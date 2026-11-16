import * as path from 'path';
import * as vscode from 'vscode';
import { displayBookmarks, fileset, replaceSubject, Revision, revId, subject } from './jj/parse';
import { Repository } from './repository';
import { ContentProvider, FileNode, LogProvider, OperationNode, RevisionNode } from './views';

export interface CommandContext {
	repo: () => Repository | undefined;
	log: LogProvider;
	refresh: () => void;
	output: vscode.OutputChannel;
}

async function confirm(message: string, action: string): Promise<boolean> {
	return (await vscode.window.showWarningMessage(message, { modal: true }, action)) === action;
}

function label(rev: Revision): string {
	return `${rev.changeId.slice(0, 8)} "${subject(rev.description) || 'no description'}"`;
}

export function registerCommands(ctx: CommandContext): vscode.Disposable {
	const requireRepo = (): Repository | undefined => {
		const repo = ctx.repo();
		if (!repo) {
			void vscode.window.showWarningMessage('JJ Lens: no Jujutsu repository found in this workspace.');
		}
		return repo;
	};

	/** Runs a mutating jj command, reporting failures. Resolves to whether it succeeded. */
	const mutate = async (args: string[]): Promise<boolean> => {
		const repo = requireRepo();
		if (!repo) {
			return false;
		}
		try {
			const { stderr } = await vscode.window.withProgress({ location: { viewId: 'jj-lens.log' } }, () =>
				repo.run(args),
			);
			const summary = stderr.trim().split('\n')[0];
			if (summary) {
				vscode.window.setStatusBarMessage(`jj: ${summary}`, 6000);
			}
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const choice = await vscode.window.showErrorMessage(`jj ${args[0]} failed: ${message}`, 'Show Output');
			if (choice) {
				ctx.output.show();
			}
			return false;
		}
	};

	const pickRevision = async (placeHolder: string): Promise<Revision | undefined> => {
		const repo = requireRepo();
		if (!repo) {
			return undefined;
		}
		if (!ctx.log.revisions.length) {
			await ctx.log.getChildren();
		}
		const picked = await vscode.window.showQuickPick(
			ctx.log.revisions.map((rev) => ({
				label: `${rev.workingCopy ? '@ ' : ''}${subject(rev.description) || '(no description set)'}`,
				description: [rev.changeId.slice(0, 8), ...displayBookmarks(rev)].join(' '),
				detail: rev.immutable ? 'immutable' : undefined,
				rev,
			})),
			{ placeHolder, matchOnDescription: true },
		);
		return picked?.rev;
	};

	const resolve = async (node: unknown, placeHolder: string): Promise<Revision | undefined> =>
		node instanceof RevisionNode ? node.rev : pickRevision(placeHolder);

	const commands: Record<string, (...args: unknown[]) => unknown> = {
		refresh: () => ctx.refresh(),

		new: async (node) => {
			await mutate(node instanceof RevisionNode ? ['new', revId(node.rev)] : ['new']);
		},

		edit: async (node) => {
			const rev = await resolve(node, 'Revision to edit (make it the working copy)');
			if (rev) {
				await mutate(['edit', revId(rev)]);
			}
		},

		describe: async (node) => {
			const repo = requireRepo();
			if (!repo) {
				return;
			}
			const rev =
				node instanceof RevisionNode
					? node.rev
					: (ctx.log.revisions.find((r) => r.workingCopy) ?? (await pickRevision('Revision to describe')));
			if (!rev) {
				return;
			}
			const multiline = rev.description.trimEnd().includes('\n');
			const input = await vscode.window.showInputBox({
				title: `Describe ${rev.changeId.slice(0, 8)}`,
				prompt: multiline ? 'Editing the first line; the rest of the description is kept.' : 'Description',
				value: subject(rev.description),
			});
			if (input === undefined) {
				return;
			}
			await mutate(['describe', '-r', revId(rev), `--message=${replaceSubject(rev.description, input)}`]);
		},

		abandon: async (node) => {
			const rev = await resolve(node, 'Revision to abandon');
			if (rev && (await confirm(`Abandon ${label(rev)}?`, 'Abandon'))) {
				await mutate(['abandon', revId(rev)]);
			}
		},

		squash: async (node) => {
			const repo = requireRepo();
			const rev = await resolve(node, 'Revision to squash into its parent');
			if (!repo || !rev) {
				return;
			}
			const args = ['squash', '-r', revId(rev)];
			// jj opens an editor when both descriptions are set, so settle it up front.
			if (rev.description.trim() && rev.parents.length === 1) {
				const parentDescription = await repo.description(rev.parents[0]).catch(() => '');
				if (parentDescription.trim()) {
					const keep = `Keep parent's: ${subject(parentDescription)}`;
					const use = `Use this revision's: ${subject(rev.description)}`;
					const both = 'Combine both';
					const choice = await vscode.window.showQuickPick([keep, use, both], {
						placeHolder: 'Both revisions have a description. Which one should the result have?',
					});
					if (!choice) {
						return;
					}
					if (choice === keep) {
						args.push('--use-destination-message');
					} else {
						const message = choice === use ? rev.description : `${parentDescription.trimEnd()}\n\n${rev.description}`;
						args.push(`--message=${message}`);
					}
				}
			}
			await mutate(args);
		},

		duplicate: async (node) => {
			const rev = await resolve(node, 'Revision to duplicate');
			if (rev) {
				await mutate(['duplicate', revId(rev)]);
			}
		},

		rebase: async (node) => {
			const rev = await resolve(node, 'Revision to rebase');
			if (!rev) {
				return;
			}
			const mode = await vscode.window.showQuickPick(
				[
					{ label: 'This revision and its descendants', flag: '-s' },
					{ label: 'Only this revision', flag: '-r' },
					{ label: 'The whole branch', flag: '-b' },
				],
				{ placeHolder: `Rebase ${label(rev)}` },
			);
			if (!mode) {
				return;
			}
			const onto = await pickRevision('Rebase onto…');
			if (onto) {
				await mutate(['rebase', mode.flag, revId(rev), '--onto', revId(onto)]);
			}
		},

		bookmarkSet: async (node) => {
			const rev = await resolve(node, 'Revision to put the bookmark on');
			if (!rev) {
				return;
			}
			const name = await vscode.window.showInputBox({
				title: `Create or move a bookmark to ${rev.changeId.slice(0, 8)}`,
				prompt: 'Bookmark name',
				validateInput: (value) => (value.trim() ? undefined : 'Enter a bookmark name'),
			});
			if (name) {
				await mutate(['bookmark', 'set', name.trim(), '-r', revId(rev), '--allow-backwards']);
			}
		},

		bookmarkDelete: async (node) => {
			const rev = await resolve(node, 'Revision whose bookmark to delete');
			if (!rev) {
				return;
			}
			if (!rev.localBookmarks.length) {
				void vscode.window.showInformationMessage('This revision has no local bookmarks.');
				return;
			}
			const name = await vscode.window.showQuickPick(rev.localBookmarks, { placeHolder: 'Bookmark to delete' });
			if (name) {
				await mutate(['bookmark', 'delete', `exact:${JSON.stringify(name)}`]);
			}
		},

		copyChangeId: async (node) => {
			const rev = await resolve(node, 'Revision');
			if (rev) {
				await vscode.env.clipboard.writeText(rev.changeId);
			}
		},

		copyCommitId: async (node) => {
			const rev = await resolve(node, 'Revision');
			if (rev) {
				await vscode.env.clipboard.writeText(rev.commitId);
			}
		},

		gitFetch: () => mutate(['git', 'fetch']),

		gitPush: () => mutate(['git', 'push']),

		gitPushRevision: async (node) => {
			const rev = await resolve(node, 'Revision to push');
			if (!rev) {
				return;
			}
			if (!rev.localBookmarks.length) {
				if (await confirm(`${label(rev)} has no bookmark. Create one and push it?`, 'Create and Push')) {
					await mutate(['git', 'push', '--change', revId(rev)]);
				}
				return;
			}
			const name =
				rev.localBookmarks.length === 1
					? rev.localBookmarks[0]
					: await vscode.window.showQuickPick(rev.localBookmarks, { placeHolder: 'Bookmark to push' });
			if (name) {
				await mutate(['git', 'push', '--bookmark', `exact:${JSON.stringify(name)}`]);
			}
		},

		undo: () => mutate(['undo']),

		setRevset: async () => {
			const config = vscode.workspace.getConfiguration('jj-lens');
			const value = await vscode.window.showInputBox({
				title: 'Log revset',
				prompt: "Revset to show in the log. Leave empty for jj's default.",
				value: config.get('revset', ''),
				placeHolder: 'e.g. all(), mine(), trunk()..@',
			});
			if (value !== undefined) {
				await config.update(
					'revset',
					value.trim() || undefined,
					vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global,
				);
			}
		},

		opRestore: async (node) => {
			if (!(node instanceof OperationNode)) {
				return;
			}
			const { op } = node;
			if (await confirm(`Restore the repository to operation ${op.id.slice(0, 8)} "${op.description}"?`, 'Restore')) {
				await mutate(['op', 'restore', op.id]);
			}
		},

		openDiff: async (node) => {
			const repo = requireRepo();
			if (!repo || !(node instanceof FileNode)) {
				return;
			}
			const { rev, change } = node;
			const left = ContentProvider.uri(change.status === 'added' ? '' : (rev.parents[0] ?? ''), change.source);
			const right =
				change.status === 'removed'
					? ContentProvider.uri('', change.target)
					: rev.workingCopy
						? vscode.Uri.file(path.join(repo.root, change.target))
						: ContentProvider.uri(rev.commitId, change.target);
			await vscode.commands.executeCommand(
				'vscode.diff',
				left,
				right,
				`${path.posix.basename(change.target)} (${rev.workingCopy ? '@' : rev.changeId.slice(0, 8)})`,
			);
		},

		openFile: async (node) => {
			const repo = requireRepo();
			if (repo && node instanceof FileNode) {
				await vscode.window.showTextDocument(vscode.Uri.file(path.join(repo.root, node.change.target)));
			}
		},

		restoreFile: async (node) => {
			if (!(node instanceof FileNode)) {
				return;
			}
			const { rev, change } = node;
			if (await confirm(`Discard the changes to ${change.target} in ${label(rev)}?`, 'Discard Changes')) {
				const paths = [...new Set([change.source, change.target])].map(fileset);
				await mutate(['restore', '--changes-in', revId(rev), ...paths]);
			}
		},
	};

	return vscode.Disposable.from(
		...Object.entries(commands).map(([name, handler]) => vscode.commands.registerCommand(`jj-lens.${name}`, handler)),
	);
}
