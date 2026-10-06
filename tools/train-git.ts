/**
 * Train the git model (src/box/git/model.ts) and write its weights.
 *
 *   node --import ./tools/register.mjs tools/train-git.ts
 *
 * Two heads, verb and object, by SGD on the sentences of tools/git-data.ts. It first trains with
 * a fifth of the templates held out and reports the action accuracy on them; then measures the
 * corpus that was written without sight of the templates (tests/box/git/corpus.json) -- its dev
 * half, whose mistakes may be looked at, and its test half, which is only ever counted -- then
 * trains on everything and writes src/box/git/weights.ts as int8.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GIT_OBJECTS, type GitObject } from '@core/box/git/actions.ts';
import type { GateWeights } from '@core/box/git/gate.ts';
import {
  type GitWeights,
  gitFeatures,
  guessAction,
  type Head,
  headProbabilities,
  VERB_CLASSES,
} from '@core/box/git/model.ts';
import { spansOf } from '@core/box/git/slots.ts';
import { type GitExample, gitExamples, NOT_GIT, NOT_GIT_PHRASES } from './git-data.ts';
import { examples as shapeExamples } from './shape-data.ts';

const BUCKETS = Number(process.env.GIT_BUCKETS ?? 4096);
const EPOCHS = 14;
const L2 = 1e-4;

interface Trained {
  w: Float32Array;
  bias: Float32Array;
}

function train(
  rows: Array<{ f: Map<number, number>; y: number }>,
  classes: number,
  seed = 1,
): Trained {
  const w = new Float32Array(classes * BUCKETS);
  const bias = new Float32Array(classes);
  let s = seed;
  const rand = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const order = rows.slice();
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const lr = 0.5 / (1 + epoch * 0.35);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [
        order[j] as (typeof order)[number],
        order[i] as (typeof order)[number],
      ];
    }
    for (const { f, y } of order) {
      const z = new Float64Array(classes);
      for (let c = 0; c < classes; c++) {
        let v = bias[c] as number;
        for (const [k, x] of f) v += (w[c * BUCKETS + k] as number) * x;
        z[c] = v;
      }
      const max = Math.max(...z);
      let sum = 0;
      for (let c = 0; c < classes; c++) {
        z[c] = Math.exp((z[c] as number) - max);
        sum += z[c] as number;
      }
      for (let c = 0; c < classes; c++) {
        const g = (z[c] as number) / sum - (c === y ? 1 : 0);
        if (Math.abs(g) < 1e-4) continue;
        bias[c] = (bias[c] as number) - lr * g;
        for (const [k, x] of f) {
          const idx = c * BUCKETS + k;
          w[idx] = (w[idx] as number) * (1 - lr * L2) - lr * g * x;
        }
      }
    }
  }
  return { w, bias };
}

function pack(t: Trained, classes: readonly string[]): Head {
  let max = 0;
  for (const v of t.w) max = Math.max(max, Math.abs(v));
  const scale = max / 127 || 1;
  const bytes = new Int8Array(t.w.length);
  t.w.forEach((v, i) => {
    bytes[i] = Math.max(-127, Math.min(127, Math.round(v / scale)));
  });
  return {
    classes: [...classes],
    w: Buffer.from(bytes.buffer).toString('base64'),
    scale,
    bias: [...t.bias].map((b) => Math.round(b * 1e4) / 1e4),
  };
}

function trainHeads(data: GitExample[]): GitWeights {
  const feats = data.map((ex) => gitFeatures(spansOf(ex.text), BUCKETS));
  const verbs = train(
    data.map((ex, i) => ({ f: feats[i] as Map<number, number>, y: VERB_CLASSES.indexOf(ex.verb) })),
    VERB_CLASSES.length,
  );
  const objects = train(
    data.map((ex, i) => ({
      f: feats[i] as Map<number, number>,
      y: GIT_OBJECTS.indexOf(ex.object),
    })),
    GIT_OBJECTS.length,
    2,
  );
  return {
    version: '1',
    buckets: BUCKETS,
    verb: pack(verbs, VERB_CLASSES),
    object: pack(objects, GIT_OBJECTS),
  };
}

const idOf = (ex: GitExample): string =>
  ex.verb === 'other' ? 'unknown' : `${ex.object}.${ex.verb}`;

function score(
  rows: Array<{ text: string; want: string; lang: string; near?: { object?: GitObject } }>,
  weights: GitWeights,
): { acc: number; wrong: Array<[string, string, string]>; byLang: Map<string, [number, number]> } {
  let right = 0;
  const wrong: Array<[string, string, string]> = [];
  const byLang = new Map<string, [number, number]>();
  for (const row of rows) {
    const g = guessAction(row.text, weights, row.near);
    const got = g.action?.id ?? 'unknown';
    const ok = got === row.want;
    if (ok) right++;
    else wrong.push([row.text, row.want, got]);
    const l = byLang.get(row.lang) ?? [0, 0];
    byLang.set(row.lang, [l[0] + (ok ? 1 : 0), l[1] + 1]);
  }
  return { acc: right / Math.max(1, rows.length), wrong, byLang };
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

const all = gitExamples();
const held = new Set(
  [...new Set(all.map((e) => e.template))].filter((t) => Number(t.split('/').pop()) % 5 === 2),
);
const trial = trainHeads(all.filter((e) => !held.has(e.template)));
const heldRows = all
  .filter((e) => held.has(e.template))
  .map((e) => ({ text: e.text, want: idOf(e), lang: e.lang }));
const h = score(heldRows, trial);
console.log(
  `examples ${all.length}, held out ${held.size} templates (${heldRows.length} sentences): ${pct(h.acc)}`,
);

const final = trainHeads(all);
let testScore = 0;

// The blind corpus: git rows only (whether a line is git at all is the shape model's question).
interface CorpusRow {
  text: string;
  lang: string;
  action: string | null;
  ctx?: { object?: GitObject };
}
const corpusPath = join(import.meta.dirname, '../tests/box/git/corpus.json');
const corpus = (JSON.parse(readFileSync(corpusPath, 'utf8')) as CorpusRow[]).filter(
  (r) => r.action !== null,
);
// Halves by a hash of the text, so they never change as rows are added.
const half = (text: string): 'dev' | 'test' => {
  let x = 0;
  for (const ch of text) x = (x * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return x % 2 ? 'dev' : 'test';
};
for (const which of ['dev', 'test'] as const) {
  const rows = corpus
    .filter((r) => half(r.text) === which)
    .map((r) => ({
      text: r.text,
      want: r.action as string,
      lang: r.lang,
      ...(r.ctx?.object ? { near: { object: r.ctx.object } } : {}),
    }));
  const s = score(rows, final);
  if (which === 'test') testScore = s.acc;
  console.log(
    `corpus ${which} (${rows.length}): ${pct(s.acc)}   ${[...s.byLang]
      .map(([l, [a, b]]) => `${l} ${a}/${b}`)
      .join(' ')}`,
  );
  if (which === 'dev' && process.argv.includes('--wrong'))
    for (const [text, want, got] of s.wrong) console.log(`  ✗ ${want} → ${got}: ${text}`);
}

// ---------------------------------------------------------------- the gate

/*
 * Git or not, for the first layer (src/box/git/gate.ts): every git sentence above, the card
 * model's own repository sentences, against every other card's sentences and the everyday ones
 * that only sound like git. Held-out measure: the corpus, whose everyday rows are a tenth of it.
 */
const shape = shapeExamples();
const gateRows: Array<{ text: string; y: number }> = [
  ...all.filter((_, i) => i % 3 === 0).map((e) => ({ text: e.text, y: 1 })),
  ...shape.map((e) => ({ text: e.text, y: e.label === 'issue' ? 1 : 0 })),
  ...[...Object.values(NOT_GIT).flat(), ...Object.values(NOT_GIT_PHRASES).flat()].flatMap((text) =>
    // The everyday sentences are few; each is seen as often as a template's.
    Array.from({ length: 6 }, () => ({ text, y: 0 })),
  ),
];
const gateTrained = train(
  gateRows.map((r) => ({ f: gitFeatures(spansOf(r.text), BUCKETS), y: r.y })),
  2,
  3,
);
const gate: GateWeights = {
  version: '1',
  buckets: BUCKETS,
  head: pack(gateTrained, ['other', 'git']),
};
{
  const all = JSON.parse(readFileSync(corpusPath, 'utf8')) as CorpusRow[];
  for (const which of ['dev', 'test'] as const) {
    const rows = all.filter((r) => half(r.text) === which);
    let right = 0;
    for (const r of rows) {
      const p =
        headProbabilities(gate.head, gitFeatures(spansOf(r.text), BUCKETS), BUCKETS).git ?? 0;
      if (p >= 0.5 === (r.action !== null)) right++;
    }
    console.log(`gate on the corpus ${which} (${rows.length}): ${pct(right / rows.length)}`);
  }
}
writeFileSync(
  join(import.meta.dirname, '../src/box/git/gate-weights.ts'),
  `/**\n * The git gate's weights. Written by tools/train-git.ts; do not edit.\n */\n\n` +
    `import type { GateWeights } from '@core/box/git/gate.ts';\n\n` +
    `export const GATE_WEIGHTS: GateWeights | null = ${JSON.stringify(gate)};\n`,
);

const out = join(import.meta.dirname, '../src/box/git/weights.ts');
writeFileSync(
  out,
  `/**\n * The trained weights of the git model. Written by tools/train-git.ts; do not edit.\n *\n` +
    ` * Held-out templates when written: ${pct(h.acc)}; the blind corpus's test half: ${pct(testScore)}.\n */\n\n` +
    `import type { GitWeights } from '@core/box/git/model.ts';\n\n` +
    `export const GIT_WEIGHTS: GitWeights = ${JSON.stringify(final)};\n`,
);
console.log(`wrote ${out}`);
