import { describe, expect, it } from 'vitest';
import {
  CURL_LEVELS,
  curlPath,
  tapeStrip,
  tornClipPath,
  tornRectPath,
  tornRectPoints,
} from '~/draw/look/paper.ts';
import { mulberry32, Rng, seedFrom } from '~/draw/look/rng.ts';

describe('seeded randomness', () => {
  it('gives the same stream for the same seed, on any machine', () => {
    // Paper whose tears rearrange themselves on refresh reads as a glitch, not as paper.
    const draw = (seed: string) => [...Array(6)].map(() => new Rng(seed).next());
    expect(draw('note-1')).toEqual(draw('note-1'));
    expect(new Rng('a').next()).not.toBe(new Rng('b').next());
  });

  it('folds a string to a stable 32-bit seed', () => {
    expect(seedFrom('note-1')).toBe(seedFrom('note-1'));
    expect(seedFrom('note-1')).not.toBe(seedFrom('note-2'));
    expect(Number.isInteger(seedFrom('x'))).toBe(true);
  });

  it('stays inside its range, and mostly near the middle', () => {
    const rng = new Rng('spread');
    let low = 0;
    for (let i = 0; i < 4000; i += 1) {
      const v = rng.range(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
      if (Math.abs(new Rng(`g${i}`).gauss()) < 1.1) low += 1;
    }
    // The mean of four draws clusters: a flat draw would put far fewer inside one unit.
    expect(low / 4000).toBeGreaterThan(0.75);
  });

  it('draws integers inclusive of both ends', () => {
    const rng = new Rng('ints');
    const seen = new Set<number>();
    for (let i = 0; i < 400; i += 1) seen.add(rng.int(0, 3));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('exposes mulberry32 on its own', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('torn paper', () => {
  it('closes the path and starts with a move', () => {
    const d = tornRectPath(240, 170, 'n1');
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('L');
  });

  it('is a clean rectangle at zero amplitude', () => {
    // The torn edge is a user knob, and 0 has to mean off rather than nearly off.
    expect(tornRectPath(100, 50, 'n', { amplitude: 0 })).toBe('M0 0 H100 V50 H0 Z');
  });

  it('is seeded, so a note always tears the same way', () => {
    expect(tornRectPath(240, 170, 'n1')).toBe(tornRectPath(240, 170, 'n1'));
    expect(tornRectPath(240, 170, 'n1')).not.toBe(tornRectPath(240, 170, 'n2'));
  });

  it('holds the corners still, or it stops reading as a rectangle', () => {
    const points = tornRectPoints(240, 170, 'corners', { amplitude: 6 });
    const corners = [0, 0.25, 0.5, 0.75].map((f) => points[Math.round(points.length * f)]);
    for (const corner of corners) {
      const nearX = Math.min(Math.abs(corner?.x ?? 0), Math.abs((corner?.x ?? 0) - 240));
      const nearY = Math.min(Math.abs(corner?.y ?? 0), Math.abs((corner?.y ?? 0) - 170));
      expect(Math.min(nearX, nearY)).toBeLessThan(1.5);
    }
  });

  it('stays within a few amplitudes of the box it was given', () => {
    // The displacement is signed, so the edge wanders both ways -- a tear is not an erosion.
    // What must hold is that it stays bounded: a nick reaches about 3.4 amplitudes inward,
    // and nothing should stray much further than that in either direction.
    const amp = 4;
    const points = tornRectPoints(240, 170, 'bounded', { amplitude: amp });
    const slack = amp * 4;
    for (const p of points) {
      expect(p.x).toBeGreaterThan(-slack);
      expect(p.y).toBeGreaterThan(-slack);
      expect(p.x).toBeLessThan(240 + slack);
      expect(p.y).toBeLessThan(170 + slack);
    }
  });

  it('correlates neighbours, so the edge reads as fibre and not as static', () => {
    // The displacement is smoothed against the previous one. For white noise the mean step
    // between neighbours is about 1.13 times the spread; correlated noise is well under it,
    // and that difference is the whole reason a tear looks torn.
    const points = tornRectPoints(600, 600, 'smooth', { amplitude: 5, nicks: 0 });
    const top = points.slice(2, Math.round(points.length / 4) - 2).map((p) => p.y);
    const mean = top.reduce((a, b) => a + b, 0) / top.length;
    const spread = Math.sqrt(top.reduce((a, b) => a + (b - mean) ** 2, 0) / top.length);
    let steps = 0;
    for (let i = 1; i < top.length; i += 1) {
      steps += Math.abs((top[i] as number) - (top[i - 1] as number));
    }
    const meanStep = steps / (top.length - 1);
    expect(meanStep).toBeLessThan(spread);
  });

  it('gives a percentage polygon for anything that is resized by CSS', () => {
    const clip = tornClipPath(1080, 1512, 'sheet');
    expect(clip.startsWith('polygon(')).toBe(true);
    expect(clip).toContain('%');
    expect(tornClipPath(1080, 1512, 'sheet')).toBe(clip);
  });
});

describe('tape', () => {
  it('is drawn centred on the origin and rotated about its own centre', () => {
    // Positioning by the strip's top-left and rotating about that swings it off into space,
    // which is exactly what the first version did.
    const tape = tapeStrip(240, 170, 0, 'n1');
    expect(tape.d.startsWith('M-')).toBe(true);
    expect(tape.transform).toBe(`translate(${tape.cx} ${tape.cy}) rotate(${tape.angle})`);
  });

  it('lands across the corner it was asked for, at roughly 45 degrees', () => {
    const w = 240;
    const h = 170;
    for (const [corner, nearX, nearY] of [
      [0, 0, 0],
      [1, w, 0],
      [2, w, h],
      [3, 0, h],
    ] as const) {
      const tape = tapeStrip(w, h, corner, 'n');
      expect(Math.abs(tape.cx - nearX), `corner ${corner} x`).toBeLessThan(8);
      expect(Math.abs(tape.cy - nearY), `corner ${corner} y`).toBeLessThan(8);
      expect(Math.abs(Math.abs(tape.angle) - 45), `corner ${corner} angle`).toBeLessThan(10);
    }
  });

  it('gives each corner its own strip, and repeats exactly', () => {
    expect(tapeStrip(240, 170, 0, 'n').d).not.toBe(tapeStrip(240, 170, 1, 'n').d);
    expect(tapeStrip(240, 170, 0, 'n')).toEqual(tapeStrip(240, 170, 0, 'n'));
  });
});

describe('the corner curl', () => {
  it('is genuinely empty at rest', () => {
    // A 14px wedge at level 0 meant every note sat with a hard dark triangle stapled to its
    // corner, which read as a rendering bug rather than as paper.
    expect(curlPath(240, 170, 0)).toBe('');
  });

  it('grows with t and stays inside the sheet', () => {
    const small = curlPath(240, 170, 0.25);
    const large = curlPath(240, 170, 1);
    expect(small).not.toBe(large);
    for (const d of [small, large]) {
      for (const n of d.match(/-?\d+\.\d+/g) ?? []) expect(Number(n)).toBeGreaterThanOrEqual(0);
    }
  });

  it('bakes enough levels to cross-fade between', () => {
    expect(CURL_LEVELS).toBeGreaterThanOrEqual(3);
  });
});
