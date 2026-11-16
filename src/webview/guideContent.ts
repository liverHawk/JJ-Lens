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
