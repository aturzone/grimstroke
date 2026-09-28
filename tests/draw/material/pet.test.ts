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

describe('the poses that used to break', () => {
  const coat = (id: string) => COATS.find((c) => c.id === id) as (typeof COATS)[number];
  const filled = (g: string[][]): Array<[number, number]> =>
    g.flatMap((row, y) =>
      row.flatMap((k, x) => (k !== '.' && k !== 'g' ? [[x, y] as [number, number]] : [])),
    );
  /** One connected silhouette: a lowered head that floats free of the body is the old fault. */
  const pieces = (g: string[][]): number => {
    const cells = new Set(filled(g).map(([x, y]) => `${x},${y}`));
    let count = 0;
    for (const start of [...cells]) {
      if (!cells.has(start)) continue;
      count++;
      const stack = [start];
      cells.delete(start);
      while (stack.length) {
        const [x, y] = (stack.pop() as string).split(',').map(Number) as [number, number];
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const k = `${x + (dx as number)},${y + (dy as number)}`;
          if (cells.has(k)) {
            cells.delete(k);
            stack.push(k);
          }
        }
      }
    }
    return count;
  };

  it("moves the dog's feet as it walks, in diagonal pairs", () => {
    // Where the paws are: every paw pixel, near and far, in the rows the legs stand in.
    const paws = (n: number) =>
      petFrame('dog', coat('golden'), 'walk', n)
        .flatMap((row, y) =>
          row.map((k, x) => (y >= 20 && (k === 'a' || k === 'A') ? `${x},${y}` : '')),
        )
        .filter(Boolean)
        .join(' ');
    // The two contact frames put different feet down in different places.
    expect(paws(0)).not.toBe(paws(2));
    // A contact frame dips the body a pixel below a passing frame.
    // The back, over the middle of the body: the tail moves on its own and is not counted.
    const top = (n: number) =>
      filled(petFrame('dog', coat('golden'), 'walk', n))
        .filter(([x]) => x >= 9 && x <= 15)
        .reduce((m, [, y]) => Math.min(m, y), 99);
    expect(top(1)).toBeLessThan(top(0));
  });

  it('eats and stretches as one body, cat and dog, in every coat', () => {
    const bad: string[] = [];
    for (const c of COATS) {
      for (const pose of ['eat', 'stretch'] as const) {
        for (let n = 0; n < PET_FRAMES[pose].count; n++) {
          const p = pieces(petFrame(c.species, c, pose, n));
          if (p !== 1) bad.push(`${c.id} ${pose}${n}: ${p} pieces`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('sleeps curled low, breathing', () => {
    const g0 = petFrame('cat', coat('ginger'), 'sleep', 0);
    const g1 = petFrame('cat', coat('ginger'), 'sleep', 1);
    // The body only: the z's of sleep are drawn over it.
    const body = (g: string[][]) => filled(g).filter(([x, y]) => y > 10 && g[y]?.[x] !== 'z');
    const height = (g: string[][]) => {
      const ys = body(g).map(([, y]) => y);
      return Math.max(...ys) - Math.min(...ys) + 1;
    };
    expect(height(g0)).toBeLessThanOrEqual(13);
    expect(JSON.stringify(body(g0))).not.toBe(JSON.stringify(body(g1)));
    // The dog too: curled on its side, not a bun facing you, and breathing.
    for (const id of ['golden', 'husky']) {
      const d0 = petFrame('dog', coat(id), 'sleep', 0);
      const d1 = petFrame('dog', coat(id), 'sleep', 1);
      expect(height(d0)).toBeLessThanOrEqual(15);
      expect(JSON.stringify(body(d0))).not.toBe(JSON.stringify(body(d1)));
    }
  });

  it('loafs, sleeps, crouches, leaps and lands as one body, in every coat', () => {
    const bad: string[] = [];
    for (const c of COATS) {
      for (const pose of ['loaf', 'sleep', 'crouch', 'leap', 'land'] as const) {
        for (let n = 0; n < PET_FRAMES[pose].count; n++) {
          // The z's of sleep float free of the body by design.
          const g = petFrame(c.species, c, pose, n).map((row) =>
            row.map((k) => (k === 'z' ? '.' : k)),
          );
          const p = pieces(g);
          if (p !== 1) bad.push(`${c.id} ${pose}${n}: ${p} pieces`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('makes a loaf a loaf: compact and rounded, not a thin strip', () => {
    for (const [species, id] of [
      ['cat', 'ginger'],
      ['dog', 'golden'],
    ] as const) {
      const cells = filled(petFrame(species, coat(id), 'loaf', 0));
      const ys = cells.map(([, y]) => y);
      // The head sits up, well over the back: at least eleven rows from the ears to the paws.
      expect(Math.max(...ys) - Math.min(...ys) + 1).toBeGreaterThanOrEqual(11);
    }
  });

  it('gives a Siamese its mask, and no other cat one', () => {
    const has = (id: string, pose: 'sit' | 'walk') =>
      petFrame('cat', coat(id), pose, 0)
        .flat()
        .some((k) => k === 'x' || k === 'y');
    expect(has('siamese', 'sit')).toBe(true);
    expect(has('siamese', 'walk')).toBe(true);
    expect(has('ginger', 'sit')).toBe(false);
    expect(has('calico', 'walk')).toBe(false);
  });

  it("keeps a Dalmatian's spots off its face, and on its body", () => {
    const spots = (g: string[][]) => g.flat().filter((k) => k.startsWith('X')).length;
    for (const pose of ['sit', 'walk', 'sleep', 'loaf'] as const) {
      // The golden is drawn the same, unmarked: where it has face fur, the Dalmatian has no spot.
      const plain = petFrame('dog', coat('golden'), pose, 0);
      const spotted = petFrame('dog', coat('dalmatian'), pose, 0);
      const onFace = plain.flatMap((row, y) =>
        row.filter((k, x) => ['1', '2', '3'].includes(k) && spotted[y]?.[x]?.startsWith('X')),
      );
      expect(onFace).toEqual([]);
      expect(spots(spotted)).toBeGreaterThan(4);
    }
  });

  it('sleeps with its ears laid flat and its head tucked, where a loaf holds its head up', () => {
    // The highest pixel over the head's columns: the ear tips in a loaf, the laid-back head asleep.
    const top = (pose: 'loaf' | 'sleep') => {
      const ys = filled(petFrame('cat', coat('ginger'), pose, 0))
        .filter(([x, y]) => x >= 24 && x <= 27 && y > 11)
        .map(([, y]) => y);
      return Math.min(...ys);
    };
    expect(top('sleep') - top('loaf')).toBeGreaterThanOrEqual(4);
  });

  it("gives a Siamese's ears its points, and every other cat pink ones", () => {
    const siamese = coat('siamese');
    expect(colourOf(siamese, 't')).toBe(siamese.second?.[1]);
    expect(colourOf(coat('ginger'), 't')).toBe('#f0a0a8');
  });

  it('crouches to spring: rump up, head down low, belly off the ground', () => {
    for (const id of ['golden', 'husky']) {
      const walk = petFrame('dog', coat(id), 'walk', 0);
      const crouch = petFrame('dog', coat(id), 'crouch', 0);
      const topOf = (g: string[][], x0: number, x1: number) =>
        Math.min(
          ...filled(g)
            .filter(([x]) => x >= x0 && x <= x1)
            .map(([, y]) => y),
        );
      // The head, seven rows lower than it walks.
      expect(topOf(crouch, 24, 30) - topOf(walk, 24, 30)).toBeGreaterThanOrEqual(6);
      // The rump, higher than the head: the back slopes down to it.
      expect(topOf(crouch, 3, 10)).toBeLessThan(topOf(crouch, 24, 30));
      // A gap under the belly, between the hind paw and the forepaws.
      expect(crouch[24]?.slice(13, 18).every((k) => k === '.')).toBe(true);
    }
  });

  it("shades a sleeping dog's back as one arc, with no outline drawn across it", () => {
    for (const id of ['golden', 'dalmatian']) {
      const g = petFrame('dog', coat(id), 'sleep', 0);
      // An outline pixel with fur on all four sides is a line drawn inside the body.
      const inside = filled(g).filter(([x, y]) => {
        if (g[y]?.[x] !== 'o' || x > 16) return false;
        const fur = (k: string | undefined) => k !== undefined && k !== '.' && k !== 'o';
        return fur(g[y - 1]?.[x]) && fur(g[y + 1]?.[x]) && fur(g[y]?.[x - 1]) && fur(g[y]?.[x + 1]);
      });
      expect(inside).toEqual([]);
    }
  });
});
