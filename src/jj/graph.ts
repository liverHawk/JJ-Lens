// Pure DAG helpers: lane layout for drawing a commit graph, and a simulator
// that predicts what the graph looks like after a jj operation.
// This file must not import 'vscode' so it stays unit-testable in isolation.

export type Mark = 'new' | 'moved' | 'changed';

/** A commit as far as graph drawing and simulation are concerned. */
export interface SimNode {
	id: string;
	/** Parent ids. Parents that are not part of the node list are drawn as stubs. */
	parents: string[];
	label?: string;
	workingCopy?: boolean;
	immutable?: boolean;
	conflict?: boolean;
	empty?: boolean;
	bookmarks?: string[];
	/** Set by the simulator to highlight what an operation touched. */
	mark?: Mark;
}

export interface LayoutNode {
	id: string;
	row: number;
	column: number;
	/** Index of the lane colour. */
	color: number;
}

export interface LayoutEdge {
	from: string;
	to: string;
	fromRow: number;
	fromColumn: number;
	toRow: number;
	toColumn: number;
	/** The lane the edge runs down between the two rows. */
	lane: number;
	color: number;
	/** The parent is not part of the node list; the edge is a short stub. */
	missing: boolean;
}

export interface GraphLayout {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	/** Number of lanes used. */
	columns: number;
}

/**
 * Assigns each node a row and a lane. `nodes` must list children before
 * parents, which is the order `jj log` prints.
 */
export function computeGraphLayout(nodes: readonly Pick<SimNode, 'id' | 'parents'>[]): GraphLayout {
	const known = new Set(nodes.map((n) => n.id));
	// lanes[i] is the id the lane is waiting for, plus the lane's colour.
	const lanes: ({ id: string; color: number } | undefined)[] = [];
	let nextColor = 0;
	let columns = 1;
	const placed = new Map<string, LayoutNode>();
	const pending: { from: string; to: string; lane: number; color: number }[] = [];
	const edges: LayoutEdge[] = [];

	const freeLane = (): number => {
		const index = lanes.indexOf(undefined);
		return index === -1 ? lanes.length : index;
	};

	nodes.forEach((node, row) => {
		// Every lane waiting for this node ends here; the node sits in the leftmost.
		let column = lanes.findIndex((lane) => lane?.id === node.id);
		let color: number;
		if (column === -1) {
			column = freeLane();
			color = nextColor++;
		} else {
			color = lanes[column]!.color;
			lanes.forEach((lane, index) => {
				if (lane?.id === node.id) {
					lanes[index] = undefined;
				}
			});
		}
		placed.set(node.id, { id: node.id, row, column, color });

		let ownLaneTaken = false;
		for (const parent of new Set(node.parents)) {
			if (!known.has(parent)) {
				edges.push({
					from: node.id,
					to: parent,
					fromRow: row,
					fromColumn: column,
					toRow: row + 1,
					toColumn: column,
					lane: column,
					color,
					missing: true,
				});
				continue;
			}
			// The first parent continues in this node's lane; others branch off,
			// joining a lane that already leads to that parent when there is one.
			let lane: number;
			if (!ownLaneTaken) {
				lane = column;
				lanes[lane] = { id: parent, color };
				ownLaneTaken = true;
			} else {
				lane = lanes.findIndex((l) => l?.id === parent);
				if (lane === -1) {
					lane = freeLane();
					lanes[lane] = { id: parent, color: nextColor++ };
				}
			}
			pending.push({ from: node.id, to: parent, lane, color: lanes[lane]!.color });
		}
		columns = Math.max(columns, lanes.length, column + 1);
		while (lanes.length && lanes[lanes.length - 1] === undefined) {
			lanes.pop();
		}
	});

	for (const edge of pending) {
		const from = placed.get(edge.from)!;
		const to = placed.get(edge.to)!;
		edges.push({
			from: edge.from,
			to: edge.to,
			fromRow: from.row,
			fromColumn: from.column,
			toRow: to.row,
			toColumn: to.column,
			lane: edge.lane,
			color: edge.color,
			missing: false,
		});
	}
	return { nodes: [...placed.values()], edges, columns };
}

/** An operation the simulator understands. Ids refer to `SimNode.id`. */
export type SimOp =
	| { kind: 'rebase'; mode: 'r' | 's' | 'b'; source: string; onto: string }
	| { kind: 'squash'; from: string; into: string; partial?: boolean }
	| { kind: 'new'; parents: string[] }
	| { kind: 'commit' }
	| { kind: 'edit'; rev: string }
	| { kind: 'describe'; rev: string }
	| { kind: 'abandon'; rev: string }
	| { kind: 'duplicate'; rev: string }
	| { kind: 'parallelize'; from: string; to: string }
	| { kind: 'split'; rev: string; parallel?: boolean }
	| { kind: 'absorb' }
	| { kind: 'restore'; rev: string };

export class SimulationError extends Error {}

const unique = <T>(items: T[]): T[] => [...new Set(items)];

class Graph {
	readonly nodes: SimNode[];
	constructor(nodes: readonly SimNode[]) {
		this.nodes = nodes.map((n) => ({ ...n, parents: [...n.parents], mark: undefined }));
	}

	get(id: string): SimNode {
		const node = this.nodes.find((n) => n.id === id);
		if (!node) {
			throw new SimulationError(`unknown revision ${id}`);
		}
		return node;
	}

	has(id: string): boolean {
		return this.nodes.some((n) => n.id === id);
	}

	get workingCopy(): SimNode | undefined {
		return this.nodes.find((n) => n.workingCopy);
	}

	children(id: string): SimNode[] {
		return this.nodes.filter((n) => n.parents.includes(id));
	}

	/** `id` and everything reachable through `step`. */
	private closure(id: string, step: (id: string) => string[]): Set<string> {
		const seen = new Set<string>([id]);
		const stack = [id];
		while (stack.length) {
			for (const next of step(stack.pop()!)) {
				if (!seen.has(next)) {
					seen.add(next);
					stack.push(next);
				}
			}
		}
		return seen;
	}

	descendants(id: string): Set<string> {
		return this.closure(id, (current) => this.children(current).map((n) => n.id));
	}

	ancestors(id: string): Set<string> {
		return this.closure(id, (current) => (this.has(current) ? this.get(current).parents : []));
	}

	mark(ids: Iterable<string>, mark: Mark): void {
		for (const id of ids) {
			const node = this.nodes.find((n) => n.id === id);
			if (node && !node.mark) {
				node.mark = mark;
			}
		}
	}

	add(node: Omit<SimNode, 'id'>, base: string): SimNode {
		let id = base;
		while (this.has(id)) {
			id += "'";
		}
		const created = { ...node, id };
		this.nodes.unshift(created);
		return created;
	}

	/** Removes a node, attaching its children to its parents. */
	remove(id: string): void {
		const node = this.get(id);
		for (const child of this.children(id)) {
			child.parents = unique(child.parents.flatMap((p) => (p === id ? node.parents : [p])));
			child.mark ??= 'changed';
		}
		this.nodes.splice(this.nodes.indexOf(node), 1);
	}

	moveWorkingCopy(to: SimNode): void {
		for (const node of this.nodes) {
			node.workingCopy = node === to;
		}
	}

	/** Children before parents, otherwise keeping the current order. */
	sorted(): SimNode[] {
		const remaining = [...this.nodes];
		const result: SimNode[] = [];
		while (remaining.length) {
			const index = remaining.findIndex((node) => !remaining.some((other) => other.parents.includes(node.id)));
			if (index === -1) {
				throw new SimulationError('the operation would create a cycle');
			}
			result.push(...remaining.splice(index, 1));
		}
		return result;
	}
}

function rebase(graph: Graph, op: Extract<SimOp, { kind: 'rebase' }>): void {
	const source = graph.get(op.source);
	graph.get(op.onto);
	if (op.source === op.onto) {
		throw new SimulationError('cannot rebase a revision onto itself');
	}
	if (op.mode === 'r') {
		// Pull the revision out; its children are reattached to its parents.
		for (const child of graph.children(source.id)) {
			child.parents = unique(child.parents.flatMap((p) => (p === source.id ? source.parents : [p])));
			child.mark = 'changed';
		}
		source.parents = [op.onto];
		source.mark = 'moved';
		return;
	}
	if (graph.descendants(source.id).has(op.onto)) {
		throw new SimulationError('cannot rebase a revision onto its own descendant');
	}
	if (op.mode === 's') {
		source.parents = [op.onto];
		graph.mark(graph.descendants(source.id), 'moved');
		return;
	}
	// -b: move everything on the source's branch that the destination does not have.
	const base = graph.ancestors(op.onto);
	const branch = [...graph.ancestors(source.id)].filter((id) => graph.has(id) && !base.has(id));
	if (!branch.length) {
		throw new SimulationError('the revision is already an ancestor of the destination');
	}
	const inBranch = new Set(branch);
	for (const id of branch) {
		const node = graph.get(id);
		if (!node.parents.some((p) => inBranch.has(p))) {
			node.parents = [op.onto];
			graph.mark(graph.descendants(id), 'moved');
		}
	}
}

/** The node that represents "the working copy lost its content". */
function emptied(graph: Graph, node: SimNode): void {
	node.empty = true;
	node.mark = 'changed';
}

function squash(graph: Graph, op: Extract<SimOp, { kind: 'squash' }>): void {
	const from = graph.get(op.from);
	const into = graph.get(op.into);
	if (from === into) {
		throw new SimulationError('source and destination are the same revision');
	}
	into.mark = 'changed';
	into.empty = into.empty && from.empty;
	// Rewriting an ancestor rebases everything above it.
	graph.mark(graph.descendants(into.id), 'changed');
	if (op.partial) {
		from.mark = 'changed';
	} else if (from.workingCopy) {
		// jj leaves a fresh empty working copy where the squashed one was.
		emptied(graph, from);
		from.label = undefined;
	} else {
		graph.remove(from.id);
	}
}

function parallelize(graph: Graph, op: Extract<SimOp, { kind: 'parallelize' }>): void {
	let bottom = graph.get(op.from);
	let top = graph.get(op.to);
	if (graph.ancestors(bottom.id).has(top.id)) {
		[bottom, top] = [top, bottom];
	}
	const below = graph.descendants(bottom.id);
	const set = [...graph.ancestors(top.id)].filter((id) => below.has(id));
	if (set.length < 2) {
		throw new SimulationError('the two revisions are not on the same line of history');
	}
	const inSet = new Set(set);
	const before = new Map(graph.nodes.map((n) => [n.id, [...n.parents]]));
	const setAncestors = (id: string): string[] => [...graph.ancestors(id)].filter((a) => a !== id && inSet.has(a));
	const outerParents = new Map(
		set.map((id) => [
			id,
			unique([id, ...setAncestors(id)].flatMap((a) => before.get(a)!.filter((p) => !inSet.has(p)))),
		]),
	);
	const ancestorsInSet = new Map(set.map((id) => [id, setAncestors(id)]));
	for (const node of graph.nodes) {
		if (inSet.has(node.id)) {
			node.parents = outerParents.get(node.id)!;
			node.mark = 'moved';
		} else if (node.parents.some((p) => inSet.has(p))) {
			// Children keep every revision they used to descend from.
			node.parents = unique(node.parents.flatMap((p) => (inSet.has(p) ? [p, ...ancestorsInSet.get(p)!] : [p])));
			node.mark = 'changed';
		}
	}
}

function split(graph: Graph, op: Extract<SimOp, { kind: 'split' }>): void {
	const node = graph.get(op.rev);
	const children = graph.children(node.id);
	const rest = graph.add(
		{
			parents: op.parallel ? [...node.parents] : [node.id],
			label: node.label ? `${node.label} (2)` : undefined,
			mark: 'new',
		},
		`${node.id}'`,
	);
	node.mark = 'changed';
	node.label = node.label ? `${node.label} (1)` : undefined;
	for (const child of children) {
		child.parents = unique(
			child.parents.flatMap((p) => (p === node.id ? (op.parallel ? [node.id, rest.id] : [rest.id]) : [p])),
		);
		child.mark = 'changed';
	}
	if (node.workingCopy && !op.parallel) {
		graph.moveWorkingCopy(rest);
	}
}

/**
 * Predicts the graph after `op`. Returns a new node list (children first) in
 * which the nodes the operation touched carry a `mark`.
 */
export function simulate(nodes: readonly SimNode[], op: SimOp): SimNode[] {
	const graph = new Graph(nodes);
	switch (op.kind) {
		case 'rebase':
			rebase(graph, op);
			break;
		case 'squash':
			squash(graph, op);
			break;
		case 'new': {
			if (!op.parents.length) {
				throw new SimulationError('a new change needs at least one parent');
			}
			op.parents.forEach((p) => graph.get(p));
			const created = graph.add({ parents: unique(op.parents), empty: true, mark: 'new' }, 'new');
			graph.moveWorkingCopy(created);
			break;
		}
		case 'commit': {
			const wc = graph.workingCopy;
			if (!wc) {
				throw new SimulationError('no working copy');
			}
			wc.mark = 'changed';
			const created = graph.add({ parents: [wc.id], empty: true, mark: 'new' }, 'new');
			graph.moveWorkingCopy(created);
			break;
		}
		case 'edit':
			graph.moveWorkingCopy(graph.get(op.rev));
			graph.get(op.rev).mark = 'changed';
			break;
		case 'describe':
		case 'restore': {
			const node = graph.get(op.rev);
			node.mark = 'changed';
			if (op.kind === 'restore') {
				node.empty = true;
			}
			graph.mark(graph.descendants(node.id), 'changed');
			break;
		}
		case 'abandon': {
			const node = graph.get(op.rev);
			if (node.workingCopy) {
				const created = graph.add({ parents: [...node.parents], empty: true, mark: 'new' }, 'new');
				graph.moveWorkingCopy(created);
			}
			graph.remove(node.id);
			break;
		}
		case 'duplicate': {
			const node = graph.get(op.rev);
			graph.add({ ...node, parents: [...node.parents], workingCopy: false, bookmarks: [], mark: 'new' }, `${node.id}'`);
			break;
		}
		case 'parallelize':
			parallelize(graph, op);
			break;
		case 'split':
			split(graph, op);
			break;
		case 'absorb': {
			const wc = graph.workingCopy;
			if (!wc) {
				throw new SimulationError('no working copy');
			}
			// The changes flow into the mutable ancestors that last touched those lines.
			for (const id of graph.ancestors(wc.id)) {
				if (id !== wc.id && graph.has(id) && !graph.get(id).immutable) {
					graph.get(id).mark = 'changed';
				}
			}
			emptied(graph, wc);
			break;
		}
	}
	return graph.sorted();
}

/**
 * The jj arguments that perform `op`. `ref` turns a node id into the revset
 * expression to pass on the command line.
 */
export function opArgs(op: SimOp, ref: (id: string) => string = (id) => id): string[] {
	switch (op.kind) {
		case 'rebase':
			return ['rebase', `-${op.mode}`, ref(op.source), '--onto', ref(op.onto)];
		case 'squash':
			return ['squash', '--from', ref(op.from), '--into', ref(op.into)];
		case 'new':
			return ['new', ...op.parents.map(ref)];
		case 'commit':
			return ['commit'];
		case 'edit':
			return ['edit', ref(op.rev)];
		case 'describe':
			return ['describe', '-r', ref(op.rev)];
		case 'abandon':
			return ['abandon', ref(op.rev)];
		case 'duplicate':
			return ['duplicate', ref(op.rev)];
		case 'parallelize':
			return ['parallelize', `${ref(op.from)}::${ref(op.to)}`];
		case 'split':
			return ['split', '-r', ref(op.rev), ...(op.parallel ? ['--parallel'] : [])];
		case 'absorb':
			return ['absorb'];
		case 'restore':
			return ['restore', '--changes-in', ref(op.rev)];
	}
}

/** Orders a parallelize pair as ancestor first, or undefined if unrelated. */
export function lineage(nodes: readonly SimNode[], a: string, b: string): [string, string] | undefined {
	const graph = new Graph(nodes);
	if (a === b || !graph.has(a) || !graph.has(b)) {
		return undefined;
	}
	if (graph.ancestors(a).has(b)) {
		return [b, a];
	}
	return graph.ancestors(b).has(a) ? [a, b] : undefined;
}
