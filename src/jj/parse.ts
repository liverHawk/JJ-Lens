// Pure helpers for talking to the jj CLI: templates and output parsers.
// This file must not import 'vscode' so it stays unit-testable in isolation.

export interface Revision {
	changeId: string;
	/** Shortest unique prefix of the change id. */
	changePrefix: string;
	commitId: string;
	description: string;
	authorName: string;
	authorEmail: string;
	timestamp: string;
	localBookmarks: string[];
	/** Remote bookmarks formatted as `name@remote`. */
	remoteBookmarks: string[];
	tags: string[];
	/** Commit ids of the parents. */
	parents: string[];
	workingCopy: boolean;
	immutable: boolean;
	conflict: boolean;
	empty: boolean;
	divergent: boolean;
	root: boolean;
}

export type FileStatus = 'modified' | 'added' | 'removed' | 'copied' | 'renamed';

export interface FileChange {
	status: FileStatus;
	/** Path before the change (differs from `target` for renames/copies). */
	source: string;
	target: string;
}

export interface Operation {
	id: string;
	description: string;
	time: string;
	user: string;
	current: boolean;
}

type Fields<T> = { [K in keyof T]: string };

/** Builds a jj template that prints one JSON object per line. */
export function jsonTemplate<T>(fields: Fields<T>): string {
	const parts = Object.entries<string>(fields).map(
		([key, expr], i) => `"${i ? ',' : ''}\\"${key}\\":" ++ json(${expr})`,
	);
	return `"{" ++ ${parts.join(' ++ ')} ++ "}\\n"`;
}

export function parseJsonLines<T>(output: string): T[] {
	return output
		.split('\n')
		.filter((line) => line.trim() !== '')
		.map((line) => JSON.parse(line) as T);
}

export const LOG_TEMPLATE = jsonTemplate<Revision>({
	changeId: 'change_id.short(12)',
	changePrefix: 'change_id.shortest(1).prefix()',
	commitId: 'commit_id.short(12)',
	description: 'description',
	authorName: 'author.name()',
	authorEmail: 'author.email()',
	timestamp: 'committer.timestamp()',
	localBookmarks: 'local_bookmarks.map(|b| b.name())',
	remoteBookmarks: 'remote_bookmarks.map(|b| stringify(b.name() ++ "@" ++ b.remote()))',
	tags: 'tags.map(|t| t.name())',
	parents: 'parents.map(|p| p.commit_id().short(12))',
	workingCopy: 'current_working_copy',
	immutable: 'immutable',
	conflict: 'conflict',
	empty: 'empty',
	divergent: 'divergent',
	root: 'root',
});

export const DIFF_TEMPLATE = jsonTemplate<FileChange>({
	status: 'status',
	source: 'source.path()',
	target: 'target.path()',
});

export const OP_TEMPLATE = jsonTemplate<Operation>({
	id: 'id.short(12)',
	description: 'description',
	time: 'time.end()',
	user: 'user',
	current: 'current_operation',
});

export function parseLog(output: string): Revision[] {
	return parseJsonLines<Revision>(output);
}

export function parseDiff(output: string): FileChange[] {
	return parseJsonLines<FileChange>(output);
}

export function parseOpLog(output: string): Operation[] {
	return parseJsonLines<Operation>(output);
}

/** The revset expression that unambiguously names a revision. */
export function revId(rev: Pick<Revision, 'changeId' | 'commitId' | 'divergent'>): string {
	return rev.divergent ? rev.commitId : rev.changeId;
}

/** Bookmarks worth displaying: local ones plus remotes that are not just mirrors. */
export function displayBookmarks(rev: Pick<Revision, 'localBookmarks' | 'remoteBookmarks'>): string[] {
	const local = new Set(rev.localBookmarks);
	const remote = rev.remoteBookmarks.filter((b) => {
		const at = b.lastIndexOf('@');
		return b.slice(at + 1) !== 'git' && !local.has(b.slice(0, at));
	});
	return [...rev.localBookmarks, ...remote];
}

export function subject(description: string): string {
	return description.split('\n', 1)[0];
}

/** Replaces the first line of a description, keeping the body. */
export function replaceSubject(description: string, newSubject: string): string {
	const newline = description.indexOf('\n');
	const body = newline === -1 ? '' : description.slice(newline).trimEnd();
	return newSubject + body;
}

/** A fileset expression matching exactly one workspace-root-relative path. */
export function fileset(path: string): string {
	return `root-file:${JSON.stringify(path)}`;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) {
		return iso;
	}
	const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000));
	const units: [number, string][] = [
		[60, 'second'],
		[60, 'minute'],
		[24, 'hour'],
		[30, 'day'],
		[12, 'month'],
		[Infinity, 'year'],
	];
	let value = seconds;
	for (const [size, name] of units) {
		if (value < size) {
			if (name === 'second' && value < 10) {
				return 'just now';
			}
			return `${value} ${name}${value === 1 ? '' : 's'} ago`;
		}
		value = Math.floor(value / size);
	}
	return iso;
}
