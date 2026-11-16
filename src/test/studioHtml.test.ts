import * as assert from 'assert';
import { Revision } from '../jj/parse';
import { ATLAS, CONCEPTS, RECIPES, REVSETS } from '../webview/guideContent';
import {
	changeIdHtml,
	esc,
	renderAtlas,
	renderGraph,
	renderGraphSvg,
	renderHeader,
	renderInspector,
	renderOperations,
	renderPairMenu,
	renderPreview,
	renderRecipes,
	renderShell,
	revisionNodes,
} from '../webview/studioHtml';

function rev(changeId: string, commitId: string, parents: string[], extra: Partial<Revision> = {}): Revision {
	return {
		changeId,
		changePrefix: changeId.slice(0, 2),
		commitId,
		description: `${changeId} subject\n`,
		authorName: 'A <script>',
		authorEmail: 'a@example.com',
		timestamp: '2026-11-16T18:32:18+09:00',
		localBookmarks: [],
		remoteBookmarks: [],
		tags: [],
		parents,
		workingCopy: false,
		immutable: false,
		conflict: false,
		empty: false,
		divergent: false,
		root: false,
		...extra,
	};
}

const REVS = [
	rev('rsnlszuyzlro', 'c3', ['c2'], { workingCopy: true, localBookmarks: ['feat'], remoteBookmarks: ['feat@origin'] }),
	rev('tsnllovtkopq', 'c2', ['c1'], { conflict: true }),
	rev('zqkwnrnytumz', 'c1', ['c0'], { immutable: true, remoteBookmarks: ['main@origin'] }),
];

const count = (html: string, needle: string): number => html.split(needle).length - 1;

suite('studio rendering', () => {
	test('esc neutralises markup', () => {
		assert.strictEqual(esc(`<a href="x">&'`), '&#60;a href=&#34;x&#34;&#62;&#38;&#39;');
	});

	test('the shell has every region and a strict CSP', () => {
		const html = renderShell({
			cspSource: 'vscode-resource:',
			nonce: 'N0NCE',
			scriptUri: 's.js',
			styleUri: 's.css',
			lang: 'ja',
		});
		for (const id of ['header', 'graph', 'inspector', 'tab-ops', 'tab-atlas', 'tab-recipes', 'clibar', 'modal']) {
			assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
		}
		assert.ok(html.includes(`script-src 'nonce-N0NCE'`));
		assert.ok(!html.includes('unsafe-inline'));
	});

	test('nothing rendered uses inline styles or handlers (the CSP would block them)', () => {
		const all = [
			renderHeader('ja', '/repo'),
			renderGraph({ lang: 'ja', revset: '', revisions: REVS, selected: 'c3' }),
			renderInspector({ lang: 'ja', rev: REVS[0], files: [], evolog: [], revisions: REVS }),
			renderOperations('ja', []),
			renderAtlas('ja'),
			renderRecipes('ja'),
		].join('');
		assert.ok(!/\sstyle="/.test(all));
		assert.ok(!/\son[a-z]+="/.test(all));
	});

	test('change ids emphasise the shortest unique prefix', () => {
		assert.strictEqual(changeIdHtml(REVS[0]), '<span class="cid"><b>rs</b>nlszuy</span>');
	});

	test('the header offers both languages and four tabs', () => {
		const html = renderHeader('en', '/repo');
		assert.strictEqual(count(html, 'class="tab-btn"'), 4);
		assert.ok(html.includes('日本語') && html.includes('English'));
		assert.ok(html.includes('data-cli="jj absorb"'));
	});

	test('the graph draws one row and one node per revision, with badges', () => {
		const html = renderGraph({ lang: 'en', revset: 'mine()', revisions: REVS, selected: 'c2' });
		assert.strictEqual(count(html, 'draggable="true"'), 3);
		assert.strictEqual(count(html, 'class="row selected'), 1);
		assert.ok(html.includes('class="wc-ring"'), 'working copy ring');
		assert.ok(html.includes('class="lock-body"'), 'immutable lock');
		assert.ok(html.includes('class="node conflict"'), 'conflict badge');
		assert.ok(html.includes('<span class="pill bm">feat</span>'));
		assert.ok(html.includes('<span class="pill remote">main@origin</span>'));
		assert.ok(!html.includes('feat@origin'), 'a remote that mirrors a local bookmark is hidden');
		assert.ok(html.includes('class="chip active"'));
		assert.ok(html.includes('A &#60;script&#62;'), 'author names are escaped');
		// The parent of the last revision is not loaded, so its edge is a stub.
		assert.strictEqual(count(html, 'missing"'), 1);
	});

	test('the graph reports errors and empty results', () => {
		assert.ok(
			renderGraph({ lang: 'en', revset: 'x(', revisions: [], error: 'bad <revset>' }).includes('bad &#60;revset&#62;'),
		);
		assert.ok(renderGraph({ lang: 'ja', revset: 'none()', revisions: [] }).includes('empty-state'));
	});

	test('the inspector offers description, file, bookmark and evolog tools', () => {
		const html = renderInspector({
			lang: 'en',
			rev: REVS[0],
			files: [
				{ status: 'modified', source: 'a.ts', target: 'a.ts' },
				{ status: 'renamed', source: 'b.ts', target: 'c.ts' },
			],
			evolog: [
				{
					commitId: 'c3',
					changeId: 'rsnlszuyzlro',
					description: '',
					authorName: 'A',
					timestamp: '2026-11-16T18:32:18+09:00',
					empty: false,
					conflict: false,
					operationId: 'op1',
					operationDescription: 'describe commit',
				},
			],
			revisions: REVS,
		});
		assert.ok(html.includes('<textarea name="message"'));
		assert.strictEqual(count(html, 'type="checkbox" name="files"'), 2);
		assert.ok(html.includes('b.ts → c.ts'));
		for (const type of ['describe', 'commit', 'split', 'moveFiles', 'restoreFiles', 'setBookmark', 'pushBookmark']) {
			assert.ok(html.includes(`&#34;type&#34;:&#34;${type}&#34;`), `no ${type} action`);
		}
		// Only mutable revisions other than the selected one can receive files.
		assert.strictEqual(count(html, '<option '), 1);
		assert.ok(html.includes('describe commit'));
	});

	test('an immutable revision cannot be edited from the inspector', () => {
		const html = renderInspector({ lang: 'en', rev: REVS[2], files: [], evolog: [], revisions: REVS });
		assert.ok(
			html.includes('<textarea name="message" rows="5" spellcheck="false" data-keep="desc:zqkwnrnytumz" disabled>'),
		);
		assert.ok(!html.includes('&#34;type&#34;:&#34;commit&#34;'));
		assert.ok(renderInspector({ lang: 'ja' }).includes('empty-state'));
	});

	test('operations get a restore button, except the current one', () => {
		const html = renderOperations('en', [
			{ id: 'op2', description: 'rebase', time: '2026-11-16T18:32:18+09:00', user: 'u', current: true },
			{ id: 'op1', description: 'describe', time: '2026-11-16T18:30:18+09:00', user: 'u', current: false },
		]);
		assert.strictEqual(count(html, '&#34;type&#34;:&#34;opRestore&#34;'), 1);
		assert.ok(html.includes('data-cli="jj op restore op1"'));
		assert.ok(html.includes('jj-lens.undo'));
	});

	test('the atlas has a Before and After graph for every command, in both languages', () => {
		for (const lang of ['ja', 'en'] as const) {
			const html = renderAtlas(lang);
			assert.strictEqual(count(html, 'class="card atlas-card"'), ATLAS.length);
			assert.strictEqual(count(html, 'class="card concept"'), CONCEPTS.length);
			// Two graphs per command, two per concept with panels.
			assert.strictEqual(count(html, '<svg class="mini-graph"'), ATLAS.length * 2 + (CONCEPTS.length - 1) * 2);
			assert.ok(html.includes('id="sec-concepts"') && html.includes('id="sec-commands"'));
		}
		assert.ok(renderAtlas('ja').includes('ログイン画面'));
		assert.ok(renderAtlas('en').includes('login form'));
	});

	test('recipes, the Git table and the revset sheet are all there', () => {
		const html = renderRecipes('en');
		assert.strictEqual(count(html, 'class="card recipe"'), RECIPES.length);
		assert.ok(html.includes('git commit --fixup + autosquash'));
		assert.strictEqual(count(html, '&#34;goto&#34;:&#34;graph&#34;'), REVSETS.length);
		for (const id of ['sec-git', 'sec-recipes', 'sec-revsets']) {
			assert.ok(html.includes(`id="${id}"`));
		}
	});

	test('the pair menu lists every operation with its exact command', () => {
		const html = renderPairMenu('en', REVS[0], REVS[1], ['c2', 'c3']);
		for (const cli of [
			'jj rebase -s rsnlszuyzlro --onto tsnllovtkopq',
			'jj rebase -r rsnlszuyzlro --onto tsnllovtkopq',
			'jj rebase -b rsnlszuyzlro --onto tsnllovtkopq',
			'jj squash --from rsnlszuyzlro --into tsnllovtkopq',
			'jj new rsnlszuyzlro tsnllovtkopq',
			'jj parallelize tsnllovtkopq::rsnlszuyzlro',
		]) {
			assert.ok(html.includes(`data-cli="${cli}"`), cli);
		}
		assert.strictEqual(count(html, ' disabled'), 0);
		const unrelated = renderPairMenu('en', REVS[0], REVS[2], undefined);
		// Parallelize needs one line of history; squashing into an immutable revision is not allowed.
		assert.strictEqual(count(unrelated, ' disabled'), 2);
	});

	test('the preview shows both graphs, the command and its explanation', () => {
		const nodes = revisionNodes(REVS);
		const html = renderPreview({ lang: 'en', command: 'jj rebase -s a --onto b', before: nodes, after: nodes });
		assert.strictEqual(count(html, '<svg class="mini-graph"'), 2);
		assert.ok(html.includes('<code>jj rebase -s a --onto b</code>'));
		assert.ok(html.includes('-s (--source)'));
		assert.ok(html.includes('&#34;type&#34;:&#34;confirm&#34;'));
	});

	test('mini graphs label nodes and highlight marks', () => {
		const svg = renderGraphSvg([
			{ id: 'new', parents: ['B'], workingCopy: true, empty: true, mark: 'new' },
			{ id: 'B', parents: ['A'], label: '日本語 <b>', bookmarks: ['feat', 'feat@origin'] },
			{ id: 'A', parents: [], immutable: true },
		]);
		assert.ok(svg.includes('class="halo mark-new"'));
		assert.ok(svg.includes('日本語 &#60;b&#62;'));
		assert.ok(svg.includes('class="g-pill bm"') && svg.includes('class="g-pill remote"'));
		assert.ok(svg.includes('height="96"'));
		assert.ok(renderGraphSvg([]).includes('height="32"'));
	});
});
