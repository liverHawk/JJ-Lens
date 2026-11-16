import * as path from 'path';
import * as vscode from 'vscode';
import { displayBookmarks, FileChange, Operation, relativeTime, Revision, revId, subject } from './jj/parse';
import { Repository } from './repository';

export const CONTENT_SCHEME = 'jj-lens';

export class RevisionNode {
	constructor(readonly rev: Revision) {}
}

export class FileNode {
	constructor(
		readonly rev: Revision,
		readonly change: FileChange,
	) {}
}

export class OperationNode {
	constructor(readonly op: Operation) {}
}

export type LogNode = RevisionNode | FileNode;

function revisionIcon(rev: Revision): vscode.ThemeIcon {
	if (rev.conflict) {
		return new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.errorForeground'));
	}
	if (rev.workingCopy) {
		return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
	}
	if (rev.immutable) {
		return new vscode.ThemeIcon('lock', new vscode.ThemeColor('descriptionForeground'));
	}
	if (rev.parents.length > 1) {
		return new vscode.ThemeIcon('git-merge');
	}
	return new vscode.ThemeIcon('circle-outline');
}

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

function revisionItem(rev: Revision): vscode.TreeItem {
	const title = subject(rev.description) || (rev.root ? 'root()' : '(no description set)');
	const item = new vscode.TreeItem(
		title,
		rev.empty
			? vscode.TreeItemCollapsibleState.None
			: rev.workingCopy
				? vscode.TreeItemCollapsibleState.Expanded
				: vscode.TreeItemCollapsibleState.Collapsed,
	);
	item.id = `${rev.changeId}/${rev.divergent ? rev.commitId : ''}`;
	const refs = [...displayBookmarks(rev), ...rev.tags];
	item.description = [
		rev.workingCopy ? '@' : '',
		rev.changeId.slice(0, 8),
		refs.length ? `[${refs.join(', ')}]` : '',
		rev.empty && !rev.root ? '(empty)' : '',
		rev.root ? '' : `${rev.authorName}, ${relativeTime(rev.timestamp)}`,
	]
		.filter(Boolean)
		.join(' ');
	item.iconPath = revisionIcon(rev);
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

export class LogProvider implements vscode.TreeDataProvider<LogNode> {
	private readonly emitter = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this.emitter.event;

	/** Revisions from the most recent load, for pickers. */
	revisions: Revision[] = [];

	constructor(private readonly repo: () => Repository | undefined) {}

	refresh(): void {
		this.emitter.fire();
	}

	getTreeItem(node: LogNode): vscode.TreeItem {
		return node instanceof RevisionNode ? revisionItem(node.rev) : fileItem(this.repo()?.root ?? '', node);
	}

	async getChildren(node?: LogNode): Promise<LogNode[]> {
		const repo = this.repo();
		if (!repo || node instanceof FileNode) {
			return [];
		}
		try {
			if (node) {
				const files = await repo.changedFiles(revId(node.rev));
				return files.map((change) => new FileNode(node.rev, change));
			}
			const config = vscode.workspace.getConfiguration('jj-lens');
			this.revisions = await repo.log(config.get('revset', ''), config.get('logLimit', 200));
			return this.revisions.map((rev) => new RevisionNode(rev));
		} catch (error) {
			void vscode.window.showErrorMessage(`JJ Lens: ${error instanceof Error ? error.message : error}`);
			return [];
		}
	}
}

export class OperationProvider implements vscode.TreeDataProvider<OperationNode> {
	private readonly emitter = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this.emitter.event;

	constructor(private readonly repo: () => Repository | undefined) {}

	refresh(): void {
		this.emitter.fire();
	}

	getTreeItem({ op }: OperationNode): vscode.TreeItem {
		const item = new vscode.TreeItem(subject(op.description) || '(no description)');
		item.description = `${op.id.slice(0, 8)} ${relativeTime(op.time)}`;
		item.tooltip = `${op.id}\n${op.user}\n${new Date(op.time).toLocaleString()}\n\n${op.description}`;
		item.iconPath = op.current
			? new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'))
			: new vscode.ThemeIcon('history');
		item.contextValue = op.current ? 'operation.current' : 'operation';
		return item;
	}

	async getChildren(node?: OperationNode): Promise<OperationNode[]> {
		const repo = this.repo();
		if (!repo || node) {
			return [];
		}
		try {
			const limit = vscode.workspace.getConfiguration('jj-lens').get('logLimit', 200);
			return (await repo.opLog(limit)).map((op) => new OperationNode(op));
		} catch (error) {
			void vscode.window.showErrorMessage(`JJ Lens: ${error instanceof Error ? error.message : error}`);
			return [];
		}
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
