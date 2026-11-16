import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
	DIFF_TEMPLATE,
	displayBookmarks,
	fileset,
	jsonTemplate,
	LOG_TEMPLATE,
	OP_TEMPLATE,
	parseDiff,
	parseLog,
	parseOpLog,
	relativeTime,
	replaceSubject,
	revId,
	subject,
} from '../jj/parse';

suite('jj output parsing', () => {
	test('jsonTemplate builds one JSON object per line', () => {
		assert.strictEqual(
			jsonTemplate({ a: 'x', b: 'y.z()' }),
			'"{" ++ "\\"a\\":" ++ json(x) ++ ",\\"b\\":" ++ json(y.z()) ++ "}\\n"',
		);
	});

	test('parseLog reads revisions and keeps multi-line descriptions', () => {
		const line = JSON.stringify({
			changeId: 'rsnlszuyzlro',
			changePrefix: 'r',
			commitId: '29a90b998f3d',
			description: 'subject\n\nbody\n',
			authorName: 'A',
			authorEmail: 'a@example.com',
			timestamp: '2026-11-16T18:32:18+09:00',
			localBookmarks: ['main'],
			remoteBookmarks: ['main@origin', 'main@git', 'other@origin'],
			tags: [],
			parents: ['90f70292ec29'],
			workingCopy: true,
			immutable: false,
			conflict: false,
			empty: false,
			divergent: false,
			root: false,
		});
		const [rev, ...rest] = parseLog(`${line}\n\n`);
		assert.strictEqual(rest.length, 0);
		assert.strictEqual(rev.changeId, 'rsnlszuyzlro');
		assert.strictEqual(subject(rev.description), 'subject');
		assert.deepStrictEqual(displayBookmarks(rev), ['main', 'other@origin']);
		assert.strictEqual(revId(rev), 'rsnlszuyzlro');
		assert.strictEqual(revId({ ...rev, divergent: true }), '29a90b998f3d');
	});

	test('parseDiff and parseOpLog', () => {
		assert.deepStrictEqual(parseDiff('{"status":"renamed","source":"a.ts","target":"b.ts"}\n'), [
			{ status: 'renamed', source: 'a.ts', target: 'b.ts' },
		]);
		assert.strictEqual(parseOpLog('').length, 0);
	});

	test('replaceSubject keeps the body', () => {
		assert.strictEqual(replaceSubject('old\n\nbody\n', 'new'), 'new\n\nbody');
		assert.strictEqual(replaceSubject('old\n', 'new'), 'new');
		assert.strictEqual(replaceSubject('', 'new'), 'new');
	});

	test('fileset quotes paths', () => {
		assert.strictEqual(fileset('src/a "b".ts'), 'root-file:"src/a \\"b\\".ts"');
	});

	test('relativeTime', () => {
		const now = new Date('2026-11-16T12:00:00Z');
		assert.strictEqual(relativeTime('2026-11-16T11:59:57Z', now), 'just now');
		assert.strictEqual(relativeTime('2026-11-16T11:59:00Z', now), '1 minute ago');
		assert.strictEqual(relativeTime('2026-11-16T09:00:00Z', now), '3 hours ago');
		assert.strictEqual(relativeTime('2026-11-14T12:00:00Z', now), '2 days ago');
		assert.strictEqual(relativeTime('2024-11-16T12:00:00Z', now), '2 years ago');
	});
});

suite('templates against the real jj CLI', function () {
	let dir: string;
	const jj = (...args: string[]) =>
		execFileSync('jj', ['--no-pager', '--color', 'never', ...args], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });

	suiteSetup(function () {
		try {
			execFileSync('jj', ['--version'], { stdio: 'pipe' });
		} catch {
			this.skip();
		}
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jj-lens-test-'));
		jj('git', 'init');
		fs.writeFileSync(path.join(dir, 'a b.txt'), 'one\n');
		jj('describe', '--message=first\n\nbody');
		jj('bookmark', 'set', 'feature', '-r', '@');
		jj('new', '--message=second');
		fs.renameSync(path.join(dir, 'a b.txt'), path.join(dir, 'c.txt'));
		fs.writeFileSync(path.join(dir, 'new.txt'), 'new\n');
	});

	suiteTeardown(() => {
		if (dir) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	test('log template', () => {
		const revs = parseLog(jj('log', '--no-graph', '-r', 'all()', '-T', LOG_TEMPLATE));
		assert.deepStrictEqual(
			revs.map((r) => subject(r.description)),
			['second', 'first', ''],
		);
		const [second, first, root] = revs;
		assert.ok(second.workingCopy && !second.empty && !second.immutable);
		assert.deepStrictEqual(second.parents, [first.commitId]);
		assert.deepStrictEqual(first.localBookmarks, ['feature']);
		assert.strictEqual(first.description, 'first\n\nbody\n');
		assert.ok(root.root && root.immutable);
	});

	test('diff template and file contents', () => {
		const changes = parseDiff(jj('diff', '-r', '@', '-T', DIFF_TEMPLATE));
		assert.deepStrictEqual(
			changes.map((c) => [c.status, c.source, c.target]),
			[
				['renamed', 'a b.txt', 'c.txt'],
				['added', 'new.txt', 'new.txt'],
			],
		);
		assert.strictEqual(jj('file', 'show', '-r', '@-', fileset('a b.txt')), 'one\n');
	});

	test('operation log template', () => {
		const ops = parseOpLog(jj('op', 'log', '--no-graph', '-T', OP_TEMPLATE));
		assert.ok(ops.length > 1);
		assert.ok(ops[0].current);
		assert.ok(ops.every((op) => /^[0-9a-f]{12}$/.test(op.id)));
	});
});
