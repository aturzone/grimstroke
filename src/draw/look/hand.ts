/**
 * Marks made by a hand.
 *
 * An arrow drawn with `M0,0 L100,0` is an arrow a machine drew, and on a page
 * that is pretending to be paper it is the one element that gives the whole
 * thing away. A person's line wanders, their circle does not close, and they
 * overshoot the end of an underline. This module puts those three properties
 * into SVG path data.
 *
 * Everything is seeded, like every other generative mark here: a page always
 * looks like itself, so the arrow that pointed at the login button last year
 * still points at it, with the same wobble, today.
 *
 * Path data, not markup. The caller decides stroke, width and colour -- this
 * only knows the shape -- which keeps the module testable without a browser and
 * usable from the page renderer, the board and the notebook alike.
 */

// Point comes from paper.ts, which already owns this module's geometry
// vocabulary -- a second definition of {x, y} is a second thing to keep in step.
import type { Point } from '~/draw/look/paper.ts';
import { Rng } from '~/draw/look/rng.ts';

export interface HandOptions {
  /** How far the stroke wanders from the ideal, in px. */
  wobble?: number;
  /** Points sampled along the shape. More is finer, and slower. */
  detail?: number;
  /**
   * How far past the end a stroke carries, as a fraction of its length.
   * A hand does not stop exactly on the mark, and a stroke that does reads as
   * a border.
   */
  overshoot?: number;
}

const HAND: Required<HandOptions> = { wobble: 2.2, detail: 14, overshoot: 0.03 };

/**
 * A smooth curve through the points, as cubic Béziers.
 *
 * Catmull-Rom converted to Bézier. Joining the samples with straight segments
 * instead produces a polyline that reads as a shaky *machine*, not as a hand:
 * the give-away is that the wobble has corners in it.
 */
export function smooth(points: readonly Point[], closed = false): string {
  if (points.length < 2) return '';
  const at = (i: number): Point => {
    const n = points.length;
    const index = closed ? ((i % n) + n) % n : Math.min(Math.max(i, 0), n - 1);
    return points[index] as Point;
  };
  const last = closed ? points.length : points.length - 1;
  const parts: string[] = [`M${fmt(at(0).x)},${fmt(at(0).y)}`];
  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    parts.push(`C${fmt(c1.x)},${fmt(c1.y)} ${fmt(c2.x)},${fmt(c2.y)} ${fmt(p2.x)},${fmt(p2.y)}`);
  }
  if (closed) parts.push('Z');
  return parts.join(' ');
}

function fmt(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * Sample a straight run and push each point sideways.
 *
 * The displacement is damped towards the ends. A line whose endpoints float is
 * a line that no longer starts where it was asked to start, and an arrow whose
 * tip has drifted eleven pixels is pointing at the wrong thing -- which is the
 * exact failure this whole library exists to avoid.
 */
export function handLine(a: Point, b: Point, seed: string, options: HandOptions = {}): string {
  const { wobble, detail, overshoot } = { ...HAND, ...options };
  const rng = new Rng(`${seed}:line`);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const over = overshoot * rng.between(0.4, 1.4);

  const points: Point[] = [];
  const count = Math.max(3, detail);
  for (let i = 0; i <= count; i += 1) {
    const t = (i / count) * (1 + over);
    // sin() rather than a flat damp: the stroke is loosest in the middle and
    // pinned at both ends, which is how a drawn line actually behaves.
    const damp = Math.sin(Math.min(t, 1) * Math.PI) ** 0.6;
    const push = rng.gauss() * wobble * damp;
    points.push({ x: a.x + dx * t + nx * push, y: a.y + dy * t + ny * push });
  }
  return smooth(points);
}

export interface Arrow {
  shaft: string;
  /** Two strokes, not a filled triangle: a marker has no fill. */
  head: [string, string];
}

/** An arrow, with the slight inward curve a hand puts into a long one. */
export function handArrow(a: Point, b: Point, seed: string, options: HandOptions = {}): Arrow {
  const rng = new Rng(`${seed}:arrow`);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;

  // A hand sweeps; it does not rule. The bow is a FRACTION of the length and
  // not a capped number of pixels: the cap was 46px, which on a 765px arrow
  // across a large screenshot is six per cent, and six per cent of curve is a
  // straight line with a rendering artefact at one end.
  const bow = (rng.next() < 0.5 ? -1 : 1) * rng.between(0.12, 0.24) * length;
  const midpoint: Point = {
    x: (a.x + b.x) / 2 - (dy / length) * bow,
    y: (a.y + b.y) / 2 + (dx / length) * bow,
  };
  const shaft = handCurve(a, midpoint, b, `${seed}:shaft`, options);

  // The head is angled off the arrival direction, which on a bowed shaft is
  // not the direction of a->b. Using a->b put the head visibly off-axis.
  const arrival = Math.atan2(b.y - midpoint.y, b.x - midpoint.x);
  // Proportional to the shaft, with a floor that scales with the picture. A
  // flat 26px cap made the head vanish on any arrow longer than a few hundred
  // pixels: a 765px shaft ending in a 26px tick reads as a line, not an arrow.
  const size = Math.max(length * 0.2, options.wobble ? options.wobble * 18 : 40);
  const spread = rng.between(0.4, 0.58);
  const head = [-1, 1].map((side) => {
    const angle = arrival + Math.PI + side * spread;
    const tip: Point = { x: b.x + Math.cos(angle) * size, y: b.y + Math.sin(angle) * size };
    return handLine(b, tip, `${seed}:head:${side}`, {
      ...options,
      wobble: (options.wobble ?? HAND.wobble) * 0.4,
      overshoot: 0,
      detail: 5,
    });
  });
  return { shaft, head: [head[0] as string, head[1] as string] };
}

/** A quadratic sweep through a control point, sampled and wobbled. */
export function handCurve(
  a: Point,
  control: Point,
  b: Point,
  seed: string,
  options: HandOptions = {},
): string {
  const { wobble, detail, overshoot } = { ...HAND, ...options };
  const rng = new Rng(`${seed}:curve`);
  const points: Point[] = [];
  const count = Math.max(4, detail);
  const over = overshoot * rng.between(0.4, 1.2);
  for (let i = 0; i <= count; i += 1) {
    const t = (i / count) * (1 + over);
    const u = 1 - t;
    const x = u * u * a.x + 2 * u * t * control.x + t * t * b.x;
    const y = u * u * a.y + 2 * u * t * control.y + t * t * b.y;
    const damp = Math.sin(Math.min(t, 1) * Math.PI) ** 0.6;
    points.push({ x: x + rng.gauss() * wobble * damp, y: y + rng.gauss() * wobble * damp });
  }
  return smooth(points);
}

export interface EllipseOptions extends HandOptions {
  /**
   * How far past the start the stroke carries, in turns. A drawn circle always
   * overlaps itself, and one that meets exactly reads as an SVG `<ellipse>`.
   */
  overlap?: number;
  /**
   * How many times round.
   *
   * Two by default, and this is the single change that made circles stop
   * looking like `<ellipse>` elements. SVG cannot vary stroke width along a
   * path, so a one-pass circle is a perfectly even line whatever is done to
   * its shape. Two passes that diverge give a doubled, thick-then-thin edge --
   * which is both what a marker does and what a person does when they want to
   * be sure you noticed.
   */
  passes?: number;
}

/**
 * A circle drawn round something.
 *
 * Not an ellipse. The radius breathes, the stroke starts at an arbitrary angle,
 * and it carries past its own beginning. Those three together are the whole
 * difference between "somebody circled this" and "an element has a border
 * radius".
 */
export function handEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: string,
  options: EllipseOptions = {},
): string {
  const wobble = options.wobble ?? 2.4;
  const detail = options.detail ?? 34;
  const overlap = options.overlap ?? 0.13;
  const passes = Math.max(1, options.passes ?? 2);
  const loops: string[] = [];
  for (let pass = 0; pass < passes; pass += 1) {
    const rng = new Rng(`${seed}:ellipse:${pass}`);
    const start = rng.between(0, Math.PI * 2);
    // Two slow harmonics, so the radius drifts rather than jitters: high
    // frequency noise on a radius reads as a gear, not as a hand.
    const phase = rng.between(0, Math.PI * 2);
    const swell = rng.between(0.05, 0.13);
    const tilt = rng.between(-0.1, 0.1);
    // The second pass is a little wider and a little more off. A hand going
    // round again does not retrace: it overshoots on the outside.
    const grow = 1 + pass * rng.between(0.02, 0.06);

    const points: Point[] = [];
    const turns = 1 + overlap * rng.between(0.6, 1.5);
    const count = Math.max(12, Math.round(detail * turns));
    for (let i = 0; i <= count; i += 1) {
      const t = (i / count) * turns;
      const angle = start + t * Math.PI * 2;
      const drift = 1 + swell * Math.sin(angle * 2 + phase) + swell * 0.5 * Math.sin(angle * 3);
      const jitter = rng.gauss() * wobble;
      const x = cx + Math.cos(angle) * (rx * grow * drift + jitter);
      const y = cy + Math.sin(angle) * (ry * grow * drift + jitter);
      points.push({ x: x + tilt * (y - cy), y });
    }
    loops.push(smooth(points));
  }
  return loops.join(' ');
}

/** An underline, drawn under a run of text. */
export function handUnderline(
  x: number,
  y: number,
  width: number,
  seed: string,
  options: HandOptions = {},
): string {
  return handLine({ x, y }, { x: x + width, y }, `${seed}:underline`, {
    wobble: 1.6,
    overshoot: 0.05,
    ...options,
  });
}

/** A square bracket down one side of a run of lines. */
export function handBracket(
  x: number,
  y: number,
  height: number,
  side: 'start' | 'end',
  seed: string,
  options: HandOptions = {},
): string {
  const arm = Math.min(14, height * 0.22) * (side === 'start' ? 1 : -1);
  const points: Point[] = [
    { x: x + arm, y },
    { x, y },
    { x, y: y + height },
    { x: x + arm, y: y + height },
  ];
  const rng = new Rng(`${seed}:bracket`);
  const wobble = options.wobble ?? 1.5;
  return smooth(
    points.map((p) => ({ x: p.x + rng.gauss() * wobble, y: p.y + rng.gauss() * wobble })),
  );
}

/**
 * A highlighter swipe: a filled shape, not a stroke.
 *
 * A marker lays down a band with ragged ends where the nib lifts, and it is
 * flat -- no gradient, no soft edge. Drawn as a closed path so it can be
 * multiplied over the text underneath and stay readable.
 */
export function handSwipe(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: string,
  options: HandOptions = {},
): string {
  const rng = new Rng(`${seed}:swipe`);
  const wobble = options.wobble ?? height * 0.09;
  const detail = options.detail ?? 9;
  // The ends slant; they do not taper to a point. A pointed end was the first
  // attempt and it read as a banner ribbon -- a chisel nib leaves a slanted
  // edge, because that is the shape of the nib.
  const lead = rng.between(0.18, 0.5) * height;
  const tail = rng.between(0.18, 0.5) * height;
  const slant = rng.next() < 0.5 ? 1 : -1;

  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= detail; i += 1) {
    const t = i / detail;
    const px = x - lead + (width + lead + tail) * t;
    top.push({ x: px, y: y + rng.gauss() * wobble });
    bottom.push({ x: px, y: y + height + rng.gauss() * wobble });
  }
  const first = top[0] as Point;
  const last = top[top.length - 1] as Point;
  top[0] = { x: first.x + slant * lead * 0.5, y: first.y };
  top[top.length - 1] = { x: last.x + slant * tail * 0.5, y: last.y };
  const back = [...bottom].reverse();
  return `${smooth(top)} ${smooth(back).replace(/^M[^C]*C/, 'L')} Z`;
}

/**
 * A marker label: a band of flat colour with the ends a nib leaves.
 *
 * Returned as a CSS `polygon()` in percentages rather than as path data,
 * because the caller does not know how wide the text inside it will be. A
 * percentage polygon stretches with the element, which is the same trick the
 * torn sheet edge uses and for the same reason.
 *
 * The ends slant and the long edges wander. A rectangle of yellow behind text
 * is a `<mark>`; this is somebody who ran a highlighter over it.
 */
export function raggedBand(
  seed: string,
  options: { wobble?: number; steps?: number } = {},
): string {
  const rng = new Rng(`${seed}:band`);
  const wobble = options.wobble ?? 6;
  const steps = options.steps ?? 7;
  const lead = rng.between(-2.5, 2.5);
  const tail = rng.between(-2.5, 2.5);
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * 100;
    points.push(`${t.toFixed(1)}% ${(rng.gauss() * wobble).toFixed(1)}%`);
  }
  points.push(`${(100 + Math.abs(tail)).toFixed(1)}% ${(50 + tail * 4).toFixed(1)}%`);
  for (let i = steps; i >= 0; i -= 1) {
    const t = (i / steps) * 100;
    points.push(`${t.toFixed(1)}% ${(100 + rng.gauss() * wobble).toFixed(1)}%`);
  }
  points.push(`${(-Math.abs(lead)).toFixed(1)}% ${(50 + lead * 4).toFixed(1)}%`);
  return `polygon(${points.join(', ')})`;
}
