import { describe, expect, it } from 'vitest';
import { isDone, renderSlashMain, type SlashEntry } from '~/draw/slash/render.ts';

const now = new Date(2026, 9, 1, 9);
const entry = (
  id: string,
  text: string,
  intent: SlashEntry['block']['intent'],
  closed = false,
): SlashEntry => ({
  address: 'slash',
  id,
  block: {
    kind: 'shape',
    intent,
    text,
    made: now.toISOString(),
    ...(closed ? { state: { closed } } : {}),
  },
  where: { title: 'made with /', href: '/?board=slash' },
});

describe('the / board', () => {
  it('folds what is done away below what is open', () => {
    const html = renderSlashMain(
      [
        entry('a', 'call the bank tomorrow 10am', 'reminder', true),
        entry('b', 'dinner friday 8pm', 'event'),
      ],
      now,
    );
    const open = html.indexOf('data-sl="open"');
    const done = html.indexOf('class="sl-done"');
    expect(html.indexOf('slash|b')).toBeGreaterThan(open);
    expect(html.indexOf('slash|b')).toBeLessThan(done);
    expect(html.indexOf('slash|a')).toBeGreaterThan(done);
  });

  it('offers a chip for each kind there is, and none for the rest', () => {
    const html = renderSlashMain([entry('b', 'dinner friday 8pm', 'event')], now);
    expect(html).toContain('data-sl-filter="event"');
    expect(html).not.toContain('data-sl-filter="timer"');
  });

  it('keeps the blocks where a script cannot be closed from inside them', () => {
    const html = renderSlashMain([entry('x', '</script><b>', 'note')], now);
    expect(html).not.toContain('</script><b>');
  });

  it('counts a list as done once every line is ticked', () => {
    const list = entry('l', 'milk\neggs', 'todo').block;
    expect(isDone(list)).toBe(false);
    expect(isDone({ ...list, state: { done: [0, 1] } })).toBe(true);
  });
});
