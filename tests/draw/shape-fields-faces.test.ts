/**
 * A card's values set by hand: laid over what its text says, only where they differ, and read
 * back by the editor as the card shows them.
 */

import { describe, expect, it } from 'vitest';
import { readShape } from '~/draw/shape/fields.ts';
import { renderShape } from '~/draw/shape/render.ts';

const REF = new Date(2026, 8, 25, 10, 0);

describe('a card, drawn', () => {
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
