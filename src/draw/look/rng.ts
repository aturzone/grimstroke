/**
 * Deterministic randomness.
 *
 * Every torn edge, tape angle and grain offset is derived from the document's id, so a note
 * looks *identical* on every reload and on every machine. That matters more than it sounds:
 * paper whose tears rearrange themselves on refresh reads as a glitch, not as paper.
 *
 * Brought over from chevaletNote, the sticky-note extension this look comes from, so the two
 * produce the same paper from the same id.
 */

/** mulberry32 -- 4 lines, good enough distribution, and fast. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fold an arbitrary string (a note id) into a 32-bit seed. FNV-1a. */
export function seedFrom(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Kept for callers that want the hash on its own. */
export const hashString = seedFrom;

/** A seeded generator with the helpers the art code actually wants. */
export class Rng {
  private readonly draw: () => number;

  constructor(seed: string | number) {
    this.draw = mulberry32(typeof seed === 'string' ? seedFrom(seed) : seed);
  }

  next(): number {
    return this.draw();
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + this.draw() * (max - min);
  }

  /** The name the rest of this codebase already used for `range`. */
  between(min: number, max: number): number {
    return this.range(min, max);
  }

  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Roughly gaussian, via the mean of four draws. Keeps tears from looking like static.
   *
   * Centred on zero and scaled by 1.1, which is the shape the torn-edge code was tuned
   * against -- a different curve here changes the character of every tear in the product.
   */
  gauss(): number {
    return (this.draw() + this.draw() + this.draw() + this.draw() - 2) * 1.1;
  }

  bool(p = 0.5): boolean {
    return this.draw() < p;
  }

  pick<T>(items: readonly T[]): T {
    const value = items[Math.floor(this.draw() * items.length)];
    if (value === undefined) throw new Error('pick() on an empty list');
    return value;
  }
}
