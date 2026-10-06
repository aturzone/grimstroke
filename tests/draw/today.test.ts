import { describe, expect, it } from 'vitest';
import type { BoardItem } from '~/draw/doc/board/model.ts';
import type { ShapeBlock } from '~/draw/shape/card.ts';
import { dayKey, gatherToday, todayAct } from '~/draw/today/gather.ts';

// A Monday morning, local time.
const now = new Date(2026, 8, 28, 8, 30);
const made = now.toISOString();
const card = (id: string, intent: string, text: string, state?: object): BoardItem =>
  ({
    id,
    at: [0, 0],
    block: { kind: 'shape', intent, text, made, ...(state ? { state } : {}) },
  }) as unknown as BoardItem;
const source = (items: BoardItem[]) => [
  { address: 'workspace', title: 'workspace', href: '/', items },
];

describe('the day, gathered', () => {
  it('sorts what is on today by time, and what comes this week after it', () => {
    const day = gatherToday(
      source([
        card('a', 'event', 'dinner today 8pm'),
        card('b', 'reminder', 'call the bank today 10am'),
        card('c', 'event', 'dentist in 3 days 4pm'),
        card('d', 'event', 'conference in 20 days'),
      ]),
      now,
    );
    expect(day.date).toBe('2026-09-28');
    expect(day.today.map((e) => e.id)).toEqual(['b', 'a']);
    expect(day.soon.map((e) => e.id)).toEqual(['c']);
  });

  it('keeps a reminder that slipped past until it is done', () => {
    // Written last Monday: "on friday" meant the 25th, which has gone by.
    const lastWeek = new Date(2026, 8, 21, 9).toISOString();
    const late = (state?: object): BoardItem =>
      ({
        id: 'r',
        at: [0, 0],
        block: {
          kind: 'shape',
          intent: 'reminder',
          text: 'pay the rent on friday',
          made: lastWeek,
          ...(state ? { state } : {}),
        },
      }) as unknown as BoardItem;
    expect(gatherToday(source([late()]), now).overdue.map((e) => e.id)).toEqual(['r']);
    expect(gatherToday(source([late({ closed: true })]), now).overdue).toEqual([]);
  });

  it('lists the habits due today, and remembers which are kept', () => {
    const day = gatherToday(
      source([
        card('h1', 'habit', 'walk every day', { log: [dayKey(now)] }),
        card('h2', 'habit', 'swim on saturday'),
      ]),
      now,
    );
    expect(day.habits.map((e) => [e.id, e.done])).toEqual([['h1', true]]);
  });

  it('shows open lists, not finished ones, and running timers, not spent ones', () => {
    const day = gatherToday(
      source([
        card('l1', 'todo', 'milk, eggs, bread', { done: [1] }),
        card('l2', 'todo', 'milk, eggs', { done: [0, 1] }),
        card('t1', 'timer', 'timer 25 min', { startedAt: now.getTime() - 60_000, elapsed: 0 }),
        card('t2', 'timer', 'timer 1 min', { startedAt: now.getTime() - 120_000, elapsed: 0 }),
      ]),
      now,
    );
    expect(day.lists.map((e) => e.id)).toEqual(['l1']);
    expect(day.lists[0]?.items?.map((i) => i.done)).toEqual([false, true, false]);
    expect(day.now.map((e) => e.id)).toEqual(['t1']);
  });
});

describe('a tap on the day page', () => {
  const block = (intent: string, state = {}): ShapeBlock =>
    ({ kind: 'shape', intent, text: 'x', made, state }) as unknown as ShapeBlock;
  it('does what the card itself would do', () => {
    expect(todayAct(block('todo', { done: [0] }), { act: 'tick', index: 2 }, now)?.done).toEqual([
      0, 2,
    ]);
    expect(todayAct(block('reminder'), { act: 'done' }, now)?.closed).toBe(true);
    expect(todayAct(block('habit'), { act: 'habit' }, now)?.log).toEqual(['2026-09-28']);
    expect(todayAct(block('habit', { log: ['2026-09-28'] }), { act: 'habit' }, now)?.log).toEqual(
      [],
    );
    expect(todayAct(block('poll'), { act: 'done' }, now)).toBeUndefined();
  });
});

describe('where a row goes', () => {
  it('is the card itself, framed on its board or page', () => {
    const made = new Date(2026, 8, 28, 8).toISOString();
    const item = {
      id: 'a b',
      at: [0, 0],
      block: { kind: 'shape', intent: 'event', text: 'dinner today 8pm', made },
    };
    const day = gatherToday(
      [
        { address: 'workspace', title: 'workspace', href: '/', items: [item as never] },
        {
          address: 'book:x:2',
          title: 'x · page 2',
          href: '/page?book=x&leaf=2',
          items: [item as never],
        },
      ],
      new Date(2026, 8, 28, 9),
    );
    expect(day.today.map((e) => e.where.href)).toEqual([
      '/?focus=a%20b',
      '/page?book=x&leaf=2&focus=a%20b',
    ]);
  });
});

describe('yesterday', () => {
  it('keeps a record of what was kept, only for habits that already existed', () => {
    const now = new Date(2026, 8, 28, 9);
    const old = new Date(2026, 8, 20, 9).toISOString();
    const fresh = new Date(2026, 8, 28, 8).toISOString();
    const habit = (id: string, made: string, log: string[]) =>
      ({
        id,
        at: [0, 0],
        block: { kind: 'shape', intent: 'habit', text: 'walk every day', made, state: { log } },
      }) as never;
    const day = gatherToday(
      [
        {
          address: 'w',
          title: 'w',
          href: '/',
          items: [
            habit('kept', old, ['2026-09-27']),
            habit('missed', old, []),
            habit('new', fresh, []),
          ],
        },
      ],
      now,
    );
    expect(day.yesterday.map((e) => [e.id, e.done])).toEqual([
      ['kept', true],
      ['missed', false],
    ]);
  });
});

describe('the calendar', () => {
  it('lays a month out in weeks from Saturday, and counts plans and kept habits', async () => {
    const { calendarMonth } = await import('~/draw/today/gather.ts');
    const now = new Date(2026, 8, 28, 9);
    const made = new Date(2026, 8, 1, 9).toISOString();
    const items = [
      {
        id: 'e',
        at: [0, 0],
        block: { kind: 'shape', intent: 'event', text: 'dinner on 2026-09-30 8pm', made },
      },
      {
        id: 'h',
        at: [0, 0],
        block: {
          kind: 'shape',
          intent: 'habit',
          text: 'walk every day',
          made,
          state: { log: ['2026-09-27'] },
        },
      },
    ];
    const m = calendarMonth(
      [{ address: 'w', title: 'w', href: '/', items: items as never }],
      2026,
      8,
      now,
    );
    expect(m.days[0]?.date).toBe('2026-08-29'); // the Saturday before the 1st
    expect(m.days.length % 7).toBe(0);
    const day = (key: string) => m.days.find((d) => d.date === key);
    expect(day('2026-09-27')).toMatchObject({ habits: 1, kept: 1 });
    expect(day('2026-09-26')).toMatchObject({ habits: 1, kept: 0 });
    // Days to come show plans, not habits.
    expect(day('2026-09-30')?.habits).toBe(0);
  });
});
