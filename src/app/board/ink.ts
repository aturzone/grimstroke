/**
 * Strokes: turning a pointer's path into a curve, and the line you see while drawing it.
 */

import type { Point } from '~/app/board/view.ts';
import { smooth } from '~/draw/look/hand.ts';

/**
 * Points to path data.
 *
 * The same `smooth()` the hand-drawn marks use, so a stroke a person draws
 * and a stroke the library generates are the same kind of curve. Points are
 * thinned first: a pointer reports far more of them than a curve needs, and
 * feeding every one to a spline produces a wobbly line and a large document.
 *
 * `band` is the width of a highlighter nib, or undefined for a line.
 */
export function pathOf(points: readonly Point[], band?: number): string {
  const kept: Point[] = [];
  for (const point of points) {
    const previous = kept[kept.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 2.5) {
      kept.push(point);
    }
  }
  if (kept.length < 2) return '';
  if (band === undefined) return smooth(kept);
  // A highlighter is a nib: a band, not a line, so the fill is the stroke
  // swept perpendicular to its own direction.
  const half = band / 2;
  const up: Point[] = [];
  const down: Point[] = [];
  for (let i = 0; i < kept.length; i += 1) {
    const a = kept[Math.max(0, i - 1)] as Point;
    const b = kept[Math.min(kept.length - 1, i + 1)] as Point;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / length) * half;
    const ny = ((b.x - a.x) / length) * half;
    const here = kept[i] as Point;
    up.push({ x: here.x + nx, y: here.y + ny });
    down.push({ x: here.x - nx, y: here.y - ny });
  }
  return `${smooth(up)} ${smooth(down.reverse()).replace(/^M[^C]*C/, 'L')} Z`;
}

/**
 * The stroke you see while you are still drawing it.
 *
 * Drawn by the app and thrown away the moment the real item arrives from the
 * server. It is the one piece of rendering the app does, and it exists only
 * because a line that appears after a round trip is not a line you drew.
 */
export class Preview {
  private readonly svg: SVGSVGElement;
  private readonly path: SVGPathElement;

  constructor(
    board: HTMLElement,
    style: { tool: string; fill: boolean; colour: string; weight: number },
  ) {
    const NS = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', `stroke tool-${style.tool} ${style.fill ? 'fill' : 'line'}`);
    this.svg.setAttribute(
      'style',
      `left:0;top:0;--stroke:${style.colour};--stroke-weight:${style.weight}px`,
    );
    this.path = document.createElementNS(NS, 'path');
    this.svg.append(this.path);
    board.append(this.svg);
  }

  draw(d: string): void {
    this.path.setAttribute('d', d);
  }

  remove(): void {
    this.svg.remove();
  }
}
