// Bilingual (Japanese / English) text and data for JJ Lens: sidebar labels,
// concept explanations, the command atlas, recipes and cheat sheets.
// This file must not import 'vscode' so it stays unit-testable in isolation.

import { SimNode, SimOp } from '../jj/graph';

export type Lang = 'ja' | 'en';

/** A localized string. */
export interface L {
	ja: string;
	en: string;
}

export function tr(lang: Lang, text: L): string {
	return text[lang];
}

/** Tabs of JJ Lens Studio. */
export type StudioTab = 'graph' | 'ops' | 'atlas' | 'recipes';

export const TAB_TITLES: Record<StudioTab, L> = {
	graph: { ja: 'ビジュアルグラフ & GUI', en: 'Visual Graph & GUI' },
	ops: { ja: '操作タイムライン', en: 'Operations Timeline' },
	atlas: { ja: '図解コンセプト & コマンド図鑑', en: 'Concepts & Command Atlas' },
	recipes: { ja: 'レシピ & Git 比較 / Revset', en: 'Recipes, Git Comparison & Revsets' },
};

export interface SidebarAction {
	label: L;
	/** Codicon name. */
	icon: string;
	/** VS Code command id. */
	command: string;
	args?: string[];
	/** The jj command line this runs, shown as the item description. */
	cli?: string;
}

export const SIDEBAR = {
	openStudio: { ja: 'JJ Lens Studio を開く(グラフ & GUI)', en: 'Open JJ Lens Studio (Graph & GUI)' },
	quickActions: { ja: 'クイック操作', en: 'Quick Actions' },
	guides: { ja: '図解ガイド & チートシート', en: 'Visual Guides & Cheat Sheets' },
	noChanges: { ja: '変更されたファイルはありません', en: 'No changed files' },
	noDescription: { ja: '(説明なし)', en: '(no description set)' },
	conflict: { ja: 'コンフリクトがあります', en: 'This change has conflicts' },
} satisfies Record<string, L>;

export const QUICK_ACTIONS: SidebarAction[] = [
	{
		label: { ja: '新しい変更を作る(@ の上)', en: 'New Change (on top of @)' },
		icon: 'add',
		command: 'jj-lens.new',
		cli: 'jj new',
	},
	{
		label: { ja: 'コミット(@ を確定して次へ)', en: 'Commit (finish @, start the next)' },
		icon: 'check',
		command: 'jj-lens.commit',
		cli: 'jj commit',
	},
	{
		label: { ja: '説明を編集', en: 'Describe' },
		icon: 'edit',
		command: 'jj-lens.describe',
		cli: 'jj describe',
	},
	{
		label: { ja: '親に統合(Squash)', en: 'Squash into Parent' },
		icon: 'fold-down',
		command: 'jj-lens.squash',
		cli: 'jj squash',
	},
	{
		label: { ja: '過去の変更へ自動振り分け(Absorb)', en: 'Absorb into Earlier Changes' },
		icon: 'wand',
		command: 'jj-lens.absorb',
		cli: 'jj absorb',
	},
	{
		label: { ja: '直前の操作を取り消す', en: 'Undo Last Operation' },
		icon: 'discard',
		command: 'jj-lens.undo',
		cli: 'jj undo',
	},
	{ label: { ja: 'Git Fetch', en: 'Git Fetch' }, icon: 'repo-pull', command: 'jj-lens.gitFetch', cli: 'jj git fetch' },
	{ label: { ja: 'Git Push', en: 'Git Push' }, icon: 'repo-push', command: 'jj-lens.gitPush', cli: 'jj git push' },
];

/** Section anchors inside the Studio tabs that the sidebar can jump to. */
export const GUIDE_LINKS: SidebarAction[] = [
	{
		label: { ja: 'Git と Jujutsu の対応表', en: 'Git vs Jujutsu' },
		icon: 'git-compare',
		command: 'jj-lens.openGuideTopic',
		args: ['recipes', 'git'],
	},
	{
		label: { ja: 'Jujutsu の概念図解', en: 'Jujutsu Concepts, Illustrated' },
		icon: 'lightbulb',
		command: 'jj-lens.openGuideTopic',
		args: ['atlas', 'concepts'],
	},
	{
		label: { ja: 'コマンド図鑑(Before / After)', en: 'Command Atlas (Before / After)' },
		icon: 'book',
		command: 'jj-lens.openGuideTopic',
		args: ['atlas', 'commands'],
	},
	{
		label: { ja: 'やりたいこと別レシピ', en: 'Recipes by Goal' },
		icon: 'checklist',
		command: 'jj-lens.openGuideTopic',
		args: ['recipes', 'recipes'],
	},
	{
		label: { ja: 'Revset チートシート', en: 'Revset Cheat Sheet' },
		icon: 'filter',
		command: 'jj-lens.openGuideTopic',
		args: ['recipes', 'revsets'],
	},
	{
		label: { ja: '操作タイムライン(Undo / Restore)', en: 'Operations Timeline (Undo / Restore)' },
		icon: 'history',
		command: 'jj-lens.openGuideTopic',
		args: ['ops'],
	},
];

// ---------------------------------------------------------------------------
// Studio UI strings
// ---------------------------------------------------------------------------

export const UI = {
	subtitle: { ja: 'Jujutsu を見て・触って・理解する', en: 'See, touch and understand Jujutsu' },
	noRepo: {
		ja: 'このワークスペースに Jujutsu リポジトリが見つかりません。',
		en: 'No Jujutsu repository was found in this workspace.',
	},
	refresh: { ja: '更新', en: 'Refresh' },
	apply: { ja: '適用', en: 'Apply' },
	execute: { ja: '実行する', en: 'Run' },
	cancel: { ja: 'キャンセル', en: 'Cancel' },
	close: { ja: '閉じる', en: 'Close' },
	copy: { ja: 'コピー', en: 'Copy' },
	before: { ja: 'Before(現在)', en: 'Before (now)' },
	after: { ja: 'After(実行後の予測)', en: 'After (predicted)' },
	beforeShort: { ja: 'Before', en: 'Before' },
	afterShort: { ja: 'After', en: 'After' },
	command: { ja: '実行されるコマンド', en: 'Command to run' },
	legendNew: { ja: '新しく作られる', en: 'created' },
	legendMoved: { ja: '移動する', en: 'moved' },
	legendChanged: { ja: '書き換わる(自動リベース含む)', en: 'rewritten (incl. auto-rebase)' },
	previewNote: {
		ja: '予測は表示中のグラフから計算しています。実行後も「操作タイムライン」からいつでも元に戻せます。',
		en: 'The prediction is computed from the graph on screen. You can always undo from the Operations Timeline.',
	},
	previewFailed: { ja: 'この操作は実行できません', en: 'This operation is not possible' },

	revsetPlaceholder: { ja: 'Revset 式(空欄で jj の既定)', en: 'Revset expression (empty for jj default)' },
	revsetDefault: { ja: '既定', en: 'Default' },
	graphHint: {
		ja: 'クリックで選択。ノードを別のノードへドラッグ、または Ctrl/⌘+クリックで2つ目を選ぶと Rebase / Squash / Merge / Parallelize のメニューが開きます。',
		en: 'Click to select. Drag a node onto another, or Ctrl/⌘-click a second node, to open the Rebase / Squash / Merge / Parallelize menu.',
	},
	noRevisions: { ja: 'この Revset に一致するリビジョンはありません。', en: 'No revisions match this revset.' },
	noDescription: { ja: '(説明なし)', en: '(no description set)' },
	selectHint: {
		ja: 'グラフのリビジョンをクリックすると、詳細・ファイル・履歴がここに表示されます。',
		en: 'Click a revision in the graph to see its details, files and history here.',
	},

	workingCopy: { ja: '作業コピー', en: 'working copy' },
	immutable: { ja: '変更不可', en: 'immutable' },
	conflict: { ja: 'コンフリクト', en: 'conflict' },
	empty: { ja: '空', en: 'empty' },
	divergent: { ja: '分岐(divergent)', en: 'divergent' },

	description: { ja: '説明(Description)', en: 'Description' },
	saveDescription: { ja: '説明を保存', en: 'Save Description' },
	commit: { ja: 'コミット(保存して新しい @ へ)', en: 'Commit (save, start a new @)' },
	actions: { ja: 'このリビジョンへの操作', en: 'Actions on This Revision' },
	newOnTop: { ja: 'この上に新規作成', en: 'New Change on Top' },
	edit: { ja: 'ここを編集(@ にする)', en: 'Edit (make it @)' },
	squashParent: { ja: '親に統合', en: 'Squash into Parent' },
	duplicate: { ja: '複製', en: 'Duplicate' },
	abandon: { ja: '破棄(Abandon)', en: 'Abandon' },
	files: { ja: '変更ファイル', en: 'Changed Files' },
	noFiles: { ja: '変更されたファイルはありません。', en: 'No changed files.' },
	fileHint: {
		ja: 'ファイル名のクリックで Diff。チェックしたファイルだけを分割・移動・破棄できます。',
		en: 'Click a file name for its diff. Tick files to split, move or discard just those.',
	},
	selectFilesFirst: { ja: '先にファイルをチェックしてください。', en: 'Tick one or more files first.' },
	splitNeedsRest: {
		ja: '残す側にも 1 つ以上ファイルが必要です(全部は選べません)。',
		en: 'Leave at least one file in the remaining change.',
	},
	splitTitle: { ja: '別コミットへ分割(jj split)', en: 'Split into a Separate Change (jj split)' },
	splitMessage: { ja: '分割したコミットの説明', en: 'Description of the split-off change' },
	splitParallel: { ja: '並列(兄弟)にする', en: 'Make them siblings (parallel)' },
	split: { ja: '分割', en: 'Split' },
	moveTitle: {
		ja: '別のリビジョンへ移動(jj squash --from --into)',
		en: 'Move to Another Revision (jj squash --from --into)',
	},
	move: { ja: '移動', en: 'Move' },
	discard: { ja: '変更を破棄(jj restore)', en: 'Discard Changes (jj restore)' },
	bookmarks: { ja: 'Bookmark', en: 'Bookmarks' },
	noBookmarks: { ja: 'Bookmark はありません。', en: 'No bookmarks here.' },
	bookmarkName: { ja: 'Bookmark 名', en: 'Bookmark name' },
	setBookmark: { ja: 'ここに作成 / 移動', en: 'Create / Move Here' },
	push: { ja: 'Push', en: 'Push' },
	delete: { ja: '削除', en: 'Delete' },
	pushChange: { ja: 'Bookmark を自動作成して Push', en: 'Create a Bookmark and Push' },
	evolog: { ja: '変遷履歴(Evolution Log)', en: 'Evolution Log' },
	evologHint: {
		ja: 'この Change ID が指してきたコミットの履歴です。編集・Rebase・Squash のたびに 1 行増えます。',
		en: 'The commits this change ID has pointed to. Each edit, rebase or squash adds a line.',
	},

	pairTitle: { ja: 'この2つのリビジョンで何をしますか?', en: 'What do you want to do with these two revisions?' },
	source: { ja: '操作元', en: 'Source' },
	target: { ja: '操作先', en: 'Target' },
	rebaseS: {
		ja: 'Rebase -s:このリビジョンと子孫すべてを移動',
		en: 'Rebase -s: move this revision and all its descendants',
	},
	rebaseR: {
		ja: 'Rebase -r:このリビジョンだけを抜いて移動(子孫は親へ繋ぎ直し)',
		en: 'Rebase -r: move only this revision (its children are reattached to its parent)',
	},
	rebaseB: { ja: 'Rebase -b:ブランチ全体を移動', en: 'Rebase -b: move the whole branch' },
	squashInto: { ja: 'Squash:操作元の変更を操作先へ統合', en: 'Squash: fold the source into the target' },
	newMerge: {
		ja: 'New Merge:2つを親にしたマージコミットを作成',
		en: 'New Merge: create a merge change with both as parents',
	},
	parallelize: {
		ja: 'Parallelize:2つの間の直列コミットを並列にする',
		en: 'Parallelize: turn the chain between them into siblings',
	},
	notRelated: { ja: '(同じ一本道の上にないため選べません)', en: '(not on one line of history)' },

	opsTitle: { ja: '操作タイムライン(jj op log)', en: 'Operations Timeline (jj op log)' },
	opsWhyTitle: { ja: 'なぜ Jujutsu ではどんな操作も怖くないのか', en: 'Why nothing in Jujutsu is scary' },
	opsWhy: {
		ja: 'jj はコマンドを実行するたびに「リポジトリ全体の状態」を Operation として記録します。コミットを書き換えても古い状態は消えず、タイムライン上に残ります。だから rebase や squash を間違えても、1 つ前に戻す(undo)ことも、任意の時点へ丸ごと戻す(op restore)こともできます。',
		en: 'Every jj command records the state of the whole repository as an operation. Rewriting commits never destroys the old state; it stays on the timeline. So after a wrong rebase or squash you can step back once (undo) or jump the whole repository to any point (op restore).',
	},
	undo: { ja: '直前の操作を取り消す(jj undo)', en: 'Undo the Last Operation (jj undo)' },
	restoreHere: { ja: 'この時点に戻す', en: 'Restore to Here' },
	current: { ja: '現在', en: 'current' },
	opState: { ja: '状態', en: 'state' },

	conceptsTitle: { ja: 'Jujutsu の核心コンセプト', en: 'Core Concepts of Jujutsu' },
	commandsTitle: { ja: 'コマンド図鑑(Before / After)', en: 'Command Atlas (Before / After)' },
	options: { ja: '主なオプション', en: 'Main Options' },
	tryIt: { ja: 'GUI で試す', en: 'Try It in the GUI' },
	gitTitle: { ja: 'Git と Jujutsu の対応表', en: 'Git vs Jujutsu' },
	gitGoal: { ja: 'やりたいこと', en: 'Goal' },
	gitGit: { ja: 'Git でのコマンド', en: 'In Git' },
	gitJj: { ja: 'Jujutsu でのやり方', en: 'In Jujutsu' },
	gitNote: { ja: 'ポイント', en: 'Key Point' },
	recipesTitle: { ja: 'やりたいこと別レシピ', en: 'Recipes by Goal' },
	runStep: { ja: '実行', en: 'Run' },
	showInGraph: { ja: 'グラフで操作', en: 'Do It in the Graph' },
	revsetsTitle: { ja: 'Revset(リビジョン指定式)チートシート', en: 'Revset Cheat Sheet' },
	revsetExpr: { ja: '式', en: 'Expression' },
	revsetMeaning: { ja: '意味', en: 'Meaning' },
	applyToGraph: { ja: 'グラフに適用', en: 'Apply to Graph' },

	cliBarIdle: {
		ja: 'ボタンやグラフにマウスを乗せると、対応する jj コマンドとオプションの意味がここに表示されます。',
		en: 'Hover a button or the graph to see the matching jj command and what its options mean.',
	},
	cliBarTitle: { ja: 'CLI で打つなら', en: 'On the command line' },
	copied: { ja: 'コピーしました', en: 'Copied' },
} satisfies Record<string, L>;

// ---------------------------------------------------------------------------
// CLI learning bar: what each command and option means
// ---------------------------------------------------------------------------

/** Keyed by subcommand (`rebase`), `subcommand flag` (`rebase -s`) or bare flag (`--onto`). */
export const CLI_NOTES: Record<string, L> = {
	new: {
		ja: 'jj new: 指定したリビジョンの上に空の変更を作り、作業コピー (@) をそこへ移す。親を複数並べるとマージになる',
		en: 'jj new: create an empty change on top of the given revisions and move the working copy (@) there. Several parents make a merge',
	},
	commit: {
		ja: 'jj commit: @ に説明を付けて確定し、その上に新しい空の @ を作る(describe + new)',
		en: 'jj commit: describe @ and start a new empty @ on top of it (describe + new)',
	},
	edit: {
		ja: 'jj edit: 指定したリビジョンを作業コピー (@) にして直接編集する。子孫は自動でリベースされる',
		en: 'jj edit: make the given revision the working copy (@) and edit it in place. Descendants are rebased automatically',
	},
	describe: {
		ja: 'jj describe: リビジョンの説明文を書き換える',
		en: 'jj describe: change the description of a revision',
	},
	abandon: {
		ja: 'jj abandon: リビジョンを捨てる。子は親へ繋ぎ直される',
		en: 'jj abandon: drop a revision. Its children are reattached to its parents',
	},
	squash: {
		ja: 'jj squash: リビジョンの変更を別のリビジョン(既定は親)へ移す',
		en: 'jj squash: move the changes of a revision into another one (its parent by default)',
	},
	split: {
		ja: 'jj split: 1 つのリビジョンを 2 つに分ける。パスを指定するとそのファイルが 1 つ目に入る',
		en: 'jj split: split one revision in two. The given paths go into the first part',
	},
	absorb: {
		ja: 'jj absorb: @ の各変更行を、その行を最後に触った祖先リビジョンへ自動で振り分ける',
		en: 'jj absorb: move each changed line of @ into the ancestor that last touched that line',
	},
	restore: {
		ja: 'jj restore: ファイルの内容を別のリビジョンの状態へ戻す',
		en: 'jj restore: restore file contents from another revision',
	},
	rebase: {
		ja: 'jj rebase: リビジョンを別の親の上へ移動する。コンフリクトしても中断しない',
		en: 'jj rebase: move revisions onto a different parent. It never stops on conflicts',
	},
	parallelize: {
		ja: 'jj parallelize: 直列に並んだリビジョンを、互いに独立した兄弟に並べ替える',
		en: 'jj parallelize: turn a chain of revisions into independent siblings',
	},
	duplicate: {
		ja: 'jj duplicate: 同じ内容・新しい Change ID のコピーを作る',
		en: 'jj duplicate: make a copy with the same content and a new change ID',
	},
	undo: {
		ja: 'jj undo: 直前の操作をなかったことにする(繰り返すとさらに遡る)',
		en: 'jj undo: undo the last operation (repeat to go further back)',
	},
	'op log': {
		ja: 'jj op log: リポジトリに対して行われた操作の履歴を表示する',
		en: 'jj op log: show the history of operations performed on the repository',
	},
	'op restore': {
		ja: 'jj op restore: リポジトリ全体を指定した操作の時点の状態に戻す',
		en: 'jj op restore: put the whole repository back in the state of the given operation',
	},
	evolog: {
		ja: 'jj evolog: 1 つの変更 (Change ID) がどう書き換えられてきたかを表示する',
		en: 'jj evolog: show how one change (change ID) has been rewritten over time',
	},
	log: { ja: 'jj log: リビジョンのグラフを表示する', en: 'jj log: show the revision graph' },
	'bookmark set': {
		ja: 'jj bookmark set: Bookmark を作成、または指定リビジョンへ移動する',
		en: 'jj bookmark set: create a bookmark or move it to the given revision',
	},
	'bookmark delete': {
		ja: 'jj bookmark delete: Bookmark を削除する(次の push でリモートからも消える)',
		en: 'jj bookmark delete: delete a bookmark (the next push deletes it on the remote too)',
	},
	'git fetch': {
		ja: 'jj git fetch: リモートの最新を取得する。作業コピーは動かない',
		en: 'jj git fetch: fetch from the remote. The working copy does not move',
	},
	'git push': {
		ja: 'jj git push: Bookmark をリモートへ送る',
		en: 'jj git push: push bookmarks to the remote',
	},
	'rebase -s': {
		ja: '-s (--source): 指定リビジョンとその子孫すべてを移動',
		en: '-s (--source): move the revision together with all its descendants',
	},
	'rebase -r': {
		ja: '-r (--revision): 指定リビジョンだけを抜き出して移動。子孫は元の親へ繋ぎ直す',
		en: '-r (--revision): move only this revision; its children are reattached to its old parent',
	},
	'rebase -b': {
		ja: '-b (--branch): 移動先と共有していない祖先ごと、ブランチ全体を移動',
		en: '-b (--branch): move the whole branch, i.e. everything not shared with the destination',
	},
	'--onto': { ja: '--onto (-o): 移動先(新しい親)を指定', en: '--onto (-o): the destination (the new parent)' },
	'squash -r': {
		ja: '-r (--revision): このリビジョンを、その親へ統合する',
		en: '-r (--revision): squash this revision into its parent',
	},
	'--from': { ja: '--from (-f): 変更の取り出し元', en: '--from (-f): where to take the changes from' },
	'--into': { ja: '--into (-t): 変更の入れ先', en: '--into (-t): where to put the changes' },
	'--use-destination-message': {
		ja: '--use-destination-message (-u): 入れ先の説明文をそのまま使う(エディタを開かない)',
		en: '--use-destination-message (-u): keep the destination description (no editor)',
	},
	'--parallel': {
		ja: '--parallel (-p): 親子ではなく兄弟(並列)として分ける',
		en: '--parallel (-p): make the two parts siblings instead of parent and child',
	},
	'--message': {
		ja: '--message (-m): 説明文を指定(エディタを開かない)',
		en: '--message (-m): the description to use (no editor)',
	},
	'split -r': { ja: '-r (--revision): 分割するリビジョン', en: '-r (--revision): the revision to split' },
	'describe -r': { ja: '-r: 説明を変えるリビジョン', en: '-r: the revision to describe' },
	'--changes-in': {
		ja: '--changes-in (-c): このリビジョンで行った変更を取り消す(親の内容に戻す)',
		en: '--changes-in (-c): undo the changes made in this revision (restore from its parent)',
	},
	'--change': {
		ja: '--change (-c): このリビジョン用の Bookmark を自動生成して push',
		en: '--change (-c): create a bookmark for this revision and push it',
	},
	'--bookmark': { ja: '--bookmark (-b): この Bookmark だけを push', en: '--bookmark (-b): push only this bookmark' },
	'--allow-backwards': {
		ja: '--allow-backwards (-B): Bookmark を後ろ(祖先)や横へ動かすことも許可',
		en: '--allow-backwards (-B): allow moving the bookmark backwards or sideways',
	},
	'bookmark set -r': { ja: '-r: Bookmark を置くリビジョン', en: '-r: the revision to point the bookmark at' },
	'log -r': { ja: '-r: 表示するリビジョンを Revset 式で絞り込む', en: '-r: which revisions to show, as a revset' },
	'evolog -r': { ja: '-r: 履歴を追う変更', en: '-r: the change to follow' },
};

const FLAG_ALIASES: Record<string, string> = {
	'-m': '--message',
	'-o': '--onto',
	'-f': '--from',
	'-t': '--into',
	'-u': '--use-destination-message',
	'-p': '--parallel',
	'-c': '--change',
	'-B': '--allow-backwards',
};

/** Explains a `jj …` command line: the subcommand first, then each option. */
export function cliNotes(lang: Lang, commandLine: string): string[] {
	const tokens = commandLine.trim().split(/\s+/);
	if (tokens[0] === 'jj') {
		tokens.shift();
	}
	const two = `${tokens[0]} ${tokens[1]}`;
	const sub = tokens[1] && !tokens[1].startsWith('-') && two in CLI_NOTES ? two : tokens[0];
	const notes = sub in CLI_NOTES ? [tr(lang, CLI_NOTES[sub])] : [];
	const seen = new Set<string>();
	for (const token of tokens) {
		if (!token.startsWith('-')) {
			continue;
		}
		const flag = token.split('=')[0];
		const key = [`${sub} ${flag}`, flag, FLAG_ALIASES[flag]].find((k) => k !== undefined && k in CLI_NOTES);
		if (key && !seen.has(key)) {
			seen.add(key);
			notes.push(tr(lang, CLI_NOTES[key]));
		}
	}
	return notes;
}

/** Formats jj arguments as a command line a user could paste into a shell. */
export function formatCli(args: readonly string[]): string {
	const quote = (arg: string): string => {
		const message = /^--message=([\s\S]*)$/.exec(arg);
		if (message) {
			return `-m ${quote(message[1])}`;
		}
		return /^[\w@:./=+,-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", `'\\''`)}'`;
	};
	return ['jj', ...args.map(quote)].join(' ');
}

// ---------------------------------------------------------------------------
// Diagrams
// ---------------------------------------------------------------------------

/** A graph node in an illustration; labels may be localized. */
export type DiagramNode = Omit<SimNode, 'label'> & { label?: L | string };

export function localizeNodes(lang: Lang, nodes: readonly DiagramNode[]): SimNode[] {
	return nodes.map((node) => ({
		...node,
		label: typeof node.label === 'object' ? tr(lang, node.label) : node.label,
	}));
}

const node = (id: string, parents: string[], label: L | string, extra: Partial<SimNode> = {}): DiagramNode => ({
	id,
	parents,
	label,
	...extra,
});

const MAIN: DiagramNode = node(
	'main',
	[],
	{ ja: '共有済みの履歴', en: 'shared history' },
	{ immutable: true, bookmarks: ['main'] },
);
const LOGIN: L = { ja: 'ログイン画面', en: 'login form' };
const API: L = { ja: 'API 追加', en: 'add API' };
const TESTS: L = { ja: 'テスト追加', en: 'add tests' };
const WIP: L = { ja: '作業中', en: 'work in progress' };

/** main ← A ← B ← @C */
const LINE: DiagramNode[] = [
	node('C', ['B'], WIP, { workingCopy: true }),
	node('B', ['A'], API),
	node('A', ['main'], LOGIN),
	MAIN,
];

/** main ← A ← B, and main ← X ← @Y on a second branch. */
const FORK: DiagramNode[] = [
	node('Y', ['X'], TESTS, { workingCopy: true }),
	node('X', ['main'], { ja: '別の作業', en: 'other work' }),
	node('B', ['A'], API),
	node('A', ['main'], LOGIN),
	MAIN,
];

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export interface ConceptPanel {
	caption: L;
	nodes: DiagramNode[];
}

export interface Concept {
	id: string;
	title: L;
	body: L;
	points: L[];
	/** Either graph panels shown side by side, or the hand-drawn Git/jj comparison. */
	diagram: { kind: 'panels'; panels: ConceptPanel[] } | { kind: 'working-copy' };
}

export const CONCEPTS: Concept[] = [
	{
		id: 'working-copy',
		title: { ja: '1. 作業コピー = コミット (@)', en: '1. The Working Copy Is a Commit (@)' },
		body: {
			ja: 'Git ではファイルを編集 → git add でステージ → git commit という 3 段階を踏みます。Jujutsu では作業コピーそのものが @ というコミットで、ファイルを保存すれば次の jj コマンド実行時に自動で @ に記録されます。',
			en: 'In Git you edit files, stage them with git add, then git commit. In Jujutsu the working copy itself is a commit called @: save a file and the next jj command records it into @ automatically.',
		},
		points: [
			{
				ja: 'ステージングエリア (index) がない。「入れたいものだけ選ぶ」は jj split / jj squash で行う',
				en: 'There is no staging area. Choosing what goes in is done with jj split / jj squash',
			},
			{
				ja: 'git stash に当たるコマンドはなく、そもそも退避が要らない。jj new <移動先> で別の場所に移っても、今の変更は元のコミットに入ったままログに残る。戻るときは jj edit <change_id>',
				en: 'There is no equivalent of git stash, because nothing needs setting aside. After jj new <target> your changes are still in the commit they were in, visible in the log. Go back with jj edit <change_id>',
			},
			{
				ja: '「コミットし忘れ」が起きない。作業は常にどこかのコミットに入っている',
				en: 'You cannot forget to commit: your work is always inside some commit',
			},
		],
		diagram: { kind: 'working-copy' },
	},
	{
		id: 'ids',
		title: { ja: '2. Change ID と Commit ID', en: '2. Change ID vs Commit ID' },
		body: {
			ja: '各リビジョンは 2 つの ID を持ちます。Change ID(k〜z の文字)は「この変更」を指す不変の名前、Commit ID(16 進数)は中身のスナップショットの名前です。説明を直したりリベースしたりすると Commit ID は変わりますが、Change ID は変わりません。',
			en: 'Every revision has two IDs. The change ID (letters k–z) is a stable name for "this change"; the commit ID (hex) names one snapshot of its content. Rewording or rebasing changes the commit ID, never the change ID.',
		},
		points: [
			{
				ja: 'コマンドには Change ID を使う。書き換えた後も同じ ID で指せる',
				en: 'Use change IDs in commands: they still work after a rewrite',
			},
			{
				ja: '強調表示されている先頭の数文字(最短ユニークプレフィックス)だけ打てば足りる',
				en: 'Typing the highlighted first letters (the shortest unique prefix) is enough',
			},
			{ ja: '過去の Commit ID は jj evolog で辿れる', en: 'Earlier commit IDs can be found with jj evolog' },
		],
		diagram: {
			kind: 'panels',
			panels: [
				{
					caption: { ja: '書き換える前', en: 'Before rewriting' },
					nodes: [
						node(
							'kxqp',
							['main'],
							{ ja: 'Change kxqp / Commit 3a1f', en: 'change kxqp / commit 3a1f' },
							{ workingCopy: true },
						),
						MAIN,
					],
				},
				{
					caption: { ja: 'jj describe の後', en: 'After jj describe' },
					nodes: [
						node(
							'kxqp',
							['main'],
							{ ja: 'Change kxqp / Commit 9c7e', en: 'change kxqp / commit 9c7e' },
							{ workingCopy: true, mark: 'changed' },
						),
						MAIN,
					],
				},
			],
		},
	},
	{
		id: 'bookmarks',
		title: { ja: '3. Bookmark(名前のないブランチ)', en: '3. Bookmarks (Branches Without Names)' },
		body: {
			ja: 'Jujutsu ではブランチ名を付けなくてもコミットを積めます。枝分かれはグラフの形そのもので表現されます。名前が必要になったとき(PR を出すときなど)にだけ、Bookmark というラベルをコミットに貼ります。',
			en: 'In Jujutsu you can stack commits without naming a branch: branches are simply the shape of the graph. Only when you need a name (to open a pull request, say) do you stick a bookmark label on a commit.',
		},
		points: [
			{
				ja: '「今いるブランチ」という概念がない。あるのは @ がどこにあるかだけ',
				en: 'There is no "current branch", only where @ is',
			},
			{
				ja: 'Bookmark は新しいコミットに自動では付いてこない。進めたいときは jj bookmark set で動かす',
				en: 'A bookmark does not follow new commits; move it with jj bookmark set',
			},
			{
				ja: 'jj git push --change <rev> なら Bookmark の作成と push を一度に行える',
				en: 'jj git push --change <rev> creates a bookmark and pushes in one step',
			},
		],
		diagram: {
			kind: 'panels',
			panels: [
				{ caption: { ja: '名前なしで作業', en: 'Working without a name' }, nodes: LINE },
				{
					caption: { ja: '必要になったらラベルを貼る', en: 'Label it when you need to' },
					nodes: [
						node('C', ['B'], WIP, { workingCopy: true }),
						node('B', ['A'], API, { bookmarks: ['feat-api'], mark: 'changed' }),
						node('A', ['main'], LOGIN),
						MAIN,
					],
				},
			],
		},
	},
	{
		id: 'auto-rebase',
		title: { ja: '4. 子孫の自動リベース', en: '4. Descendants Are Rebased Automatically' },
		body: {
			ja: '過去のコミットを edit / squash / describe で書き換えると、その上に積まれている子孫コミットは自動的に新しい親の上へリベースされます。git rebase -i のような対話的な手順は要りません。',
			en: 'When you rewrite an earlier commit with edit, squash or describe, every commit stacked on top is rebased onto the new version automatically. No interactive rebase needed.',
		},
		points: [
			{
				ja: 'Change ID は変わらないので、子孫も同じ ID のまま',
				en: 'Change IDs stay the same, for the descendants too',
			},
			{
				ja: 'リベースでコンフリクトしても操作は止まらない(次の項目)',
				en: 'A conflict during the rebase does not stop the operation (see the next concept)',
			},
		],
		diagram: {
			kind: 'panels',
			panels: [
				{ caption: { ja: 'A を直したい', en: 'You want to fix A' }, nodes: LINE },
				{
					caption: { ja: 'A を書き換えると B と C が追従', en: 'Rewrite A: B and C follow' },
					nodes: [
						node('C', ['B'], WIP, { workingCopy: true, mark: 'changed' }),
						node('B', ['A'], API, { mark: 'changed' }),
						node('A', ['main'], { ja: 'ログイン画面(修正済)', en: 'login form (fixed)' }, { mark: 'moved' }),
						MAIN,
					],
				},
			],
		},
	},
	{
		id: 'conflicts',
		title: { ja: '5. コンフリクトもコミットに保存される', en: '5. Conflicts Are Stored in Commits' },
		body: {
			ja: 'Git ではコンフリクトが起きるとリベースが中断し、解消するまで先へ進めません。Jujutsu ではコンフリクトした状態がそのままコミットに記録され、操作は最後まで完了します。解消は好きなタイミングで行えます。',
			en: 'In Git a conflict stops the rebase until you resolve it. In Jujutsu the conflicted state is recorded in the commit and the operation completes. You resolve it whenever you like.',
		},
		points: [
			{
				ja: 'コンフリクト中のコミットは赤いバッジで表示される。jj log -r "conflicts()" で一覧できる',
				en: 'Conflicted commits get a red badge. List them with jj log -r "conflicts()"',
			},
			{
				ja: '解消するには jj new <コンフリクト中のコミット> で上に乗り、直してから jj squash',
				en: 'To resolve: jj new <conflicted commit>, fix the files, then jj squash',
			},
			{
				ja: '親のコンフリクトを解消すると、子孫のコンフリクトも自動で消えることが多い',
				en: 'Resolving the parent often makes the conflicts in its descendants disappear too',
			},
		],
		diagram: {
			kind: 'panels',
			panels: [
				{ caption: { ja: 'リベース前', en: 'Before the rebase' }, nodes: FORK },
				{
					caption: { ja: 'リベースは完了、コンフリクトは記録', en: 'Rebase done, conflict recorded' },
					nodes: [
						node('Y', ['X'], TESTS, { workingCopy: true, mark: 'moved' }),
						node('X', ['B'], { ja: '別の作業', en: 'other work' }, { conflict: true, mark: 'moved' }),
						node('B', ['A'], API),
						node('A', ['main'], LOGIN),
						MAIN,
					],
				},
			],
		},
	},
];

// ---------------------------------------------------------------------------
// Command atlas
// ---------------------------------------------------------------------------

export type AtlasCategory = 'basic' | 'rewrite' | 'move' | 'safety' | 'git';

export const ATLAS_CATEGORIES: Record<AtlasCategory, L> = {
	basic: { ja: '基本操作', en: 'Basics' },
	rewrite: { ja: '履歴の整理・統合・分割', en: 'Tidying, Combining and Splitting' },
	move: { ja: '履歴の移動・並び替え', en: 'Moving and Reordering' },
	safety: { ja: '安全網・履歴追跡', en: 'Safety Net and History Tracking' },
	git: { ja: 'Git 連携・Bookmark', en: 'Git and Bookmarks' },
};

export interface AtlasCommand {
	id: string;
	category: AtlasCategory;
	/** The command line shown as the card title. */
	command: string;
	summary: L;
	/** When you would reach for it. */
	usage: L;
	options: { flag: string; text: L }[];
	before: DiagramNode[];
	/** The After graph is simulated from `op`, unless `after` gives it explicitly. */
	op?: SimOp;
	after?: DiagramNode[];
	/** "Try it": run a VS Code command, or go to a Studio tab with a hint. */
	try: { command: string } | { tab: StudioTab; hint: L };
}

const GRAPH_HINT_DRAG: L = {
	ja: 'グラフでノードを別のノードへドラッグすると、Before/After プレビュー付きで実行できます。',
	en: 'Drag a node onto another in the graph to run this with a Before/After preview.',
};
const GRAPH_HINT_SELECT: L = {
	ja: 'グラフでリビジョンを選ぶと、右のインスペクタから実行できます。',
	en: 'Select a revision in the graph, then use the inspector on the right.',
};

export const ATLAS: AtlasCommand[] = [
	{
		id: 'new',
		category: 'basic',
		command: 'jj new',
		summary: { ja: '新しい空の変更を作り、@ をそこへ移す', en: 'Create a new empty change and move @ to it' },
		usage: {
			ja: '次の作業を始めるとき。別のリビジョンの上で作業したいときは jj new <rev>(git switch に近い)。元の変更は退避されるのではなく、元のコミットにそのまま残る。',
			en: 'When you start the next piece of work. Use jj new <rev> to work on top of another revision (close to git switch). Your earlier changes are not stashed: they simply stay in their own commit.',
		},
		options: [
			{ flag: 'jj new <rev>', text: { ja: '指定したリビジョンの上に作る', en: 'create it on top of that revision' } },
			{ flag: 'jj new <A> <B>', text: { ja: '複数の親を持つマージを作る', en: 'create a merge with several parents' } },
			{ flag: '-m <msg>', text: { ja: '説明を同時に付ける', en: 'set the description at the same time' } },
		],
		before: LINE,
		op: { kind: 'new', parents: ['C'] },
		try: { command: 'jj-lens.new' },
	},
	{
		id: 'edit',
		category: 'basic',
		command: 'jj edit <rev>',
		summary: { ja: '過去のリビジョンを @ にして直接編集する', en: 'Make an earlier revision @ and edit it in place' },
		usage: {
			ja: '数個前のコミットを直接直したいとき。ファイルを編集すればそのコミットに入り、子孫は自動でリベースされる。',
			en: 'When you want to fix a commit a few steps back. Your edits go into that commit and its descendants are rebased automatically.',
		},
		options: [],
		before: LINE,
		op: { kind: 'edit', rev: 'A' },
		try: { command: 'jj-lens.edit' },
	},
	{
		id: 'describe',
		category: 'basic',
		command: 'jj describe',
		summary: { ja: '説明文(コミットメッセージ)を書き換える', en: 'Change the description (commit message)' },
		usage: {
			ja: 'いつでも、どのリビジョンにも使える。作業の途中で説明を書いてもよい。',
			en: 'Any time, on any revision. You can describe a change while you are still working on it.',
		},
		options: [
			{ flag: '-r <rev>', text: { ja: '@ 以外のリビジョンを対象にする', en: 'describe a revision other than @' } },
			{ flag: '-m <msg>', text: { ja: 'エディタを開かずに説明を指定', en: 'give the description without an editor' } },
		],
		before: LINE,
		op: { kind: 'describe', rev: 'B' },
		try: { command: 'jj-lens.describe' },
	},
	{
		id: 'commit',
		category: 'basic',
		command: 'jj commit',
		summary: { ja: '@ に説明を付けて確定し、新しい空の @ を作る', en: 'Describe @ and start a new empty @ on top' },
		usage: {
			ja: '「今の変更に説明を付けて次へ進む」をひとまとめに行う。jj describe + jj new と同じ。',
			en: 'Does "describe what I did and move on" in one step. Same as jj describe followed by jj new.',
		},
		options: [{ flag: '-m <msg>', text: { ja: '説明を指定', en: 'the description' } }],
		before: LINE,
		op: { kind: 'commit' },
		try: { command: 'jj-lens.commit' },
	},
	{
		id: 'squash',
		category: 'rewrite',
		command: 'jj squash',
		summary: { ja: '@ の変更を親 (@-) に流し込む', en: 'Move the changes of @ into its parent (@-)' },
		usage: {
			ja: '直前のコミットに修正を混ぜたいとき(git commit --amend 相当)。ファイルを指定すればその分だけ移せる。',
			en: 'When you want to fold a fix into the previous commit (like git commit --amend). Give paths to move only those files.',
		},
		options: [
			{
				flag: '-r <rev>',
				text: { ja: '@ 以外のリビジョンをその親へ統合', en: 'squash another revision into its parent' },
			},
			{ flag: '<paths>', text: { ja: '指定したファイルだけを移す', en: 'move only these files' } },
		],
		before: LINE,
		op: { kind: 'squash', from: 'C', into: 'B' },
		try: { command: 'jj-lens.squash' },
	},
	{
		id: 'squash-into',
		category: 'rewrite',
		command: 'jj squash --from <A> --into <B>',
		summary: {
			ja: '任意のリビジョンから任意のリビジョンへ変更を移す',
			en: 'Move changes from any revision into any other',
		},
		usage: {
			ja: '親以外へ変更を移したいとき。例:@ の修正を 3 つ前のコミットへ直接入れる。',
			en: 'When the destination is not the parent, e.g. putting a fix from @ straight into a commit three steps back.',
		},
		options: [
			{ flag: '--from <rev>', text: { ja: '変更の取り出し元', en: 'where the changes come from' } },
			{ flag: '--into <rev>', text: { ja: '変更の入れ先', en: 'where the changes go' } },
		],
		before: LINE,
		op: { kind: 'squash', from: 'C', into: 'A' },
		try: { tab: 'graph', hint: GRAPH_HINT_DRAG },
	},
	{
		id: 'split',
		category: 'rewrite',
		command: 'jj split <paths>',
		summary: { ja: '1 つのリビジョンを親子 2 つに分ける', en: 'Split one revision into a parent and a child' },
		usage: {
			ja: '1 つのコミットに変更を混ぜすぎたとき。指定したファイルが 1 つ目、残りが 2 つ目に入る。',
			en: 'When one commit does too much. The given files go into the first part, the rest into the second.',
		},
		options: [
			{ flag: '-r <rev>', text: { ja: '分割するリビジョン(既定は @)', en: 'the revision to split (default @)' } },
			{ flag: '-m <msg>', text: { ja: '1 つ目のコミットの説明', en: 'description of the first part' } },
		],
		before: LINE,
		op: { kind: 'split', rev: 'B' },
		try: { command: 'jj-lens.split' },
	},
	{
		id: 'split-parallel',
		category: 'rewrite',
		command: 'jj split --parallel <paths>',
		summary: { ja: '1 つのリビジョンを兄弟 2 つに分ける', en: 'Split one revision into two siblings' },
		usage: {
			ja: '分けた 2 つが互いに依存しないとき。別々の PR にしたい場合に便利。',
			en: 'When the two parts do not depend on each other, e.g. to send them as separate pull requests.',
		},
		options: [
			{ flag: '--parallel', text: { ja: '親子ではなく並列に分ける', en: 'siblings instead of parent and child' } },
		],
		before: LINE,
		op: { kind: 'split', rev: 'B', parallel: true },
		try: { tab: 'graph', hint: GRAPH_HINT_SELECT },
	},
	{
		id: 'absorb',
		category: 'rewrite',
		command: 'jj absorb',
		summary: {
			ja: '@ の変更を、適切な過去コミットへ自動で振り分ける',
			en: 'Distribute the changes of @ into the right earlier commits',
		},
		usage: {
			ja: 'レビュー指摘などで複数のコミットにまたがる修正をしたとき。各行を「その行を最後に変更した祖先」へ吸収させる。',
			en: 'After making fixes that belong to several commits (review feedback, say). Each line goes to the ancestor that last changed it.',
		},
		options: [
			{ flag: '--from <rev>', text: { ja: '振り分け元(既定は @)', en: 'the source (default @)' } },
			{ flag: '--into <revset>', text: { ja: '振り分け先の候補を絞る', en: 'restrict the candidate destinations' } },
		],
		before: LINE,
		op: { kind: 'absorb' },
		try: { command: 'jj-lens.absorb' },
	},
	{
		id: 'abandon',
		category: 'rewrite',
		command: 'jj abandon <rev>',
		summary: { ja: 'リビジョンを捨て、子を親へ繋ぎ直す', en: 'Drop a revision and reattach its children' },
		usage: {
			ja: '不要になった変更を消すとき。子孫は残り、捨てたリビジョンの親の上へリベースされる。',
			en: 'When a change is no longer wanted. Its descendants stay and are rebased onto its parent.',
		},
		options: [],
		before: LINE,
		op: { kind: 'abandon', rev: 'B' },
		try: { command: 'jj-lens.abandon' },
	},
	{
		id: 'restore',
		category: 'rewrite',
		command: 'jj restore <paths>',
		summary: {
			ja: 'ファイルの変更を取り消す(親の内容へ戻す)',
			en: 'Discard changes to files (restore from the parent)',
		},
		usage: {
			ja: '特定のファイルの変更だけをなかったことにしたいとき。',
			en: 'When you want to throw away the changes to particular files only.',
		},
		options: [
			{
				flag: '--changes-in <rev>',
				text: { ja: 'このリビジョンでの変更を取り消す', en: 'discard the changes made in this revision' },
			},
			{
				flag: '--from <rev>',
				text: { ja: 'このリビジョンの内容を取り込む', en: 'take the content from this revision' },
			},
		],
		before: LINE,
		op: { kind: 'restore', rev: 'C' },
		try: { tab: 'graph', hint: GRAPH_HINT_SELECT },
	},
	{
		id: 'rebase-r',
		category: 'move',
		command: 'jj rebase -r <rev> --onto <dest>',
		summary: { ja: 'リビジョン 1 つだけを抜き出して移動する', en: 'Pull out a single revision and move it' },
		usage: {
			ja: 'コミットの順番を入れ替えたいとき、1 つだけ別の場所へ移したいとき。子孫は元の親へ繋ぎ直される。',
			en: 'To reorder commits or move just one elsewhere. Its children are reattached to its old parent.',
		},
		options: [
			{ flag: '-r <rev>', text: { ja: '移動するリビジョン(単体)', en: 'the single revision to move' } },
			{ flag: '--onto <rev>', text: { ja: '移動先の親', en: 'the new parent' } },
			{
				flag: '-A / -B <rev>',
				text: { ja: '指定リビジョンの直後 / 直前に挿入', en: 'insert right after / before a revision' },
			},
		],
		before: LINE,
		op: { kind: 'rebase', mode: 'r', source: 'A', onto: 'C' },
		try: { tab: 'graph', hint: GRAPH_HINT_DRAG },
	},
	{
		id: 'rebase-s',
		category: 'move',
		command: 'jj rebase -s <rev> --onto <dest>',
		summary: { ja: 'リビジョンと、その子孫すべてを移動する', en: 'Move a revision together with all its descendants' },
		usage: {
			ja: '途中から上の積み重ねを丸ごと別の場所へ載せ替えたいとき。',
			en: 'To transplant a stack of commits, from some point upward, onto another place.',
		},
		options: [
			{
				flag: '-s <rev>',
				text: { ja: '移動の起点(子孫も一緒に動く)', en: 'the root of what moves (descendants come along)' },
			},
			{ flag: '--onto <rev>', text: { ja: '移動先の親', en: 'the new parent' } },
		],
		before: FORK,
		op: { kind: 'rebase', mode: 's', source: 'X', onto: 'B' },
		try: { tab: 'graph', hint: GRAPH_HINT_DRAG },
	},
	{
		id: 'rebase-b',
		category: 'move',
		command: 'jj rebase -b <rev> --onto <dest>',
		summary: { ja: 'ブランチ全体を移動する', en: 'Move a whole branch' },
		usage: {
			ja: '最新の main の上へ作業ブランチを載せ直すとき(git rebase main 相当)。ブランチのどのコミットを指定してもよい。',
			en: 'To put your work on top of the latest main (like git rebase main). Any commit of the branch can be named.',
		},
		options: [
			{
				flag: '-b <rev>',
				text: {
					ja: 'このリビジョンを含むブランチ全体(既定は @)',
					en: 'the whole branch containing this revision (default @)',
				},
			},
			{ flag: '--onto <rev>', text: { ja: '移動先の親', en: 'the new parent' } },
		],
		before: FORK,
		op: { kind: 'rebase', mode: 'b', source: 'Y', onto: 'B' },
		try: { tab: 'graph', hint: GRAPH_HINT_DRAG },
	},
	{
		id: 'parallelize',
		category: 'move',
		command: 'jj parallelize <A>::<B>',
		summary: { ja: '直列のコミットを並列の兄弟に並べ替える', en: 'Turn a chain of commits into siblings' },
		usage: {
			ja: '積み重ねたコミットが実は互いに独立していたとき。上にある子は両方を親に持つマージになる。',
			en: 'When stacked commits turn out to be independent. A child above them becomes a merge of both.',
		},
		options: [{ flag: '<A>::<B>', text: { ja: 'A から B までの範囲', en: 'the range from A to B' } }],
		before: LINE,
		op: { kind: 'parallelize', from: 'A', to: 'B' },
		try: { tab: 'graph', hint: GRAPH_HINT_DRAG },
	},
	{
		id: 'duplicate',
		category: 'move',
		command: 'jj duplicate <rev>',
		summary: { ja: '同じ内容で新しい Change ID のコピーを作る', en: 'Copy a revision under a new change ID' },
		usage: {
			ja: '元を残したまま別の案を試したいとき。cherry-pick の代わりにもなる。',
			en: 'To try a variation while keeping the original. Also serves as cherry-pick.',
		},
		options: [{ flag: '--onto <rev>', text: { ja: 'コピーを置く場所を指定', en: 'where to put the copy' } }],
		before: LINE,
		op: { kind: 'duplicate', rev: 'B' },
		try: { command: 'jj-lens.duplicate' },
	},
	{
		id: 'undo',
		category: 'safety',
		command: 'jj undo',
		summary: { ja: '直前の操作を取り消す', en: 'Undo the last operation' },
		usage: {
			ja: 'rebase や squash、abandon を間違えたとき。リポジトリ全体が 1 つ前の状態へ戻る。',
			en: 'After a wrong rebase, squash or abandon. The whole repository goes back one step.',
		},
		options: [],
		before: [node('C', ['A'], WIP, { workingCopy: true }), node('A', ['main'], LOGIN), MAIN],
		after: LINE.map((n) => (n.id === 'B' ? { ...n, mark: 'new' as const } : n)),
		try: { command: 'jj-lens.undo' },
	},
	{
		id: 'op-restore',
		category: 'safety',
		command: 'jj op log / jj op restore <op>',
		summary: {
			ja: '操作履歴を見て、任意の時点へ丸ごと戻す',
			en: 'Browse the operation history and jump back to any point',
		},
		usage: {
			ja: '何手も前に戻りたいとき。op log で時点を探し、op restore でその状態を復元する。復元自体も 1 つの操作として記録される。',
			en: 'To go back several steps. Find the point in op log and restore it; the restore is itself recorded as an operation.',
		},
		options: [{ flag: '<op>', text: { ja: 'op log に表示される操作 ID', en: 'the operation ID shown by op log' } }],
		before: [node('C', ['main'], WIP, { workingCopy: true }), MAIN],
		after: LINE.map((n) => (n.id === 'A' || n.id === 'B' ? { ...n, mark: 'new' as const } : n)),
		try: {
			tab: 'ops',
			hint: {
				ja: 'タイムラインから戻りたい時点を選んでください。',
				en: 'Pick the point to return to on the timeline.',
			},
		},
	},
	{
		id: 'evolog',
		category: 'safety',
		command: 'jj evolog -r <rev>',
		summary: { ja: '1 つの変更が書き換えられてきた履歴を見る', en: 'See how one change has been rewritten' },
		usage: {
			ja: '「このコミット、前はどうなっていた?」を調べるとき。過去の Commit ID が分かれば、そこから内容を取り戻せる。',
			en: 'To answer "what did this commit look like before?". With an old commit ID you can get that content back.',
		},
		options: [{ flag: '-p', text: { ja: '各書き換えの差分も表示', en: 'also show the diff of each rewrite' } }],
		before: [
			node(
				'kxqp',
				['main'],
				{ ja: 'Change kxqp / Commit 9c7e(現在)', en: 'change kxqp / commit 9c7e (now)' },
				{ workingCopy: true },
			),
			MAIN,
		],
		after: [
			node('9c7e', ['5b2d'], { ja: '9c7e:説明を変更', en: '9c7e: reworded' }, { mark: 'changed' }),
			node('5b2d', ['3a1f'], { ja: '5b2d:main の上へリベース', en: '5b2d: rebased onto main' }, { mark: 'changed' }),
			node('3a1f', [], { ja: '3a1f:最初のスナップショット', en: '3a1f: first snapshot' }, { mark: 'changed' }),
		],
		try: { tab: 'graph', hint: GRAPH_HINT_SELECT },
	},
	{
		id: 'bookmark',
		category: 'git',
		command: 'jj bookmark set <name> -r <rev>',
		summary: { ja: 'Bookmark を作る・動かす(delete で削除)', en: 'Create or move a bookmark (delete removes it)' },
		usage: {
			ja: 'PR 用のブランチ名が必要になったとき。コミットを追加した後は、もう一度 set して Bookmark を進める。',
			en: 'When you need a branch name for a pull request. After adding commits, set it again to move it forward.',
		},
		options: [
			{ flag: '-r <rev>', text: { ja: 'Bookmark を置くリビジョン(既定は @)', en: 'where to put it (default @)' } },
			{ flag: 'jj bookmark delete <name>', text: { ja: 'Bookmark を削除', en: 'delete the bookmark' } },
		],
		before: LINE,
		after: LINE.map((n) => (n.id === 'B' ? { ...n, bookmarks: ['feat-api'], mark: 'changed' as const } : n)),
		try: { command: 'jj-lens.bookmarkSet' },
	},
	{
		id: 'git-fetch',
		category: 'git',
		command: 'jj git fetch',
		summary: { ja: 'リモートの最新を取得する', en: 'Fetch the latest from the remote' },
		usage: {
			ja: 'リモートの更新を取り込むとき。作業コピーは動かないので、必要なら jj rebase -b @ --onto main で載せ直す。',
			en: 'To get what is new on the remote. Your working copy does not move; follow up with jj rebase -b @ --onto main if needed.',
		},
		options: [{ flag: '--remote <name>', text: { ja: '取得するリモートを指定', en: 'which remote to fetch from' } }],
		before: [node('C', ['A'], WIP, { workingCopy: true }), node('A', ['main'], LOGIN), MAIN],
		after: [
			node('C', ['A'], WIP, { workingCopy: true }),
			node('A', ['old'], LOGIN),
			node(
				'main',
				['old'],
				{ ja: 'リモートの新しいコミット', en: 'new commit from the remote' },
				{ immutable: true, bookmarks: ['main'], mark: 'new' },
			),
			node('old', [], { ja: '共有済みの履歴', en: 'shared history' }, { immutable: true }),
		],
		try: { command: 'jj-lens.gitFetch' },
	},
	{
		id: 'git-push',
		category: 'git',
		command: 'jj git push --change <rev>',
		summary: { ja: 'Bookmark を自動生成してリモートへ push する', en: 'Create a bookmark automatically and push it' },
		usage: {
			ja: 'ブランチ名を考えずに PR を出したいとき。push-<change id> という Bookmark が作られる。既存の Bookmark を送るなら --bookmark <name>。',
			en: 'To open a pull request without inventing a branch name: a bookmark push-<change id> is created. Use --bookmark <name> for an existing one.',
		},
		options: [
			{
				flag: '--change <rev>',
				text: {
					ja: 'このリビジョン用の Bookmark を作って push',
					en: 'create a bookmark for this revision and push it',
				},
			},
			{ flag: '--bookmark <name>', text: { ja: '既存の Bookmark を push', en: 'push an existing bookmark' } },
		],
		before: LINE,
		after: LINE.map((n) =>
			n.id === 'B' ? { ...n, bookmarks: ['push-kxqp', 'push-kxqp@origin'], mark: 'changed' as const } : n,
		),
		try: { command: 'jj-lens.gitPushRevision' },
	},
];

// ---------------------------------------------------------------------------
// Git comparison, recipes and revsets
// ---------------------------------------------------------------------------

export interface GitComparison {
	goal: L;
	git: string;
	jj: string;
	note: L;
	/** Atlas card that illustrates the jj side. */
	atlas?: string;
}

export const GIT_COMPARISON: GitComparison[] = [
	{
		goal: { ja: '作業を一時退避して別作業へ', en: 'Set work aside and do something else' },
		git: 'git stash → git switch <branch> → … → git stash pop',
		jj: 'jj new <target> → … → jj edit <change_id>',
		note: {
			ja: 'jj new は stash の言い換えではない。@ はすでにコミットなので退避という手順自体がなくなる。変更は元のコミットに残り、jj edit <change_id> でそこへ戻る',
			en: 'jj new is not a stash. Because @ is already a commit, the stashing step disappears: your changes stay in their commit, and jj edit <change_id> takes you back to it',
		},
		atlas: 'new',
	},
	{
		goal: { ja: '直前のコミットに修正を混ぜる', en: 'Add a fix to the previous commit' },
		git: 'git add -p && git commit --amend',
		jj: 'jj squash',
		note: {
			ja: '@ の変更を親 @- に流し込む(ファイル指定も可)',
			en: 'Moves the changes of @ into its parent @- (paths can be given)',
		},
		atlas: 'squash',
	},
	{
		goal: { ja: '3つ前のコミットを直接直す', en: 'Fix a commit three steps back' },
		git: 'git rebase -i HEAD~4',
		jj: 'jj edit <change_id> / jj squash --into <change_id>',
		note: {
			ja: '子孫は自動でリベースされるため対話的リベース不要',
			en: 'Descendants are rebased automatically; no interactive rebase',
		},
		atlas: 'edit',
	},
	{
		goal: { ja: '変更を適切な過去コミットへ自動振り分け', en: 'Send fixes to the right earlier commits' },
		git: 'git commit --fixup + autosquash',
		jj: 'jj absorb',
		note: {
			ja: '変更した行を最後に触った祖先コミットへ自動吸収',
			en: 'Each line is absorbed by the ancestor that last touched it',
		},
		atlas: 'absorb',
	},
	{
		goal: { ja: 'コミットを2つに分割する', en: 'Split a commit in two' },
		git: 'git reset HEAD~ → git add -p',
		jj: 'jj split',
		note: { ja: 'GUI でファイルを選んで分割可能', en: 'Pick the files in the GUI and split' },
		atlas: 'split',
	},
	{
		goal: { ja: '操作ミスを取り消す', en: 'Undo a mistake' },
		git: 'git reflog → git reset --hard',
		jj: 'jj undo / jj op restore',
		note: {
			ja: 'リポジトリ全体の状態履歴から安全に1コマンドで復元',
			en: 'One command restores the whole repository from its operation history',
		},
		atlas: 'undo',
	},
	{
		goal: { ja: 'PR 用のブランチを作って Push', en: 'Create a branch for a PR and push' },
		git: 'git switch -c feat && git push -u',
		jj: 'jj git push --change @ / jj bookmark set',
		note: {
			ja: '自動生成ブックマークまたは任意名で即 Push',
			en: 'Push right away with a generated or a chosen bookmark name',
		},
		atlas: 'git-push',
	},
];

export interface RecipeStep {
	text: L;
	cli?: string;
	/** Runs a VS Code command, or sends the user to a Studio tab with a hint. */
	run?: { command: string } | { tab: StudioTab; hint: L };
}

export interface Recipe {
	id: string;
	title: L;
	steps: RecipeStep[];
}

export const RECIPES: Recipe[] = [
	{
		id: 'commit',
		title: { ja: '今の変更に説明をつけて次の作業に進みたい', en: 'Describe what I did and move on' },
		steps: [
			{
				text: {
					ja: 'ファイルを保存する(git add は不要。変更はもう @ に入っている)',
					en: 'Save your files (no git add; the changes are already in @)',
				},
			},
			{
				text: { ja: '説明を付けて、新しい空の @ を作る', en: 'Describe it and start a new empty @' },
				cli: 'jj commit -m "説明"',
				run: { command: 'jj-lens.commit' },
			},
		],
	},
	{
		id: 'amend',
		title: {
			ja: '直前のコミット (@-) に今の変更を混ぜたい',
			en: 'Fold my current changes into the previous commit (@-)',
		},
		steps: [
			{
				text: { ja: '@ の変更をすべて親へ流し込む', en: 'Move everything in @ into its parent' },
				cli: 'jj squash',
				run: { command: 'jj-lens.squash' },
			},
			{
				text: {
					ja: '一部のファイルだけ混ぜたいなら、グラフで @ を選び、ファイルにチェックして「移動」',
					en: 'For only some files: select @ in the graph, tick the files and press Move',
				},
				cli: 'jj squash <paths>',
				run: { tab: 'graph', hint: GRAPH_HINT_SELECT },
			},
		],
	},
	{
		id: 'edit-old',
		title: { ja: '数個前のコミットに戻って直接ファイルを修正したい', en: 'Go back a few commits and fix files there' },
		steps: [
			{
				text: { ja: '直したいコミットを @ にする', en: 'Make that commit the working copy' },
				cli: 'jj edit <change_id>',
				run: { command: 'jj-lens.edit' },
			},
			{
				text: {
					ja: 'ファイルを直して保存。子孫は自動でリベースされる',
					en: 'Fix and save the files. Descendants are rebased automatically',
				},
			},
			{
				text: {
					ja: '元の場所へ戻る(戻りたいコミットの上に新しい @ を作る)',
					en: 'Go back (start a new @ on top of where you were)',
				},
				cli: 'jj new <change_id>',
				run: { tab: 'graph', hint: GRAPH_HINT_SELECT },
			},
		],
	},
	{
		id: 'split',
		title: {
			ja: '1つのコミットに混ぜすぎた変更をファイル単位で2つに分けたい',
			en: 'Split a commit that does too much, file by file',
		},
		steps: [
			{
				text: {
					ja: 'グラフでコミットを選び、分けたいファイルにチェックして「分割」',
					en: 'Select the commit in the graph, tick the files to separate, press Split',
				},
				cli: 'jj split -r <change_id> <paths>',
				run: { tab: 'graph', hint: GRAPH_HINT_SELECT },
			},
			{
				text: { ja: 'または、ファイルを選ぶピッカーから分割する', en: 'Or split @ from a file picker' },
				cli: 'jj split <paths>',
				run: { command: 'jj-lens.split' },
			},
		],
	},
	{
		id: 'absorb',
		title: {
			ja: '複数の変更をどの過去コミットに入れるか自動で振り分けたい',
			en: 'Let jj decide which earlier commits my fixes belong to',
		},
		steps: [
			{
				text: { ja: '@ で修正をまとめて行い、保存する', en: 'Make all the fixes in @ and save' },
			},
			{
				text: {
					ja: '各行を、その行を最後に変更した祖先コミットへ吸収させる',
					en: 'Absorb each line into the ancestor that last changed it',
				},
				cli: 'jj absorb',
				run: { command: 'jj-lens.absorb' },
			},
			{
				text: {
					ja: '振り分け先が決まらなかった変更は @ に残る。jj squash --into で手動で入れる',
					en: 'Changes with no clear destination stay in @; place them with jj squash --into',
				},
			},
		],
	},
	{
		id: 'undo',
		title: {
			ja: '間違えて Rebase / Squash してしまったので元に戻したい',
			en: 'I rebased or squashed by mistake and want it back',
		},
		steps: [
			{
				text: { ja: '直前の 1 手を取り消す', en: 'Undo the last step' },
				cli: 'jj undo',
				run: { command: 'jj-lens.undo' },
			},
			{
				text: {
					ja: 'もっと前へ戻るなら、操作タイムラインで時点を選んで「この時点に戻す」',
					en: 'To go further back, pick a point on the Operations Timeline and restore it',
				},
				cli: 'jj op restore <op_id>',
				run: {
					tab: 'ops',
					hint: {
						ja: '戻りたい時点の「この時点に戻す」を押してください。',
						en: 'Press "Restore to Here" on the point you want.',
					},
				},
			},
		],
	},
	{
		id: 'push',
		title: { ja: 'GitHub に Pull Request を出すために Push したい', en: 'Push so I can open a pull request on GitHub' },
		steps: [
			{
				text: { ja: '最新を取得し、必要なら main の上へ載せ直す', en: 'Fetch, and rebase onto main if needed' },
				cli: 'jj git fetch && jj rebase -b @ --onto main',
				run: { command: 'jj-lens.gitFetch' },
			},
			{
				text: {
					ja: 'Push する。Bookmark がなければ自動で作られる',
					en: 'Push. A bookmark is created if there is none',
				},
				cli: 'jj git push --change <change_id>',
				run: { command: 'jj-lens.gitPushRevision' },
			},
			{
				text: {
					ja: 'レビュー後にコミットを直したら、同じ Bookmark をもう一度 Push する(force push は自動)',
					en: 'After fixing commits in review, push the same bookmark again (the force push is automatic)',
				},
				cli: 'jj git push --bookmark <name>',
			},
		],
	},
];

export interface RevsetEntry {
	expr: string;
	meaning: L;
}

export const REVSETS: RevsetEntry[] = [
	{ expr: '@', meaning: { ja: '作業コピー', en: 'the working copy' } },
	{ expr: '@-', meaning: { ja: '作業コピーの親', en: 'the parent of the working copy' } },
	{ expr: '@--', meaning: { ja: '作業コピーの祖父母', en: 'the grandparent of the working copy' } },
	{
		expr: 'trunk()',
		meaning: { ja: 'メインブランチ(main / master)の先頭', en: 'the head of the main branch (main / master)' },
	},
	{
		expr: 'trunk()..@',
		meaning: { ja: 'メインブランチから現在までの自分の変更', en: 'your changes between the main branch and @' },
	},
	{ expr: 'mine()', meaning: { ja: '自分が author のコミット', en: 'commits you authored' } },
	{ expr: 'conflicts()', meaning: { ja: 'コンフリクト中のコミット', en: 'commits with conflicts' } },
	{ expr: 'empty()', meaning: { ja: '変更のない空コミット', en: 'commits with no changes' } },
	{ expr: 'mutable()', meaning: { ja: '書き換え可能な(未共有の)コミット', en: 'commits you may still rewrite' } },
	{ expr: 'heads(all())', meaning: { ja: 'すべての枝の先頭', en: 'the head of every branch' } },
	{ expr: 'ancestors(@, 5)', meaning: { ja: '@ から 5 世代分の祖先', en: '@ and its ancestors, 5 generations deep' } },
	{ expr: 'bookmarks()', meaning: { ja: 'Bookmark が付いているコミット', en: 'commits that carry a bookmark' } },
	{ expr: 'all()', meaning: { ja: 'すべてのコミット', en: 'every commit' } },
];

/** One-click revset chips above the graph. An empty expression is jj's default. */
export const REVSET_CHIPS: string[] = ['', 'trunk()..@', 'mine()', 'all()', 'conflicts()', 'mutable()'];
