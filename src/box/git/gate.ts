/**
 * The first layer: is a line said to git at all?
 *
 * A tiny model of its own -- two classes, a few kilobytes -- run before anything else on every
 * keystroke, in the browser as on the server. It is kept apart from the card model (classify.ts)
 * so that teaching it "push the meeting to friday is not git" never moves where a meeting or a
 * todo goes; classify.ts only takes its answer as the chance of the repositories' kind. What the
 * line asks of git is the second layer's question (model.ts), loaded only when this says yes.
 */

import { GATE_WEIGHTS } from '@core/box/git/gate-weights.ts';
import { gitFeatures, type Head, headProbabilities } from '@core/box/git/model.ts';
import { spansOf } from '@core/box/git/slots.ts';

export interface GateWeights {
  version: string;
  buckets: number;
  /** Classes: 'other', 'git'. */
  head: Head;
}

/** How likely a line is something to do with git: 0..1. */
export function gitChance(text: string, weights: GateWeights | null = GATE_WEIGHTS): number {
  if (!weights || text.trim().length < 2) return 0;
  const f = gitFeatures(spansOf(text), weights.buckets);
  return headProbabilities(weights.head, f, weights.buckets).git ?? 0;
}
