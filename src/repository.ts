import * as path from 'path';
import * as vscode from 'vscode';
import { Jj, JjResult } from './jj/cli';
import {
	DIFF_TEMPLATE,
	EVOLOG_TEMPLATE,
	EvologEntry,
	FileChange,
	fileset,
	LOG_TEMPLATE,
	OP_TEMPLATE,
	Operation,
	parseDiff,
	parseEvolog,
	parseLog,
	parseOpLog,
	Revision,
} from './jj/parse';

export class Repository implements vscode.Disposable {
	private readonly changeEmitter = new vscode.EventEmitter<void>();
	/** Fires (debounced) whenever the repository may have changed. */
	readonly onDidChange = this.changeEmitter.event;

	private readonly disposables: vscode.Disposable[] = [this.changeEmitter];
	private timer: NodeJS.Timeout | undefined;

	constructor(
		readonly root: string,
		private readonly jj: Jj,
	) {
		// Every jj operation rewrites the op heads, including ones run in a terminal.
		const watcher = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(vscode.Uri.file(root), '.jj/repo/op_heads/heads/*'),
		);
		this.disposables.push(
			watcher,
			watcher.onDidCreate(() => this.notifyChanged()),
			watcher.onDidDelete(() => this.notifyChanged()),
		);
	}

	static async detect(jj: Jj, folder: string): Promise<string | undefined> {
		try {
			const { stdout } = await jj.run(['root'], { cwd: folder });
			return stdout.trim() || undefined;
		} catch {
			return undefined;
		}
	}

	notifyChanged(): void {
		clearTimeout(this.timer);
		this.timer = setTimeout(() => this.changeEmitter.fire(), 250);
	}

	contains(uri: vscode.Uri): boolean {
		return uri.scheme === 'file' && (uri.fsPath === this.root || uri.fsPath.startsWith(this.root + path.sep));
	}

	/** Lists revisions. Snapshots the working copy first, like a plain `jj log`. */
	async log(revset: string, limit: number): Promise<Revision[]> {
		const args = ['log', '--no-graph', '-n', String(limit), '-T', LOG_TEMPLATE];
		if (revset) {
			args.push('-r', revset);
		}
		const { stdout } = await this.jj.run(args, { cwd: this.root, snapshot: true });
		return parseLog(stdout);
	}

	async changedFiles(rev: string): Promise<FileChange[]> {
		const { stdout } = await this.read(['diff', '-r', rev, '-T', DIFF_TEMPLATE]);
		return parseDiff(stdout);
	}

	async opLog(limit: number): Promise<Operation[]> {
		const { stdout } = await this.read(['op', 'log', '--no-graph', '-n', String(limit), '-T', OP_TEMPLATE]);
		return parseOpLog(stdout);
	}

	/** How a change has been rewritten over time, newest first. */
	async evolog(rev: string, limit = 30): Promise<EvologEntry[]> {
		const { stdout } = await this.read(['evolog', '--no-graph', '-r', rev, '-n', String(limit), '-T', EVOLOG_TEMPLATE]);
		return parseEvolog(stdout);
	}

	/** The working-copy revision (`@`). Snapshots the working copy first. */
	async workingCopy(): Promise<Revision | undefined> {
		return (await this.log('@', 1))[0];
	}

	async fileContent(rev: string, filePath: string): Promise<string> {
		const { stdout } = await this.read(['file', 'show', '-r', rev, fileset(filePath)]);
		return stdout;
	}

	async description(rev: string): Promise<string> {
		const { stdout } = await this.read(['log', '--no-graph', '-r', rev, '-T', 'description']);
		return stdout;
	}

	/** Runs a command that may change the repository. */
	async run(args: string[]): Promise<JjResult> {
		try {
			return await this.jj.run(args, { cwd: this.root, snapshot: true });
		} finally {
			this.notifyChanged();
		}
	}

	private read(args: string[]): Promise<JjResult> {
		return this.jj.run(args, { cwd: this.root });
	}

	dispose(): void {
		clearTimeout(this.timer);
		vscode.Disposable.from(...this.disposables).dispose();
	}
}
