/**
 * Which card a line of text is: the one decision, made by a model small enough to ship inside the
 * page.
 *
 * A multinomial logistic regression over two kinds of evidence: the named facts in rules.ts, and
 * hashed character and word n-grams (so "ناهار" and "brunch" count for an event without a rule
 * naming them). It is trained offline on generated sentences in English and Persian
 * (tools/train-shape.ts) and its weights are int8, a few tens of kilobytes; a prediction is a few
 * hundred multiply-adds, well under a millisecond, in the browser or on the server, with no
 * network and nothing to install.
 *
 * It answers the way Shapeshift's Jev does -- one choice with a probability for every option,
 * plus a handful of signals (is it a video call, is it urgent) -- because that shape is what the
 * bar's calm state machine (decide.ts) is built on. With no weights it falls back to the hand
 * weights of the rules, and says so in `model`.
 */

import { gitChance } from '@core/box/git/gate.ts';
import type { ShapeIntent } from '@core/box/intents.ts';
import { completeness } from '@core/box/parse.ts';
import { ruleFeatures, ruleScores } from '@core/box/rules.ts';
import { norm } from '@core/box/text.ts';
import { WEIGHTS } from '@core/box/weights.ts';

export type IntentKey = ShapeIntent | 'none';

export const INTENT_KEYS: readonly IntentKey[] = [
  'event',
  'reminder',
  'todo',
  'timer',
  'habit',
  'color',
  'split',
  'expense',
  'convert',
  'calc',
  'travel',
  'poll',
  'contact',
  'link',
  'countdown',
  'timezone',
  'random',
  'goal',
  'issue',
  'note',
  'none',
];

export interface Signals {
  isQuestion: boolean;
  recurring: boolean;
  urgent: boolean;
  tone: 'neutral' | 'positive' | 'excited' | 'stressed' | 'reflective';
  eventMode: 'in_person' | 'video_call' | 'phone_call' | null;
  transport: 'flight' | 'train' | 'bus' | 'car' | null;
  tripType: 'work' | 'leisure' | null;
  expenseCategory: 'food' | 'transport' | 'shopping' | 'bills' | 'entertainment' | 'health' | null;
  colorMood: 'warm' | 'cool' | 'neutral' | 'vivid' | 'pastel' | 'dark' | null;
  timerKind: 'countdown' | 'focus' | 'break' | 'stopwatch';
  hasExplicitOptions: boolean;
  isShoppingList: boolean;
}

export interface ShapeResult {
  intent: { value: IntentKey; confidence: number; probabilities: Record<IntentKey, number> };
  /** 0..2: how complete the text is for the card it most likely is. */
  readiness: number;
  signals: Signals;
  model: string;
}

export interface Weights {
  version: string;
  classes: IntentKey[];
  rules: string[];
  buckets: number;
  /** int8 weights, classes x (rules + buckets), row-major, base64. */
  w: string;
  scale: number;
  bias: number[];
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

/** Sparse features: rule index (or rules.length + bucket) to value. */
export function features(
  t: string,
  rules: readonly string[],
  buckets: number,
): Map<number, number> {
  const out = new Map<number, number>();
  // The named facts, and the hand-weighted score each kind gets from them: the model starts
  // from what the rules know and learns only where they are wrong.
  const f: Record<string, number> = { ...ruleFeatures(t) };
  for (const [k, v] of Object.entries(ruleScores(t))) if (v) f[`score.${k}`] = v / 6;
  rules.forEach((name, i) => {
    const v = f[name];
    if (v) out.set(i, v);
  });
  const add = (key: string, v: number): void => {
    const i = rules.length + (fnv(key) % buckets);
    out.set(i, (out.get(i) ?? 0) + v);
  };
  // Digits say little on their own and a lot as a shape: 450 and 2400 are both "a number".
  const shape = ` ${t.replace(/\d+/g, '0')} `;
  for (let n = 3; n <= 4; n++) {
    for (let i = 0; i + n <= shape.length; i++) add(`c${n}:${shape.slice(i, i + n)}`, 0.12);
  }
  const words = shape.trim().split(/\s+/).filter(Boolean);
  for (const w of words) add(`w:${w}`, 0.5);
  for (let i = 0; i + 1 < words.length; i++) add(`b:${words[i]} ${words[i + 1]}`, 0.35);
  return out;
}

let unpacked: { w: Int8Array; cols: number } | null = null;

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

/** The probabilities for every class, from the model or, without one, from the rules. */
export function probabilities(
  text: string,
  weights: Weights | null = WEIGHTS,
): {
  probs: Record<IntentKey, number>;
  model: string;
} {
  const t = norm(text);
  if (!weights) {
    const s = ruleScores(t);
    const p = softmax(INTENT_KEYS.map((k) => (s[k] ?? 0) / 0.8));
    return {
      probs: Object.fromEntries(INTENT_KEYS.map((k, i) => [k, p[i] ?? 0])) as Record<
        IntentKey,
        number
      >,
      model: 'grimstroke-rules',
    };
  }
  const cols = weights.rules.length + weights.buckets;
  if (!unpacked || unpacked.cols !== cols) unpacked = { w: decode(weights.w), cols };
  const w = unpacked.w;
  const f = features(t, weights.rules, weights.buckets);
  const logits = weights.classes.map((_, c) => {
    let z = weights.bias[c] ?? 0;
    for (const [i, v] of f) z += (w[c * cols + i] ?? 0) * weights.scale * v;
    return z;
  });
  const p = softmax(logits);
  const probs = Object.fromEntries(INTENT_KEYS.map((k) => [k, 0])) as Record<IntentKey, number>;
  weights.classes.forEach((k, i) => {
    probs[k] = p[i] ?? 0;
  });
  return { probs, model: `grimstroke-shape-${weights.version}` };
}

// ---------------------------------------------------------------- signals

export function signalsOf(text: string): Signals {
  const t = norm(text);
  const pick = <T>(rules: Array<[RegExp, T]>, fallback: T): T => {
    for (const [re, v] of rules) if (re.test(t)) return v;
    return fallback;
  };
  return {
    isQuestion:
      /[?]\s*$|^(what|why|how|when|where|who|should|could|would|is|are|do|does|can)\b|^(چرا|چطور|کی|کجا|آیا)/.test(
        t,
      ),
    recurring:
      /\b(every|daily|weekly|monthly|each (day|week|morning)|\dx a week|times a week|repeat)|هر روز|هر هفته|روزانه|هفتگی|ماهانه|هفته ?ای/.test(
        t,
      ),
    urgent:
      /\b(urgent|asap|immediately|right now|important|critical)\b|!!|فوری|مهم|همین الان|سریع/.test(
        t,
      ),
    tone: pick<Signals['tone']>(
      [
        [
          /\b(worried|stressed|anxious|ugh|deadline|panic|tired|frustrat)|نگران|استرس|خسته|کلافه/,
          'stressed',
        ],
        [/\b(can'?t wait|excited|yay|so pumped)|!{1,}$|هیجان|ذوق|عالیه/, 'excited'],
        [/\b(grateful|happy|love|thankful|glad|great)\b|خوشحال|ممنون|عاشق|خوب بود/, 'positive'],
        [
          /\b(wonder|thinking about|realized|reflect|maybe|lately|i think)\b|فکر می کنم|شاید|این روزها|آروم/,
          'reflective',
        ],
      ],
      'neutral',
    ),
    eventMode: pick<Signals['eventMode']>(
      [
        [
          /\b(zoom|meet|teams|facetime|video|skype|discord)\b|زوم|گوگل میت|اسکای روم|تصویری/,
          'video_call',
        ],
        [/\b(phone|call|ring)\b|تلفنی|زنگ/, 'phone_call'],
        [
          /\b(dinner|lunch|breakfast|coffee|drinks|party|at [a-z]+)\b|شام|ناهار|صبحانه|کافه|رستوران|مهمونی/,
          'in_person',
        ],
      ],
      null,
    ),
    transport: pick<Signals['transport']>(
      [
        [/\b(flight|fly|flying|plane|airport)\b|پرواز|هواپیما|فرودگاه/, 'flight'],
        [/\b(train|rail)\b|قطار/, 'train'],
        [/\b(bus|coach)\b|اتوبوس/, 'bus'],
        [/\b(drive|car|road ?trip)\b|ماشین|جاده/, 'car'],
      ],
      null,
    ),
    tripType: pick<Signals['tripType']>(
      [
        [
          /\b(work|business|conference|client|offsite|meeting)\b|کاری|کنفرانس|همایش|ماموریت/,
          'work',
        ],
        [
          /\b(vacation|holiday|beach|getaway|leisure|visit|weekend)\b|تعطیلات|تفریح|ساحل|آخر ?هفته|دیدن/,
          'leisure',
        ],
      ],
      null,
    ),
    expenseCategory: pick<Signals['expenseCategory']>(
      [
        [
          /\b(uber|ola|cab|taxi|fuel|petrol|metro|bus|train|parking)\b|اسنپ|تپسی|تاکسی|بنزین|مترو|پارکینگ/,
          'transport',
        ],
        [
          /\b(food|lunch|dinner|breakfast|coffee|groceries|pizza|restaurant|drinks)\b|غذا|ناهار|شام|صبحانه|قهوه|کافه|رستوران|پیتزا|خرید خونه|سوپر/,
          'food',
        ],
        [
          /\b(rent|electricity|wifi|internet|bill|recharge|netflix|spotify|subscription)\b|اجاره|قبض|برق|آب|گاز|اینترنت|شارژ|اشتراک/,
          'bills',
        ],
        [/\b(movie|concert|game|tickets?|show)\b|سینما|کنسرت|بازی|بلیط|تئاتر/, 'entertainment'],
        [
          /\b(medicine|doctor|pharmacy|gym|hospital)\b|دارو|دکتر|داروخانه|باشگاه|بیمارستان/,
          'health',
        ],
        [
          /\b(shoes|shirt|clothes|amazon|phone|laptop|headphones|gift)\b|کفش|لباس|گوشی|لپ ?تاپ|هدفون|کادو|دیجی ?کالا/,
          'shopping',
        ],
      ],
      null,
    ),
    colorMood: pick<Signals['colorMood']>(
      [
        [/\b(pastel|soft|pale|baby|light)\b|پاستلی|ملایم|روشن/, 'pastel'],
        [/\b(dark|deep|midnight|navy)\b|تیره|سرمه/, 'dark'],
        [/\b(neon|vivid|bright|electric|hot)\b|جیغ|فسفری|براق/, 'vivid'],
        [
          /\b(warm|sunset|fire|red|orange|yellow|amber|coral|peach|gold)\b|گرم|قرمز|نارنجی|زرد|طلایی/,
          'warm',
        ],
        [
          /\b(cool|ocean|sea|sky|blue|green|teal|purple|mint|ice)\b|سرد|آبی|سبز|بنفش|فیروزه/,
          'cool',
        ],
        [/\b(grey|gray|beige|sand|stone|neutral|cream)\b|طوسی|خاکستری|بژ|کرم/, 'neutral'],
      ],
      null,
    ),
    timerKind: pick<Signals['timerKind']>(
      [
        [/\b(focus|pomodoro|deep work|study|work)\b|تمرکز|پومودورو|درس|مطالعه|کار/, 'focus'],
        [/\b(break|rest|nap|breather)\b|استراحت|چرت/, 'break'],
        [/\b(stopwatch|count up)\b|کرنومتر/, 'stopwatch'],
      ],
      'countdown',
    ),
    hasExplicitOptions: /\b\S+\s+(or|vs)\s+\S+|\S+ یا \S+/.test(t),
    isShoppingList:
      /\b(buy|get|groceries|shopping|milk|eggs|bread|coffee|pick up|order)\b|بخر|خرید|شیر|نان|تخم ?مرغ/.test(
        t,
      ),
  };
}

// ---------------------------------------------------------------- the answer

const NONE: ShapeResult['intent'] = {
  value: 'none',
  confidence: 1,
  probabilities: Object.fromEntries(INTENT_KEYS.map((k) => [k, k === 'none' ? 1 : 0])) as Record<
    IntentKey,
    number
  >,
};

/** Classify a line. `ref` is the moment it is read against, for how complete a card is. */
export function classify(
  text: string,
  ref: Date = new Date(),
  weights: Weights | null = WEIGHTS,
): ShapeResult {
  const trimmed = text.trim();
  if (trimmed.length < 2)
    return { intent: NONE, readiness: 0, signals: signalsOf(''), model: 'none' };
  const { probs, model } = probabilities(trimmed, weights);
  // The first layer has the say on the repositories' kind -- everything said to git -- and the
  // card model shares the rest out as it would have (git/gate.ts).
  if (weights) {
    const git = gitChance(trimmed);
    const rest = 1 - (probs.issue ?? 0);
    for (const k of INTENT_KEYS)
      probs[k] = k === 'issue' ? git : rest > 0 ? ((probs[k] ?? 0) / rest) * (1 - git) : 0;
  }
  let value: IntentKey = 'none';
  for (const k of INTENT_KEYS) if ((probs[k] ?? 0) > (probs[value] ?? 0)) value = k;
  const readiness = value === 'none' ? 0 : Math.min(2, completeness(value, trimmed, ref) * 2);
  return {
    intent: { value, confidence: probs[value] ?? 0, probabilities: probs },
    readiness,
    signals: signalsOf(trimmed),
    model,
  };
}
