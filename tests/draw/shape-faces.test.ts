/**
 * The shape reader: which card a line is, what is on the card, and a bar that does not flicker.
 * Everything is read against a fixed moment, Friday 25 September 2026, 10:00.
 */

import { describe, expect, it } from 'vitest';
import { renderShape, summarize } from '~/draw/shape/render.ts';

const REF = new Date(2026, 8, 25, 10, 0);

describe('a card, drawn', () => {
  it('escapes what was typed and carries its controls', () => {
    const html = renderShape({
      kind: 'shape',
      intent: 'todo',
      text: 'buy <b>milk</b>, eggs',
      made: REF.toISOString(),
    });
    expect(html).not.toContain('<b>');
    expect(html).toContain('data-sc-act="todo:0"');
  });

  it('shows what was done to it', () => {
    const block = {
      kind: 'shape' as const,
      intent: 'todo' as const,
      text: 'milk, eggs, bread',
      state: { done: [1] },
    };
    expect(summarize(block, REF)).toBe('1/3 · Milk, Eggs, Bread');
    expect(renderShape(block)).toContain('is-done');
  });

  it('is drawn right to left for Persian', () => {
    expect(renderShape({ kind: 'shape', intent: 'note', text: 'امروز آروم بود' })).toContain(
      'dir="rtl"',
    );
  });
});
