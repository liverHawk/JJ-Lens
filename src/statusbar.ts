import * as vscode from 'vscode';
import { Revision, subject } from './jj/parse';

const MAX_SUBJECT = 40;

/** The status bar text for the working copy, e.g. `jj: @ rsnlszuy "feat: …"`. */
export function statusText(rev: Revision): string {
	const title = subject(rev.description);
	const short = title.length > MAX_SUBJECT ? `${title.slice(0, MAX_SUBJECT - 1)}…` : title;
	return `$(git-branch) jj: @ ${rev.changeId.slice(0, 8)}${short ? ` "${short}"` : ''}`;
}

/** Shows the working copy in the status bar; clicking it opens JJ Lens Studio. */
export class StatusBar implements vscode.Disposable {
	private readonly item = vscode.window.createStatusBarItem('jj-lens.status', vscode.StatusBarAlignment.Left, 100);

	constructor() {
		this.item.name = 'JJ Lens';
		this.item.command = 'jj-lens.openStudio';
	}

	update(rev: Revision | undefined): void {
		if (!rev) {
			this.item.hide();
			return;
		}
		this.item.text = statusText(rev);
		this.item.backgroundColor = rev.conflict ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
		const tooltip = new vscode.MarkdownString();
		tooltip.appendMarkdown(`**Working copy** \`${rev.changeId}\` (commit \`${rev.commitId}\`)\n\n`);
		tooltip.appendText(rev.description.trim() || '(no description set)');
		tooltip.appendMarkdown(
			`\n\n${rev.conflict ? '$(warning) Conflicts · ' : ''}${rev.empty ? 'Empty · ' : ''}Click to open JJ Lens Studio`,
		);
		tooltip.supportThemeIcons = true;
		this.item.tooltip = tooltip;
		this.item.show();
	}

	dispose(): void {
		this.item.dispose();
	}
}
