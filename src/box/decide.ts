/**
 * Turning a flickery stream of guesses into a calm bar.
 *
 * A guess arrives on every keystroke, and a bar that showed each one would change its mind four
 * times while "dinner with priya" is typed. So there are four states -- plain input, a faint
 * ghost of the likely card, a choice between two close guesses, and a committed card -- with
 * thresholds between them and inertia once committed: a challenger has to win twice running (or
 * be very sure) to replace the card on show. A kind picked by hand stays until the text changes
 * substantially.
 *
 * The thresholds and the inertia are Shapeshift's (anishfn/shapeshift, MIT), which found them by
 * watching people type; the code is written for this repository.
 */

import type { IntentKey, ShapeResult } from '@core/box/classify.ts';
import type { ShapeIntent } from '@core/box/intents.ts';

export type UiState =
  | { kind: 'input' }
  | { kind: 'ghost'; intent: ShapeIntent }
  | { kind: 'choose'; options: [ShapeIntent, ShapeIntent] }
  | { kind: 'committed'; intent: ShapeIntent; forced?: boolean };

export const THRESHOLDS = {
  inputBelow: 0.4,
  commitAt: 0.7,
  chooseGap: 0.15,
  chooseFloor: 0.25,
  challengerOverride: 0.85,
  challengerWins: 2,
  dropBelow: 0.3,
  forcedChangeRatio: 0.3,
} as const;

export interface Memory {
  ui: UiState;
  challenger: { intent: ShapeIntent; wins: number } | null;
  forcedText: string | null;
}

export const START: Memory = { ui: { kind: 'input' }, challenger: null, forcedText: null };

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

export function changedSubstantially(from: string, to: string): boolean {
  return levenshtein(from, to) > THRESHOLDS.forcedChangeRatio * Math.max(from.length, to.length, 1);
}

function ranked(r: ShapeResult): Array<[IntentKey, number]> {
  return (Object.entries(r.intent.probabilities) as Array<[IntentKey, number]>).sort(
    (a, b) => b[1] - a[1],
  );
}

/** One result, no history. */
export function rawState(r: ShapeResult): UiState {
  const top = r.intent.value;
  const conf = r.intent.confidence;
  const rk = ranked(r).filter(([k]) => k !== 'none');
  const close = (): [ShapeIntent, ShapeIntent] | null => {
    const [a, b] = rk;
    if (!a || !b) return null;
    return a[1] > THRESHOLDS.chooseFloor &&
      b[1] > THRESHOLDS.chooseFloor &&
      a[1] - b[1] < THRESHOLDS.chooseGap
      ? [a[0] as ShapeIntent, b[0] as ShapeIntent]
      : null;
  };
  if (top === 'none' || conf < THRESHOLDS.inputBelow) {
    const pair = top !== 'none' ? close() : null;
    return pair ? { kind: 'choose', options: pair } : { kind: 'input' };
  }
  const pair = close();
  if (pair) return { kind: 'choose', options: pair };
  if (conf < THRESHOLDS.commitAt) return { kind: 'ghost', intent: top };
  return { kind: 'committed', intent: top };
}

/** The next calm state, given the last one and a fresh result for `text`. */
export function decide(mem: Memory, r: ShapeResult, text: string): Memory {
  if (!text.trim()) return START;
  const prev = mem.ui;
  if (prev.kind === 'committed' && prev.forced && mem.forcedText !== null) {
    if (!changedSubstantially(mem.forcedText, text)) return mem;
  }
  const raw = rawState(r);
  if (prev.kind === 'committed' && !prev.forced) {
    const current = prev.intent;
    const top = r.intent.value;
    const topConf = r.intent.confidence;
    const currentP = r.intent.probabilities[current] ?? 0;
    if (top === current) return { ui: prev, challenger: null, forcedText: null };
    if (top === 'none') {
      if (currentP < THRESHOLDS.dropBelow)
        return { ui: { kind: 'input' }, challenger: null, forcedText: null };
      return { ...mem, challenger: null };
    }
    if (topConf >= THRESHOLDS.challengerOverride) {
      return { ui: { kind: 'committed', intent: top }, challenger: null, forcedText: null };
    }
    const wins = mem.challenger?.intent === top ? mem.challenger.wins + 1 : 1;
    if (wins >= THRESHOLDS.challengerWins && topConf >= THRESHOLDS.inputBelow) {
      return { ui: raw, challenger: null, forcedText: null };
    }
    if (currentP < THRESHOLDS.dropBelow && topConf < THRESHOLDS.inputBelow) {
      return { ui: { kind: 'input' }, challenger: null, forcedText: null };
    }
    return { ui: prev, challenger: { intent: top, wins }, forcedText: null };
  }
  return { ui: raw, challenger: null, forcedText: null };
}

/** A kind picked by hand, from the "/" list or a "did you mean" chip. */
export function force(intent: ShapeIntent, text: string): Memory {
  return { ui: { kind: 'committed', intent, forced: true }, challenger: null, forcedText: text };
}

/** Tab on a ghost: keep it, without locking it. */
export function promote(mem: Memory): Memory {
  return mem.ui.kind === 'ghost'
    ? { ui: { kind: 'committed', intent: mem.ui.intent }, challenger: null, forcedText: null }
    : mem;
}

export function activeIntent(ui: UiState): ShapeIntent | null {
  return ui.kind === 'committed' || ui.kind === 'ghost' ? ui.intent : null;
}
