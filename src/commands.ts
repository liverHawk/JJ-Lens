import * as path from 'path';
import * as vscode from 'vscode';
import { displayBookmarks, FileChange, fileset, replaceSubject, Revision, revId, subject } from './jj/parse';
import { Repository } from './repository';
import { ContentProvider, FileNode, RevisionNode } from './views';

export interface CommandContext {
	repo: () => Repository | undefined;
	/** Revisions of the current log revset, loaded on demand. */
	revisions: () => Promise<Revision[]>;
	refresh: () => void;
	output: vscode.OutputChannel;
	/** Opens JJ Lens Studio, optionally on a tab and section. */
	openStudio: (tab?: string, section?: string) => void;
}

const PROGRESS_VIEW = 'jj-lens.workingCopy';

export function requireRepo(ctx: CommandContext): Repository | undefined {
	const repo = ctx.repo();
	if (!repo) {
		void vscode.window.showWarningMessage('JJ Lens: no Jujutsu repository found in this workspace.');
	}
	return repo;
}

/** Runs a mutating jj command, reporting failures. Resolves to whether it succeeded. */
export async function mutate(ctx: CommandContext, args: string[]): Promise<boolean> {
	const repo = requireRepo(ctx);
	if (!repo) {
		return false;
	}
	try {
		const { stderr } = await vscode.window.withProgress({ location: { viewId: PROGRESS_VIEW } }, () => repo.run(args));
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
}

export async function confirm(message: string, action: string): Promise<boolean> {
	return (await vscode.window.showWarningMessage(message, { modal: true }, action)) === action;
}

export function label(rev: Revision): string {
	return `${rev.changeId.slice(0, 8)} "${subject(rev.description) || 'no description'}"`;
}

/** Opens the diff of one changed file of a revision. */
export async function openDiff(repo: Repository, rev: Revision, change: FileChange): Promise<void> {
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
}

/** Filesets naming both sides of each change, so renames move as a whole. */
export function changeFilesets(changes: readonly FileChange[]): string[] {
	return [...new Set(changes.flatMap((change) => [change.source, change.target]))].map(fileset);
}

/** Stores the log revset; an empty value restores jj's default. */
export async function setRevset(value: string): Promise<void> {
	await vscode.workspace
		.getConfiguration('jj-lens')
		.update(
			'revset',
			value.trim() || undefined,
			vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global,
		);
}

function isRevision(value: unknown): value is Revision {
	return typeof value === 'object' && value !== null && 'changeId' in value && 'commitId' in value;
}

/** The revision a command argument refers to, if it carries one. */
function argRevision(arg: unknown): Revision | undefined {
	if (arg instanceof RevisionNode || arg instanceof FileNode) {
		return arg.rev;
	}
	return isRevision(arg) ? arg : undefined;
}

/** Asks for the first line of a description, keeping the body. */
async function askDescription(rev: Revision, title: string): Promise<string | undefined> {
	const multiline = rev.description.trimEnd().includes('\n');
	const input = await vscode.window.showInputBox({
		title,
		prompt: multiline ? 'Editing the first line; the rest of the description is kept.' : 'Description',
		value: subject(rev.description),
	});
	return input === undefined ? undefined : replaceSubject(rev.description, input);
}

export function registerCommands(ctx: CommandContext): vscode.Disposable {
	const run = (args: string[]) => mutate(ctx, args);

	const revisionItems = async () =>
		(await ctx.revisions()).map((rev) => ({
			label: `${rev.workingCopy ? '@ ' : ''}${subject(rev.description) || '(no description set)'}`,
			description: [rev.changeId.slice(0, 8), ...displayBookmarks(rev)].join(' '),
			detail: rev.immutable ? 'immutable' : undefined,
			rev,
		}));

	const pickRevision = async (placeHolder: string): Promise<Revision | undefined> => {
		if (!requireRepo(ctx)) {
			return undefined;
		}
		const picked = await vscode.window.showQuickPick(revisionItems(), { placeHolder, matchOnDescription: true });
		return picked?.rev;
	};

	const pickRevisions = async (placeHolder: string): Promise<Revision[] | undefined> => {
		if (!requireRepo(ctx)) {
			return undefined;
		}
		const picked = await vscode.window.showQuickPick(revisionItems(), {
			placeHolder,
			matchOnDescription: true,
			canPickMany: true,
		});
		return picked?.map((item) => item.rev);
	};

	const resolve = async (arg: unknown, placeHolder: string): Promise<Revision | undefined> =>
		argRevision(arg) ?? pickRevision(placeHolder);

	const workingCopy = async (): Promise<Revision | undefined> => requireRepo(ctx)?.workingCopy();

	const commands: Record<string, (...args: unknown[]) => unknown> = {
		refresh: () => ctx.refresh(),

		openStudio: (tab, section) =>
			ctx.openStudio(typeof tab === 'string' ? tab : undefined, typeof section === 'string' ? section : undefined),

		openGuideTopic: (tab, section) =>
			ctx.openStudio(typeof tab === 'string' ? tab : 'atlas', typeof section === 'string' ? section : undefined),

		new: async (arg) => {
			const rev = argRevision(arg);
			await run(rev ? ['new', revId(rev)] : ['new']);
		},

		newMerge: async () => {
			const parents = await pickRevisions('Parents of the new merge change (pick two or more)');
			if (!parents) {
				return;
			}
			if (parents.length < 2) {
				void vscode.window.showInformationMessage('Pick at least two revisions to create a merge.');
				return;
			}
			await run(['new', ...parents.map(revId)]);
		},

		commit: async () => {
			const rev = await workingCopy();
			if (!rev) {
				return;
			}
			const message = await askDescription(rev, 'Commit: describe @ and start a new change');
			if (message !== undefined) {
				await run(['commit', `--message=${message}`]);
			}
		},

		edit: async (arg) => {
			const rev = await resolve(arg, 'Revision to edit (make it the working copy)');
			if (rev) {
				await run(['edit', revId(rev)]);
			}
		},

		describe: async (arg) => {
			const rev = argRevision(arg) ?? (await workingCopy());
			if (!rev) {
				return;
			}
			const message = await askDescription(rev, `Describe ${rev.changeId.slice(0, 8)}`);
			if (message !== undefined) {
				await run(['describe', '-r', revId(rev), `--message=${message}`]);
			}
		},

		abandon: async (arg) => {
			const rev = await resolve(arg, 'Revision to abandon');
			if (rev && (await confirm(`Abandon ${label(rev)}?`, 'Abandon'))) {
				await run(['abandon', revId(rev)]);
			}
		},

		squash: async (arg) => {
			const repo = requireRepo(ctx);
			const rev = argRevision(arg) ?? (await workingCopy());
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
			await run(args);
		},

		absorb: () => run(['absorb']),

		split: async (arg) => {
			const repo = requireRepo(ctx);
			const rev = argRevision(arg) ?? (await workingCopy());
			if (!repo || !rev) {
				return;
			}
			const changes = await repo.changedFiles(revId(rev));
			if (changes.length < 2) {
				void vscode.window.showInformationMessage('A revision needs at least two changed files to be split by file.');
				return;
			}
			const picked = await vscode.window.showQuickPick(
				changes.map((change) => ({ label: change.target, description: change.status, change })),
				{ canPickMany: true, placeHolder: `Files to move into a separate change (split ${label(rev)})` },
			);
			if (!picked?.length) {
				return;
			}
			if (picked.length === changes.length) {
				void vscode.window.showInformationMessage('Leave at least one file in the remaining change.');
				return;
			}
			const mode = await vscode.window.showQuickPick(
				[
					{ label: 'In series', detail: 'The selected files become the parent of the rest', parallel: false },
					{ label: 'In parallel', detail: 'The two parts become siblings (--parallel)', parallel: true },
				],
				{ placeHolder: 'How should the two parts be arranged?' },
			);
			if (!mode) {
				return;
			}
			const message = await vscode.window.showInputBox({
				title: 'Description of the change holding the selected files',
				value: subject(rev.description),
			});
			if (message === undefined) {
				return;
			}
			await run([
				'split',
				'-r',
				revId(rev),
				...(mode.parallel ? ['--parallel'] : []),
				`--message=${message}`,
				...changeFilesets(picked.map((item) => item.change)),
			]);
		},

		duplicate: async (arg) => {
			const rev = await resolve(arg, 'Revision to duplicate');
			if (rev) {
				await run(['duplicate', revId(rev)]);
			}
		},

		rebase: async (arg) => {
			const rev = await resolve(arg, 'Revision to rebase');
			if (!rev) {
				return;
			}
			const mode = await vscode.window.showQuickPick(
				[
					{ label: 'This revision and its descendants', description: '-s', flag: '-s' },
					{ label: 'Only this revision', description: '-r', flag: '-r' },
					{ label: 'The whole branch', description: '-b', flag: '-b' },
				],
				{ placeHolder: `Rebase ${label(rev)}` },
			);
			if (!mode) {
				return;
			}
			const onto = await pickRevision('Rebase onto…');
			if (onto) {
				await run(['rebase', mode.flag, revId(rev), '--onto', revId(onto)]);
			}
		},

		parallelize: async () => {
			const first = await pickRevision('First revision of the chain to parallelize');
			const last = first && (await pickRevision('Last revision of the chain'));
			if (first && last) {
				// One of the two ranges is empty, so the order of the picks does not matter.
				const [a, b] = [revId(first), revId(last)];
				await run(['parallelize', `(${a}::${b}) | (${b}::${a})`]);
			}
		},

		bookmarkSet: async (arg) => {
			const rev = await resolve(arg, 'Revision to put the bookmark on');
			if (!rev) {
				return;
			}
			const name = await vscode.window.showInputBox({
				title: `Create or move a bookmark to ${rev.changeId.slice(0, 8)}`,
				prompt: 'Bookmark name',
				validateInput: (value) => (value.trim() ? undefined : 'Enter a bookmark name'),
			});
			if (name) {
				await run(['bookmark', 'set', name.trim(), '-r', revId(rev), '--allow-backwards']);
			}
		},

		bookmarkDelete: async (arg) => {
			const rev = await resolve(arg, 'Revision whose bookmark to delete');
			if (!rev) {
				return;
			}
			if (!rev.localBookmarks.length) {
				void vscode.window.showInformationMessage('This revision has no local bookmarks.');
				return;
			}
			const name = await vscode.window.showQuickPick(rev.localBookmarks, { placeHolder: 'Bookmark to delete' });
			if (name) {
				await run(['bookmark', 'delete', `exact:${JSON.stringify(name)}`]);
			}
		},

		copyChangeId: async (arg) => {
			const rev = await resolve(arg, 'Revision');
			if (rev) {
				await vscode.env.clipboard.writeText(rev.changeId);
			}
		},

		copyCommitId: async (arg) => {
			const rev = await resolve(arg, 'Revision');
			if (rev) {
				await vscode.env.clipboard.writeText(rev.commitId);
			}
		},

		gitFetch: () => run(['git', 'fetch']),

		gitPush: () => run(['git', 'push']),

		gitPushRevision: async (arg) => {
			const rev = await resolve(arg, 'Revision to push');
			if (!rev) {
				return;
			}
			if (!rev.localBookmarks.length) {
				if (await confirm(`${label(rev)} has no bookmark. Create one and push it?`, 'Create and Push')) {
					await run(['git', 'push', '--change', revId(rev)]);
				}
				return;
			}
			const name =
				rev.localBookmarks.length === 1
					? rev.localBookmarks[0]
					: await vscode.window.showQuickPick(rev.localBookmarks, { placeHolder: 'Bookmark to push' });
			if (name) {
				await run(['git', 'push', '--bookmark', `exact:${JSON.stringify(name)}`]);
			}
		},

		undo: () => run(['undo']),

		setRevset: async () => {
			const value = await vscode.window.showInputBox({
				title: 'Log revset',
				prompt: "Revset to show in the graph. Leave empty for jj's default.",
				value: vscode.workspace.getConfiguration('jj-lens').get('revset', ''),
				placeHolder: 'e.g. all(), mine(), trunk()..@',
			});
			if (value !== undefined) {
				await setRevset(value);
			}
		},

		openDiff: async (arg) => {
			const repo = requireRepo(ctx);
			if (repo && arg instanceof FileNode) {
				await openDiff(repo, arg.rev, arg.change);
			}
		},

		openFile: async (arg) => {
			const repo = requireRepo(ctx);
			if (repo && arg instanceof FileNode) {
				await vscode.window.showTextDocument(vscode.Uri.file(path.join(repo.root, arg.change.target)));
			}
		},

		restoreFile: async (arg) => {
			if (!(arg instanceof FileNode)) {
				return;
			}
			const { rev, change } = arg;
			if (await confirm(`Discard the changes to ${change.target} in ${label(rev)}?`, 'Discard Changes')) {
				await run(['restore', '--changes-in', revId(rev), ...changeFilesets([change])]);
			}
		},
	};

	return vscode.Disposable.from(
		...Object.entries(commands).map(([name, handler]) => vscode.commands.registerCommand(`jj-lens.${name}`, handler)),
	);
}
