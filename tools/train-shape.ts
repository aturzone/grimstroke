/**
 * Train the shape classifier and write its weights.
 *
 *   node --import ./tools/register.mjs tools/train-shape.ts
 *
 * Softmax regression by SGD on the generated sentences (tools/shape-data.ts). It first trains
 * with a fifth of the TEMPLATES held out and reports accuracy on them, next to the hand-weighted
 * rules on the same held-out set -- the model has to beat the rules to be worth shipping -- and
 * then trains on everything and writes src/draw/shape/weights.ts as int8.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  features,
  INTENT_KEYS,
  type IntentKey,
  probabilities,
  type Weights,
} from '~/draw/shape/classify.ts';
import { ruleFeatures } from '~/draw/shape/rules.ts';
import { norm } from '~/draw/shape/text.ts';
import { type Example, examples } from './shape-data.ts';

const BUCKETS = 2048;
const EPOCHS = 18;
const L2 = 1e-4;

function ruleNames(data: Example[]): string[] {
  const names = new Set<string>();
  for (const ex of data) for (const k of Object.keys(ruleFeatures(norm(ex.text)))) names.add(k);
  for (const k of INTENT_KEYS) names.add(`score.${k}`);
  return [...names].sort();
}

interface Model {
  w: Float32Array;
  bias: Float32Array;
  cols: number;
  rules: string[];
}

function train(data: Example[], rules: string[], seed = 1): Model {
  const C = INTENT_KEYS.length;
  const cols = rules.length + BUCKETS;
  const w = new Float32Array(C * cols);
  const bias = new Float32Array(C);
  const rows = data.map((ex) => ({
    f: features(norm(ex.text), rules, BUCKETS),
    y: INTENT_KEYS.indexOf(ex.label),
  }));
  let s = seed;
  const rand = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const lr = 0.5 / (1 + epoch * 0.35);
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rows[i], rows[j]] = [rows[j] as (typeof rows)[number], rows[i] as (typeof rows)[number]];
    }
    for (const { f, y } of rows) {
      const z = new Float64Array(C);
      for (let c = 0; c < C; c++) {
        let v = bias[c] as number;
        for (const [k, x] of f) v += (w[c * cols + k] as number) * x;
        z[c] = v;
      }
      const max = Math.max(...z);
      let sum = 0;
      for (let c = 0; c < C; c++) {
        z[c] = Math.exp((z[c] as number) - max);
        sum += z[c] as number;
      }
      for (let c = 0; c < C; c++) {
        const g = (z[c] as number) / sum - (c === y ? 1 : 0);
        if (Math.abs(g) < 1e-4) continue;
        bias[c] = (bias[c] as number) - lr * g;
        for (const [k, x] of f) {
          const idx = c * cols + k;
          w[idx] = (w[idx] as number) * (1 - lr * L2) - lr * g * x;
        }
      }
    }
  }
  return { w, bias, cols, rules };
}

function pack(m: Model): Weights {
  let max = 0;
  for (const v of m.w) max = Math.max(max, Math.abs(v));
  const scale = max / 127 || 1;
  const bytes = new Int8Array(m.w.length);
  m.w.forEach((v, i) => {
    bytes[i] = Math.max(-127, Math.min(127, Math.round(v / scale)));
  });
  return {
    version: '1',
    classes: [...INTENT_KEYS],
    rules: m.rules,
    buckets: BUCKETS,
    w: Buffer.from(bytes.buffer).toString('base64'),
    scale,
    bias: [...m.bias].map((b) => Math.round(b * 1e4) / 1e4),
  };
}

function accuracy(
  data: Example[],
  weights: Weights | null,
): { acc: number; wrong: Array<[string, IntentKey, IntentKey]> } {
  let right = 0;
  const wrong: Array<[string, IntentKey, IntentKey]> = [];
  for (const ex of data) {
    const { probs } = probabilities(ex.text, weights);
    let top: IntentKey = 'none';
    for (const k of INTENT_KEYS) if ((probs[k] ?? 0) > (probs[top] ?? 0)) top = k;
    if (top === ex.label) right++;
    else wrong.push([ex.text, ex.label, top]);
  }
  return { acc: right / data.length, wrong };
}

const all = examples();
const templates = [...new Set(all.map((e) => e.template))];
// Every fifth template of each kind is held out.
const held = new Set(templates.filter((t) => Number(t.split('/')[1]) % 5 === 2));
const trainSet = all.filter((e) => !held.has(e.template));
const testSet = all.filter((e) => held.has(e.template));
const rules = ruleNames(all);

const trial = pack(train(trainSet, rules));
const model = accuracy(testSet, trial);
const baseline = accuracy(testSet, null);
// Whole sentences only: a sentence cut off mid-word is sometimes nothing yet, for anyone.
const whole = testSet.filter((e) => !e.cut);
const modelWhole = accuracy(whole, trial);
const baseWhole = accuracy(whole, null);
console.log(
  `examples ${all.length}, templates ${templates.length}, held out ${held.size} templates (${testSet.length} sentences)`,
);
console.log(
  `held-out accuracy: model ${(model.acc * 100).toFixed(1)}%   rules alone ${(baseline.acc * 100).toFixed(1)}%`,
);
console.log(
  `  whole sentences: model ${(modelWhole.acc * 100).toFixed(1)}%   rules alone ${(baseWhole.acc * 100).toFixed(1)}%`,
);
const confusion = new Map<string, number>();
for (const [, want, got] of modelWhole.wrong)
  confusion.set(`${want} → ${got}`, (confusion.get(`${want} → ${got}`) ?? 0) + 1);
for (const [k, v] of [...confusion].sort((a, b) => b[1] - a[1]).slice(0, 12))
  console.log(`  ${v}× ${k}`);
const seen = new Set<string>();
for (const [text, want, got] of modelWhole.wrong) {
  if (seen.has(`${want}${got}`)) continue;
  seen.add(`${want}${got}`);
  console.log(`  ✗ ${want} → ${got}: ${text}`);
}

const final = pack(train(all, rules));
const fit = accuracy(all, final);
console.log(`trained on everything: ${(fit.acc * 100).toFixed(1)}% on the training sentences`);

const out = join(import.meta.dirname, '../src/draw/shape/weights.ts');
writeFileSync(
  out,
  `/**\n * The trained weights of the shape classifier. Written by tools/train-shape.ts; do not edit.\n *\n` +
    ` * Held-out accuracy when written: ${(model.acc * 100).toFixed(1)}% (rules alone ${(baseline.acc * 100).toFixed(1)}%).\n */\n\n` +
    `import type { Weights } from './classify.ts';\n\n` +
    `export const WEIGHTS: Weights | null = ${JSON.stringify(final)};\n`,
);
console.log(`wrote ${out} (${Math.round(final.w.length / 1024)} KB of weights)`);
