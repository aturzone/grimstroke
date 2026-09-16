import { describe, expect, it } from 'vitest';
import { tapeStrip, tornPath } from '~/art/paper.ts';
import { hashString, Rng } from '~/art/prng.ts';

describe('seeded randomness', () => {
  it('gives the same sequence for the same seed', () => {
    const a = new Rng('page-1');
    const b = new Rng('page-1');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('gives a different sequence for a different seed', () => {
    const a = new Rng('page-1');
    const b = new Rng('page-2');
    expect(a.next()).not.toBe(b.next());
  });

  it('stays inside the unit interval', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('draws gauss() centred near zero', () => {
    const rng = new Rng('spread');
    let total = 0;
    for (let i = 0; i < 2000; i += 1) total += rng.gauss();
    expect(Math.abs(total / 2000)).toBeLessThan(0.05);
  });

  it('hashes strings without collapsing them', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
    expect(hashString('page')).toBe(hashString('page'));
  });
});

describe('torn paper', () => {
  it('always tears a page the same way', () => {
    expect(tornPath(800, 600, 'x')).toEqual(tornPath(800, 600, 'x'));
  });

  it('tears two pages differently', () => {
    expect(tornPath(800, 600, 'one')).not.toEqual(tornPath(800, 600, 'two'));
  });

  it('pins the corners so the sheet still reads as a sheet', () => {
    const points = tornPath(1000, 700, 'corner');
    const first = points[0];
    expect(first).toBeDefined();
    expect(Math.abs(first?.x ?? 99)).toBeLessThan(2);
    expect(Math.abs(first?.y ?? 99)).toBeLessThan(2);
  });

  it('keeps the wander close to the requested amplitude', () => {
    const points = tornPath(1000, 700, 'amp', { amplitude: 6, nicks: 0 });
    const overshoot = Math.max(...points.map((p) => Math.max(-p.x, -p.y)));
    expect(overshoot).toBeLessThan(8);
  });

  it('rotates tape about its own centre, near the expected angle', () => {
    const tape = tapeStrip('t');
    expect(tape.rotation).toBeGreaterThan(-56);
    expect(tape.rotation).toBeLessThan(-34);
    expect(tape.clipPath.startsWith('polygon(')).toBe(true);
  });
});
