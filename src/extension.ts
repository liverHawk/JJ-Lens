import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { Jj } from './jj/cli';
import { Repository } from './repository';
import { CONTENT_SCHEME, ContentProvider, LogProvider, OperationProvider } from './views';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const output = vscode.window.createOutputChannel('JJ Lens');
	const jj = new Jj(
		() => vscode.workspace.getConfiguration('jj-lens').get('jjPath', 'jj') || 'jj',
		(line) => output.appendLine(line),
	);

	let repo: Repository | undefined;
	const getRepo = () => repo;

	const logProvider = new LogProvider(getRepo);
	const opProvider = new OperationProvider(getRepo);
	const logView = vscode.window.createTreeView('jj-lens.log', { treeDataProvider: logProvider });
	const opView = vscode.window.createTreeView('jj-lens.operations', { treeDataProvider: opProvider });

	const refresh = () => {
		logView.description = vscode.workspace.getConfiguration('jj-lens').get('revset', '') || undefined;
		logProvider.refresh();
		opProvider.refresh();
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
		refresh();
	};

	context.subscriptions.push(
		output,
		logView,
		opView,
		{ dispose: () => repo?.dispose() },
		vscode.workspace.registerTextDocumentContentProvider(CONTENT_SCHEME, new ContentProvider(getRepo)),
		registerCommands({ repo: getRepo, log: logProvider, refresh, output }),
		vscode.workspace.onDidChangeWorkspaceFolders(detectRepository),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('jj-lens.jjPath')) {
				void detectRepository();
			} else if (event.affectsConfiguration('jj-lens')) {
				refresh();
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
