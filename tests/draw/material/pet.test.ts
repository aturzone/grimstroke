import { describe, expect, it } from 'vitest';
import {
  COATS,
  colourOf,
  PET_FRAMES,
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
