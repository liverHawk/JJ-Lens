import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { changeFilesets, CommandContext, confirm, label, mutate, openDiff, setRevset } from '../commands';
import { lineage, neighbourhood, opArgs, SimOp, simulate } from '../jj/graph';
import { EvologEntry, FileChange, Operation, Revision, revId, subject } from '../jj/parse';
import { formatCli, Lang, StudioTab, tr, UI } from './guideContent';
import {
	renderAtlas,
	renderCliBar,
	renderGraph,
	renderHeader,
	renderInspector,
	renderMessage,
	renderOperations,
	renderPairMenu,
	renderPreview,
	renderRecipes,
	renderShell,
	revisionNodes,
} from './studioHtml';

const TABS: readonly string[] = ['graph', 'ops', 'atlas', 'recipes'] satisfies StudioTab[];

/** What the webview sends: a type, plus whatever that action needs. */
interface Message {
	type: string;
	[key: string]: unknown;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Values of the form an action button sits in. */
function form(message: Message): Record<string, unknown> {
	return typeof message.form === 'object' && message.form !== null ? (message.form as Record<string, unknown>) : {};
}

const list = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Parses an operation sent by the webview, keeping only known revisions. */
function parseOp(value: unknown, known: (id: string) => boolean): SimOp | undefined {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}
	const op = value as Record<string, unknown>;
	const id = (key: string): string | undefined => {
		const v = text(op[key]);
		return known(v) ? v : undefined;
	};
	switch (op.kind) {
		case 'rebase': {
			const [source, onto, mode] = [id('source'), id('onto'), op.mode];
			return source && onto && (mode === 'r' || mode === 's' || mode === 'b')
				? { kind: 'rebase', mode, source, onto }
				: undefined;
		}
		case 'squash': {
			const [from, into] = [id('from'), id('into')];
			return from && into ? { kind: 'squash', from, into } : undefined;
		}
		case 'parallelize': {
			const [from, to] = [id('from'), id('to')];
			return from && to ? { kind: 'parallelize', from, to } : undefined;
		}
		case 'new': {
			const parents = list(op.parents).filter(known);
			return parents.length ? { kind: 'new', parents } : undefined;
		}
		case 'edit':
		case 'abandon':
		case 'duplicate': {
			const rev = id('rev');
			return rev ? { kind: op.kind, rev } : undefined;
		}
		default:
			return undefined;
	}
}

/** The editor-area panel: visual graph, operations, and the illustrated guides. */
export class StudioPanel implements vscode.Disposable {
	private panel: vscode.WebviewPanel | undefined;
	private ready = false;
	/** Tab to show once the webview has loaded. */
	private queued: { tab: string; section?: string } | undefined;

	private revisions: Revision[] = [];
	private operations: Operation[] = [];
	private error: string | undefined;
	/** Change id of the selected revision; survives rewrites, unlike the commit id. */
	private selectedChange: string | undefined;
	private selected: Revision | undefined;
	private files: FileChange[] = [];
	private evolog: EvologEntry[] = [];
	/** The command waiting behind the Before/After preview. */
	private pending: string[] | undefined;
	private generation = 0;

	constructor(
		private readonly ctx: CommandContext,
		private readonly extensionUri: vscode.Uri,
		private readonly lang: { get: () => Lang; set: (lang: Lang) => Promise<void> },
	) {}

	get isOpen(): boolean {
		return this.panel !== undefined;
	}

	open(tab?: string, section?: string): void {
		const target = tab && TABS.includes(tab) ? { tab, section } : undefined;
		if (this.panel) {
			this.panel.reveal();
			if (target) {
				this.post({ type: 'tab', ...target });
			}
			return;
		}
		const media = vscode.Uri.joinPath(this.extensionUri, 'media');
		const panel = vscode.window.createWebviewPanel('jj-lens.studio', 'JJ Lens Studio', vscode.ViewColumn.Active, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [media],
		});
		this.panel = panel;
		this.ready = false;
		this.queued = target;
		panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'icon.svg');
		panel.onDidDispose(() => {
			this.panel = undefined;
			this.ready = false;
		});
		panel.webview.onDidReceiveMessage((message: Message) => {
			void this.handle(message).catch((error: unknown) => {
				this.ctx.output.appendLine(`studio: ${String(error)}`);
				void vscode.window.showErrorMessage(`JJ Lens: ${error instanceof Error ? error.message : String(error)}`);
			});
		});
		panel.webview.html = renderShell({
			cspSource: panel.webview.cspSource,
			nonce: crypto.randomBytes(16).toString('hex'),
			scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(media, 'studio.js')).toString(),
			styleUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(media, 'studio.css')).toString(),
			lang: this.lang.get(),
		});
	}

	/** Reloads the repository data and redraws the parts that show it. */
	async refresh(): Promise<void> {
		if (!this.panel || !this.ready) {
			return;
		}
		const current = ++this.generation;
		const repo = this.ctx.repo();
		let revisions: Revision[] = [];
		let operations: Operation[] = [];
		let error: string | undefined;
		if (repo) {
			try {
				revisions = await this.ctx.revisions();
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
			}
			const limit = vscode.workspace.getConfiguration('jj-lens').get('logLimit', 200);
			operations = await repo.opLog(limit).catch(() => []);
		}
		if (current !== this.generation) {
			return;
		}
		this.revisions = revisions;
		this.operations = operations;
		this.error = error;
		this.selected =
			revisions.find((rev) => rev.changeId === this.selectedChange && !rev.divergent) ??
			revisions.find((rev) => rev.workingCopy);
		this.selectedChange = this.selected?.changeId;
		await this.loadDetails();
		if (current !== this.generation) {
			return;
		}
		this.post({
			type: 'render',
			regions: {
				header: renderHeader(this.lang.get(), repo?.root),
				graph: this.graphHtml(),
				inspector: this.inspectorHtml(),
				'tab-ops': renderOperations(this.lang.get(), operations),
			},
		});
	}

	dispose(): void {
		this.panel?.dispose();
	}

	private post(message: object): void {
		void this.panel?.webview.postMessage(message);
	}

	private get revset(): string {
		return vscode.workspace.getConfiguration('jj-lens').get('revset', '');
	}

	private graphHtml(): string {
		return renderGraph({
			lang: this.lang.get(),
			revset: this.revset,
			revisions: this.revisions,
			selected: this.selected?.commitId,
			error: this.error,
		});
	}

	private inspectorHtml(): string {
		const lang = this.lang.get();
		return this.selected
			? renderInspector({
					lang,
					rev: this.selected,
					files: this.files,
					evolog: this.evolog,
					revisions: this.revisions,
				})
			: renderInspector({ lang });
	}

	private async loadDetails(): Promise<void> {
		const repo = this.ctx.repo();
		const rev = this.selected;
		if (!repo || !rev) {
			this.files = [];
			this.evolog = [];
			return;
		}
		// Commit ids pin down exactly the version on screen.
		[this.files, this.evolog] = await Promise.all([
			repo.changedFiles(rev.commitId).catch(() => []),
			repo.evolog(rev.commitId).catch(() => []),
		]);
	}

	/** The static, language-dependent parts. */
	private renderStatic(): void {
		const lang = this.lang.get();
		this.post({
			type: 'render',
			regions: {
				header: renderHeader(lang, this.ctx.repo()?.root),
				clibar: renderCliBar(lang),
				'tab-atlas': renderAtlas(lang),
				'tab-recipes': renderRecipes(lang),
			},
		});
	}

	private byCommit(id: unknown): Revision | undefined {
		return this.revisions.find((rev) => rev.commitId === id);
	}

	private toast(message: string): void {
		this.post({ type: 'toast', text: message });
	}

	/** The files ticked in the inspector's file list. */
	private pickedFiles(message: Message): FileChange[] {
		return list(form(message).files)
			.map((index) => this.files[Number(index)])
			.filter((change): change is FileChange => change !== undefined);
	}

	/** Shows Before and After for `op`; `args` runs when the user confirms. */
	private preview(op: SimOp, args: string[], focus: string[]): void {
		const lang = this.lang.get();
		const before = revisionNodes(this.revisions);
		let after;
		try {
			after = simulate(before, op);
		} catch (error) {
			this.post({
				type: 'modal',
				html: renderMessage(lang, tr(lang, UI.previewFailed), error instanceof Error ? error.message : String(error)),
			});
			return;
		}
		const keep = neighbourhood(before, focus);
		for (const node of after) {
			if (node.mark) {
				keep.add(node.id);
			}
		}
		this.pending = args;
		this.post({
			type: 'modal',
			html: renderPreview({
				lang,
				command: formatCli(args),
				before: before.filter((node) => keep.has(node.id)),
				after: after.filter((node) => keep.has(node.id)),
			}),
		});
	}

	/** jj arguments for an operation on loaded revisions. */
	private args(op: SimOp): string[] {
		const args = opArgs(op, (id) => {
			const rev = this.byCommit(id);
			return rev ? revId(rev) : id;
		});
		if (op.kind === 'squash') {
			// jj would open an editor to merge two descriptions.
			const [from, into] = [this.byCommit(op.from), this.byCommit(op.into)];
			if (from?.description.trim() && into?.description.trim()) {
				args.push('--use-destination-message');
			}
		}
		return args;
	}

	private async handle(message: Message): Promise<void> {
		const lang = this.lang.get();
		const run = (args: string[]) => mutate(this.ctx, args);
		const rev = this.byCommit(message.id);
		const known = (id: string): boolean => this.byCommit(id) !== undefined;

		switch (message.type) {
			case 'ready':
				this.ready = true;
				this.renderStatic();
				await this.refresh();
				if (this.queued) {
					this.post({ type: 'tab', ...this.queued });
					this.queued = undefined;
				}
				return;

			case 'refresh':
				this.ctx.refresh();
				return;

			case 'lang':
				// Storing the language refreshes the data-driven regions.
				await this.lang.set(message.value === 'en' ? 'en' : 'ja');
				this.renderStatic();
				return;

			case 'command': {
				// Only this extension's own commands may be triggered from the page.
				const command = text(message.command);
				if (command.startsWith('jj-lens.')) {
					await vscode.commands.executeCommand(command);
				}
				return;
			}

			case 'copy':
				await vscode.env.clipboard.writeText(text(message.text));
				return;

			case 'goto':
				if (TABS.includes(text(message.tab))) {
					this.post({ type: 'tab', tab: message.tab, section: text(message.section) || undefined });
				}
				if (text(message.hint)) {
					this.toast(text(message.hint));
				}
				return;

			case 'revset':
				await setRevset(typeof message.value === 'string' ? message.value : text(form(message).value));
				if (message.goto === 'graph') {
					this.post({ type: 'tab', tab: 'graph' });
				}
				return;

			case 'select':
				if (rev) {
					this.selected = rev;
					this.selectedChange = rev.changeId;
					await this.loadDetails();
					this.post({ type: 'render', regions: { graph: this.graphHtml(), inspector: this.inspectorHtml() } });
				}
				return;

			case 'pair': {
				const [source, target] = [this.byCommit(message.source), this.byCommit(message.target)];
				if (source && target && source !== target) {
					const related = lineage(revisionNodes(this.revisions), source.commitId, target.commitId);
					this.post({ type: 'modal', html: renderPairMenu(lang, source, target, related) });
				}
				return;
			}

			case 'preview':
			case 'run': {
				const op = parseOp(message.op, known);
				if (!op) {
					return;
				}
				if (message.type === 'run') {
					await run(this.args(op));
				} else {
					const focus = Object.values(op)
						.flat()
						.filter((v): v is string => typeof v === 'string' && known(v));
					this.preview(op, this.args(op), focus);
				}
				return;
			}

			case 'confirm':
				if (this.pending) {
					const args = this.pending;
					this.pending = undefined;
					await run(args);
				}
				return;

			case 'describe':
				if (rev) {
					await run(['describe', '-r', revId(rev), `--message=${text(form(message).message)}`]);
				}
				return;

			case 'commit':
				if (rev?.workingCopy) {
					await run(['commit', `--message=${text(form(message).message)}`]);
				}
				return;

			case 'diff': {
				const repo = this.ctx.repo();
				const change = this.files[Number(message.index)];
				if (repo && rev && change) {
					await openDiff(repo, rev, change);
				}
				return;
			}

			case 'split': {
				const picked = this.pickedFiles(message);
				if (!rev || !picked.length || picked.length === this.files.length) {
					this.toast(tr(lang, picked.length ? UI.splitNeedsRest : UI.selectFilesFirst));
					return;
				}
				const parallel = list(form(message).parallel).length > 0;
				const description = text(form(message).splitMessage).trim() || subject(rev.description);
				this.preview(
					{ kind: 'split', rev: rev.commitId, parallel },
					[
						'split',
						'-r',
						revId(rev),
						...(parallel ? ['--parallel'] : []),
						`--message=${description}`,
						...changeFilesets(picked),
					],
					[rev.commitId],
				);
				return;
			}

			case 'moveFiles': {
				const picked = this.pickedFiles(message);
				const target = this.byCommit(form(message).target);
				if (!rev || !target || !picked.length) {
					this.toast(tr(lang, UI.selectFilesFirst));
					return;
				}
				const partial = picked.length < this.files.length;
				const op: SimOp = { kind: 'squash', from: rev.commitId, into: target.commitId, partial };
				this.preview(op, [...this.args(op), ...changeFilesets(picked)], [rev.commitId, target.commitId]);
				return;
			}

			case 'restoreFiles': {
				const picked = this.pickedFiles(message);
				if (!rev || !picked.length) {
					this.toast(tr(lang, UI.selectFilesFirst));
					return;
				}
				const names = picked.map((change) => change.target).join(', ');
				if (await confirm(`Discard the changes to ${names} in ${label(rev)}?`, 'Discard Changes')) {
					await run(['restore', '--changes-in', revId(rev), ...changeFilesets(picked)]);
				}
				return;
			}

			case 'setBookmark': {
				const name = text(form(message).name).trim();
				if (rev && name) {
					await run(['bookmark', 'set', name, '-r', revId(rev), '--allow-backwards']);
				}
				return;
			}

			case 'deleteBookmark': {
				const name = text(message.name);
				if (name && (await confirm(`Delete the bookmark "${name}"?`, 'Delete'))) {
					await run(['bookmark', 'delete', `exact:${JSON.stringify(name)}`]);
				}
				return;
			}

			case 'pushBookmark':
				if (text(message.name)) {
					await run(['git', 'push', '--bookmark', `exact:${JSON.stringify(text(message.name))}`]);
				}
				return;

			case 'pushChange':
				if (rev) {
					await run(['git', 'push', '--change', revId(rev)]);
				}
				return;

			case 'opRestore': {
				const op = this.operations.find((candidate) => candidate.id === message.id);
				if (
					op &&
					(await confirm(`Restore the repository to operation ${op.id.slice(0, 8)} "${op.description}"?`, 'Restore'))
				) {
					await run(['op', 'restore', op.id]);
				}
				return;
			}
		}
	}
}
