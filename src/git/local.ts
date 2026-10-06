/**
 * A working copy on this machine, through git itself.
 *
 * The `git` program does the work -- nothing here reimplements it -- run with its arguments as a
 * list, never through a shell, so nothing said in the box can become a command of its own. It
 * never waits for a password (GIT_TERMINAL_PROMPT=0): a push that needs one fails and says so,
 * where an open prompt would hang the server. Where a working copy is: the folder the command
 * line runs in, or one named by GRIMSTROKE_GIT_DIR, or a clone the box made under the
 * workspace's own folder.
 */

import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export class GitFailed extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Run git with these arguments in this folder; its output, or a GitFailed saying why not.
 * `header` is an HTTP header for the service -- a key, for a clone the box makes -- given through
 * git's environment, so it is neither on the command line nor written into the clone's config.
 */
export function git(
  cwd: string,
  args: string[],
  timeout = 120_000,
  header?: string,
): Promise<string> {
  return new Promise((done, fail) => {
    execFile(
      'git',
      args,
      {
        cwd,
        timeout,
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_OPTIONAL_LOCKS: '0',
          LC_ALL: 'C',
          ...(header
            ? {
                GIT_CONFIG_COUNT: '1',
                GIT_CONFIG_KEY_0: 'http.extraHeader',
                GIT_CONFIG_VALUE_0: header,
              }
            : {}),
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          // git's own words, without its hints on how to silence its hints.
          const said = (stderr || stdout || error.message)
            .split('\n')
            .filter((l) => l.trim() && !/^hint:/.test(l))
            .slice(-6)
            .join('\n')
            .trim();
          fail(new GitFailed(typeof error.code === 'number' ? error.code : 1, said));
        } else done(stdout);
      },
    );
  });
}

export interface Change {
  path: string;
  /** Two letters, as git status --short says them: index then working tree. */
  state: string;
}

export interface LocalCommit {
  sha: string;
  author: string;
  at: string;
  message: string;
}

const SEP = '\u001f';

export class WorkingCopy {
  readonly root: string;
  /** The service's key, as an HTTP header, for a clone the box made: its pushes and pulls. */
  private readonly header: string | undefined;

  constructor(root: string, header?: string) {
    this.root = root;
    this.header = header;
  }

  /** The working copy a folder is in, or null when it is in none. */
  static async find(dir: string): Promise<WorkingCopy | null> {
    try {
      return new WorkingCopy((await git(dir, ['rev-parse', '--show-toplevel'])).trim());
    } catch {
      return null;
    }
  }

  private run(args: string[], timeout = 120_000): Promise<string> {
    return git(this.root, args, timeout, this.header);
  }

  async branch(): Promise<string> {
    return (await this.run(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  }

  async status(): Promise<{ branch: string; ahead: number; behind: number; changes: Change[] }> {
    const out = await this.run(['status', '--porcelain=v1', '--branch']);
    const [first = '', ...rest] = out.split('\n');
    const m = /^## ([^.\s]+)(?:\.\.\.\S+)?(?: \[(?:ahead (\d+))?(?:, )?(?:behind (\d+))?\])?/.exec(
      first,
    );
    return {
      branch: m?.[1] ?? '',
      ahead: Number(m?.[2] ?? 0),
      behind: Number(m?.[3] ?? 0),
      changes: rest.filter(Boolean).map((l) => ({ state: l.slice(0, 2), path: l.slice(3) })),
    };
  }

  diff(o: { path?: string; ref?: string; staged?: boolean } = {}): Promise<string> {
    return this.run([
      'diff',
      ...(o.staged ? ['--cached'] : []),
      ...(o.ref ? [o.ref] : []),
      '--',
      ...(o.path ? [o.path] : []),
    ]);
  }

  async stage(paths: string[] = []): Promise<void> {
    await this.run(['add', ...(paths.length ? ['--', ...paths] : ['-A'])]);
  }

  async unstage(paths: string[] = []): Promise<void> {
    await this.run(['restore', '--staged', '--', ...(paths.length ? paths : ['.'])]);
  }

  /** Commit what is staged -- or, with nothing staged, every change. */
  async commit(message: string, paths: string[] = []): Promise<LocalCommit> {
    if (paths.length) await this.stage(paths);
    const staged = (await this.run(['diff', '--cached', '--name-only'])).trim();
    if (!staged) await this.stage();
    await this.run(['commit', '-m', message]);
    return (await this.log({ count: 1 }))[0] as LocalCommit;
  }

  async amend(message?: string): Promise<LocalCommit> {
    await this.run(['commit', '--amend', ...(message ? ['-m', message] : ['--no-edit'])]);
    return (await this.log({ count: 1 }))[0] as LocalCommit;
  }

  async push(o: { branch?: string; force?: boolean } = {}): Promise<string> {
    const branch = o.branch ?? (await this.branch());
    const out = await this.run(
      ['push', ...(o.force ? ['--force-with-lease'] : []), '--set-upstream', 'origin', branch],
      300_000,
    ).catch(async (e: unknown) => {
      if (
        e instanceof GitFailed &&
        /no such remote|does not appear to be a git repository/i.test(e.message)
      )
        throw new GitFailed(e.code, 'this working copy has no remote called origin to push to');
      throw e;
    });
    return out;
  }

  pull(o: { branch?: string } = {}): Promise<string> {
    return this.run(['pull', '--ff-only', ...(o.branch ? ['origin', o.branch] : [])], 300_000);
  }

  fetch(): Promise<string> {
    return this.run(['fetch', '--all', '--prune'], 300_000);
  }

  /** Fetch one ref of the remote into a branch here: a pull request's head. */
  fetchRef(ref: string, branch: string): Promise<string> {
    return this.run(['fetch', 'origin', `${ref}:${branch}`], 300_000);
  }

  merge(branch: string): Promise<string> {
    return this.run(['merge', '--no-edit', branch]);
  }

  rebase(onto: string): Promise<string> {
    return this.run(['rebase', onto]);
  }

  stash(message?: string): Promise<string> {
    return this.run(['stash', 'push', '--include-untracked', ...(message ? ['-m', message] : [])]);
  }

  unstash(): Promise<string> {
    return this.run(['stash', 'pop']);
  }

  /** Move the branch back: keeping the changes as they are, or -- hard -- throwing them away. */
  reset(ref: string, hard = false): Promise<string> {
    return this.run(['reset', hard ? '--hard' : '--mixed', ref]);
  }

  /** Throw away uncommitted changes: to one file, or all of them (untracked files stay). */
  async discard(path?: string): Promise<void> {
    await this.run(['restore', '--staged', '--worktree', '--', path ?? '.']);
  }

  cherryPick(ref: string): Promise<string> {
    return this.run(['cherry-pick', ref]);
  }

  revert(ref: string): Promise<string> {
    return this.run(['revert', '--no-edit', ref]);
  }

  async blame(
    path: string,
  ): Promise<Array<{ line: number; author: string; sha: string; text: string }>> {
    const out = await this.run(['blame', '--line-porcelain', '--', path]);
    const rows: Array<{ line: number; author: string; sha: string; text: string }> = [];
    let sha = '';
    let author = '';
    for (const l of out.split('\n')) {
      const head = /^([0-9a-f]{40}) \d+ (\d+)/.exec(l);
      if (head) sha = head[1] as string;
      else if (l.startsWith('author ')) author = l.slice(7);
      else if (l.startsWith('\t'))
        rows.push({ line: rows.length + 1, author, sha: sha.slice(0, 8), text: l.slice(1) });
    }
    return rows;
  }

  async remotes(): Promise<Array<{ name: string; url: string }>> {
    const out = await this.run(['remote', '-v']);
    const seen = new Map<string, string>();
    for (const l of out.split('\n')) {
      const [name, url] = l.split(/\s+/);
      if (name && url && !seen.has(name)) seen.set(name, url);
    }
    return [...seen].map(([name, url]) => ({ name, url }));
  }

  async addRemote(name: string, url: string): Promise<void> {
    await this.run(['remote', 'add', name, url]);
  }

  async branches(): Promise<Array<{ name: string; current: boolean; sha: string }>> {
    const out = await this.run([
      'branch',
      `--format=%(HEAD)${SEP}%(refname:short)${SEP}%(objectname:short)`,
    ]);
    return out
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [head, name, sha] = l.split(SEP);
        return { name: name ?? '', current: head === '*', sha: sha ?? '' };
      });
  }

  async createBranch(name: string, from?: string, switchTo = true): Promise<void> {
    await this.run(
      switchTo
        ? ['switch', '-c', name, ...(from ? [from] : [])]
        : ['branch', name, ...(from ? [from] : [])],
    );
  }

  async deleteBranch(name: string, force = false): Promise<void> {
    await this.run(['branch', force ? '-D' : '-d', name]);
  }

  async switchTo(name: string): Promise<void> {
    await this.run(['switch', name]);
  }

  async renameBranch(from: string, to: string): Promise<void> {
    await this.run(['branch', '-m', from, to]);
  }

  async log(
    o: { ref?: string; author?: string; path?: string; count?: number } = {},
  ): Promise<LocalCommit[]> {
    const out = await this.run([
      'log',
      `-n${o.count ?? 20}`,
      `--format=%h${SEP}%an${SEP}%aI${SEP}%s`,
      ...(o.author ? [`--author=${o.author}`] : []),
      ...(o.ref ? [o.ref] : []),
      '--',
      ...(o.path ? [o.path] : []),
    ]).catch((e: unknown) => {
      // A repository with no commits yet has no log.
      if (e instanceof GitFailed && /does not have any commits/.test(e.message)) return '';
      throw e;
    });
    return out
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [sha, author, at, message] = l.split(SEP);
        return { sha: sha ?? '', author: author ?? '', at: at ?? '', message: message ?? '' };
      });
  }

  show(ref: string): Promise<string> {
    return this.run(['show', '--stat', '--format=%H%n%an <%ae>%n%aI%n%n%B', ref]);
  }

  async compare(
    base: string,
    head: string,
  ): Promise<{ ahead: number; behind: number; commits: LocalCommit[] }> {
    const counts = (
      await this.run(['rev-list', '--left-right', '--count', `${base}...${head}`])
    ).trim();
    const [behind, ahead] = counts.split(/\s+/).map(Number);
    return {
      ahead: ahead ?? 0,
      behind: behind ?? 0,
      commits: await this.log({ ref: `${base}..${head}` }),
    };
  }

  async tags(): Promise<string[]> {
    return (await this.run(['tag', '--sort=-creatordate'])).split('\n').filter(Boolean);
  }

  async createTag(name: string, ref?: string, message?: string): Promise<void> {
    await this.run([
      'tag',
      ...(message ? ['-a', name, '-m', message] : [name]),
      ...(ref ? [ref] : []),
    ]);
  }

  async deleteTag(name: string): Promise<void> {
    await this.run(['tag', '-d', name]);
  }

  file(path: string, ref = 'HEAD'): Promise<string> {
    return this.run(['show', `${ref}:${path}`]);
  }
}

/** Make a repository in a folder: an existing one is left as it is. */
export async function initAt(dir: string): Promise<WorkingCopy> {
  await mkdir(dir, { recursive: true });
  await git(dir, ['init']);
  return new WorkingCopy(resolve(dir));
}

/** Clone into a folder, and the working copy it became. */
export async function cloneInto(
  url: string,
  dir: string,
  o: { branch?: string; header?: string } = {},
): Promise<WorkingCopy> {
  await mkdir(resolve(dir, '..'), { recursive: true });
  await git(
    resolve(dir, '..'),
    ['clone', ...(o.branch ? ['--branch', o.branch] : []), url, resolve(dir)],
    600_000,
    o.header,
  );
  return new WorkingCopy(resolve(dir), o.header);
}

/** The header a service takes its key in, for git over HTTPS. */
export function keyHeader(provider: string, token: string, user = 'git'): string {
  const pair =
    provider === 'github'
      ? `x-access-token:${token}`
      : provider === 'gitlab'
        ? `oauth2:${token}`
        : `${user}:${token}`;
  return `Authorization: Basic ${Buffer.from(pair).toString('base64')}`;
}
