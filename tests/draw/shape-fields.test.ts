/**
 * A card's values set by hand: laid over what its text says, only where they differ, and read
 * back by the editor as the card shows them.
 */

import { describe, expect, it } from 'vitest';
import { FIELDS, fieldValues, keepFields, readFields, readShape } from '~/draw/shape/fields.ts';
import { SHAPE_INTENTS } from '~/draw/shape/intents.ts';
import { renderShape, summarize } from '~/draw/shape/render.ts';

const REF = new Date(2026, 8, 25, 10, 0);

describe('the field schema', () => {
  it('has fields for every kind, with unique keys', () => {
    for (const k of SHAPE_INTENTS) {
      const keys = FIELDS[k].map((f) => f.key);
      expect(keys.length, k).toBeGreaterThan(0);
      expect(new Set(keys).size, k).toBe(keys.length);
    }
  });

  it('round-trips: what the editor opens with, saved unchanged, keeps nothing', () => {
    const texts: Record<string, string> = {
      event: 'dinner with priya friday 8pm',
      timer: '25 min focus',
      split: 'split 2400 between 3',
      poll: 'pizza or burgers for friday?',
      convert: '5 miles in km',
      goal: 'read 12 books this year, 4 done',
      countdown: 'days until christmas',
      travel: 'flight to goa next weekend',
    };
    for (const [k, text] of Object.entries(texts)) {
      const intent = k as (typeof SHAPE_INTENTS)[number];
      const values = fieldValues(intent, readShape(intent, text, REF));
      expect(keepFields(intent, text, REF, values), k).toBeUndefined();
    }
  });
});

describe('set by hand', () => {
  it('a timer typed as just "timer" gets a duration, and the text stays the text', () => {
    const state = { fields: { duration: 600, label: 'Tea' } };
    const d = readShape('timer', 'timer', REF, state);
    expect(d.seconds).toBe(600);
    expect(d.label).toBe('Tea');
    const html = renderShape({
      kind: 'shape',
      intent: 'timer',
      text: 'timer',
      made: REF.toISOString(),
      state,
    });
    expect(html).toContain('10:00');
    expect(html).toContain('Tea');
  });

  it('an event moved to another day and time, and a place', () => {
    const d = readShape('event', 'dinner with priya friday 8pm', REF, {
      fields: { date: '2026-10-02', time: '19:30', place: 'Cafe Nero' },
    });
    expect(d.date).toEqual(new Date(2026, 9, 2, 19, 30));
    expect(d.hasTime).toBe(true);
    expect(d.location).toBe('Cafe Nero');
    expect(d.title).toBe('Dinner');
  });

  it('a split, a poll, a conversion and a goal', () => {
    expect(readShape('split', 'split 2400 between 3', REF, { fields: { people: 4 } }).people).toBe(
      4,
    );
    expect(
      readShape('poll', 'pizza or burgers?', REF, {
        fields: { options: ['Pizza', 'Burgers', 'Tacos'] },
      }).options,
    ).toEqual(['Pizza', 'Burgers', 'Tacos']);
    const c = readShape('convert', '5 miles in km', REF, { fields: { to: 'm' } });
    expect(c.result).toBeCloseTo(8046.72, 1);
    expect(
      readShape('goal', 'read 12 books, 4 done', REF, { fields: { current: 7 } }).current,
    ).toBe(7);
  });

  it('the older per-kind state is still read, beneath fields', () => {
    expect(readShape('split', 'split 2400 between 3', REF, { people: 5 }).people).toBe(5);
    expect(
      readShape('split', 'split 2400 between 3', REF, { people: 5, fields: { people: 6 } }).people,
    ).toBe(6);
  });

  it('keeps only what differs from the text', () => {
    const values = fieldValues('timer', readShape('timer', '25 min focus', REF));
    expect(keepFields('timer', '25 min focus', REF, { ...values, duration: 1800 })).toEqual({
      duration: 1800,
    });
  });

  it('shows in the summary an agent reads', () => {
    const block = {
      kind: 'shape' as const,
      intent: 'timer' as const,
      text: '25 min focus',
      made: REF.toISOString(),
      state: { fields: { duration: 300 } },
    };
    expect(summarize(block, REF)).toBe('Focus · 05:00');
  });
});

describe('from an agent', () => {
  it('holds sent fields to the schema', () => {
    expect(readFields('timer', { duration: '90', label: 'x', nonsense: 1 })).toEqual({
      duration: 90,
      label: 'x',
    });
    expect(readFields('habit', { days: [1, 9, 'a', 3] })).toEqual({ days: [1, 3] });
    expect(readFields('timer', null)).toBeUndefined();
  });
});

describe('the face', () => {
  it('a live card carries its pencil; a preview and an export do not', () => {
    const block = { kind: 'shape' as const, intent: 'note' as const, text: 'hello there' };
    expect(renderShape(block)).toContain('data-sc-act="edit"');
    expect(renderShape(block, { interactive: false })).not.toContain('data-sc-act="edit"');
  });
  it('a timer with no time offers some', () => {
    const html = renderShape({
      kind: 'shape',
      intent: 'timer',
      text: 'timer',
      made: REF.toISOString(),
    });
    expect(html).toContain('data-sc-act="timer:set:1500"');
  });
});
