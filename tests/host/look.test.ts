import { describe, expect, it } from 'vitest';
import { hushed } from '~/app/feel.ts';
import { DEFAULT_LOOK, readLook, withLook } from '~/host/serve/look.ts';

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

describe('motion on the page', () => {
  it('is said on the root before the script runs, when it is not full', () => {
    const page = '<!doctype html><html lang="en"><head></head><body></body></html>';
    const calm = readLook({ feel: { motion: 'none' } });
    expect(withLook(page, calm, 'board')).toContain('<html data-motion="none" lang="en">');
    expect(withLook(page, DEFAULT_LOOK, 'board')).toContain('<html lang="en">');
  });
});

describe('light or dark, and the owner’s colours', () => {
  it('keeps the theme to light or dark, and colours only for real palettes, as hex', () => {
    expect(readLook({}).theme).toBe('light');
    expect(readLook({ theme: 'dark' }).theme).toBe('dark');
    expect(readLook({ theme: 'purple' }).theme).toBe('light');
    const l = readLook({
      palettes: { night: { paper: '#101820', ink: 'nope' }, invented: { paper: '#000000' } },
    });
    expect(Object.keys(l.palettes)).toEqual(['night']);
    expect(l.palettes.night).toEqual({ paper: '#101820', ink: '#e9ebf0', accent: '#6d8bff' });
  });
});
