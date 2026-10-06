/**
 * The git model: which verb a sentence does to which object.
 *
 * The second layer of the box. The first -- the shape model (classify.ts), which every keystroke
 * runs -- only says that a line is about repositories; this one is loaded the first time it does
 * (understand.ts is imported on demand), so a workspace that never says a word about git never
 * holds it in memory.
 *
 * Two small heads, the same kind of model as the shape model (multinomial logistic regression,
 * int8 weights): one reads the verb, one reads the object, and the answer is the likeliest pair
 * that actions.ts says exists. A head learns a word once -- "смёржи" is merge whether a pull
 * request or a branch follows -- and the pair keeps it from answering nonsense.
 *
 * It reads the sentence with its numbers, names and messages masked (slots.ts), and the words
 * after a colon apart from the ones before: "comment on #3: close this later" is a comment.
 */

import {
  GIT_ACTIONS,
  GIT_OBJECTS,
  GIT_VERBS,
  type GitAction,
  type GitObject,
  type GitVerb,
} from '@core/box/git/actions.ts';
import { type Spans, saysThat, spansOf } from '@core/box/git/slots.ts';
import { GIT_SPEECH, stemPattern } from '@core/box/git/words.ts';

/** The verb head's classes: every verb, and "something git, but not one of these". */
export const VERB_CLASSES = [...GIT_VERBS, 'other'] as const;
export type VerbClass = (typeof VERB_CLASSES)[number];

export interface Head {
  classes: string[];
  /** int8 weights, classes x buckets, row-major, base64. */
  w: string;
  scale: number;
  bias: number[];
}

export interface GitWeights {
  version: string;
  buckets: number;
  verb: Head;
  object: Head;
}

// ---------------------------------------------------------------- features

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Every language's stems for each verb and object, as one pattern each. */
const VERB_STEMS: Array<[GitVerb, RegExp[]]> = GIT_VERBS.map((v) => [
  v,
  [
    stemPattern(GIT_SPEECH.filter((s) => !s.dense).flatMap((s) => s.verbs[v] ?? [])),
    stemPattern(
      GIT_SPEECH.filter((s) => s.dense).flatMap((s) => s.verbs[v] ?? []),
      true,
    ),
  ].filter((r): r is RegExp => r !== null),
]);
const OBJECT_STEMS: Array<[GitObject, RegExp[]]> = GIT_OBJECTS.map((o) => [
  o,
  [
    stemPattern(GIT_SPEECH.filter((s) => !s.dense).flatMap((s) => s.objects[o])),
    stemPattern(
      GIT_SPEECH.filter((s) => s.dense).flatMap((s) => s.objects[o]),
      true,
    ),
  ].filter((r): r is RegExp => r !== null),
]);

/** Where in the sentence a pattern first matches: 0 at the start, 1 at the end, -1 nowhere. */
function where(res: RegExp[], t: string): number {
  let best = -1;
  for (const re of res) {
    const m = re.exec(t);
    if (m && (best < 0 || m.index / Math.max(1, t.length) < best))
      best = m.index / Math.max(1, t.length);
  }
  return best;
}

/** The named facts about a sentence, before any of its letters. */
export function gitFacts(s: Spans): Record<string, number> {
  const head = s.head.toLowerCase();
  const f: Record<string, number> = {};
  for (const [v, res] of VERB_STEMS) {
    const at = where(res, head);
    if (at < 0) continue;
    f[`v:${v}`] = 1;
    f[at < 0.34 ? `v<:${v}` : at > 0.6 ? `v>:${v}` : `v~:${v}`] = 1;
  }
  for (const [o, res] of OBJECT_STEMS) {
    const at = where(res, head);
    if (at < 0) continue;
    f[`o:${o}`] = 1;
    f[at < 0.34 ? `o<:${o}` : `o>:${o}`] = 0.5;
  }
  if (s.hashes.length) f['has:#'] = 1;
  if (s.numbers.length) f['has:n'] = 1;
  if (s.paths.length) f['has:path'] = 1;
  if (s.versions.length) f['has:ver'] = 1;
  if (s.shas.length) f['has:sha'] = 1;
  if (s.urls.length) f['has:url'] = 1;
  if (s.mentions.length) f['has:@'] = 1;
  if (s.quoted.length) f['has:quote'] = 1;
  if (s.tail) f['has:tail'] = 1;
  if (
    /[?؟]\s*$/.test(s.masked) ||
    /^(did|is|are|does|has|have|what|which|how|why|who|where|can|آیا|چرا|چی|کی|کدوم|ли|что|какие|как)\b/u.test(
      head,
    )
  )
    f.question = 1;
  if (/^git\s/.test(head)) f.git = 1;
  const n = head.split(/\s+/).filter(Boolean).length;
  f[n <= 2 ? 'len:1' : n <= 5 ? 'len:2' : n <= 10 ? 'len:3' : 'len:4'] = 1;
  return f;
}

/** Sparse features: bucket to value. */
export function gitFeatures(s: Spans, buckets: number): Map<number, number> {
  const out = new Map<number, number>();
  const add = (key: string, v: number): void => {
    const i = fnv(key) % buckets;
    out.set(i, (out.get(i) ?? 0) + v);
  };
  for (const [k, v] of Object.entries(gitFacts(s))) add(`f:${k}`, v);
  const head = ` ${s.head.toLowerCase().replace(/\s+/g, ' ').trim()} `;
  for (let n = 3; n <= 4; n++)
    for (let i = 0; i + n <= head.length; i++) add(`c${n}:${head.slice(i, i + n)}`, 0.12);
  const words = head.trim().split(/\s+/).filter(Boolean);
  for (const w of words) add(`w:${w}`, 0.5);
  for (let i = 0; i + 1 < words.length; i++) add(`b:${words[i]} ${words[i + 1]}`, 0.35);
  if (words[0]) add(`first:${words[0]}`, 0.5);
  const last = words[words.length - 1];
  if (last) add(`last:${last}`, 0.5);
  // The words after a colon count, less, and as themselves.
  for (const w of s.tail.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 12))
    add(`t:${w}`, 0.2);
  return out;
}

// ---------------------------------------------------------------- the heads

function decode(b64: string): Int8Array {
  const bin = atob(b64);
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

const unpacked = new WeakMap<Head, Int8Array>();

export function headProbabilities(
  head: Head,
  f: Map<number, number>,
  buckets: number,
): Record<string, number> {
  let w = unpacked.get(head);
  if (!w) {
    w = decode(head.w);
    unpacked.set(head, w);
  }
  const logits = head.classes.map((_, c) => {
    let z = head.bias[c] ?? 0;
    for (const [i, v] of f) z += (w[c * buckets + i] ?? 0) * head.scale * v;
    return z;
  });
  const p = softmax(logits);
  return Object.fromEntries(head.classes.map((k, i) => [k, p[i] ?? 0]));
}

export interface GitGuess {
  action: GitAction | null;
  /** How sure, among the actions there are: 0..1. */
  confidence: number;
  verb: { value: VerbClass; p: number };
  object: { value: GitObject; p: number };
  /** The next likeliest actions, for "did you mean". */
  others: Array<{ id: string; p: number }>;
  spans: Spans;
}

/**
 * Which action a sentence asks for. `near` is what was being talked about: "merge it" after a
 * pull request was shown is merging that pull request, and the object head, which cannot know
 * that from "it", is told so -- only when the sentence names no object of its own, or says "it".
 */
export function guessAction(
  text: string,
  weights: GitWeights,
  near?: { object?: GitObject | undefined },
): GitGuess {
  const spans = spansOf(text);
  const f = gitFeatures(spans, weights.buckets);
  const pv = headProbabilities(weights.verb, f, weights.buckets);
  const po = headProbabilities(weights.object, f, weights.buckets);
  if (
    near?.object &&
    (saysThat(text) || !OBJECT_STEMS.some(([, res]) => where(res, spans.head.toLowerCase()) >= 0))
  ) {
    for (const o of GIT_OBJECTS) po[o] = (po[o] ?? 0) * 0.35 + (o === near.object ? 0.65 : 0);
  }
  const scored = GIT_ACTIONS.map((a) => ({ a, s: (pv[a.verb] ?? 0) * (po[a.object] ?? 0) }));
  const total = scored.reduce((sum, x) => sum + x.s, 0) || 1;
  scored.sort((x, y) => y.s - x.s);
  const top = scored[0] as { a: GitAction; s: number };
  const verb = (Object.entries(pv) as Array<[VerbClass, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0] as [VerbClass, number];
  const object = (Object.entries(po) as Array<[GitObject, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0] as [GitObject, number];
  // "Something about git, but none of these": the verb head says so outright.
  const other = (pv.other ?? 0) > 0.5 || (pv.other ?? 0) > (pv[top.a.verb] ?? 0);
  return {
    action: other ? null : top.a,
    confidence: other ? (pv.other ?? 0) : top.s / total,
    verb: { value: verb[0], p: verb[1] },
    object: { value: object[0], p: object[1] },
    others: scored.slice(other ? 0 : 1, 4).map((x) => ({ id: x.a.id, p: x.s / total })),
    spans,
  };
}
