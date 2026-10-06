/**
 * Git said in words, on a working copy here: a real repository in a folder of its own, worked
 * through only by sentences -- made, changed, committed, branched, stashed, tagged, pushed to a
 * remote and pulled back, undone. What git itself then says is what is held to.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { understandGit } from '@core/box/git/understand.ts';
import { doGit, type GitResult } from '@core/git/do.ts';
import { WorkingCopy } from '@core/git/local.ts';
import { Live } from '@core/serve/live.ts';
import { Store } from '@core/store/store.ts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = mkdtempSync(join(tmpdir(), 'gs-local-'));
const dir = join(root, 'work');
const remote = join(root, 'remote.git');
let live: Live;

const sh = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });

/** Say it here, confirmed, and what came back. */
async function say(text: string): Promise<GitResult> {
  const local = await WorkingCopy.find(dir);
  const plan = understandGit(text, {
    ...(local ? { local: { root: local.root, branch: await local.branch().catch(() => '') } } : {}),
  });
  return doGit(plan, { live, local, here: dir, confirmed: true });
}

beforeAll(() => {
  live = new Live(new Store({ dir: join(root, 'workspace') }));
  execFileSync('git', ['init', '--bare', '-b', 'main', remote]);
  execFileSync('mkdir', ['-p', dir]);
});

afterAll(() => live.close());

describe('a working copy, worked in words', () => {
  it('is made', async () => {
    const r = await say('git init');
    expect(r.action).toBe('local.init');
    expect(r.ok, r.says).toBe(true);
    sh(dir, 'config', 'user.email', 'ada@example.org');
    sh(dir, 'config', 'user.name', 'Ada');
    sh(dir, 'checkout', '-q', '-b', 'main');
  });

  it('says what changed', async () => {
    writeFileSync(join(dir, 'README.md'), 'hello\n');
    const r = await say('what changed?');
    expect(r.action).toBe('local.status');
    expect(r.items?.map((i) => i.title)).toContain('README.md');
  });

  it('commits it, with the message that was said', async () => {
    const r = await say('commit everything: first words');
    expect(r.action).toBe('local.commit');
    expect(r.ok, r.says).toBe(true);
    expect(sh(dir, 'log', '-1', '--format=%s').trim()).toBe('first words');
  });

  it('makes a branch, and moves onto it', async () => {
    const r = await say('create a branch feature/hello');
    expect(r.action).toBe('branch.create');
    expect(r.ok, r.says).toBe(true);
    expect(sh(dir, 'branch', '--show-current').trim()).toBe('feature/hello');
  });

  it('commits in Persian, and goes back to main in Russian', async () => {
    writeFileSync(join(dir, 'README.md'), 'hello\nworld\n');
    expect((await say('تغییرات رو کامیت کن: خط دوم')).ok).toBe(true);
    expect(sh(dir, 'log', '-1', '--format=%s').trim()).toBe('خط دوم');
    const r = await say('переключись на main');
    expect(r.action).toBe('branch.switch');
    expect(sh(dir, 'branch', '--show-current').trim()).toBe('main');
  });

  it('merges the branch in', async () => {
    const r = await say('merge feature/hello into main');
    expect(r.action).toBe('local.merge');
    expect(r.ok, r.says).toBe(true);
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('hello\nworld\n');
  });

  it('stashes changes away and brings them back', async () => {
    writeFileSync(join(dir, 'README.md'), 'half done\n');
    expect((await say('stash my changes')).action).toBe('local.stash');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('hello\nworld\n');
    expect((await say('pop the stash')).action).toBe('local.unstash');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('half done\n');
  });

  it('throws changes to a file away', async () => {
    const r = await say('discard my changes to README.md');
    expect(r.action).toBe('local.discard');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('hello\nworld\n');
  });

  it('tags it', async () => {
    const r = await say('tag this as v1.0.0');
    expect(r.action).toBe('tag.create');
    expect(sh(dir, 'tag').trim()).toBe('v1.0.0');
  });

  it('lists the last commits', async () => {
    const r = await say('last 2 commits');
    expect(r.action).toBe('commit.list');
    expect(r.items).toHaveLength(2);
  });

  it('says who wrote a file', async () => {
    const r = await say('who wrote README.md');
    expect(r.action).toBe('file.blame');
    expect(r.says).toContain('Ada');
  });

  it('adds a remote, pushes to it, and pulls from it', async () => {
    expect((await say(`add remote origin file://${remote}`)).ok).toBe(true);
    const pushed = await say('push');
    expect(pushed.action).toBe('local.push');
    expect(pushed.ok, pushed.says).toBe(true);
    expect(sh(remote, 'log', '-1', '--format=%s', 'main').trim()).toBe('خط دوم');
    const pulled = await say('pull');
    expect(pulled.action).toBe('local.pull');
    expect(pulled.ok, pulled.says).toBe(true);
  });

  it('undoes the last commit and keeps its changes', async () => {
    const r = await say('undo my last commit');
    expect(r.action).toBe('local.reset');
    expect(r.ok, r.says).toBe(true);
    expect(sh(dir, 'log', '-1', '--format=%s').trim()).toBe('first words');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('hello\nworld\n');
  });

  it('deletes a branch, which waits to be confirmed first', async () => {
    const local = await WorkingCopy.find(dir);
    const plan = understandGit('delete the branch feature/hello', {
      ...(local ? { local: { root: local.root } } : {}),
    });
    expect(plan.weight).toBe('destructive');
    const waiting = await doGit(plan, { live, local, here: dir });
    expect(waiting.confirm).toBe(true);
    expect(sh(dir, 'branch', '--list', 'feature/hello').trim()).not.toBe('');
    // Not merged since the reset: git refuses, and the refusal is what is said.
    const refused = await doGit(plan, { live, local, here: dir, confirmed: true });
    expect(refused.ok).toBe(false);
    expect(refused.says).toMatch(/not fully merged/);
    expect(refused.says).not.toMatch(/hint:/);
    const forced = await say('force delete the branch feature/hello');
    expect(forced.ok, forced.says).toBe(true);
    expect(sh(dir, 'branch', '--list', 'feature/hello').trim()).toBe('');
  });
});
