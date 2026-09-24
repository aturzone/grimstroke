import { describe, expect, it } from 'vitest';
import {
  CAT_COLOURS,
  CAT_FRAMES,
  CAT_GROUND,
  CAT_H,
  CAT_W,
  type CatPose,
  catFrame,
} from '~/app/shelf/cat-art.ts';

describe('the shelf cat, drawn', () => {
  const poses = Object.keys(CAT_FRAMES) as CatPose[];

  it('draws every frame of every pose in colours that were chosen, on the grid', () => {
    for (const pose of poses) {
      for (let n = 0; n < CAT_FRAMES[pose].count; n++) {
        const g = catFrame(pose, n);
        expect(g.length).toBe(CAT_H);
        for (const row of g) {
          expect(row.length).toBe(CAT_W);
          for (const c of row)
            expect(c === '.' || c in CAT_COLOURS, `${pose} ${n}: ${c}`).toBe(true);
        }
      }
    }
  });

  it('stands on the plank, with an outline all round', () => {
    for (const pose of ['walk', 'sit', 'sleep'] as CatPose[]) {
      const g = catFrame(pose, 0);
      const bottom = g.findLastIndex((row) => row.some((c) => c !== '.' && c !== 'z'));
      expect(Math.abs(bottom - CAT_GROUND)).toBeLessThanOrEqual(1);
      expect(g.flat().filter((c) => c === 'o').length).toBeGreaterThan(40);
    }
  });

  it('moves between the frames of a walk', () => {
    const a = catFrame('walk', 0)
      .map((r) => r.join(''))
      .join('\n');
    const b = catFrame('walk', 4)
      .map((r) => r.join(''))
      .join('\n');
    expect(a).not.toBe(b);
  });
});
