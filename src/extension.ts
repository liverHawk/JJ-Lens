import * as vscode from 'vscode';
import { CommandContext, registerCommands } from './commands';
import { Jj } from './jj/cli';
import { Revision } from './jj/parse';
import { Repository } from './repository';
import { StatusBar } from './statusbar';
import { CONTENT_SCHEME, ContentProvider, GuideProvider, WorkingCopyProvider } from './views';
import { Lang } from './webview/guideContent';

const LANG_KEY = 'jj-lens.lang';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const output = vscode.window.createOutputChannel('JJ Lens');
	const jj = new Jj(
		() => vscode.workspace.getConfiguration('jj-lens').get('jjPath', 'jj') || 'jj',
		(line) => output.appendLine(line),
	);

	let repo: Repository | undefined;
	const getRepo = () => repo;
	// Japanese is the default; the Studio header switches it.
	const getLang = (): Lang => (context.globalState.get<string>(LANG_KEY) === 'en' ? 'en' : 'ja');

	const workingCopyProvider = new WorkingCopyProvider(getRepo, getLang);
	const guideProvider = new GuideProvider(getLang);
	const workingCopyView = vscode.window.createTreeView('jj-lens.workingCopy', {
		treeDataProvider: workingCopyProvider,
	});
	const guideView = vscode.window.createTreeView('jj-lens.guide', { treeDataProvider: guideProvider });
	const statusBar = new StatusBar();

	let generation = 0;
	const refresh = async () => {
		const current = ++generation;
		let workingCopy: Revision | undefined;
		try {
			workingCopy = await repo?.workingCopy();
		} catch (error) {
			output.appendLine(String(error));
		}
		if (current !== generation) {
			return;
		}
		workingCopyProvider.update(workingCopy);
		statusBar.update(workingCopy);
	};

	const detectRepository = async () => {
		repo?.dispose();
		repo = undefined;
		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			if (folder.uri.scheme !== 'file') {
				continue;
			}
			const root = await Repository.detect(jj, folder.uri.fsPath);
			if (root) {
				repo = new Repository(root, jj);
				repo.onDidChange(refresh);
				break;
			}
		}
		await vscode.commands.executeCommand('setContext', 'jj-lens.hasRepo', repo !== undefined);
		await refresh();
	};

	const commandContext: CommandContext = {
		repo: getRepo,
		revisions: async () => {
			const config = vscode.workspace.getConfiguration('jj-lens');
			return (await repo?.log(config.get('revset', ''), config.get('logLimit', 200))) ?? [];
		},
		refresh: () => void refresh(),
		output,
		openStudio: () => {
			void vscode.window.showInformationMessage('JJ Lens Studio is not available yet.');
		},
	};

	context.subscriptions.push(
		output,
		workingCopyView,
		guideView,
		statusBar,
		{ dispose: () => repo?.dispose() },
		vscode.workspace.registerTextDocumentContentProvider(CONTENT_SCHEME, new ContentProvider(getRepo)),
		registerCommands(commandContext),
		vscode.workspace.onDidChangeWorkspaceFolders(detectRepository),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('jj-lens.jjPath')) {
				void detectRepository();
			} else if (event.affectsConfiguration('jj-lens')) {
				void refresh();
			}
		}),
		// jj only notices working-copy edits when a command runs, so nudge it on save and refocus.
		vscode.workspace.onDidSaveTextDocument((document) => {
			if (repo?.contains(document.uri)) {
				repo.notifyChanged();
			}
		}),
		vscode.window.onDidChangeWindowState((state) => {
			if (state.focused) {
				repo?.notifyChanged();
			}
		}),
	);

	await detectRepository();
}

export function deactivate(): void {}
