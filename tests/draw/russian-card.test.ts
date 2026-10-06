import { describe, expect, it } from 'vitest';
import { renderShape } from '~/draw/shape/render.ts';

// Thursday 1 October 2026, nine in the morning.
const ref = new Date(2026, 9, 1, 9, 0);

describe('a card in Russian', () => {
  it('speaks Russian on the card', () => {
    const html = renderShape(
      {
        kind: 'shape',
        intent: 'event',
        text: 'ужин с Анной завтра в 8 вечера',
        made: ref.toISOString(),
      },
      { now: ref },
    );
    expect(html).toContain('Событие');
    expect(html).toContain('Завтра');
    expect(html).toContain('dir="ltr"');
  });
});
