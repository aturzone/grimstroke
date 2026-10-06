/**
 * How well the box understands git, held to what it was when this was written -- measured on
 * corpora written by people who never saw what it was taught from (tests/box/git/corpus*.json),
 * so a change that teaches it one sentence and loses three is caught.
 *
 * The first corpus's test half is the score: nothing was ever tuned by looking at it. Its dev
 * half and the second corpus have been looked at, and are held to more.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@core/box/classify.ts';
import type { GitObject } from '@core/box/git/actions.ts';
import type { GitSlots } from '@core/box/git/slots.ts';
import { understandGit } from '@core/box/git/understand.ts';
import { describe, expect, it } from 'vitest';

interface Row {
  text: string;
  action: string | null;
  slots: Record<string, unknown>;
  ctx?: { object?: GitObject; number?: string; repo?: string };
}

const load = (file: string): Row[] =>
  JSON.parse(readFileSync(join(import.meta.dirname, file), 'utf8')) as Row[];

const half = (text: string): 'dev' | 'test' => {
  let x = 0;
  for (const ch of text) x = (x * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return x % 2 ? 'dev' : 'test';
};

const norm = (v: unknown): string =>
  (Array.isArray(v) ? v.map(norm).sort().join(',') : String(v ?? ''))
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[.,;:!?؟،"'«»“”]+$/u, '')
    .trim();

function score(rows: Row[]): { gate: number; action: number; slots: number } {
  let gate = 0;
  let action = 0;
  let git = 0;
  let slotsRight = 0;
  let slots = 0;
  for (const r of rows) {
    if ((classify(r.text).intent.value === 'issue') === (r.action !== null)) gate++;
    if (r.action === null) continue;
    git++;
    const plan = understandGit(r.text, r.ctx ? { last: r.ctx } : {});
    if ((plan.action?.id ?? 'unknown') !== r.action) continue;
    action++;
    for (const [k, v] of Object.entries(r.slots ?? {})) {
      const a = norm(v);
      const b = norm(plan.slots[k as keyof GitSlots]);
      slots++;
      if (
        ['title', 'body', 'query'].includes(k)
          ? Boolean(b) && (a.includes(b) || b.includes(a))
          : a === b
      )
        slotsRight++;
    }
  }
  return { gate: gate / rows.length, action: action / git, slots: slotsRight / slots };
}

describe('understanding git, on sentences nobody taught it', () => {
  const first = load('corpus.json');

  it('the held-out half: gate 95.5%, action 95%, slots 90%', () => {
    const s = score(first.filter((r) => half(r.text) === 'test'));
    expect(s.gate).toBeGreaterThanOrEqual(0.955);
    expect(s.action).toBeGreaterThanOrEqual(0.95);
    expect(s.slots).toBeGreaterThanOrEqual(0.9);
  });

  it('the half that was looked at', () => {
    const s = score(first.filter((r) => half(r.text) === 'dev'));
    expect(s.gate).toBeGreaterThanOrEqual(0.97);
    expect(s.action).toBeGreaterThanOrEqual(0.97);
    expect(s.slots).toBeGreaterThanOrEqual(0.98);
  });

  it('the second corpus', () => {
    const s = score(load('corpus-2.json'));
    expect(s.gate).toBeGreaterThanOrEqual(0.95);
    expect(s.action).toBeGreaterThanOrEqual(0.96);
    expect(s.slots).toBeGreaterThanOrEqual(0.93);
  });
});
