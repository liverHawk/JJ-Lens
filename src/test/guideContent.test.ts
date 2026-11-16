import * as assert from 'assert';
import { simulate } from '../jj/graph';
import {
	ATLAS,
	ATLAS_CATEGORIES,
	cliNotes,
	CLI_NOTES,
	CONCEPTS,
	formatCli,
	GIT_COMPARISON,
	GUIDE_LINKS,
	L,
	localizeNodes,
	QUICK_ACTIONS,
	RECIPES,
	REVSETS,
	TAB_TITLES,
	UI,
} from '../webview/guideContent';

/** Every `{ja, en}` pair anywhere inside `value`. */
function localized(value: unknown, found: L[] = []): L[] {
	if (Array.isArray(value)) {
		value.forEach((item) => localized(item, found));
	} else if (typeof value === 'object' && value !== null) {
		const record = value as Record<string, unknown>;
		if (typeof record.ja === 'string' && typeof record.en === 'string') {
			found.push(record as unknown as L);
		} else {
			Object.values(record).forEach((item) => localized(item, found));
		}
	}
	return found;
}

suite('guide content', () => {
	test('every text has both Japanese and English', () => {
		const all = localized([
			UI,
			CLI_NOTES,
			TAB_TITLES,
			QUICK_ACTIONS,
			GUIDE_LINKS,
			CONCEPTS,
			ATLAS,
			ATLAS_CATEGORIES,
			GIT_COMPARISON,
			RECIPES,
			REVSETS,
		]);
		assert.ok(all.length > 300);
		for (const text of all) {
			assert.ok(text.ja.trim() && text.en.trim(), `missing translation: ${JSON.stringify(text)}`);
		}
	});

	test('the atlas covers every command of the plan, each with a diagram', () => {
		const ids = ATLAS.map((entry) => entry.id);
		assert.strictEqual(new Set(ids).size, ids.length);
		for (const id of [
			'new',
			'edit',
			'describe',
			'commit',
			'squash',
			'squash-into',
			'split',
			'split-parallel',
			'absorb',
			'abandon',
			'restore',
			'rebase-r',
			'rebase-s',
			'rebase-b',
			'parallelize',
			'duplicate',
			'undo',
			'op-restore',
			'evolog',
			'bookmark',
			'git-fetch',
			'git-push',
		]) {
			assert.ok(ids.includes(id), `no atlas entry for ${id}`);
		}
		for (const entry of ATLAS) {
			assert.ok(entry.op || entry.after, `${entry.id} has no After diagram`);
			if (entry.op) {
				const after = simulate(localizeNodes('ja', entry.before), entry.op);
				assert.ok(
					after.some((n) => n.mark),
					`${entry.id}: the simulation highlights nothing`,
				);
			}
		}
	});

	test('five concepts, seven comparisons and seven recipes', () => {
		assert.strictEqual(CONCEPTS.length, 5);
		assert.strictEqual(GIT_COMPARISON.length, 7);
		assert.strictEqual(RECIPES.length, 7);
		const atlasIds = new Set(ATLAS.map((entry) => entry.id));
		for (const row of GIT_COMPARISON) {
			assert.ok(!row.atlas || atlasIds.has(row.atlas), `unknown atlas link ${row.atlas}`);
		}
		for (const expr of ['@', '@-', '@--', 'trunk()', 'trunk()..@', 'mine()', 'conflicts()', 'empty()']) {
			assert.ok(REVSETS.some((entry) => entry.expr === expr));
		}
	});

	test('cliNotes explains the subcommand and each option', () => {
		const notes = cliNotes('en', 'jj rebase -s rsnlszuy --onto tsnllovt');
		assert.strictEqual(notes.length, 3);
		assert.ok(notes[0].startsWith('jj rebase'));
		assert.ok(notes[1].startsWith('-s (--source)'));
		assert.ok(notes[2].startsWith('--onto'));
		assert.ok(cliNotes('ja', 'jj rebase -r a --onto b')[1].includes('だけ'));
		assert.ok(cliNotes('en', 'jj git push --change abc')[0].startsWith('jj git push'));
		assert.strictEqual(cliNotes('en', 'jj git push --change abc').length, 2);
		assert.strictEqual(cliNotes('en', "jj describe -r abc -m 'x'").length, 3);
		assert.deepStrictEqual(cliNotes('en', 'jj frobnicate --hard'), []);
	});

	test('formatCli quotes what a shell would split', () => {
		assert.strictEqual(formatCli(['rebase', '-s', 'abc', '--onto', 'def']), 'jj rebase -s abc --onto def');
		assert.strictEqual(formatCli(['describe', '--message=fix: it']), "jj describe -m 'fix: it'");
		assert.strictEqual(formatCli(['split', 'root-file:"a b.txt"']), `jj split 'root-file:"a b.txt"'`);
		assert.strictEqual(formatCli(['commit', "--message=it's"]), `jj commit -m 'it'\\''s'`);
		assert.strictEqual(formatCli(['parallelize', 'a::b']), 'jj parallelize a::b');
	});
});
