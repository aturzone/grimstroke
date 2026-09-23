import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HAND,
  DEFAULT_MARKER,
  DEFAULT_MONO,
  FACES,
  fontFamily,
  PERSIAN,
  stack,
  verifyFaces,
  weightRule,
} from '~/draw/type/faces.ts';

describe('the vendored faces', () => {
  it('are exactly what FONTS.toml says they are', () => {
    // A font file is binary, it is large, and nobody reviews a diff of one. It
    // can be replaced by a build step, a partial download or a well-meaning
    // upgrade, and the only symptom is that pages start looking slightly
    // different -- which is the one thing this tool promises does not happen.
    for (const check of verifyFaces()) {
      expect(check.actual, `${check.family} ${check.file}`).toBe(check.expected);
    }
  });

  it('declares a variable face as a weight range', () => {
    const caveat = FACES.find((f) => f.file === 'Caveat-Variable.ttf');
    expect(caveat).toBeDefined();
    expect(weightRule(caveat as (typeof FACES)[number])).toBe('400 700');
    expect(weightRule({ family: 'x', weight: 700, file: 'x.ttf' })).toBe('700');
  });
});

describe('font roles', () => {
  it('puts the Persian face in every stack that is not mono', () => {
    // Both hands are Latin-only. A Persian note set in one of them alone is a
    // row of empty boxes, and falling back to a system font would make output
    // depend on the machine it was rendered on.
    for (const role of ['body', 'hand', 'marker'] as const) {
      expect(stack(role), role).toContain(PERSIAN);
    }
  });

  it('never hands technical text to a proportional face', () => {
    // A log excerpt that reflows is not the log excerpt.
    expect(stack('mono')).toEqual([DEFAULT_MONO]);
  });

  it('gives a right-to-left page the Persian face for its body', () => {
    expect(stack('body', {}, 'rtl')[0]).toBe(PERSIAN);
    expect(stack('body', {}, 'ltr')[0]).not.toBe(PERSIAN);
  });

  it('keeps the two hands distinct', () => {
    expect(stack('hand')[0]).toBe(DEFAULT_HAND);
    expect(stack('marker')[0]).toBe(DEFAULT_MARKER);
    expect(DEFAULT_HAND).not.toBe(DEFAULT_MARKER);
  });

  it('honours an override and still appends the fallbacks', () => {
    const chosen = stack('hand', { hand: 'Estedad' });
    expect(chosen[0]).toBe('Estedad');
    expect(chosen.filter((f) => f === 'Estedad')).toHaveLength(1);
  });

  it('quotes every family and ends in a generic', () => {
    const value = fontFamily('hand');
    expect(value).toContain("'Caveat'");
    expect(value.endsWith('cursive')).toBe(true);
  });
});
