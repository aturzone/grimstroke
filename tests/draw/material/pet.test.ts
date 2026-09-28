import { describe, expect, it } from 'vitest';
import {
  between,
  COATS,
  colourOf,
  FAMILY,
  frameAt,
  nextFrameIn,
  PET_FRAMES,
  PET_GROUND,
  PET_H,
  PET_W,
  POSES,
  petFrame,
  poseLength,
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

  it('walks in eight frames and gallops in six, every frame different, cat and dog', () => {
    for (const id of ['ginger', 'golden']) {
      const coat = COATS.find((c) => c.id === id);
      if (!coat) continue;
      for (const [pose, count] of [
        ['walk', 8],
        ['run', 6],
      ] as const) {
        const frames = Array.from({ length: PET_FRAMES[pose].count }, (_, n) =>
          petFrame(coat.species, coat, pose, n)
            .map((r) => r.join(''))
            .join('\n'),
        );
        expect(frames.length).toBe(count);
        expect(new Set(frames).size).toBe(count);
      }
    }
  });

  it('times every frame of every pose, and plays once or loops as the pose asks', () => {
    for (const pose of POSES) {
      const spec = PET_FRAMES[pose];
      expect(spec.ms.length).toBe(spec.count);
      expect(spec.ms.every((ms) => ms > 0)).toBe(true);
    }
    // A blink: down quickly, held shut, up.
    expect(frameAt('blink', 0)).toBe(0);
    expect(frameAt('blink', 70)).toBe(1);
    expect(frameAt('blink', 200)).toBe(2);
    // Played once, it holds its last frame; looped, it comes round again.
    expect(frameAt('sitdown', 10_000)).toBe(PET_FRAMES.sitdown.count - 1);
    expect(frameAt('walk', poseLength('walk'))).toBe(0);
    expect(nextFrameIn('blink', 0)).toBe(PET_FRAMES.blink.ms[0]);
    expect(nextFrameIn('sitdown', 10_000)).toBe(Number.POSITIVE_INFINITY);
  });

  it('joins the poses through their in-betweens, never straight from one to the other', () => {
    expect(between('walk', 'sit')).toEqual(['sitdown']);
    expect(between('sit', 'walk')).toEqual(['standup']);
    expect(between('sit', 'sleep')).toEqual(['standup', 'liedown', 'curl']);
    expect(between('sleep', 'stretch')).toEqual(['wake', 'getup']);
    expect(between('sleep', 'sit')).toEqual(['wake', 'getup', 'sitdown']);
    expect(between('loaf', 'sleep')).toEqual(['curl']);
    expect(between('blink', 'yawn')).toEqual([]);
    // Every route ends in the family it was going to.
    for (const from of POSES) {
      for (const to of POSES) {
        const route = between(from, to);
        const end = route.length
          ? FAMILY[route[route.length - 1] as (typeof POSES)[number]]
          : FAMILY[from];
        expect(end).toBe(FAMILY[to]);
      }
    }
  });

  it('begins and ends its in-betweens on the drawings either side of them', () => {
    const coat = COATS.find((c) => c.id === 'ginger');
    if (!coat) return;
    const draw = (pose: (typeof POSES)[number], n: number) =>
      petFrame('cat', coat, pose, n)
        .map((r) => r.join(''))
        .join('\n');
    expect(draw('sitdown', 0)).toBe(draw('stand', 0));
    expect(draw('standup', PET_FRAMES.standup.count - 1)).toBe(draw('stand', 0));
    expect(draw('getup', PET_FRAMES.getup.count - 1)).toBe(draw('stand', 0));
    expect(draw('stretch', 0)).toBe(draw('stand', 0));
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
    // The two contact frames, half a cycle apart, put different feet down in different places.
    expect(paws(0)).not.toBe(paws(4));
    // The body sinks onto the legs after each contact and rises over the passing legs: the back
    // (over the middle of the body; the tail moves on its own) is higher at 3 than at 1.
    for (const [species, id] of [
      ['dog', 'golden'],
      ['cat', 'ginger'],
    ] as const) {
      const top = (n: number) =>
        filled(petFrame(species, coat(id), 'walk', n))
          .filter(([x]) => x >= 9 && x <= 15)
          .reduce((m, [, y]) => Math.min(m, y), 99);
      expect(top(3)).toBeLessThan(top(1));
      expect(top(7)).toBeLessThan(top(5));
    }
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
      for (const pose of [
        'loaf',
        'sleep',
        'crouch',
        'leap',
        'land',
        'walk',
        'run',
        'stand',
        'sitdown',
        'standup',
        'liedown',
        'getup',
        'curl',
        'wake',
      ] as const) {
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

  it('gathers itself before it springs: low, then lower, the paws still on the ground', () => {
    for (const [species, id] of [
      ['cat', 'ginger'],
      ['dog', 'golden'],
      ['dog', 'husky'],
    ] as const) {
      // The back, over the middle of the body: clear of a curled tail and of the head.
      const back = (g: string[][]) =>
        Math.min(
          ...filled(g)
            .filter(([x]) => x >= 12 && x <= 15)
            .map(([, y]) => y),
        );
      const stand = petFrame(species, coat(id), 'stand', 0);
      const low = petFrame(species, coat(id), 'crouch', 0);
      const lower = petFrame(species, coat(id), 'crouch', 1);
      expect(back(low) - back(stand)).toBeGreaterThanOrEqual(3);
      expect(back(lower)).toBeGreaterThan(back(low));
      // And it lands on its forepaws first: the landing's first frame is lower than its second.
      expect(back(petFrame(species, coat(id), 'land', 0))).toBeGreaterThan(
        back(petFrame(species, coat(id), 'land', 1)),
      );
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
  it('draws every frame of every pose, in every coat, as one body: strictly 4-connected', () => {
    // The z's of sleep and a heart are glyphs over the pet, not part of it.
    const body = (g: string[][]) =>
      g.map((row) => row.map((k) => (k === 'z' || k === 'h' || k === 'H' ? '.' : k)));
    const loose: string[] = [];
    for (const c of COATS) {
      for (const pose of POSES) {
        for (let n = 0; n < PET_FRAMES[pose].count; n++) {
          if (pieces(body(petFrame(c.species, c, pose, n))) !== 1)
            loose.push(`${c.id} ${pose}.${n}`);
        }
      }
    }
    expect(loose).toEqual([]);
  });

  /** The top of the back: the highest pixel over the middle of the body, side on. */
  const backTop = (g: string[][]): number => {
    for (let y = 0; y < PET_H; y++) for (let x = 11; x <= 15; x++) if (g[y]?.[x] !== '.') return y;
    return PET_H;
  };

  it('keeps a walking body on its legs: fur from the body to the paw, never a line across the hip', () => {
    const broken: string[] = [];
    for (const c of COATS) {
      const frames = Array.from({ length: PET_FRAMES.walk.count }, (_, n) =>
        petFrame(c.species, c, 'walk', n),
      );
      const standing = backTop(frames[0] as string[][]);
      frames.forEach((g, n) => {
        const top = backTop(g);
        // It dips at each step and never rises above standing: rising, it lifted off its legs.
        if (top < standing) broken.push(`${c.id} walk.${n} rises`);
        // Somewhere under the hip and somewhere under the shoulder, one column of fur runs from
        // inside the body down to the paw with no outline across it: the near leg is part of the body.
        for (const [from, to, where] of [
          [5, 12, 'hip'],
          [15, 23, 'shoulder'],
        ] as const) {
          // A path through fur (never an outline) from inside the body down toward the paw,
          // which may step sideways as a leg slants.
          const fur = (x: number, y: number): boolean => {
            const k = g[y]?.[x] ?? '.';
            return k !== '.' && k !== 'o';
          };
          let front = new Set<number>();
          for (let x = from; x <= to; x++) if (fur(x, top + 3)) front.add(x);
          for (let y = top + 4; y <= PET_GROUND - 4 && front.size; y++) {
            const next = new Set<number>();
            for (const x of front)
              for (const nx of [x - 1, x, x + 1])
                if ((fur(nx, y) && fur(nx, y - 1)) || (nx === x && fur(nx, y))) next.add(nx);
            front = next;
          }
          const joined = front.size > 0;
          if (!joined) broken.push(`${c.id} walk.${n} ${where}`);
        }
      });
    }
    expect(broken).toEqual([]);
  });

  it('carries the head with the body as it walks: a pixel of lag at most, never a jump', () => {
    const headTop = (g: string[][]): number => {
      for (let y = 0; y < PET_H; y++)
        for (let x = 22; x < PET_W; x++) if (g[y]?.[x] !== '.') return y;
      return PET_H;
    };
    const jumps: string[] = [];
    for (const c of COATS) {
      const rel = Array.from({ length: PET_FRAMES.walk.count }, (_, n) => {
        const g = petFrame(c.species, c, 'walk', n);
        return headTop(g) - backTop(g);
      });
      rel.forEach((r, n) => {
        const next = rel[(n + 1) % rel.length] as number;
        if (Math.abs(next - r) > 1)
          jumps.push(`${c.id} walk.${n}->${(n + 1) % rel.length}: ${r} to ${next}`);
      });
    }
    expect(jumps).toEqual([]);
  });
});
