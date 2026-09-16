/**
 * Paper, as geometry.
 *
 * A page is a sheet of paper that was torn out of something, so its edge is not
 * a line. The shape is generated here rather than in the page, for three
 * reasons: the seeding lives in one language, the path can be tested without a
 * browser, and it shows up in a rendered HTML snapshot as readable text where a
 * change to it is reviewable.
 */

import { Rng } from './prng.ts';

export interface Point {
  x: number;
  y: number;
}

export interface TornOptions {
  /** How far, in px, the edge wanders inward at its deepest. */
  amplitude?: number;
  /** Distance between sampled points along the perimeter. */
  step?: number;
  /** Deep bites taken out of the edge, on top of the general wander. */
  nicks?: number;
  /** Corners are held still within this distance, so the sheet stays a sheet. */
  pin?: number;
}

const DEFAULTS: Required<TornOptions> = { amplitude: 9, step: 24, nicks: 3, pin: 28 };

/**
 * Walk the perimeter clockwise from the top-left, displacing each point inward
 * along the edge normal.
 *
 * Corners are pinned deliberately. A perimeter left entirely free stops reading
 * as a rectangle that was torn and starts reading as a blob.
 */
export function tornPath(
  width: number,
  height: number,
  seed: string,
  options: TornOptions = {},
): Point[] {
  const { amplitude, step, nicks, pin } = { ...DEFAULTS, ...options };
  const rng = new Rng(seed);
  const edges: Array<[Point, Point, Point]> = [
    [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: 1 },
    ],
    [
      { x: width, y: 0 },
      { x: width, y: height },
      { x: -1, y: 0 },
    ],
    [
      { x: width, y: height },
      { x: 0, y: height },
      { x: 0, y: -1 },
    ],
    [
      { x: 0, y: height },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
  ];

  const points: Point[] = [];
  for (const [from, to, normal] of edges) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const count = Math.max(2, Math.round(length / step));
    for (let i = 0; i < count; i += 1) {
      const t = i / count;
      const along = Math.min(t, 1 - t) * length;
      const damp = Math.min(1, along / pin);
      const d = rng.gauss() * amplitude * damp;
      points.push({
        x: from.x + (to.x - from.x) * t + normal.x * d,
        y: from.y + (to.y - from.y) * t + normal.y * d,
      });
    }
  }

  const centre = { x: width / 2, y: height / 2 };
  for (let i = 0; i < nicks; i += 1) {
    const index = Math.floor(rng.next() * points.length);
    const point = points[index];
    if (!point) continue;
    const depth = amplitude * rng.between(1.6, 3.4);
    const dx = centre.x - point.x;
    const dy = centre.y - point.y;
    const norm = Math.hypot(dx, dy) || 1;
    points[index] = { x: point.x + (dx / norm) * depth, y: point.y + (dy / norm) * depth };
  }
  return points;
}

/**
 * The same path as a CSS polygon() in percentages, so a sheet can be resized
 * without regenerating its tear.
 */
export function tornClipPath(
  width: number,
  height: number,
  seed: string,
  options?: TornOptions,
): string {
  const points = tornPath(width, height, seed, options);
  const body = points
    .map((p) => `${((p.x / width) * 100).toFixed(2)}% ${((p.y / height) * 100).toFixed(2)}%`)
    .join(', ');
  return `polygon(${body})`;
}

export interface Tape {
  width: number;
  height: number;
  rotation: number;
  clipPath: string;
}

/**
 * A strip of tape.
 *
 * Rotated about its own centre. Positioning it by the top-left corner and then
 * rotating swings it off into space, which is the kind of mistake that looks
 * like a layout bug for an hour before anyone suspects the transform origin.
 */
export function tapeStrip(seed: string): Tape {
  const rng = new Rng(`${seed}:tape`);
  const width = Math.round(rng.between(52, 74));
  const height = Math.round(rng.between(16, 21));
  const teeth: string[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i += 1) {
    teeth.push(`${((i / steps) * 100).toFixed(0)}% ${rng.between(0, 14).toFixed(0)}%`);
  }
  for (let i = steps; i >= 0; i -= 1) {
    teeth.push(`${((i / steps) * 100).toFixed(0)}% ${rng.between(86, 100).toFixed(0)}%`);
  }
  return {
    width,
    height,
    rotation: rng.between(-45 - 9, -45 + 9),
    clipPath: `polygon(${teeth.join(', ')})`,
  };
}
