import * as assert from 'assert';
import * as vscode from 'vscode';

const studioTabs = () =>
	vscode.window.tabGroups.all
		.flatMap((group) => group.tabs)
		.filter((tab) => tab.input instanceof vscode.TabInputWebview && tab.label === 'JJ Lens Studio');

suite('Extension', () => {
	test('activates and registers every contributed command', async () => {
		const extension = vscode.extensions.all.find((e) => e.packageJSON.name === 'jj-lens');
		assert.ok(extension, 'extension not found');
		await extension.activate();

		const registered = new Set(await vscode.commands.getCommands(true));
		const contributed: { command: string }[] = extension.packageJSON.contributes.commands;
		assert.ok(contributed.length > 0);
		for (const { command } of contributed) {
			assert.ok(registered.has(command), `${command} is contributed but not registered`);
		}
	});

	test('JJ Lens Studio opens as an editor tab, on any of its tabs', async () => {
		await vscode.commands.executeCommand('jj-lens.openStudio');
		await vscode.commands.executeCommand('jj-lens.openGuideTopic', 'recipes', 'revsets');
		// The tab model updates asynchronously after the panel is created.
		for (let attempt = 0; attempt < 40 && !studioTabs().length; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		const studio = studioTabs();
		assert.strictEqual(studio.length, 1, 'opening twice reuses the panel');
		assert.ok(studio[0].input instanceof vscode.TabInputWebview);
	});
});
