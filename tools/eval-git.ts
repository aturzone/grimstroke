/**
 * How well the box understands git, measured on the corpus written without sight of anything
 * it was taught from (tests/box/git/corpus.json):
 *
 *   node --import ./tools/register.mjs tools/eval-git.ts [--half dev|test] [--wrong]
 *
 * For each row: whether the shape model hands it to git at all (and keeps everyday sentences
 * away), which action the git model reads, and every slot the row names, compared as written.
 * The dev half's mistakes may be looked at to improve the readers; the test half is only counted.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@core/box/classify.ts';
import type { GitObject } from '@core/box/git/actions.ts';
import type { GitSlots } from '@core/box/git/slots.ts';
import { understandGit } from '@core/box/git/understand.ts';

interface Row {
  text: string;
  lang: string;
  action: string | null;
  slots: Record<string, unknown>;
  ctx?: { object?: GitObject; number?: string; repo?: string };
}

// --corpus 2: the second blind corpus, all of it a dev set (the first one's test half is the score).
const which2 =
  process.argv.includes('--corpus') && process.argv[process.argv.indexOf('--corpus') + 1] === '2';
const rows = JSON.parse(
  readFileSync(
    join(import.meta.dirname, `../tests/box/git/${which2 ? 'corpus-2' : 'corpus'}.json`),
    'utf8',
  ),
) as Row[];
const half = (text: string): 'dev' | 'test' => {
  if (which2) return 'dev';
  let x = 0;
  for (const ch of text) x = (x * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return x % 2 ? 'dev' : 'test';
};
const want = process.argv.includes('--half')
  ? process.argv[process.argv.indexOf('--half') + 1]
  : undefined;
const showWrong = process.argv.includes('--wrong');

const norm = (v: unknown): string =>
  (Array.isArray(v) ? v.map(norm).sort().join(',') : String(v ?? ''))
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[.,;:!?؟،"'«»“”]+$/u, '')
    .trim();

/** Words compared loosely: the expected text is in what was read, or the other way round. */
const LOOSE = new Set(['title', 'body', 'query']);

for (const which of want ? [want] : which2 ? ['dev'] : ['dev', 'test']) {
  const set = rows.filter((r) => half(r.text) === which);
  let gateRight = 0;
  let actionRight = 0;
  let actionRows = 0;
  const slotScore = new Map<string, [number, number]>();
  const wrong: string[] = [];
  for (const r of set) {
    const isGit = classify(r.text).intent.value === 'issue';
    const shouldGit = r.action !== null;
    if (isGit === shouldGit) gateRight++;
    else wrong.push(`gate ${shouldGit ? 'missed' : 'took'}: ${r.text}`);
    if (!shouldGit) continue;
    actionRows++;
    const plan = understandGit(r.text, r.ctx ? { last: r.ctx } : {});
    const got = plan.action?.id ?? 'unknown';
    if (got === r.action) actionRight++;
    else {
      wrong.push(`action ${r.action} → ${got}: ${r.text}`);
      continue;
    }
    for (const [k, v] of Object.entries(r.slots ?? {})) {
      const read = plan.slots[k as keyof GitSlots];
      const a = norm(v);
      const b = norm(read);
      const ok = LOOSE.has(k) ? Boolean(b) && (a.includes(b) || b.includes(a)) : a === b;
      const s = slotScore.get(k) ?? [0, 0];
      slotScore.set(k, [s[0] + (ok ? 1 : 0), s[1] + 1]);
      if (!ok) wrong.push(`slot ${k} "${a}" → "${b}" (${r.action}): ${r.text}`);
    }
  }
  const pct = (a: number, b: number): string => `${((a / Math.max(1, b)) * 100).toFixed(1)}%`;
  let sa = 0;
  let sb = 0;
  for (const [, [a, b]] of slotScore) {
    sa += a;
    sb += b;
  }
  console.log(
    `${which}: gate ${pct(gateRight, set.length)} (${set.length})  action ${pct(actionRight, actionRows)} (${actionRows})  slots ${pct(sa, sb)} (${sb})`,
  );
  console.log(
    `  ${[...slotScore]
      .sort((x, y) => y[1][1] - x[1][1])
      .map(([k, [a, b]]) => `${k} ${a}/${b}`)
      .join('  ')}`,
  );
  if (showWrong && which === 'dev') for (const w of wrong) console.log(`  ✗ ${w}`);
}
