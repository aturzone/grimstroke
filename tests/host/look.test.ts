import { describe, expect, it } from 'vitest';
import { hushed } from '~/app/feel.ts';
import { DEFAULT_LOOK, readLook } from '~/host/serve/look.ts';

describe('quiet hours', () => {
  it('are kept only as two different whole hours', () => {
    const at = (quiet: unknown) => readLook({ feel: { quiet } }).feel.quiet;
    expect(at({ from: 22, to: 7 })).toEqual({ from: 22, to: 7 });
    expect(at({ from: 22, to: 22 })).toBeUndefined();
    expect(at({ from: 24, to: 7 })).toBeUndefined();
    expect(at({ from: 1.5, to: 7 })).toBeUndefined();
    expect(at('night')).toBeUndefined();
    expect(DEFAULT_LOOK.feel.quiet).toBeUndefined();
  });

  it('run across midnight when they end before they start', () => {
    const night = { from: 22, to: 7 };
    expect([21, 22, 23, 0, 6, 7, 12].map((h) => hushed(h, night))).toEqual([
      false,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
    const lunch = { from: 12, to: 14 };
    expect([11, 12, 13, 14].map((h) => hushed(h, lunch))).toEqual([false, true, true, false]);
    expect(hushed(3, undefined)).toBe(false);
  });
});
