/**
 * Seeded randomness.
 *
 * Every generative mark on a page -- the tear of the paper, the angle of a strip
 * of tape, the drift of a sticky note -- is drawn from a seed derived from the
 * page's own id. So a page always looks like itself: re-export it and nothing
 * moves, which is what lets a rendered page be compared, cached, or regenerated
 * a year later without the picture changing underneath the words.
 */

/** FNV-1a, 32-bit. Small, fast, and good enough to spread short ids. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i) & 0xff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * mulberry32. Chosen over Math.random because the point here is that it is NOT
 * random between runs, and over a cryptographic generator because nothing about
 * a torn paper edge needs to resist an attacker.
 */
export class Rng {
  private state: number;

  constructor(seed: string | number) {
    this.state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** In [min, max). */
  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Centred on zero, in roughly [-1, 1]. The mean of four draws rather than one:
   * a single uniform draw makes an edge that reads as noise, and four make one
   * that reads as fibre.
   */
  gauss(): number {
    return ((this.next() + this.next() + this.next() + this.next()) / 4) * 2 - 1;
  }

  pick<T>(items: readonly T[]): T {
    const value = items[Math.floor(this.next() * items.length)];
    if (value === undefined) throw new Error('pick() on an empty list');
    return value;
  }
}
