import { describe, expect, it } from 'vitest';
import {
  BODY_FLOOR,
  CHIP_FLOOR,
  check,
  contrast,
  customPalette,
  PALETTES,
  palette,
  textOn,
} from '~/theme/palette.ts';

describe('palettes', () => {
  it('ships eight', () => {
    expect(PALETTES).toHaveLength(8);
  });

  it('meets both contrast floors, every one of them', () => {
    // This test exists because acid yellow on cream shipped at 1.3:1 once in the
    // extension this look comes from, and nothing said a word.
    for (const p of PALETTES) {
      expect(check(p), p.id).toEqual([]);
      expect(contrast(p.ink, p.paper), p.id).toBeGreaterThanOrEqual(BODY_FLOOR);
      expect(contrast(p.accent, textOn(p.accent, [p.paper, p.ink])), p.id).toBeGreaterThanOrEqual(
        CHIP_FLOOR,
      );
    }
  });

  it('never uses pure black as ink', () => {
    // A photocopier never produces one, and pure black next to a fluorescent
    // paper vibrates unpleasantly.
    for (const p of PALETTES) expect(p.ink.toLowerCase()).not.toBe('#000000');
  });

  it('derives chip lettering rather than taking it on trust', () => {
    for (const p of PALETTES) {
      expect([p.paper, p.ink]).toContain(textOn(p.accent, [p.paper, p.ink]));
    }
  });

  it('names the palettes it does not have', () => {
    expect(() => palette('nope')).toThrow(/unknown palette/);
  });

  it('refuses a custom palette nobody could read', () => {
    expect(() => customPalette({ paper: '#f0e7d2', ink: '#eeeeee', accent: '#c01b3a' })).toThrow(
      /below the/,
    );
  });

  it('accepts a custom palette that holds up', () => {
    const made = customPalette({ paper: '#fff8e7', ink: '#1a1410', accent: '#0057b8' });
    expect(check(made)).toEqual([]);
  });
});
