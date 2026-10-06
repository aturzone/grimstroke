/**
 * A git sentence, understood: which action, with what, where, and whether it may be done as it
 * stands -- the plan the core shows before anything is done, and does once it is confirmed.
 *
 * The layers, cheapest first. The shape model (classify.ts) runs on every keystroke and says
 * whether a line is about repositories at all. Only then is this module loaded -- by the server
 * and the command line, with `import()` -- and with it the git model (model.ts) and its weights:
 * which verb on which object. The slot readers (slots.ts) then find what the action is told, the
 * conversation (`GitContext.last`) fills what "it" and "that one" mean, and what is still
 * missing is said, not guessed.
 *
 * Pure: no network, no disk. git/do.ts does what a plan says.
 */

import { type GitAction, gitAction, type SlotName, type Weight } from '@core/box/git/actions.ts';
import { type GitGuess, guessAction } from '@core/box/git/model.ts';
import { type GitSlots, placeSaid, readSlots, saysThat } from '@core/box/git/slots.ts';
import { GIT_WEIGHTS } from '@core/box/git/weights.ts';
import { type Lang, langOf } from '@core/box/text.ts';

/** What was being talked about, and where grimstroke is standing. */
export interface GitContext {
  last?: {
    object?: GitAction['object'];
    number?: string;
    repo?: string;
    branch?: string;
    ref?: string;
    tag?: string;
  };
  /** A working copy here (the command line run inside one), and its branch. */
  local?: { root: string; branch?: string } | null;
}

export interface GitPlan {
  text: string;
  lang: Lang;
  /** null: about git, but nothing the box can do -- `others` says what it can. */
  action: GitAction | null;
  confidence: number;
  slots: GitSlots;
  /** Where it is done, for an action that can be done in either place. */
  where: 'remote' | 'local' | 'account' | null;
  /** What it cannot be done without, and nothing said it. */
  missing: SlotName[];
  weight: Weight | null;
  /** Done only once confirmed: anything that changes something. */
  confirm: boolean;
  /** Filled from what was talked about, not from the sentence. */
  fromContext: SlotName[];
  others: Array<{ id: string; p: number }>;
  /** What will happen, in the sentence's language. */
  says: string;
}

/** Below this the plan is offered as a guess, with the others beside it, never done on Enter. */
export const SURE_ENOUGH = 0.55;

export function understandGit(text: string, ctx: GitContext = {}): GitPlan {
  const lang = langOf(text);
  const near = ctx.last?.object ? { object: ctx.last.object } : undefined;
  const guess: GitGuess = guessAction(text, GIT_WEIGHTS, near);
  const action = feasible(guess, ctx);
  if (!action)
    return {
      text,
      lang,
      action: null,
      confidence: guess.confidence,
      slots: {},
      where: null,
      missing: [],
      weight: null,
      confirm: false,
      fromContext: [],
      others: guess.others,
      says: notKnown(lang),
    };

  const slots = readSlots(text, action, guess.spans);
  const fromContext: SlotName[] = [];
  const last = ctx.last ?? {};
  const wants = new Set<SlotName>([...action.needs, ...action.takes]);
  // "close it", "merge that one": the thing talked about, when it is the same kind of thing.
  const same = last.object === action.object || saysThat(text);
  if (wants.has('number') && !slots.number && last.number && same) {
    slots.number = last.number;
    fromContext.push('number');
  }
  if (wants.has('repo') && !slots.repo && last.repo) {
    slots.repo = last.repo;
    fromContext.push('repo');
  }
  if (wants.has('ref') && !slots.ref && last.ref && same) {
    slots.ref = last.ref;
    fromContext.push('ref');
  }
  if (wants.has('tag') && !slots.tag && last.tag && same) {
    slots.tag = last.tag;
    fromContext.push('tag');
  }
  if (wants.has('branch') && !slots.branch && last.branch && same) {
    slots.branch = last.branch;
    fromContext.push('branch');
  }

  const where =
    action.scope === 'both'
      ? (placeSaid(text) ?? (ctx.local && !slots.repo ? 'local' : 'remote'))
      : action.scope;
  // What the place itself answers: the branch a push is on is the one checked out.
  const missing = action.needs.filter((s) => {
    if (s === 'branch' && where === 'local' && ctx.local?.branch && action.verb !== 'switch')
      return false;
    if (s === 'body' && action.id === 'local.commit') return !slots.body;
    return slots[s as keyof GitSlots] === undefined;
  });

  return {
    text,
    lang,
    action,
    confidence: guess.confidence,
    slots,
    where,
    missing,
    weight: action.weight,
    confirm: action.weight !== 'read',
    fromContext,
    others: guess.others,
    says: describe(action, slots, where, lang),
  };
}

/**
 * The likeliest action that can be done with what was said. "Open PRs?" reads a little like
 * showing one pull request, but no number was said and none was talked about, so it is the list:
 * an action whose number, commit or version the sentence lacks gives way to a near rival that
 * needs none -- never to a far one.
 */
function feasible(guess: GitGuess, ctx: GitContext): GitAction | null {
  const top = guess.action;
  if (!top) return null;
  const s = guess.spans;
  const has: Partial<Record<SlotName, boolean>> = {
    number:
      s.hashes.length > 0 ||
      s.numbers.length > 0 ||
      Boolean(ctx.last?.number && ctx.last.object === top.object),
    ref: s.shas.length > 0 || s.paths.length > 0 || Boolean(ctx.last?.ref),
    tag: s.versions.length > 0 || Boolean(ctx.last?.tag),
  };
  const lacks = (a: GitAction): boolean => a.needs.some((n) => has[n] === false);
  if (!lacks(top)) return top;
  const best = guess.confidence;
  for (const o of guess.others) {
    const a = gitAction(o.id);
    if (a && !lacks(a) && o.p >= best * 0.25) return a;
  }
  return top;
}

function notKnown(lang: Lang): string {
  return lang === 'fa'
    ? 'این کار گیت را هنوز بلد نیستم'
    : lang === 'ru'
      ? 'Это действие с git я пока не умею'
      : 'That is git, but not something I can do yet';
}

/** One line saying what will be done: "Close issue #12 in web". */
export function describe(
  action: GitAction,
  s: GitSlots,
  where: GitPlan['where'],
  lang: Lang,
): string {
  const head = lang === 'fa' ? action.fa : lang === 'ru' ? action.ru : action.en;
  const bits: string[] = [];
  if (s.number) bits.push(`#${s.number}`);
  if (s.branch) bits.push(s.base ? `${s.branch} → ${s.base}` : s.branch);
  else if (s.base) bits.push(s.base);
  if (s.ref) bits.push(s.ref.slice(0, 12));
  if (s.tag) bits.push(s.tag);
  if (s.path) bits.push(s.path);
  if (s.people?.length) bits.push(s.people.map((p) => (p === '@me' ? p : `@${p}`)).join(' '));
  if (s.labels?.length) bits.push(s.labels.map((l) => `[${l}]`).join(' '));
  if (s.milestone) bits.push(s.milestone);
  if (s.state) bits.push(s.state);
  if (s.mine) bits.push(lang === 'fa' ? 'مال من' : lang === 'ru' ? 'мои' : 'mine');
  if (s.query) bits.push(`“${s.query}”`);
  if (s.method)
    bits.push(
      s.method === 'squash'
        ? lang === 'fa'
          ? 'اسکواش'
          : lang === 'ru'
            ? 'сквош'
            : 'squashed'
        : s.method,
    );
  if (s.draft) bits.push(lang === 'fa' ? 'پیش‌نویس' : lang === 'ru' ? 'черновик' : 'draft');
  if (s.force) bits.push(lang === 'fa' ? 'به زور' : lang === 'ru' ? 'принудительно' : 'forced');
  if (s.repo)
    bits.push(lang === 'fa' ? `در ${s.repo}` : lang === 'ru' ? `в ${s.repo}` : `in ${s.repo}`);
  if (where === 'local' && action.scope === 'both')
    bits.push(lang === 'fa' ? '(روی این سیستم)' : lang === 'ru' ? '(локально)' : '(here)');
  const line = `${head}${bits.length ? ` ${bits.join(' ')}` : ''}`;
  const words = s.title ?? s.body;
  return words ? `${line}: ${words.length > 80 ? `${words.slice(0, 77)}…` : words}` : line;
}
