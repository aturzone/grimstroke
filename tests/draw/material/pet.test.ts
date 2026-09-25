import { describe, expect, it } from 'vitest';
import {
  COATS,
  colourOf,
  PET_FRAMES,
  PET_GROUND,
  PET_H,
  PET_W,
  POSES,
  petFrame,
} from '~/draw/material/pet/art.ts';
import { readPet, readProfile } from '~/draw/material/profile/model.ts';

describe('the pets, drawn', () => {
  it('draws every pose of every coat in colours that were chosen, on the grid', () => {
    const bad = new Set<string>();
    for (const coat of COATS) {
      for (const pose of POSES) {
        for (let n = 0; n < PET_FRAMES[pose].count; n++) {
          const g = petFrame(coat.species, coat, pose, n);
          if (g.length !== PET_H) bad.add(`${coat.id} ${pose}${n}: ${g.length} rows`);
          for (const row of g) {
            if (row.length !== PET_W) bad.add(`${coat.id} ${pose}${n}: a row of ${row.length}`);
            for (const k of row)
              if (k !== '.' && colourOf(coat, k) === undefined)
                bad.add(`${coat.id} ${pose}${n}: ${k}`);
          }
        }
      }
    }
    expect([...bad].slice(0, 10)).toEqual([]);
  });

  it('has a drawing for every frame, standing on the ground unless it is in the air', () => {
    const bad: string[] = [];
    for (const coat of [
      COATS.find((c) => c.id === 'ginger'),
      COATS.find((c) => c.id === 'husky'),
    ]) {
      if (!coat) continue;
      for (const pose of POSES) {
        for (let n = 0; n < PET_FRAMES[pose].count; n++) {
          const g = petFrame(coat.species, coat, pose, n);
          const solid = g.flat().filter((k) => k !== '.').length;
          // A frame name the drawings lack comes back empty, not as an error: count the pixels.
          if (solid < 80) bad.push(`${coat.id} ${pose}${n}: only ${solid} pixels`);
          const lowest = g.findLastIndex((row) => row.some((k) => k !== '.'));
          const airborne = pose === 'leap' || pose === 'run' || pose === 'happy';
          if (lowest > PET_GROUND || (!airborne && lowest !== PET_GROUND))
            bad.push(`${coat.id} ${pose}${n}: stands on row ${lowest}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('draws the walk and the run in four frames, each different', () => {
    for (const pose of ['walk', 'run'] as const) {
      const coat = COATS[0];
      if (!coat) continue;
      const frames = Array.from({ length: PET_FRAMES[pose].count }, (_, n) =>
        petFrame('cat', coat, pose, n)
          .map((r) => r.join(''))
          .join('\n'),
      );
      expect(frames.length).toBe(4);
      expect(new Set(frames).size).toBe(4);
    }
  });

  it('faces you when it sits: the head is a mirror of itself', () => {
    for (const id of ['ginger', 'golden', 'husky']) {
      const coat = COATS.find((c) => c.id === id);
      if (!coat) continue;
      const g = petFrame(coat.species, coat, 'sit', 0);
      // The head: the rows above the shoulders. Compare each pixel with its mirror about the
      // head's own middle, ignoring colour and counting only filled against empty.
      let same = 0;
      let all = 0;
      for (const row of g.slice(3, 16)) {
        const xs = row.flatMap((k, x) => (k === '.' ? [] : [x]));
        if (!xs.length) continue;
        const mid = ((xs[0] ?? 0) + (xs[xs.length - 1] ?? 0)) / 2;
        for (const x of xs) {
          all++;
          if (row[Math.round(2 * mid - x)] !== '.') same++;
        }
      }
      expect(same / all).toBeGreaterThan(0.9);
    }
  });

  it('has both a cat and a dog, in several coats each', () => {
    expect(COATS.filter((c) => c.species === 'cat').length).toBeGreaterThanOrEqual(5);
    expect(COATS.filter((c) => c.species === 'dog').length).toBeGreaterThanOrEqual(5);
  });

  it('keeps a pet in the profile, read defensively', () => {
    expect(readPet({ species: 'dog', coat: 'beagle', name: '  Pepper ' })).toEqual({
      species: 'dog',
      coat: 'beagle',
      name: 'Pepper',
      on: true,
    });
    expect(readPet({ species: 'bird', coat: '<x>' })).toMatchObject({
      species: 'cat',
      coat: 'ginger',
    });
    expect(
      readProfile({ name: 'a', pet: { species: 'cat', coat: 'tuxedo', on: false } }).pet,
    ).toMatchObject({ coat: 'tuxedo', on: false });
  });
});
