/**
 * The / box from a terminal: on a workspace's files, with no server and no browser, answering
 * in words for a person and in JSON for an agent.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { work } from '@core/work.ts';
import { describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'grimstroke-work-'));

/** Run a verb, and what it wrote. */
async function run(
  verb: string,
  ...argv: string[]
): Promise<{ code: number | undefined; out: string }> {
  let out = '';
  const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    out += String(chunk);
    return true;
  });
  const err = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    out += String(chunk);
    return true;
  });
  try {
    return { code: await work(verb, argv, dir), out };
  } finally {
    write.mockRestore();
    err.mockRestore();
  }
}

describe('grimstroke from a terminal', () => {
  it('reads a line the way the box does, in any of the three languages', async () => {
    const r = JSON.parse((await run('read', 'gym', 'mon', 'wed', 'fri', '7am', '--json')).out);
    expect(r.kind).toBe('habit');
    expect(r.fields.title).toBe('Gym');
    const ru = JSON.parse((await run('read', 'таймер 25 минут', '--json')).out);
    expect(ru.kind).toBe('timer');
    expect((await run('read', 'settings')).out).toContain('a command');
  });

  it('puts cards on the / board, lists them, and marks one done', async () => {
    const added = JSON.parse((await run('add', 'milk, eggs, bread', '--json')).out);
    expect(added.kind).toBe('todo');
    await run('add', 'call the bank tomorrow 10am');
    const { cards } = JSON.parse((await run('cards', '--json')).out);
    expect(cards).toHaveLength(2);
    expect((await run('done', added.id)).code).toBe(0);
    const open = JSON.parse((await run('cards', '--open', '--json')).out);
    expect(open.cards.map((c: { id: string }) => c.id)).not.toContain(added.id);
  });

  it('says plainly what is missing', async () => {
    const r = await run('issues', '--json');
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out).error).toMatch(/connect/);
    expect(await work('nothing-like-this', [], dir)).toBeUndefined();
  });
});
