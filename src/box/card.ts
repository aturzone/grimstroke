/**
 * A card the / box made, as data: what it is, the words it was made from, when, and what has
 * been done to it since -- and the line that says it, for search, for an agent and for a
 * reminder. How a card looks is a face's (it draws from exactly this).
 */

import { type Fields, readShape } from '@core/box/fields.ts';
import { INTENTS, type ShapeIntent } from '@core/box/intents.ts';
import { describeRandom, formatClock } from '@core/box/parse.ts';
import { formatAmount, isPersian, langOf } from '@core/box/text.ts';
import { UNITS } from '@core/box/units.ts';
import { daysBetween, formatWhen } from '@core/box/when.ts';
import { formatIn, localZone } from '@core/box/zones.ts';

/** What has been done to a card since it was made. Every field is optional. */
export interface ShapeState {
  /** Checklist: ticked item indices. */
  done?: number[];
  /** Poll: votes per option. */
  votes?: number[];
  /** Split: people and total, as changed on the card. */
  people?: number;
  total?: number;
  /** Habit: the days of the week (0 = Sunday) it happens on, as changed on the card. */
  days?: number[];
  /** Habit: dates (YYYY-MM-DD) it was done. */
  log?: string[];
  /** Goal: progress so far. */
  current?: number;
  /** Timer: seconds run so far, and when it was last started (epoch ms) if it is running. */
  elapsed?: number;
  startedAt?: number | null;
  /** Convert: the unit chosen to convert to. */
  to?: string;
  /** Random: the last result. */
  result?: string;
  /** Reminder, todo, event: marked as done. */
  closed?: boolean;
  /** Issue: opened, where and as which number. */
  issue?: { url: string; number: string | number };
  /**
   * Values set by hand, over what the text says: see fields.ts for each kind's keys. The older
   * `people`, `total`, `days`, `current` and `to` above are read beneath these.
   */
  fields?: Fields;
}

export interface ShapeBlock {
  kind: 'shape';
  intent: ShapeIntent;
  text: string;
  /** When it was made (ISO): what relative dates in its text are read against. */
  made?: string;
  state?: ShapeState;
}

/** One line for search, the saved list and an agent: "Dinner · Fri 26 Sep, 8 PM". */
export function summarize(block: ShapeBlock, at?: Date): string {
  const now = at ?? (block.made ? new Date(block.made) : new Date(0));
  const made = block.made ? new Date(block.made) : now;
  const fa = isPersian(block.text);
  const lang = langOf(block.text);
  const st = block.state ?? {};
  const whenOf = (d: Date | null, hasTime: boolean): string => {
    if (!d) return '';
    const w = formatWhen(d, hasTime, now, lang);
    return [w.day, w.time].filter(Boolean).join(fa ? '، ' : ', ');
  };
  const join = (...parts: Array<string | null | undefined | false>): string =>
    parts.filter(Boolean).join(' · ');
  const label = fa ? INTENTS[block.intent].fa : INTENTS[block.intent].label;
  switch (block.intent) {
    case 'event': {
      const d = readShape('event', block.text, made, st);
      return join(
        d.title || label,
        whenOf(d.date, d.hasTime),
        d.link ?? d.location,
        d.people.join(', '),
      );
    }
    case 'reminder': {
      const d = readShape('reminder', block.text, made, st);
      return join(
        d.task || label,
        whenOf(d.when, d.hasTime),
        st.closed && (fa ? 'انجام شد' : 'done'),
      );
    }
    case 'todo': {
      const d = readShape('todo', block.text, made, st);
      return join(`${(st.done ?? []).length}/${d.items.length}`, d.items.slice(0, 5).join(', '));
    }
    case 'timer': {
      const d = readShape('timer', block.text, made, st);
      return join(
        d.label || label,
        d.seconds ? formatClock(d.seconds) : fa ? 'کرنومتر' : 'stopwatch',
      );
    }
    case 'habit': {
      const d = readShape('habit', block.text, made, st);
      return join(d.title || label, d.label, `${(st.log ?? []).length}×`);
    }
    case 'color': {
      const d = readShape('color', block.text, made, st);
      return d.hex ? join(d.name, d.hex.toUpperCase()) : block.text;
    }
    case 'split': {
      const d = readShape('split', block.text, made, st);
      const total = d.total;
      const people = d.people ?? 2;
      return total
        ? `${formatAmount(total, d.currency)} ÷ ${people} = ${formatAmount(total / people, d.currency)}`
        : label;
    }
    case 'expense': {
      const d = readShape('expense', block.text, made, st);
      return join(d.amount !== null && formatAmount(d.amount, d.currency), d.item) || label;
    }
    case 'convert': {
      const d = readShape('convert', block.text, made, st);
      const to = d.to;
      const r = d.result;
      return r !== null && d.from && to
        ? `${d.value} ${UNITS[d.from]?.label ?? d.from} = ${Number(r.toFixed(3))} ${UNITS[to]?.label ?? to}`
        : block.text;
    }
    case 'calc': {
      const d = readShape('calc', block.text, made, st);
      return d.result !== null ? `${d.expression} = ${d.result}` : block.text;
    }
    case 'travel': {
      const d = readShape('travel', block.text, made, st);
      return join(
        d.destination ? `${d.origin ? `${d.origin} → ` : ''}${d.destination}` : label,
        whenOf(d.start, false),
        d.mode &&
          (fa ? { flight: 'پرواز', train: 'قطار', bus: 'اتوبوس', car: 'جاده' }[d.mode] : d.mode),
      );
    }
    case 'poll': {
      const d = readShape('poll', block.text, made, st);
      const votes = d.options.map((o, i) => `${o} ${st.votes?.[i] ?? 0}`);
      return join(d.title, votes.join(' / '));
    }
    case 'contact': {
      const d = readShape('contact', block.text, made, st);
      return join(d.name || label, d.phone, d.email);
    }
    case 'link': {
      const d = readShape('link', block.text, made, st);
      return join(d.domain ?? d.url, d.note);
    }
    case 'countdown': {
      const d = readShape('countdown', block.text, made, st);
      if (!d.date) return block.text;
      const days = daysBetween(now, d.date);
      return fa ? `${d.title}: ${days} روز` : `${d.title}: ${days} ${days === 1 ? 'day' : 'days'}`;
    }
    case 'timezone': {
      const d = readShape('timezone', block.text, made, st);
      const at = d.isNow ? now : (d.instant ?? now);
      const from = d.from.label === 'Local' ? localZone() : d.from;
      return join(
        `${formatIn(from.tz, at, fa)} ${from.label}`,
        d.to && `${formatIn(d.to.tz, at, fa)} ${d.to.label}`,
      );
    }
    case 'random': {
      const d = readShape('random', block.text, made, st);
      return join(describeRandom(d, fa), st.result);
    }
    case 'goal': {
      const d = readShape('goal', block.text, made, st);
      return d.target
        ? join(d.title, `${d.current}/${d.target}${d.unit ? ` ${d.unit}` : ''}`)
        : d.title;
    }
    case 'issue': {
      const d = readShape('issue', block.text, made, st);
      return join(d.title || label, d.type, d.repo, d.labels.join(', '));
    }
    case 'note':
      return readShape('note', block.text, made, st).title;
  }
}
