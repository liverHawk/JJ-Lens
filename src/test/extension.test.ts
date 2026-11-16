import * as assert from 'assert';
import * as vscode from 'vscode';

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
});
