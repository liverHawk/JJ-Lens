import * as path from 'path';
import * as vscode from 'vscode';
import { displayBookmarks, FileChange, Revision, revId, subject } from './jj/parse';
import { Repository } from './repository';
import { GUIDE_LINKS, Lang, QUICK_ACTIONS, SIDEBAR, SidebarAction, tr } from './webview/guideContent';

export const CONTENT_SCHEME = 'jj-lens';

/** The summary row of a revision (the working copy, in the sidebar). */
export class RevisionNode {
	constructor(readonly rev: Revision) {}
}

export class FileNode {
	constructor(
		readonly rev: Revision,
		readonly change: FileChange,
	) {}
}

/** A row that only informs. */
class InfoNode {
	constructor(
		readonly label: string,
		readonly icon: vscode.ThemeIcon,
	) {}
}

export type WorkingCopyNode = RevisionNode | FileNode | InfoNode;

function revisionTooltip(rev: Revision): vscode.MarkdownString {
	const md = new vscode.MarkdownString();
	md.appendMarkdown(`**Change** \`${rev.changeId}\` · **Commit** \`${rev.commitId}\`\n\n`);
	md.appendText(`${rev.authorName} <${rev.authorEmail}>`);
	md.appendMarkdown(`  \n${new Date(rev.timestamp).toLocaleString()}\n\n`);
	const flags = [
		rev.workingCopy && 'working copy',
		rev.immutable && 'immutable',
		rev.conflict && 'conflict',
		rev.divergent && 'divergent',
		rev.empty && 'empty',
	].filter(Boolean);
	if (flags.length) {
		md.appendMarkdown(`_${flags.join(', ')}_\n\n`);
	}
	const refs = [...displayBookmarks(rev), ...rev.tags];
	if (refs.length) {
		md.appendMarkdown(refs.map((r) => `\`${r}\``).join(' ') + '\n\n');
	}
	md.appendMarkdown('---\n\n');
	md.appendText(rev.description.trim() || '(no description set)');
	return md;
}

function revisionItem(rev: Revision, lang: Lang): vscode.TreeItem {
	// The shortest unique prefix is what you type on the command line, so highlight it.
	const id = rev.changeId.slice(0, 8);
	const item = new vscode.TreeItem({
		label: `@ ${id}`,
		highlights: [[2, 2 + Math.min(rev.changePrefix.length, id.length)]],
	});
	const refs = [...displayBookmarks(rev), ...rev.tags];
	item.description = [
		subject(rev.description) || tr(lang, SIDEBAR.noDescription),
		refs.length ? `[${refs.join(', ')}]` : '',
		rev.empty ? '(empty)' : '',
	]
		.filter(Boolean)
		.join(' ');
	item.iconPath = rev.conflict
		? new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.errorForeground'))
		: new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
	item.tooltip = revisionTooltip(rev);
	item.contextValue = ['revision', rev.immutable ? 'imm' : 'mut', rev.workingCopy ? 'wc' : '']
		.filter(Boolean)
		.join('.');
	return item;
}

const STATUS_LETTER: Record<FileChange['status'], string> = {
	modified: 'M',
	added: 'A',
	removed: 'D',
	copied: 'C',
	renamed: 'R',
};

export function statusLetter(status: FileChange['status']): string {
	return STATUS_LETTER[status];
}

function fileItem(root: string, node: FileNode): vscode.TreeItem {
	const { change } = node;
	const item = new vscode.TreeItem(vscode.Uri.file(path.join(root, change.target)));
	const dir = path.posix.dirname(change.target);
	item.description = [STATUS_LETTER[change.status], dir === '.' ? '' : dir].filter(Boolean).join(' ');
	item.tooltip = change.source === change.target ? change.target : `${change.source} → ${change.target}`;
	item.contextValue = ['file', node.rev.immutable ? 'imm' : 'mut', change.status].join('.');
	item.command = { command: 'jj-lens.openDiff', title: 'Open Changes', arguments: [node] };
	return item;
}

/** The working copy (`@`): its summary and its changed files. */
export class WorkingCopyProvider implements vscode.TreeDataProvider<WorkingCopyNode> {
	private readonly emitter = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this.emitter.event;
	private rev: Revision | undefined;

	constructor(
		private readonly repo: () => Repository | undefined,
		private readonly lang: () => Lang,
	) {}

	/** Shows `rev` as the working copy. */
	update(rev: Revision | undefined): void {
		this.rev = rev;
		this.emitter.fire();
	}

	getTreeItem(node: WorkingCopyNode): vscode.TreeItem {
		if (node instanceof RevisionNode) {
			return revisionItem(node.rev, this.lang());
		}
		if (node instanceof FileNode) {
			return fileItem(this.repo()?.root ?? '', node);
		}
		const item = new vscode.TreeItem(node.label);
		item.iconPath = node.icon;
		return item;
	}

	async getChildren(node?: WorkingCopyNode): Promise<WorkingCopyNode[]> {
		const repo = this.repo();
		const rev = this.rev;
		if (!repo || !rev || node) {
			return [];
		}
		const nodes: WorkingCopyNode[] = [new RevisionNode(rev)];
		if (rev.conflict) {
			nodes.push(
				new InfoNode(
					tr(this.lang(), SIDEBAR.conflict),
					new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.errorForeground')),
				),
			);
		}
		try {
			const files = await repo.changedFiles(revId(rev));
			if (files.length) {
				nodes.push(...files.map((change) => new FileNode(rev, change)));
			} else {
				nodes.push(new InfoNode(tr(this.lang(), SIDEBAR.noChanges), new vscode.ThemeIcon('dash')));
			}
		} catch (error) {
			void vscode.window.showErrorMessage(`JJ Lens: ${error instanceof Error ? error.message : error}`);
		}
		return nodes;
	}
}

type GuideNode =
	| { kind: 'action'; action: SidebarAction }
	| { kind: 'group'; label: string; icon: string; children: GuideNode[] };

const actions = (list: SidebarAction[]): GuideNode[] => list.map((action) => ({ kind: 'action', action }));

/** Launcher for JJ Lens Studio, everyday actions and the illustrated guides. */
export class GuideProvider implements vscode.TreeDataProvider<GuideNode> {
	private readonly emitter = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this.emitter.event;

	constructor(private readonly lang: () => Lang) {}

	refresh(): void {
		this.emitter.fire();
	}

	getTreeItem(node: GuideNode): vscode.TreeItem {
		if (node.kind === 'group') {
			const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded);
			item.iconPath = new vscode.ThemeIcon(node.icon);
			return item;
		}
		const { action } = node;
		const title = tr(this.lang(), action.label);
		const item = new vscode.TreeItem(title);
		item.iconPath = new vscode.ThemeIcon(action.icon);
		item.description = action.cli;
		item.tooltip = action.cli ? `${title}\n${action.cli}` : title;
		item.command = { command: action.command, title, arguments: action.args };
		return item;
	}

	getChildren(node?: GuideNode): GuideNode[] {
		if (node) {
			return node.kind === 'group' ? node.children : [];
		}
		const lang = this.lang();
		return [
			{
				kind: 'action',
				action: { label: SIDEBAR.openStudio, icon: 'type-hierarchy', command: 'jj-lens.openStudio' },
			},
			{ kind: 'group', label: tr(lang, SIDEBAR.quickActions), icon: 'zap', children: actions(QUICK_ACTIONS) },
			{ kind: 'group', label: tr(lang, SIDEBAR.guides), icon: 'mortar-board', children: actions(GUIDE_LINKS) },
		];
	}
}

/** Serves file contents at a revision for the diff editor. */
export class ContentProvider implements vscode.TextDocumentContentProvider {
	constructor(private readonly repo: () => Repository | undefined) {}

	static uri(rev: string, filePath: string): vscode.Uri {
		return vscode.Uri.from({
			scheme: CONTENT_SCHEME,
			path: '/' + filePath,
			query: JSON.stringify({ rev, path: filePath }),
		});
	}

	async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
		const { rev, path: filePath } = JSON.parse(uri.query) as { rev: string; path: string };
		if (!rev) {
			return '';
		}
		try {
			return (await this.repo()?.fileContent(rev, filePath)) ?? '';
		} catch {
			// The file does not exist at that revision (added or removed).
			return '';
		}
	}
}
