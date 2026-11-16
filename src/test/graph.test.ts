import * as assert from 'assert';
import { computeGraphLayout, lineage, opArgs, SimNode, simulate, SimulationError } from '../jj/graph';

/** Builds nodes from `id: parent parent` lines, children first. */
function graph(spec: string): SimNode[] {
	return spec
		.trim()
		.split('\n')
		.map((line) => {
			const [id, parents = ''] = line.trim().split(':');
			const wc = id.startsWith('@');
			return {
				id: id.replace('@', ''),
				parents: parents.trim() ? parents.trim().split(/\s+/) : [],
				workingCopy: wc || undefined,
			};
		});
}

/** `id: parents` map, to compare shapes regardless of order. */
function shape(nodes: SimNode[]): Record<string, string[]> {
	return Object.fromEntries(nodes.map((n) => [n.id, [...n.parents].toSorted()]));
}

const marks = (nodes: SimNode[]): Record<string, string> =>
	Object.fromEntries(nodes.filter((n) => n.mark).map((n) => [n.id, n.mark!]));

//   D
//   |  C
//   B  |
//   | /
//   A
const FORK = graph(`
	@D: B
	C: A
	B: A
	A:
`);

const LINE = graph(`
	@D: C
	C: B
	B: A
	A:
`);

suite('graph layout', () => {
	test('a straight line uses one lane', () => {
		const layout = computeGraphLayout(LINE);
		assert.strictEqual(layout.columns, 1);
		assert.deepStrictEqual(
			layout.nodes.map((n) => [n.id, n.row, n.column]),
			[
				['D', 0, 0],
				['C', 1, 0],
				['B', 2, 0],
				['A', 3, 0],
			],
		);
		assert.strictEqual(layout.edges.length, 3);
		assert.ok(layout.edges.every((e) => !e.missing && e.fromColumn === 0 && e.toColumn === 0));
	});

	test('a fork puts the second head in its own lane and joins at the base', () => {
		const layout = computeGraphLayout(FORK);
		const at = Object.fromEntries(layout.nodes.map((n) => [n.id, n.column]));
		assert.deepStrictEqual(at, { D: 0, C: 1, B: 0, A: 0 });
		assert.strictEqual(layout.columns, 2);
		const edge = layout.edges.find((e) => e.from === 'C')!;
		assert.deepStrictEqual([edge.fromColumn, edge.lane, edge.toRow, edge.toColumn], [1, 1, 3, 0]);
		assert.notStrictEqual(layout.nodes[0].color, layout.nodes[1].color);
	});

	test('a merge opens a lane for the second parent', () => {
		const layout = computeGraphLayout(
			graph(`
				M: B C
				B: A
				C: A
				A:
			`),
		);
		const at = Object.fromEntries(layout.nodes.map((n) => [n.id, n.column]));
		assert.deepStrictEqual(at, { M: 0, B: 0, C: 1, A: 0 });
		assert.strictEqual(layout.edges.length, 4);
	});

	test('parents outside the list become stubs', () => {
		const layout = computeGraphLayout(graph('B: A\nA: zzz'));
		const stub = layout.edges.find((e) => e.missing)!;
		assert.deepStrictEqual([stub.from, stub.to, stub.toRow], ['A', 'zzz', 2]);
	});

	test('freed lanes are reused', () => {
		const layout = computeGraphLayout(
			graph(`
				E: A
				D: A
				C: B
				B: A
				A:
			`),
		);
		assert.strictEqual(layout.columns, 3);
		assert.strictEqual(computeGraphLayout([]).columns, 1);
	});
});

suite('operation simulation', () => {
	test('does not modify its input', () => {
		const before = JSON.stringify(FORK);
		simulate(FORK, { kind: 'rebase', mode: 's', source: 'C', onto: 'D' });
		assert.strictEqual(JSON.stringify(FORK), before);
	});

	test('rebase -s moves the revision with its descendants', () => {
		const after = simulate(LINE, { kind: 'rebase', mode: 's', source: 'C', onto: 'A' });
		assert.deepStrictEqual(shape(after), { A: [], B: ['A'], C: ['A'], D: ['C'] });
		assert.deepStrictEqual(marks(after), { C: 'moved', D: 'moved' });
	});

	test('rebase -r moves one revision and reattaches its children', () => {
		const after = simulate(LINE, { kind: 'rebase', mode: 'r', source: 'B', onto: 'D' });
		assert.deepStrictEqual(shape(after), { A: [], C: ['A'], D: ['C'], B: ['D'] });
		assert.deepStrictEqual(marks(after), { B: 'moved', C: 'changed', D: 'changed' });
		assert.deepStrictEqual(
			after.map((n) => n.id),
			['B', 'D', 'C', 'A'],
		);
	});

	test('rebase -b moves the whole branch', () => {
		const nodes = graph(`
			E: D
			D: A
			C: B
			B: A
			A:
		`);
		const after = simulate(nodes, { kind: 'rebase', mode: 'b', source: 'E', onto: 'C' });
		assert.deepStrictEqual(shape(after), { A: [], B: ['A'], C: ['B'], D: ['C'], E: ['D'] });
		assert.deepStrictEqual(marks(after), { D: 'moved', E: 'moved' });
	});

	test('rebase rejects cycles', () => {
		assert.throws(() => simulate(LINE, { kind: 'rebase', mode: 's', source: 'B', onto: 'D' }), SimulationError);
		assert.throws(() => simulate(LINE, { kind: 'rebase', mode: 's', source: 'B', onto: 'B' }), SimulationError);
		assert.throws(() => simulate(LINE, { kind: 'rebase', mode: 'b', source: 'B', onto: 'D' }), SimulationError);
	});

	test('squash removes the source and rebases its children', () => {
		const after = simulate(LINE, { kind: 'squash', from: 'C', into: 'B' });
		assert.deepStrictEqual(shape(after), { A: [], B: ['A'], D: ['B'] });
		assert.deepStrictEqual(marks(after), { B: 'changed', D: 'changed' });
	});

	test('squashing the working copy leaves an empty working copy', () => {
		const after = simulate(LINE, { kind: 'squash', from: 'D', into: 'C' });
		const wc = after.find((n) => n.id === 'D')!;
		assert.ok(wc.workingCopy && wc.empty);
		assert.strictEqual(after.length, 4);
		const partial = simulate(LINE, { kind: 'squash', from: 'D', into: 'C', partial: true });
		assert.ok(!partial.find((n) => n.id === 'D')!.empty);
	});

	test('new creates an empty working copy, with several parents for a merge', () => {
		const after = simulate(FORK, { kind: 'new', parents: ['D', 'C'] });
		assert.deepStrictEqual(after[0], {
			id: 'new',
			parents: ['D', 'C'],
			empty: true,
			mark: 'new',
			workingCopy: true,
		});
		assert.ok(!after.find((n) => n.id === 'D')!.workingCopy);
	});

	test('commit puts a new working copy on top of the old one', () => {
		const after = simulate(LINE, { kind: 'commit' });
		assert.deepStrictEqual(after[0].parents, ['D']);
		assert.ok(after[0].workingCopy && !after[1].workingCopy);
	});

	test('abandon reattaches children; abandoning @ creates a new one', () => {
		const after = simulate(LINE, { kind: 'abandon', rev: 'B' });
		assert.deepStrictEqual(shape(after), { A: [], C: ['A'], D: ['C'] });
		const wc = simulate(LINE, { kind: 'abandon', rev: 'D' });
		assert.deepStrictEqual(shape(wc), { A: [], B: ['A'], C: ['B'], new: ['C'] });
		assert.ok(wc[0].workingCopy);
	});

	test('parallelize turns a chain into siblings', () => {
		const after = simulate(LINE, { kind: 'parallelize', from: 'B', to: 'C' });
		assert.deepStrictEqual(shape(after), { A: [], B: ['A'], C: ['A'], D: ['B', 'C'] });
		// Order of the two arguments does not matter.
		assert.deepStrictEqual(shape(simulate(LINE, { kind: 'parallelize', from: 'C', to: 'B' })), shape(after));
		assert.throws(() => simulate(FORK, { kind: 'parallelize', from: 'C', to: 'D' }), SimulationError);
	});

	test('split inserts a second revision, in series or in parallel', () => {
		const series = simulate(LINE, { kind: 'split', rev: 'B' });
		assert.deepStrictEqual(shape(series), { A: [], B: ['A'], "B'": ['B'], C: ["B'"], D: ['C'] });
		const parallel = simulate(LINE, { kind: 'split', rev: 'B', parallel: true });
		assert.deepStrictEqual(shape(parallel), { A: [], B: ['A'], "B'": ['A'], C: ['B', "B'"], D: ['C'] });
		const wc = simulate(LINE, { kind: 'split', rev: 'D' });
		assert.strictEqual(wc.find((n) => n.workingCopy)!.id, "D'");
	});

	test('edit, duplicate and absorb', () => {
		assert.strictEqual(simulate(LINE, { kind: 'edit', rev: 'B' }).find((n) => n.workingCopy)!.id, 'B');
		assert.deepStrictEqual(shape(simulate(LINE, { kind: 'duplicate', rev: 'C' }))["C'"], ['B']);
		const nodes = LINE.map((n) => ({ ...n, immutable: n.id === 'A' }));
		const absorbed = simulate(nodes, { kind: 'absorb' });
		assert.deepStrictEqual(marks(absorbed), { B: 'changed', C: 'changed', D: 'changed' });
		assert.ok(absorbed[0].empty);
	});

	test('the result is always ordered children first', () => {
		const after = simulate(LINE, { kind: 'rebase', mode: 'r', source: 'A', onto: 'D' });
		const index = new Map(after.map((n, i) => [n.id, i]));
		for (const node of after) {
			for (const parent of node.parents) {
				assert.ok(index.get(node.id)! < index.get(parent)!);
			}
		}
	});
});

suite('operation commands', () => {
	test('opArgs', () => {
		assert.deepStrictEqual(
			opArgs({ kind: 'rebase', mode: 's', source: 'C', onto: 'A' }, (id) => id.toLowerCase()),
			['rebase', '-s', 'c', '--onto', 'a'],
		);
		assert.deepStrictEqual(opArgs({ kind: 'squash', from: 'C', into: 'A' }), ['squash', '--from', 'C', '--into', 'A']);
		assert.deepStrictEqual(opArgs({ kind: 'new', parents: ['A', 'B'] }), ['new', 'A', 'B']);
		assert.deepStrictEqual(opArgs({ kind: 'parallelize', from: 'B', to: 'C' }), ['parallelize', 'B::C']);
		assert.deepStrictEqual(opArgs({ kind: 'split', rev: 'B', parallel: true }), ['split', '-r', 'B', '--parallel']);
	});

	test('lineage orders ancestor first', () => {
		assert.deepStrictEqual(lineage(LINE, 'D', 'B'), ['B', 'D']);
		assert.deepStrictEqual(lineage(LINE, 'B', 'D'), ['B', 'D']);
		assert.strictEqual(lineage(FORK, 'C', 'D'), undefined);
		assert.strictEqual(lineage(LINE, 'B', 'B'), undefined);
	});
});
