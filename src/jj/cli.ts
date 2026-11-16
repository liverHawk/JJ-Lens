import { execFile } from 'child_process';

export interface JjResult {
	stdout: string;
	stderr: string;
}

export class JjError extends Error {
	constructor(
		readonly args: string[],
		readonly stderr: string,
		readonly code: number | string | undefined,
	) {
		super(stderr.trim() || `jj ${args[0]} failed (${code})`);
		this.name = 'JjError';
	}
}

export interface RunOptions {
	cwd: string;
	/**
	 * Whether the command may snapshot the working copy. Commands that do are
	 * serialized so concurrent snapshots do not create divergent operations.
	 */
	snapshot?: boolean;
}

export class Jj {
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly binary: () => string,
		private readonly log: (line: string) => void = () => {},
	) {}

	run(args: string[], options: RunOptions): Promise<JjResult> {
		if (!options.snapshot) {
			return this.exec(['--ignore-working-copy', ...args], options.cwd);
		}
		const result = this.queue.then(() => this.exec(args, options.cwd));
		this.queue = result.catch(() => undefined);
		return result;
	}

	private exec(args: string[], cwd: string): Promise<JjResult> {
		const fullArgs = ['--no-pager', '--color', 'never', ...args];
		this.log(`> jj ${args.join(' ')}`);
		return new Promise((resolve, reject) => {
			execFile(
				this.binary(),
				fullArgs,
				{
					cwd,
					encoding: 'utf8',
					maxBuffer: 64 * 1024 * 1024,
					// Never let jj block on an interactive editor: fail fast instead.
					env: { ...process.env, JJ_EDITOR: 'false' },
				},
				(error, stdout, stderr) => {
					if (error) {
						this.log(stderr || String(error));
						reject(new JjError(args, stderr || error.message, error.code ?? undefined));
						return;
					}
					if (stderr.trim()) {
						this.log(stderr.trimEnd());
					}
					resolve({ stdout, stderr });
				},
			);
		});
	}
}
