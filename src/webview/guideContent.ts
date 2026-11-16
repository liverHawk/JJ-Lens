// Bilingual (Japanese / English) text and data for JJ Lens: sidebar labels,
// concept explanations, the command atlas, recipes and cheat sheets.
// This file must not import 'vscode' so it stays unit-testable in isolation.

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
	const sub = two in CLI_NOTES ? two : tokens[0];
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
