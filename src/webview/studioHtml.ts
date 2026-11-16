// Renders JJ Lens Studio as HTML and SVG strings. Everything here is a pure
// function of its arguments; the webview script only swaps the results in and
// reports clicks back. This file must not import 'vscode'.

import { computeGraphLayout, GraphLayout, LayoutEdge, SimNode, simulate } from '../jj/graph';
import {
	displayBookmarks,
	EvologEntry,
	FileChange,
	Operation,
	relativeTime,
	Revision,
	revId,
	subject,
} from '../jj/parse';
import {
	ATLAS,
	ATLAS_CATEGORIES,
	AtlasCategory,
	cliNotes,
	Concept,
	CONCEPTS,
	GIT_COMPARISON,
	L,
	Lang,
	localizeNodes,
	QUICK_ACTIONS,
	RECIPES,
	REVSET_CHIPS,
	REVSETS,
	StudioTab,
	TAB_TITLES,
	tr,
	UI,
} from './guideContent';

export function esc(text: string): string {
	return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** `data-msg`: the message the webview posts when the element is clicked. */
export function msgAttr(message: object): string {
	return ` data-msg="${esc(JSON.stringify(message))}"`;
}

/** `data-cli`: the jj command line an element stands for, with its explanation. */
export function cliAttr(lang: Lang, commandLine: string): string {
	return ` data-cli="${esc(commandLine)}" data-cli-notes="${esc(cliNotes(lang, commandLine).join('\n'))}"`;
}

export interface ButtonOptions {
	label: string;
	msg?: object;
	cli?: string;
	kind?: 'primary' | 'danger' | 'ghost';
	/** Closes the open modal when clicked. */
	close?: boolean;
	disabled?: boolean;
	title?: string;
}

export function button(lang: Lang, options: ButtonOptions): string {
	return (
		`<button type="button" class="btn${options.kind ? ` ${options.kind}` : ''}"` +
		(options.msg ? msgAttr(options.msg) : '') +
		(options.cli ? cliAttr(lang, options.cli) : '') +
		(options.close ? ' data-close' : '') +
		(options.disabled ? ' disabled' : '') +
		(options.title ? ` title="${esc(options.title)}"` : '') +
		`>${esc(options.label)}</button>`
	);
}

// ---------------------------------------------------------------------------
// Graph drawing
// ---------------------------------------------------------------------------

const LANE = 18;
const PAD = 14;
const COLORS = 8;

const laneX = (column: number): number => PAD + column * LANE;

function curve(fromX: number, fromY: number, toX: number, toY: number): string {
	const mid = (fromY + toY) / 2;
	return fromX === toX ? `V${toY}` : `C${fromX} ${mid} ${toX} ${mid} ${toX} ${toY}`;
}

function edgePath(edge: LayoutEdge, rowHeight: number): string {
	const y = (row: number): number => row * rowHeight + rowHeight / 2;
	const x1 = laneX(edge.fromColumn);
	const y1 = y(edge.fromRow);
	if (edge.missing) {
		return `M${x1} ${y1}V${y1 + rowHeight * 0.75}`;
	}
	const x2 = laneX(edge.toColumn);
	const y2 = y(edge.toRow);
	if (edge.toRow === edge.fromRow + 1) {
		return `M${x1} ${y1}${curve(x1, y1, x2, y2)}`;
	}
	// Leave the child into the edge's lane, run down it, then join the parent.
	const xl = laneX(edge.lane);
	const yA = y(edge.fromRow + 1);
	const yB = y(edge.toRow - 1);
	return `M${x1} ${y1}${curve(x1, y1, xl, yA)}V${yB}${curve(xl, yB, x2, y2)}`;
}

function edgesSvg(layout: GraphLayout, rowHeight: number): string {
	return layout.edges
		.map(
			(edge) =>
				`<path class="edge lane-${edge.color % COLORS}${edge.missing ? ' missing' : ''}" d="${edgePath(edge, rowHeight)}"/>`,
		)
		.join('');
}

/** The node symbol: @ gets a green ring, immutable a lock, conflict a red badge, empty a dashed circle. */
function glyph(node: SimNode, x: number, y: number, color: number): string {
	const halo = node.mark ? `<circle class="halo mark-${node.mark}" cx="${x}" cy="${y}" r="11"/>` : '';
	let shape: string;
	if (node.conflict) {
		shape =
			`<circle class="node conflict" cx="${x}" cy="${y}" r="7"/>` +
			`<text class="bang" x="${x}" y="${y + 3.5}" text-anchor="middle">!</text>`;
	} else if (node.immutable) {
		shape =
			`<circle class="node-bg" cx="${x}" cy="${y}" r="8"/>` +
			`<path class="lock-shackle" d="M${x - 2.5} ${y - 1}v-2a2.5 2.5 0 0 1 5 0v2"/>` +
			`<rect class="lock-body" x="${x - 4.5}" y="${y - 1}" width="9" height="6.5" rx="1.5"/>`;
	} else if (node.empty) {
		shape = `<circle class="node empty lane-${color % COLORS}" cx="${x}" cy="${y}" r="5"/>`;
	} else {
		shape = `<circle class="node fill-${color % COLORS}" cx="${x}" cy="${y}" r="5"/>`;
	}
	const ring = node.workingCopy ? `<circle class="wc-ring" cx="${x}" cy="${y}" r="9"/>` : '';
	return halo + ring + shape;
}

function glyphsSvg(nodes: readonly SimNode[], layout: GraphLayout, rowHeight: number): string {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	return layout.nodes
		.map((placed) =>
			glyph(byId.get(placed.id)!, laneX(placed.column), placed.row * rowHeight + rowHeight / 2, placed.color),
		)
		.join('');
}

/** Rough rendered width of `text`; CJK glyphs are about twice as wide as Latin ones. */
function textWidth(text: string, latin: number): number {
	let width = 0;
	for (const ch of text) {
		width += ch.charCodeAt(0) > 0x2e7f ? latin * 1.9 : latin;
	}
	return width;
}

const MINI_ROW = 32;
const MONO = 7.3;

/**
 * A small self-contained graph with its labels drawn inside the SVG. Used for
 * the Before/After previews and every illustration.
 */
export function renderGraphSvg(nodes: readonly SimNode[]): string {
	const layout = computeGraphLayout(nodes);
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const textX = laneX(layout.columns) + 4;
	let width = textX;
	const labels = layout.nodes
		.map((placed) => {
			const node = byId.get(placed.id)!;
			const y = placed.row * MINI_ROW + MINI_ROW / 2;
			let x = textX;
			let out = '';
			if (node.workingCopy) {
				out += `<text class="g-at" x="${x}" y="${y + 4}">@</text>`;
				x += MONO * 1.6;
			}
			const name = node.name ?? node.id;
			out += `<text class="g-name${node.mark ? ` mark-${node.mark}` : ''}" x="${x}" y="${y + 4}">${esc(name)}</text>`;
			x += textWidth(name, MONO) + 8;
			for (const bookmark of node.bookmarks ?? []) {
				const w = textWidth(bookmark, 6.4) + 12;
				const kind = bookmark.includes('@') ? 'remote' : 'bm';
				out +=
					`<rect class="g-pill ${kind}" x="${x}" y="${y - 8.5}" width="${w}" height="17" rx="8.5"/>` +
					`<text class="g-pill-text ${kind}" x="${x + 6}" y="${y + 3.5}">${esc(bookmark)}</text>`;
				x += w + 6;
			}
			const label = node.label && node.label.length > 64 ? `${node.label.slice(0, 63)}…` : node.label;
			if (label) {
				out += `<text class="g-label" x="${x}" y="${y + 4}">${esc(label)}</text>`;
				x += textWidth(label, 6.6);
			}
			if (node.empty && !node.label) {
				out += `<text class="g-label dim" x="${x}" y="${y + 4}">(empty)</text>`;
				x += 50;
			}
			width = Math.max(width, x);
			return out;
		})
		.join('');
	const height = Math.max(nodes.length, 1) * MINI_ROW;
	return (
		`<svg class="mini-graph" xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width + 12)}" height="${height}" ` +
		`viewBox="0 0 ${Math.ceil(width + 12)} ${height}" role="img">` +
		edgesSvg(layout, MINI_ROW) +
		glyphsSvg(nodes, layout, MINI_ROW) +
		labels +
		`</svg>`
	);
}

/** Converts loaded revisions to graph nodes; ids are commit ids. */
export function revisionNodes(revisions: readonly Revision[]): SimNode[] {
	return revisions.map((rev) => ({
		id: rev.commitId,
		name: rev.changeId.slice(0, 8),
		parents: rev.parents,
		label: subject(rev.description) || (rev.root ? 'root()' : undefined),
		workingCopy: rev.workingCopy,
		immutable: rev.immutable,
		conflict: rev.conflict,
		empty: rev.empty,
		bookmarks: displayBookmarks(rev),
	}));
}

// ---------------------------------------------------------------------------
// Shell and header
// ---------------------------------------------------------------------------

export interface ShellOptions {
	cspSource: string;
	nonce: string;
	scriptUri: string;
	styleUri: string;
	lang: Lang;
}

/** The static page; every region is filled in by `render` messages. */
export function renderShell(options: ShellOptions): string {
	const tabs: StudioTab[] = ['graph', 'ops', 'atlas', 'recipes'];
	return `<!DOCTYPE html>
<html lang="${options.lang}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${options.cspSource}; script-src 'nonce-${options.nonce}'; img-src ${options.cspSource} data:;">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${options.styleUri}">
<title>JJ Lens Studio</title>
</head>
<body>
<header id="header"></header>
<main>
${tabs
	.map((tab) =>
		tab === 'graph'
			? `<section class="tab" id="tab-graph" data-tab-panel="graph"><div id="graph" class="pane"></div><aside id="inspector" class="pane"></aside></section>`
			: `<section class="tab pane" id="tab-${tab}" data-tab-panel="${tab}" hidden></section>`,
	)
	.join('\n')}
</main>
<footer id="clibar"></footer>
<div id="modal" hidden></div>
<div id="toast" hidden></div>
<script nonce="${options.nonce}" src="${options.scriptUri}"></script>
</body>
</html>`;
}

export function renderHeader(lang: Lang, root: string | undefined): string {
	const tabs = (Object.keys(TAB_TITLES) as StudioTab[])
		.map(
			(tab, index) =>
				`<button type="button" class="tab-btn" data-tab="${tab}"><span class="tab-no">${index + 1}</span>${esc(tr(lang, TAB_TITLES[tab]))}</button>`,
		)
		.join('');
	const tools = QUICK_ACTIONS.map((action) =>
		button(lang, {
			label: tr(lang, action.label),
			msg: { type: 'command', command: action.command },
			cli: action.cli,
			kind: 'ghost',
		}),
	).join('');
	const langButton = (value: Lang, label: string): string =>
		`<button type="button" class="lang-btn${value === lang ? ' active' : ''}"${msgAttr({ type: 'lang', value })}>${label}</button>`;
	return (
		`<div class="top">` +
		`<div class="brand"><span class="logo">JJ Lens Studio</span><span class="sub">${esc(tr(lang, UI.subtitle))}</span></div>` +
		`<div class="repo" title="${esc(root ?? '')}">${esc(root ?? tr(lang, UI.noRepo))}</div>` +
		`<div class="lang">${langButton('ja', '日本語')}${langButton('en', 'English')}</div>` +
		`</div>` +
		`<div class="toolbar">${tools}${button(lang, { label: `⟳ ${tr(lang, UI.refresh)}`, msg: { type: 'refresh' }, kind: 'ghost' })}</div>` +
		`<nav class="tabs">${tabs}</nav>`
	);
}

export function renderCliBar(lang: Lang): string {
	return (
		`<span class="cli-title">${esc(tr(lang, UI.cliBarTitle))}</span>` +
		`<div class="cli-body"><code id="cli-command" hidden></code>` +
		`<span id="cli-notes" class="cli-notes">${esc(tr(lang, UI.cliBarIdle))}</span></div>` +
		`<button type="button" class="btn ghost" id="cli-copy" hidden data-copied="${esc(tr(lang, UI.copied))}">${esc(tr(lang, UI.copy))}</button>`
	);
}

// ---------------------------------------------------------------------------
// Tab 1: graph and inspector
// ---------------------------------------------------------------------------

const ROW = 30;

/** The change id with its shortest unique prefix emphasised, jj style. */
export function changeIdHtml(rev: Pick<Revision, 'changeId' | 'changePrefix'>, length = 8): string {
	const id = rev.changeId.slice(0, length);
	const prefix = id.slice(0, Math.min(rev.changePrefix.length, id.length));
	return `<span class="cid"><b>${esc(prefix)}</b>${esc(id.slice(prefix.length))}</span>`;
}

const pill = (kind: string, text: string): string => `<span class="pill ${kind}">${esc(text)}</span>`;

function pills(lang: Lang, rev: Revision): string {
	return [
		rev.workingCopy ? pill('at', '@') : '',
		...rev.localBookmarks.map((name) => pill('bm', name)),
		...displayBookmarks(rev)
			.filter((name) => !rev.localBookmarks.includes(name))
			.map((name) => pill('remote', name)),
		...rev.tags.map((name) => pill('tag', name)),
		rev.conflict ? pill('conflict', tr(lang, UI.conflict)) : '',
		rev.divergent ? pill('conflict', tr(lang, UI.divergent)) : '',
		rev.empty && !rev.root ? pill('empty', tr(lang, UI.empty)) : '',
	].join('');
}

export interface GraphView {
	lang: Lang;
	revset: string;
	revisions: readonly Revision[];
	/** Commit id of the selected revision. */
	selected?: string;
	error?: string;
}

export function renderGraph(view: GraphView): string {
	const { lang, revisions } = view;
	const chips = REVSET_CHIPS.map((expr) => {
		const active = expr === view.revset ? ' active' : '';
		const command = expr ? `jj log -r '${expr}'` : 'jj log';
		return `<button type="button" class="chip${active}"${msgAttr({ type: 'revset', value: expr })}${cliAttr(lang, command)}>${esc(expr || tr(lang, UI.revsetDefault))}</button>`;
	}).join('');
	const filter =
		`<div class="filter" data-form>` +
		`<input type="text" name="value" class="revset-input" spellcheck="false" value="${esc(view.revset)}" placeholder="${esc(tr(lang, UI.revsetPlaceholder))}">` +
		button(lang, {
			label: tr(lang, UI.apply),
			msg: { type: 'revset' },
			cli: `jj log -r '${view.revset || '…'}'`,
			kind: 'primary',
		}) +
		`<div class="chips">${chips}</div></div>` +
		`<p class="hint">${esc(tr(lang, UI.graphHint))}</p>`;
	if (view.error) {
		return `${filter}<pre class="error">${esc(view.error)}</pre>`;
	}
	if (!revisions.length) {
		return `${filter}<p class="empty-state">${esc(tr(lang, UI.noRevisions))}</p>`;
	}
	const nodes = revisionNodes(revisions);
	const layout = computeGraphLayout(nodes);
	const width = laneX(layout.columns);
	const height = revisions.length * ROW;
	const lanes =
		`<svg class="lanes" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		edgesSvg(layout, ROW) +
		glyphsSvg(nodes, layout, ROW) +
		`</svg>`;
	const rows = revisions
		.map((rev) => {
			const classes = [
				'row',
				rev.commitId === view.selected ? 'selected' : '',
				rev.immutable ? 'imm' : '',
				rev.workingCopy ? 'wc' : '',
			]
				.filter(Boolean)
				.join(' ');
			const title = subject(rev.description) || (rev.root ? 'root()' : tr(lang, UI.noDescription));
			return (
				`<div class="${classes}" data-id="${rev.commitId}" draggable="true"${cliAttr(lang, `jj log -r ${revId(rev)}`)}>` +
				changeIdHtml(rev) +
				pills(lang, rev) +
				`<span class="subj${subject(rev.description) ? '' : ' dim'}">${esc(title)}</span>` +
				(rev.root ? '' : `<span class="meta">${esc(rev.authorName)} · ${esc(relativeTime(rev.timestamp))}</span>`) +
				`</div>`
			);
		})
		.join('');
	return `${filter}<div class="graph">${lanes}<div class="rows">${rows}</div></div>`;
}

export interface InspectorView {
	lang: Lang;
	rev: Revision;
	files: readonly FileChange[];
	evolog: readonly EvologEntry[];
	/** All loaded revisions, to offer as targets. */
	revisions: readonly Revision[];
}

const STATUS_LETTER: Record<FileChange['status'], string> = {
	modified: 'M',
	added: 'A',
	removed: 'D',
	copied: 'C',
	renamed: 'R',
};

function section(title: string, body: string, extraClass = ''): string {
	return `<section class="card ${extraClass}"><h3>${esc(title)}</h3>${body}</section>`;
}

export function renderInspector(view: InspectorView | { lang: Lang }): string {
	const { lang } = view;
	if (!('rev' in view)) {
		return `<p class="empty-state">${esc(tr(lang, UI.selectHint))}</p>`;
	}
	const { rev, files, evolog } = view;
	const id = rev.commitId;
	const ref = revId(rev);
	const t = (text: L): string => tr(lang, text);
	const locked = rev.immutable;

	const head =
		`<div class="rev-head">` +
		`<div class="rev-ids">${changeIdHtml(rev, 12)}<span class="commit-id" title="commit id">${esc(rev.commitId)}</span></div>` +
		`<div class="rev-pills">${pills(lang, rev)}${locked ? `<span class="pill imm">${esc(t(UI.immutable))}</span>` : ''}</div>` +
		(rev.root
			? ''
			: `<div class="meta">${esc(rev.authorName)} &lt;${esc(rev.authorEmail)}&gt; · ${esc(new Date(rev.timestamp).toLocaleString(lang))}</div>`) +
		`</div>`;

	const description = section(
		t(UI.description),
		`<div data-form>` +
			`<textarea name="message" rows="5" spellcheck="false" data-keep="desc:${esc(rev.changeId)}"${locked ? ' disabled' : ''}>${esc(rev.description)}</textarea>` +
			`<div class="btn-row">` +
			button(lang, {
				label: t(UI.saveDescription),
				msg: { type: 'describe', id },
				cli: `jj describe -r ${ref} -m '…'`,
				kind: 'primary',
				disabled: locked,
			}) +
			(rev.workingCopy
				? button(lang, { label: t(UI.commit), msg: { type: 'commit', id }, cli: `jj commit -m '…'`, disabled: locked })
				: '') +
			`</div></div>`,
	);

	const parent = rev.parents.length === 1 ? view.revisions.find((r) => r.commitId === rev.parents[0]) : undefined;
	const actions = section(
		t(UI.actions),
		`<div class="btn-row">` +
			button(lang, {
				label: t(UI.newOnTop),
				msg: { type: 'run', op: { kind: 'new', parents: [id] } },
				cli: `jj new ${ref}`,
			}) +
			button(lang, {
				label: t(UI.edit),
				msg: { type: 'run', op: { kind: 'edit', rev: id } },
				cli: `jj edit ${ref}`,
				disabled: locked || rev.workingCopy,
			}) +
			button(lang, {
				label: t(UI.squashParent),
				msg: parent ? { type: 'preview', op: { kind: 'squash', from: id, into: parent.commitId } } : undefined,
				cli: `jj squash -r ${ref}`,
				disabled: locked || !parent || parent.immutable,
			}) +
			button(lang, {
				label: t(UI.duplicate),
				msg: { type: 'run', op: { kind: 'duplicate', rev: id } },
				cli: `jj duplicate ${ref}`,
				disabled: rev.root,
			}) +
			button(lang, {
				label: t(UI.abandon),
				msg: { type: 'preview', op: { kind: 'abandon', rev: id } },
				cli: `jj abandon ${ref}`,
				kind: 'danger',
				disabled: locked,
			}) +
			`</div>`,
	);

	const targets = view.revisions
		.filter((r) => !r.immutable && r.commitId !== id)
		.map(
			(r) =>
				`<option value="${r.commitId}"${r.commitId === rev.parents[0] ? ' selected' : ''}>${esc(`${r.workingCopy ? '@ ' : ''}${r.changeId.slice(0, 8)} ${subject(r.description) || t(UI.noDescription)}`)}</option>`,
		)
		.join('');
	const fileRows = files
		.map((file, index) => {
			const name = file.source === file.target ? file.target : `${file.source} → ${file.target}`;
			return (
				`<li class="file">` +
				`<input type="checkbox" name="files" value="${index}" data-keep="file:${esc(rev.changeId)}:${esc(file.target)}"${locked ? ' disabled' : ''}>` +
				`<span class="status status-${file.status}">${STATUS_LETTER[file.status]}</span>` +
				`<button type="button" class="link"${msgAttr({ type: 'diff', id, index })}${cliAttr(lang, `jj diff -r ${ref} '${file.target}'`)}>${esc(name)}</button>` +
				`</li>`
			);
		})
		.join('');
	const fileTools = locked
		? ''
		: `<div class="file-tools">` +
			`<fieldset><legend>${esc(t(UI.splitTitle))}</legend>` +
			`<input type="text" name="splitMessage" placeholder="${esc(t(UI.splitMessage))}" data-keep="split:${esc(rev.changeId)}">` +
			`<label class="check"><input type="checkbox" name="parallel" value="1"${cliAttr(lang, `jj split -r ${ref} --parallel …`)}>${esc(t(UI.splitParallel))}</label>` +
			button(lang, { label: t(UI.split), msg: { type: 'split', id }, cli: `jj split -r ${ref} -m '…' <files>` }) +
			`</fieldset>` +
			`<fieldset><legend>${esc(t(UI.moveTitle))}</legend>` +
			`<select name="target">${targets}</select>` +
			button(lang, {
				label: t(UI.move),
				msg: { type: 'moveFiles', id },
				cli: `jj squash --from ${ref} --into <target> <files>`,
				disabled: !targets,
			}) +
			`</fieldset>` +
			`<div class="btn-row">` +
			button(lang, {
				label: t(UI.discard),
				msg: { type: 'restoreFiles', id },
				cli: `jj restore --changes-in ${ref} <files>`,
				kind: 'danger',
			}) +
			`</div></div>`;
	const fileSection = section(
		`${t(UI.files)} (${files.length})`,
		files.length
			? `<p class="hint">${esc(t(UI.fileHint))}</p><div data-form><ul class="files">${fileRows}</ul>${fileTools}</div>`
			: `<p class="dim">${esc(t(UI.noFiles))}</p>`,
	);

	const bookmarkRows = rev.localBookmarks
		.map(
			(name) =>
				`<li><span class="pill bm">${esc(name)}</span>` +
				button(lang, {
					label: t(UI.push),
					msg: { type: 'pushBookmark', name },
					cli: `jj git push --bookmark ${name}`,
					kind: 'ghost',
				}) +
				button(lang, {
					label: t(UI.delete),
					msg: { type: 'deleteBookmark', name },
					cli: `jj bookmark delete ${name}`,
					kind: 'ghost',
				}) +
				`</li>`,
		)
		.join('');
	const bookmarkSection = section(
		t(UI.bookmarks),
		(bookmarkRows ? `<ul class="bookmarks">${bookmarkRows}</ul>` : `<p class="dim">${esc(t(UI.noBookmarks))}</p>`) +
			`<div class="inline-form" data-form>` +
			`<input type="text" name="name" spellcheck="false" placeholder="${esc(t(UI.bookmarkName))}">` +
			button(lang, {
				label: t(UI.setBookmark),
				msg: { type: 'setBookmark', id },
				cli: `jj bookmark set <name> -r ${ref} --allow-backwards`,
			}) +
			`</div>` +
			(rev.localBookmarks.length
				? ''
				: `<div class="btn-row">${button(lang, {
						label: t(UI.pushChange),
						msg: { type: 'pushChange', id },
						cli: `jj git push --change ${ref}`,
						disabled: locked,
					})}</div>`),
	);

	const evologRows = evolog
		.map(
			(entry, index) =>
				`<li${index === 0 ? ' class="current"' : ''}>` +
				`<span class="commit-id">${esc(entry.commitId)}</span>` +
				`<span class="evo-op">${esc(entry.operationDescription)}</span>` +
				`<span class="meta">${esc(relativeTime(entry.timestamp))}</span>` +
				`</li>`,
		)
		.join('');
	const evologSection = section(
		t(UI.evolog),
		`<p class="hint"${cliAttr(lang, `jj evolog -r ${ref}`)}>${esc(t(UI.evologHint))}</p><ol class="evolog">${evologRows}</ol>`,
	);

	return head + description + actions + fileSection + bookmarkSection + evologSection;
}

// ---------------------------------------------------------------------------
// Tab 2: operations timeline
// ---------------------------------------------------------------------------

const OPS_DIAGRAM = {
	state: { ja: '状態', en: 'state' },
	now: { ja: '(現在)', en: '(now)' },
	undo: { ja: 'jj undo:1 つ前へ', en: 'jj undo: one step back' },
	restore: { ja: 'jj op restore:任意の時点へ', en: 'jj op restore: to any point' },
} satisfies Record<string, L>;

/** States of the repository chained by operations, with undo / restore arrows going back. */
function operationsDiagram(lang: Lang): string {
	const boxes = [0, 1, 2]
		.map((i) => {
			const x = 10 + i * 210;
			const last = i === 2;
			return (
				`<rect class="d-box${last ? ' now' : ''}" x="${x}" y="34" width="120" height="40" rx="6"/>` +
				`<text class="d-text" x="${x + 60}" y="59" text-anchor="middle">${esc(`${tr(lang, OPS_DIAGRAM.state)} ${i + 1}${last ? ` ${tr(lang, OPS_DIAGRAM.now)}` : ''}`)}</text>`
			);
		})
		.join('');
	const arrows = ['jj describe', 'jj rebase']
		.map((label, i) => {
			const x = 130 + i * 210;
			return (
				`<path class="d-arrow" d="M${x + 4} 54H${x + 82}" marker-end="url(#arrow)"/>` +
				`<text class="d-code" x="${x + 45}" y="46" text-anchor="middle">${label}</text>`
			);
		})
		.join('');
	return (
		`<svg class="diagram" xmlns="http://www.w3.org/2000/svg" width="570" height="160" viewBox="0 0 570 160" role="img">` +
		`<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="d-head" d="M0 0L10 5L0 10z"/></marker></defs>` +
		boxes +
		arrows +
		`<path class="d-arrow back" d="M480 76C480 106 280 106 280 78" marker-end="url(#arrow)"/>` +
		`<text class="d-code" x="380" y="116" text-anchor="middle">${esc(tr(lang, OPS_DIAGRAM.undo))}</text>` +
		`<path class="d-arrow back" d="M510 76C510 150 70 150 70 78" marker-end="url(#arrow)"/>` +
		`<text class="d-code" x="250" y="152" text-anchor="middle">${esc(tr(lang, OPS_DIAGRAM.restore))}</text>` +
		`</svg>`
	);
}

export function renderOperations(lang: Lang, operations: readonly Operation[]): string {
	const t = (text: L): string => tr(lang, text);
	const why = section(
		t(UI.opsWhyTitle),
		`<p>${esc(t(UI.opsWhy))}</p>${operationsDiagram(lang)}` +
			`<div class="btn-row">${button(lang, { label: t(UI.undo), msg: { type: 'command', command: 'jj-lens.undo' }, cli: 'jj undo', kind: 'primary' })}</div>`,
	);
	const items = operations
		.map(
			(op) =>
				`<li class="op${op.current ? ' current' : ''}"${cliAttr(lang, `jj op restore ${op.id}`)}>` +
				`<div class="op-main"><span class="op-desc">${esc(subject(op.description) || '—')}</span>` +
				(op.current ? `<span class="pill at">${esc(t(UI.current))}</span>` : '') +
				`</div>` +
				`<div class="meta"><span class="commit-id">${esc(op.id)}</span> · ${esc(op.user)} · ${esc(relativeTime(op.time))}</div>` +
				(op.current
					? ''
					: button(lang, {
							label: t(UI.restoreHere),
							msg: { type: 'opRestore', id: op.id },
							cli: `jj op restore ${op.id}`,
							kind: 'ghost',
						})) +
				`</li>`,
		)
		.join('');
	return (
		`<h2 id="sec-ops"${cliAttr(lang, 'jj op log')}>${esc(t(UI.opsTitle))}</h2>` +
		why +
		`<ol class="timeline">${items}</ol>`
	);
}

// ---------------------------------------------------------------------------
// Tab 3: concepts and command atlas
// ---------------------------------------------------------------------------

function legend(lang: Lang): string {
	const item = (mark: string, text: L): string =>
		`<span class="legend-item"><span class="legend-dot mark-${mark}"></span>${esc(tr(lang, text))}</span>`;
	return `<div class="legend">${item('new', UI.legendNew)}${item('moved', UI.legendMoved)}${item('changed', UI.legendChanged)}</div>`;
}

function panels(items: { caption: string; nodes: readonly SimNode[] }[]): string {
	return (
		`<div class="panels">` +
		items
			.map((item) => `<figure><figcaption>${esc(item.caption)}</figcaption>${renderGraphSvg(item.nodes)}</figure>`)
			.join(`<div class="panel-arrow" aria-hidden="true">→</div>`) +
		`</div>`
	);
}

const WC_DIAGRAM = {
	edit: { ja: 'ファイルを編集', en: 'edit files' },
	index: { ja: 'index(ステージ)', en: 'index (staging)' },
	commit: { ja: 'コミット', en: 'commit' },
	stash: { ja: 'stash(退避)', en: 'stash' },
	save: { ja: 'ファイルを編集・保存', en: 'edit and save files' },
	auto: { ja: '自動で記録', en: 'recorded automatically' },
	wc: { ja: '@(作業コピー = コミット)', en: '@ (working copy = a commit)' },
} satisfies Record<string, L>;

const diagramBox = (x: number, y: number, w: number, text: string, cls = ''): string =>
	`<rect class="d-box ${cls}" x="${x}" y="${y}" width="${w}" height="36" rx="6"/>` +
	`<text class="d-text" x="${x + w / 2}" y="${y + 23}" text-anchor="middle">${text}</text>`;

const diagramArrow = (x1: number, x2: number, y: number, label: string): string =>
	`<path class="d-arrow" d="M${x1} ${y}H${x2}" marker-end="url(#arrow-wc)"/>` +
	`<text class="d-code" x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle">${label}</text>`;

/** Git's three stages next to Jujutsu's single step. */
function workingCopyDiagram(lang: Lang): string {
	const t = (text: L): string => esc(tr(lang, text));
	return (
		`<svg class="diagram" xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200" role="img">` +
		`<defs><marker id="arrow-wc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="d-head" d="M0 0L10 5L0 10z"/></marker></defs>` +
		`<text class="d-title" x="4" y="42">Git</text>` +
		diagramBox(70, 20, 130, t(WC_DIAGRAM.edit)) +
		diagramArrow(204, 286, 38, 'git add') +
		diagramBox(290, 20, 130, t(WC_DIAGRAM.index)) +
		diagramArrow(424, 506, 38, 'git commit') +
		diagramBox(510, 20, 110, t(WC_DIAGRAM.commit)) +
		`<path class="d-arrow back" d="M135 58V80" marker-end="url(#arrow-wc)"/>` +
		diagramBox(70, 82, 130, t(WC_DIAGRAM.stash), 'faded') +
		`<text class="d-code" x="210" y="105">git stash</text>` +
		`<text class="d-title" x="4" y="170">jj</text>` +
		diagramBox(70, 148, 170, t(WC_DIAGRAM.save)) +
		diagramArrow(244, 366, 166, t(WC_DIAGRAM.auto)) +
		diagramBox(370, 148, 250, t(WC_DIAGRAM.wc), 'now') +
		`</svg>`
	);
}

function conceptCard(lang: Lang, concept: Concept): string {
	const diagram =
		concept.diagram.kind === 'working-copy'
			? workingCopyDiagram(lang)
			: panels(
					concept.diagram.panels.map((panel) => ({
						caption: tr(lang, panel.caption),
						nodes: localizeNodes(lang, panel.nodes),
					})),
				);
	return (
		`<article class="card concept" id="concept-${concept.id}">` +
		`<h3>${esc(tr(lang, concept.title))}</h3>` +
		`<p>${esc(tr(lang, concept.body))}</p>` +
		diagram +
		`<ul class="points">${concept.points.map((point) => `<li>${esc(tr(lang, point))}</li>`).join('')}</ul>` +
		`</article>`
	);
}

/** A "try it" or "run this step" button: a VS Code command, or a jump to a tab. */
function runButton(
	lang: Lang,
	run: { command: string } | { tab: StudioTab; hint: L },
	label: string,
	cli?: string,
): string {
	return button(lang, {
		label,
		msg:
			'command' in run
				? { type: 'command', command: run.command }
				: { type: 'goto', tab: run.tab, hint: tr(lang, run.hint) },
		cli,
		kind: 'primary',
	});
}

export function renderAtlas(lang: Lang): string {
	const t = (text: L): string => tr(lang, text);
	const concepts = CONCEPTS.map((concept) => conceptCard(lang, concept)).join('');
	const categories = (Object.keys(ATLAS_CATEGORIES) as AtlasCategory[])
		.map((category) => {
			const cards = ATLAS.filter((entry) => entry.category === category)
				.map((entry) => {
					const before = localizeNodes(lang, entry.before);
					const after = entry.after ? localizeNodes(lang, entry.after) : simulate(before, entry.op!);
					const options = entry.options.length
						? `<h5>${esc(t(UI.options))}</h5><dl class="options">` +
							entry.options
								.map((option) => `<dt><code>${esc(option.flag)}</code></dt><dd>${esc(t(option.text))}</dd>`)
								.join('') +
							`</dl>`
						: '';
					return (
						`<article class="card atlas-card" id="cmd-${entry.id}"${cliAttr(lang, entry.command)}>` +
						`<h4><code>${esc(entry.command)}</code></h4>` +
						`<p class="summary">${esc(t(entry.summary))}</p>` +
						panels([
							{ caption: t(UI.beforeShort), nodes: before },
							{ caption: t(UI.afterShort), nodes: after },
						]) +
						`<p>${esc(t(entry.usage))}</p>` +
						options +
						`<div class="btn-row">${runButton(lang, entry.try, t(UI.tryIt), entry.command)}</div>` +
						`</article>`
					);
				})
				.join('');
			return `<h3 class="category">${esc(t(ATLAS_CATEGORIES[category]))}</h3><div class="cards">${cards}</div>`;
		})
		.join('');
	return (
		`<h2 id="sec-concepts">${esc(t(UI.conceptsTitle))}</h2>${legend(lang)}<div class="concepts">${concepts}</div>` +
		`<h2 id="sec-commands">${esc(t(UI.commandsTitle))}</h2>${legend(lang)}${categories}`
	);
}

// ---------------------------------------------------------------------------
// Tab 4: Git comparison, recipes, revsets
// ---------------------------------------------------------------------------

export function renderRecipes(lang: Lang): string {
	const t = (text: L): string => tr(lang, text);
	const gitRows = GIT_COMPARISON.map(
		(row) =>
			`<tr><th scope="row">${esc(t(row.goal))}</th>` +
			`<td><code>${esc(row.git)}</code></td>` +
			`<td${cliAttr(lang, row.jj.split(' / ')[0])}><code class="jj">${esc(row.jj)}</code></td>` +
			`<td>${esc(t(row.note))}` +
			(row.atlas
				? ` <button type="button" class="link"${msgAttr({ type: 'goto', tab: 'atlas', section: `cmd-${row.atlas}` })}>→ ${esc(t(UI.commandsTitle))}</button>`
				: '') +
			`</td></tr>`,
	).join('');
	const git =
		`<h2 id="sec-git">${esc(t(UI.gitTitle))}</h2>` +
		`<table class="compare"><thead><tr><th>${esc(t(UI.gitGoal))}</th><th>${esc(t(UI.gitGit))}</th><th>${esc(t(UI.gitJj))}</th><th>${esc(t(UI.gitNote))}</th></tr></thead>` +
		`<tbody>${gitRows}</tbody></table>`;

	const recipes = RECIPES.map((recipe) => {
		const steps = recipe.steps
			.map(
				(step) =>
					`<li><span class="step-text">${esc(t(step.text))}</span>` +
					(step.cli ? `<code class="jj"${cliAttr(lang, step.cli)}>${esc(step.cli)}</code>` : '') +
					(step.run
						? runButton(lang, step.run, 'command' in step.run ? t(UI.runStep) : t(UI.showInGraph), step.cli)
						: '') +
					`</li>`,
			)
			.join('');
		return `<article class="card recipe" id="recipe-${recipe.id}"><h3>${esc(t(recipe.title))}</h3><ol class="steps">${steps}</ol></article>`;
	}).join('');

	const revsetRows = REVSETS.map(
		(entry) =>
			`<tr${cliAttr(lang, `jj log -r '${entry.expr}'`)}><td><code class="jj">${esc(entry.expr)}</code></td><td>${esc(t(entry.meaning))}</td>` +
			`<td>${button(lang, { label: t(UI.applyToGraph), msg: { type: 'revset', value: entry.expr, goto: 'graph' }, kind: 'ghost' })}</td></tr>`,
	).join('');
	const revsets =
		`<h2 id="sec-revsets">${esc(t(UI.revsetsTitle))}</h2>` +
		`<table class="compare revsets"><thead><tr><th>${esc(t(UI.revsetExpr))}</th><th>${esc(t(UI.revsetMeaning))}</th><th></th></tr></thead><tbody>${revsetRows}</tbody></table>`;

	return (
		git + `<h2 id="sec-recipes">${esc(t(UI.recipesTitle))}</h2><div class="cards recipes">${recipes}</div>` + revsets
	);
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function revisionLine(lang: Lang, rev: Revision): string {
	return `${changeIdHtml(rev)}${pills(lang, rev)}<span class="subj">${esc(subject(rev.description) || tr(lang, UI.noDescription))}</span>`;
}

/** The menu shown after dragging `source` onto `target` (or selecting both). */
export function renderPairMenu(
	lang: Lang,
	source: Revision,
	target: Revision,
	/** Ancestor first, when the two are on one line of history. */
	related: readonly [string, string] | undefined,
): string {
	const t = (text: L): string => tr(lang, text);
	const [s, d] = [revId(source), revId(target)];
	const [from, onto] = [source.commitId, target.commitId];
	const option = (text: L, op: object | undefined, cli: string, disabled: boolean, note = ''): string =>
		`<button type="button" class="option"${op ? msgAttr({ type: 'preview', op }) : ''}${cliAttr(lang, cli)}${disabled ? ' disabled' : ''}>` +
		`<span>${esc(t(text))}${note ? ` <span class="dim">${esc(note)}</span>` : ''}</span><code>${esc(cli)}</code></button>`;
	const rebase = (mode: 'r' | 's' | 'b', text: L): string =>
		option(text, { kind: 'rebase', mode, source: from, onto }, `jj rebase -${mode} ${s} --onto ${d}`, source.immutable);
	const relatedRefs = related?.map((id) => revId(id === from ? source : target));
	return (
		`<div class="modal-card">` +
		`<h2>${esc(t(UI.pairTitle))}</h2>` +
		`<dl class="pair"><dt>${esc(t(UI.source))}</dt><dd>${revisionLine(lang, source)}</dd>` +
		`<dt>${esc(t(UI.target))}</dt><dd>${revisionLine(lang, target)}</dd></dl>` +
		`<div class="option-list">` +
		rebase('s', UI.rebaseS) +
		rebase('r', UI.rebaseR) +
		rebase('b', UI.rebaseB) +
		option(
			UI.squashInto,
			{ kind: 'squash', from, into: onto },
			`jj squash --from ${s} --into ${d}`,
			source.immutable || target.immutable,
		) +
		option(UI.newMerge, { kind: 'new', parents: [from, onto] }, `jj new ${s} ${d}`, false) +
		option(
			UI.parallelize,
			related ? { kind: 'parallelize', from: related[0], to: related[1] } : undefined,
			`jj parallelize ${relatedRefs ? `${relatedRefs[0]}::${relatedRefs[1]}` : `${d}::${s}`}`,
			!related || source.immutable || target.immutable,
			related ? '' : t(UI.notRelated),
		) +
		`</div>` +
		`<div class="btn-row end">${button(lang, { label: t(UI.cancel), close: true })}</div>` +
		`</div>`
	);
}

export interface PreviewView {
	lang: Lang;
	/** The command line that will run. */
	command: string;
	before: readonly SimNode[];
	after: readonly SimNode[];
}

/** Before and After side by side, with the exact command, to confirm an operation. */
export function renderPreview(view: PreviewView): string {
	const { lang } = view;
	const t = (text: L): string => tr(lang, text);
	const notes = cliNotes(lang, view.command)
		.map((note) => `<li>${esc(note)}</li>`)
		.join('');
	return (
		`<div class="modal-card wide">` +
		panels([
			{ caption: t(UI.before), nodes: view.before },
			{ caption: t(UI.after), nodes: view.after },
		]) +
		legend(lang) +
		`<h3>${esc(t(UI.command))}</h3>` +
		`<pre class="command"${cliAttr(lang, view.command)}><code>${esc(view.command)}</code></pre>` +
		`<ul class="notes">${notes}</ul>` +
		`<p class="hint">${esc(t(UI.previewNote))}</p>` +
		`<div class="btn-row end">` +
		button(lang, { label: t(UI.cancel), close: true }) +
		button(lang, { label: t(UI.execute), msg: { type: 'confirm' }, kind: 'primary', close: true, cli: view.command }) +
		`</div></div>`
	);
}

export function renderMessage(lang: Lang, title: string, detail: string): string {
	return (
		`<div class="modal-card">` +
		`<h2>${esc(title)}</h2><pre class="error">${esc(detail)}</pre>` +
		`<div class="btn-row end">${button(lang, { label: tr(lang, UI.close), close: true })}</div>` +
		`</div>`
	);
}
