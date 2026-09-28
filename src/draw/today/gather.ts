/**
 * The day, gathered: what the cards on every board and every notebook page say about today.
 *
 * A person keeps their plans where they wrote them -- "dinner friday 8pm" on the board, a
 * checklist on a notebook's page, "gym mon wed fri" wherever -- and this reads all of it back
 * as one morning page: what is running now, what is on today and at what time, which habits
 * are due, what slipped past, which lists are still open, and what is coming this week.
 *
 * Pure: the host hands it every board and page and the moment "now" is. Nothing here reads a
 * clock, a file or the network, so an agent asking GET /api/today and the page a person opens
 * are the same answer.
 */

import type { BoardItem } from '~/draw/doc/board/model.ts';
import { readShape } from '~/draw/shape/fields.ts';
import type { ShapeBlock, ShapeState } from '~/draw/shape/render.ts';

/** Somewhere cards can live: a board, or one page of a notebook. */
export interface TodaySource {
  /** The board's patch address: a board id, or book:<id>:<page>. */
  address: string;
  /** How a person knows it: "workspace", "Field notes · page 3". */
  title: string;
  href: string;
  items: readonly BoardItem[];
}

export type TodayKind = 'timer' | 'event' | 'reminder' | 'habit' | 'todo' | 'countdown';

export interface TodayEntry {
  address: string;
  id: string;
  kind: TodayKind;
  title: string;
  where: { title: string; href: string };
  /** When it happens (ISO), for events, reminders and countdowns. */
  when?: string;
  hasTime?: boolean;
  done: boolean;
  /** A checklist's items, as they stand. */
  items?: Array<{ text: string; done: boolean }>;
  /** A running timer: when it will end (epoch ms), or how long it has run with no end. */
  endsAt?: number;
  /** A countdown: whole days left. */
  days?: number;
}

export interface TodayData {
  /** The day this is (YYYY-MM-DD, local). */
  date: string;
  now: TodayEntry[];
  today: TodayEntry[];
  habits: TodayEntry[];
  overdue: TodayEntry[];
  lists: TodayEntry[];
  soon: TodayEntry[];
  /** What yesterday held, kept or not: a day's record does not vanish at midnight. */
  yesterday: TodayEntry[];
}

/** YYYY-MM-DD in local time: the key a habit's log is kept in. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const DAY = 86_400_000;

function shorten(text: string, n = 60): string {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
}

export function gatherToday(sources: readonly TodaySource[], now: Date): TodayData {
  const out: TodayData = {
    date: dayKey(now),
    now: [],
    today: [],
    habits: [],
    overdue: [],
    lists: [],
    soon: [],
    yesterday: [],
  };
  const today = startOfDay(now);
  const yesterday = today - DAY;
  const before = new Date(yesterday);
  const tomorrow = today + DAY;
  const week = today + 8 * DAY;
  for (const source of sources) {
    for (const item of source.items) {
      if (item.block?.kind !== 'shape') continue;
      const block = item.block as unknown as ShapeBlock;
      const s: ShapeState = block.state ?? {};
      const made = block.made ? new Date(block.made) : now;
      // The link goes to the card itself, framed and chosen (the board's ?focus=), not just to
      // the board it is somewhere on: "where is it?" is answered by being taken there.
      const href = `${source.href}${source.href.includes('?') ? '&' : '?'}focus=${encodeURIComponent(item.id)}`;
      const base = {
        address: source.address,
        id: item.id,
        where: { title: source.title, href },
        done: Boolean(s.closed),
      };
      switch (block.intent) {
        case 'timer': {
          if (typeof s.startedAt !== 'number') break;
          const d = readShape('timer', block.text, made, s);
          const ran = (s.elapsed ?? 0) * 1000;
          const entry: TodayEntry = {
            ...base,
            kind: 'timer',
            title: d.label || shorten(block.text),
            done: false,
          };
          if (d.seconds) entry.endsAt = s.startedAt + d.seconds * 1000 - ran;
          // Run out already: it had its moment, and is not "now" any more.
          if (entry.endsAt !== undefined && entry.endsAt <= now.getTime()) break;
          out.now.push(entry);
          break;
        }
        case 'event':
        case 'reminder': {
          const d =
            block.intent === 'event'
              ? readShape('event', block.text, made, s)
              : readShape('reminder', block.text, made, s);
          const at = 'date' in d ? d.date : d.when;
          if (!at) break;
          const t = at.getTime();
          const entry: TodayEntry = {
            ...base,
            kind: block.intent,
            title: ('title' in d ? d.title : d.task) || shorten(block.text),
            when: at.toISOString(),
            hasTime: d.hasTime,
          };
          if (t >= yesterday && t < today) out.yesterday.push(entry);
          if (t >= today && t < tomorrow) out.today.push(entry);
          else if (t >= tomorrow && t < week) out.soon.push(entry);
          else if (t < today && block.intent === 'reminder' && !entry.done) out.overdue.push(entry);
          break;
        }
        case 'countdown': {
          const d = readShape('countdown', block.text, made, s);
          if (!d.date) break;
          const days = Math.round((startOfDay(d.date) - today) / DAY);
          if (days < 0 || days > 7) break;
          const entry: TodayEntry = {
            ...base,
            kind: 'countdown',
            title: d.title || shorten(block.text),
            when: d.date.toISOString(),
            days,
          };
          (days === 0 ? out.today : out.soon).push(entry);
          break;
        }
        case 'habit': {
          const d = readShape('habit', block.text, made, s);
          // Only a habit that already existed yesterday can have been kept or missed then.
          if (made.getTime() < today && (d.days.length === 0 || d.days.includes(before.getDay()))) {
            out.yesterday.push({
              ...base,
              kind: 'habit',
              title: d.title || shorten(block.text),
              done: (s.log ?? []).includes(dayKey(before)),
            });
          }
          const due = d.days.length === 0 || d.days.includes(now.getDay());
          // Not before it was made: a habit started today was not missed last month.
          if (!due || made.getTime() >= startOfDay(now) + DAY) break;
          out.habits.push({
            ...base,
            kind: 'habit',
            title: d.title || shorten(block.text),
            done: (s.log ?? []).includes(out.date),
          });
          break;
        }
        case 'todo': {
          if (s.closed) break;
          const d = readShape('todo', block.text, made, s);
          const done = new Set(s.done ?? []);
          const items = d.items.map((text, i) => ({ text, done: done.has(i) }));
          if (!items.length || items.every((i) => i.done)) break;
          out.lists.push({
            ...base,
            kind: 'todo',
            title: d.shopping ? 'Shopping' : shorten(d.items.slice(0, 3).join(', '), 40),
            items,
          });
          break;
        }
        default:
          break;
      }
    }
  }
  const byWhen = (a: TodayEntry, b: TodayEntry): number =>
    (a.when ?? '').localeCompare(b.when ?? '');
  out.today.sort(byWhen);
  out.soon.sort(byWhen);
  out.overdue.sort(byWhen);
  out.yesterday.sort(
    (a, b) => Number(a.kind === 'habit') - Number(b.kind === 'habit') || byWhen(a, b),
  );
  out.now.sort((a, b) => (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity));
  return out;
}

/** What the day page can do to a card, as the card itself would have done it. */
export type TodayAct = { act: 'tick'; index: number } | { act: 'done' } | { act: 'habit' };

/** The card's next state after an act on the day page, or undefined if the act does not apply. */
export function todayAct(block: ShapeBlock, action: TodayAct, now: Date): ShapeState | undefined {
  const s: ShapeState = structuredClone(block.state ?? {});
  if (action.act === 'tick' && block.intent === 'todo') {
    const set = new Set(s.done ?? []);
    if (set.has(action.index)) set.delete(action.index);
    else set.add(action.index);
    s.done = [...set].sort((a, b) => a - b);
    return s;
  }
  if (action.act === 'done' && (block.intent === 'reminder' || block.intent === 'event')) {
    s.closed = !s.closed;
    return s;
  }
  if (action.act === 'habit' && block.intent === 'habit') {
    const key = dayKey(now);
    const log = new Set(s.log ?? []);
    if (log.has(key)) log.delete(key);
    else log.add(key);
    s.log = [...log].sort();
    return s;
  }
  return undefined;
}

/** One day of a month as the calendar shows it: how full it was, and how much of it was done. */
export interface CalendarDay {
  date: string;
  /** Events, reminders and countdowns falling on it, and how many of those are done. */
  things: number;
  done: number;
  /** Habits due that day, and how many were kept. */
  habits: number;
  kept: number;
}

/**
 * The days shown for a month: whole weeks from the Saturday on or before the 1st to the Friday
 * on or after the last -- the week as it runs where this notebook's owner lives.
 */
export function calendarMonth(
  sources: readonly TodaySource[],
  year: number,
  month: number,
  /** The real moment now, handed in: nothing in draw/ reads a clock. */
  now: Date,
): { days: CalendarDay[]; first: string; last: string } {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 1) % 7));
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - ((last.getDay() + 1) % 7)));
  const days: CalendarDay[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    const day = gatherToday(sources, noon);
    const things = day.today.length;
    // A habit is a record of days gone by; on days still to come it would put a dot on every
    // one of them and hide the plans.
    const future = startOfDay(noon) > startOfDay(now);
    days.push({
      date: dayKey(noon),
      things,
      done: day.today.filter((e) => e.done).length,
      habits: future ? 0 : day.habits.length,
      kept: future ? 0 : day.habits.filter((e) => e.done).length,
    });
  }
  return { days, first: dayKey(first), last: dayKey(last) };
}
