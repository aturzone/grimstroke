/**
 * The paper itself: torn edges, tape, and the curl of a lifted corner.
 *
 * Brought over from chevaletNote, the sticky-note extension this look comes from. The note in
 * a grimstroke workspace is meant to be *the same note*, so this is its geometry rather than
 * a second attempt at the same idea.
 *
 * Everything here is computed ONCE per note and again only on resize. Nothing in this file may
 * be called from an animation loop: an SVG filter or a canvas repaint per frame is 3-12 ms of
 * main thread, which is the whole frame budget gone.
 *
 * The one technique deliberately NOT used is `feTurbulence` + `feDisplacementMap` for the torn
 * edge. It looks great and costs a re-rasterisation every time the note's effective scale
 * changes -- which, during a drag, is every frame. Generating the jagged path from a seeded
 * PRNG costs about 0.15 ms once and animates for free.
 */

import { Rng } from '~/draw/look/rng.ts';

const r2 = (n: number): number => Math.round(n * 100) / 100;

export interface Point {
  x: number;
  y: number;
}

export interface TornOptions {
  /** How far the edge wanders from straight, in px. 0 gives a clean rectangle. */
  amplitude?: number;
  /** Distance between perturbation points, in px. Smaller is rougher and costs more. */
  step?: number;
  /** Number of deeper bites taken out of the edge. */
  nicks?: number;
}

/**
 * A closed path around a `w x h` rectangle whose edges have been torn.
 *
 * Walks the perimeter, pushing each point along the inward normal by seeded noise, then adds
 * a few deeper nicks so the tear has some rhythm instead of uniform fuzz.
 */
export function tornRectPath(
  w: number,
  h: number,
  seed: string | number,
  o: TornOptions = {},
): string {
  const points = tornRectPoints(w, h, seed, o);
  if (points.length === 0) return `M0 0 H${r2(w)} V${r2(h)} H0 Z`;
  let d = '';
  for (const [i, p] of points.entries()) {
    d += i === 0 ? `M${r2(p.x)} ${r2(p.y)}` : `L${r2(p.x)} ${r2(p.y)}`;
  }
  return `${d}Z`;
}

/** The same tear as points, for a caller that wants percentages rather than a path. */
export function tornRectPoints(
  w: number,
  h: number,
  seed: string | number,
  o: TornOptions = {},
): Point[] {
  const amp = o.amplitude ?? 2.4;
  const stepPx = o.step ?? 7;
  const nicks = o.nicks ?? 4;
  const rng = new Rng(seed);
  if (amp <= 0) return [];

  // Perimeter as [point, inward normal] pairs, walked clockwise from the top-left.
  type P = [x: number, y: number, nx: number, ny: number];
  const pts: P[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): void => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / stepPx));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, nx, ny]);
    }
  };
  edge(0, 0, w, 0, 0, 1); // top,    inward = down
  edge(w, 0, w, h, -1, 0); // right,  inward = left
  edge(w, h, 0, h, 0, -1); // bottom, inward = up
  edge(0, h, 0, 0, 1, 0); // left,   inward = right

  // Base displacement: smoothed noise, so neighbouring points stay related. Independent
  // draws give an edge that reads as static rather than as fibre.
  const disp = new Float32Array(pts.length);
  let prev = rng.gauss();
  for (let i = 0; i < pts.length; i++) {
    const target = rng.gauss();
    prev = prev * 0.55 + target * 0.45;
    disp[i] = prev * amp;
  }

  // Deeper bites, tapered so they read as tears rather than dents.
  for (let k = 0; k < nicks; k++) {
    const at = rng.int(0, pts.length - 1);
    const width = rng.int(2, 5);
    const depth = rng.range(amp * 1.6, amp * 3.4);
    for (let j = -width; j <= width; j++) {
      const i = (at + j + pts.length) % pts.length;
      const falloff = 1 - Math.abs(j) / (width + 1);
      disp[i] = (disp[i] as number) + depth * falloff * falloff;
    }
  }

  // Corners stay put, or the note stops reading as a rectangle.
  const corners = [
    0,
    Math.round(pts.length * 0.25),
    Math.round(pts.length * 0.5),
    Math.round(pts.length * 0.75),
  ];
  for (const c of corners) {
    for (let j = -2; j <= 2; j++) {
      const i = (c + j + pts.length) % pts.length;
      disp[i] = (disp[i] as number) * (Math.abs(j) / 3);
    }
  }

  return pts.map(([x, y, nx, ny], i) => ({
    x: x + nx * (disp[i] as number),
    y: y + ny * (disp[i] as number),
  }));
}

/**
 * The same tear as a CSS `polygon()` in percentages, so a surface can be resized without
 * regenerating it. Used for the page sheet and for a torn mount; a note uses the path, because
 * a note's tear is stroked as well as filled.
 */
export function tornClipPath(
  width: number,
  height: number,
  seed: string,
  options?: TornOptions,
): string {
  const points = tornRectPoints(width, height, seed, {
    amplitude: 9,
    step: 24,
    nicks: 3,
    ...options,
  });
  if (points.length === 0) return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  const body = points
    .map((p) => `${((p.x / width) * 100).toFixed(2)}% ${((p.y / height) * 100).toFixed(2)}%`)
    .join(', ');
  return `polygon(${body})`;
}

export interface Tape {
  /** The strip, drawn centred on the origin, in px. */
  d: string;
  /** Degrees. Applied about the strip's own centre. */
  angle: number;
  /** Where the strip's centre goes, in the units of the `w`/`h` it was given. */
  cx: number;
  cy: number;
  /** `translate(cx cy) rotate(angle)`, for a caller drawing inside one viewBox. */
  transform: string;
}

/**
 * A strip of masking tape straddling one corner, as an SVG path plus the transform that places
 * it. Corner index: 0 = top-left, 1 = top-right, 2 = bottom-right, 3 = bottom-left.
 *
 * The strip is drawn centred on the origin and rotated about its own centre, so it lands
 * ACROSS the corner at roughly 45 degrees -- the way tape is actually applied. Positioning by
 * the strip's top-left and rotating about that instead swings it off into space, which is
 * exactly what the first version did.
 */
export function tapeStrip(
  w: number,
  h: number,
  corner: 0 | 1 | 2 | 3,
  seed: string | number,
): Tape {
  const rng = new Rng(`${seed}:tape${corner}`);
  const len = rng.range(52, 74);
  const wide = rng.range(16, 21);

  // Torn-off ends: the short edges are ragged, the long edges are straight.
  const jag = (x: number): string => {
    const n = 5;
    let s = '';
    for (let i = 1; i <= n; i++) {
      s += `L${r2(x + rng.range(-2.4, 2.4))} ${r2(-wide / 2 + (wide / n) * i)}`;
    }
    return s;
  };
  const hx = len / 2;
  const hy = wide / 2;
  const d =
    `M${r2(-hx)} ${r2(-hy)} L${r2(hx)} ${r2(-hy)} ${jag(hx)} ` +
    `L${r2(-hx)} ${r2(hy)} ${jag(-hx)} Z`;

  // Sit the centre just outside the corner, so equal amounts of tape land on the paper and on
  // whatever is behind it.
  const out = rng.range(2, 7);
  const left = corner === 0 || corner === 3;
  const top = corner === 0 || corner === 1;
  const cx = left ? out : w - out;
  const cy = top ? out : h - out;
  // 45 degrees across the corner, with a little human error.
  const base = left === top ? -45 : 45;
  const angle = base + rng.range(-9, 9);

  return {
    d,
    angle: r2(angle),
    cx: r2(cx),
    cy: r2(cy),
    transform: `translate(${r2(cx)} ${r2(cy)}) rotate(${r2(angle)})`,
  };
}

/** How many pre-baked curl levels a note cross-fades between. */
export const CURL_LEVELS = 5;

/**
 * One of five pre-baked corner folds, `t` from 0 (flat) to 1 (fully curled).
 *
 * Baked because morphing a path per frame is a main-thread repaint; cross-fading five static
 * ones by opacity is free.
 *
 * Level 0 must be genuinely empty. An earlier version drew a 14px wedge there, which meant
 * every note sat with a hard dark triangle stapled to its corner at rest -- it read as a
 * rendering bug, not as paper.
 */
export function curlPath(w: number, h: number, t: number): string {
  if (t <= 0) return '';
  const s = 6 + t * 54; // how far up the corner has lifted
  const lift = t * 0.55;
  const x0 = w - s;
  const y0 = h;
  const x1 = w;
  const y1 = h - s;
  const cx = w - s * (0.45 - lift * 0.2);
  const cy = h - s * (0.45 - lift * 0.2);
  return (
    `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ` +
    `${x1.toFixed(1)} ${y1.toFixed(1)} L${x1.toFixed(1)} ${y0.toFixed(1)} Z`
  );
}
