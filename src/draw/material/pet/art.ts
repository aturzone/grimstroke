/**
 * The pets: a cat and a dog, in several coats, in every pose they have.
 *
 * Every part and frame is drawn by hand in sprites.ts, as text, one letter per pixel, each letter a
 * role (outline, light fur, cream, points...) rather than a colour. This file puts a frame together
 * from its parts, then colours it for a coat: a tabby's stripes, a Siamese's points, a calico's
 * patches, a Dalmatian's spots, a beagle's saddle.
 *
 * The style follows Stardew Valley's pets (see sprites.ts): a small grid at a whole-number scale,
 * resting poses facing the viewer. Every frame is drawn once into one sprite sheet per pet and coat
 * (see app/shelf/pet.ts); after that a pet costs a background-position change when its frame
 * changes, and nothing else.
 */

import { ART } from '~/draw/material/pet/sprites.ts';

export const PET_W = 32;
export const PET_H = 28;
/** The row the pet stands on: its contact shadow. The paws are the row above. */
export const PET_GROUND = 26;

export type Species = 'cat' | 'dog';

export type PetPose =
  | 'walk'
  | 'run'
  | 'sit'
  | 'blink'
  | 'flick'
  | 'happy'
  | 'look'
  | 'yawn'
  | 'wash'
  | 'lick'
  | 'loaf'
  | 'sleep'
  | 'stretch'
  | 'eat'
  | 'crouch'
  | 'leap'
  | 'land';

/**
 * Frames per pose, and how many a second they play at. A four-frame walk, as Stardew's pets walk;
 * a sit that breathes, slowly.
 */
export const PET_FRAMES: Readonly<Record<PetPose, { count: number; fps: number }>> = {
  walk: { count: 4, fps: 7 },
  run: { count: 4, fps: 11 },
  sit: { count: 2, fps: 1 },
  blink: { count: 3, fps: 12 },
  flick: { count: 4, fps: 8 },
  happy: { count: 2, fps: 3 },
  look: { count: 1, fps: 1 },
  yawn: { count: 4, fps: 5 },
  wash: { count: 4, fps: 5 },
  lick: { count: 4, fps: 4 },
  loaf: { count: 1, fps: 1 },
  sleep: { count: 2, fps: 1 },
  stretch: { count: 3, fps: 4 },
  eat: { count: 2, fps: 4 },
  crouch: { count: 1, fps: 1 },
  leap: { count: 1, fps: 1 },
  land: { count: 1, fps: 1 },
};

export const POSES = Object.keys(PET_FRAMES) as PetPose[];

// ---------------------------------------------------------------- coats

/**
 * A coat: its colours and its pattern. The main fur and a second one (for stripes, points,
 * patches, spots or a saddle), each in three tones, and cream for a chest, muzzle and paws.
 */
export interface Coat {
  id: string;
  label: string;
  species: Species;
  fur: [string, string, string];
  second?: [string, string, string];
  /** A calico's third colour: its black patches. */
  third?: [string, string, string];
  cream: [string, string];
  pattern?: 'tabby' | 'patches' | 'points' | 'spots' | 'saddle' | 'mask';
  /** Where the cream goes: a little (muzzle, chest, paws), a lot (belly too), or none. */
  pale?: 'some' | 'lots' | 'none';
  eye: string;
  nose?: string;
  /** A dog's ears: pricked up (shiba, husky) or hanging (the rest). */
  ears?: 'up' | 'flop';
}

export const COATS: readonly Coat[] = [
  {
    id: 'ginger',
    label: 'ginger tabby',
    species: 'cat',
    fur: ['#f7b56e', '#e58a3e', '#b65a20'],
    second: ['#d06a24', '#b0521a', '#8a3c10'],
    cream: ['#fbf1e0', '#e6cda6'],
    pattern: 'tabby',
    eye: '#6fae3e',
  },
  {
    id: 'grey',
    label: 'grey tabby',
    species: 'cat',
    fur: ['#c6ced6', '#939ca7', '#656e79'],
    second: ['#747c86', '#5a616b', '#434951'],
    cream: ['#f6f6f3', '#d9dbd8'],
    pattern: 'tabby',
    eye: '#d2aa2c',
  },
  {
    id: 'black',
    label: 'black',
    species: 'cat',
    fur: ['#55556a', '#34343f', '#212129'],
    cream: ['#55556a', '#34343f'],
    pale: 'none',
    eye: '#e0bc36',
    nose: '#7a4a52',
  },
  {
    id: 'tuxedo',
    label: 'tuxedo',
    species: 'cat',
    fur: ['#55556a', '#34343f', '#212129'],
    cream: ['#f7f5f0', '#d8d4cc'],
    pale: 'lots',
    eye: '#93c74c',
  },
  {
    id: 'white',
    label: 'white',
    species: 'cat',
    fur: ['#ffffff', '#f1ede6', '#d3cbbf'],
    cream: ['#ffffff', '#e6dfd4'],
    pale: 'none',
    eye: '#5fa8d8',
  },
  {
    id: 'calico',
    label: 'calico',
    species: 'cat',
    fur: ['#fffaf1', '#f3ebdc', '#d8ccb6'],
    second: ['#f3a55a', '#dc833c', '#aa5e24'],
    third: ['#55556a', '#34343f', '#212129'],
    cream: ['#fffaf1', '#e5dac6'],
    pattern: 'patches',
    pale: 'none',
    eye: '#6fae3e',
  },
  {
    id: 'siamese',
    label: 'siamese',
    species: 'cat',
    fur: ['#f8eedc', '#e9d9bd', '#cbb795'],
    second: ['#8a6650', '#654a38', '#443024'],
    cream: ['#fbf4e6', '#e6d5b8'],
    pattern: 'points',
    eye: '#4a90d9',
  },
  {
    id: 'shiba',
    label: 'shiba',
    species: 'dog',
    ears: 'up',
    fur: ['#f4ab5e', '#dc863c', '#aa5e24'],
    cream: ['#fbf1e0', '#e8cfa8'],
    pale: 'lots',
    eye: '#2a1a12',
  },
  {
    id: 'golden',
    label: 'golden',
    species: 'dog',
    fur: ['#f6d383', '#e2b055', '#b98834'],
    cream: ['#fbeccb', '#e8d3a2'],
    pale: 'some',
    eye: '#2a1a12',
  },
  {
    id: 'lab',
    label: 'black lab',
    species: 'dog',
    fur: ['#55555e', '#34343b', '#212126'],
    cream: ['#55555e', '#34343b'],
    pale: 'none',
    eye: '#6b4a2a',
    nose: '#121216',
  },
  {
    id: 'dalmatian',
    label: 'dalmatian',
    species: 'dog',
    fur: ['#ffffff', '#f1ede6', '#d3cbbf'],
    second: ['#34343b', '#212126', '#141418'],
    cream: ['#ffffff', '#e6dfd4'],
    pattern: 'spots',
    pale: 'none',
    eye: '#2a1a12',
  },
  {
    id: 'beagle',
    label: 'beagle',
    species: 'dog',
    fur: ['#eaae63', '#cc8d45', '#9e682a'],
    second: ['#43342a', '#2e241d', '#1c1612'],
    cream: ['#fdf8ef', '#e5dac6'],
    pattern: 'saddle',
    pale: 'lots',
    eye: '#2a1a12',
  },
  {
    id: 'husky',
    label: 'husky',
    species: 'dog',
    ears: 'up',
    fur: ['#a3acb6', '#7b8490', '#58606b'],
    second: ['#6a727d', '#4d545e', '#373d45'],
    cream: ['#f7f7f5', '#d9dbd8'],
    pattern: 'mask',
    pale: 'lots',
    eye: '#5fb0e8',
  },
];

export function coatOf(id: string | undefined, species: Species = 'cat'): Coat {
  return (
    COATS.find((c) => c.id === id && c.species === species) ??
    (COATS.find((c) => c.species === species) as Coat)
  );
}

// ---------------------------------------------------------------- putting a frame together

type Grid = string[][];

interface Part {
  x: number;
  y: number;
  inc: Array<{ name: string; dx: number; dy: number; far: boolean }>;
  rows: string[];
}

function parse(art: string): Map<string, Part> {
  const parts = new Map<string, Part>();
  let cur: Part | undefined;
  for (const raw of art.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('==')) {
      const [, name = '', rest = ''] = /^==\s*(\S+)\s*(.*)$/.exec(line) ?? [];
      const x = /\bx=(-?\d+)/.exec(rest);
      const y = /\by=(-?\d+)/.exec(rest);
      cur = { x: x ? Number(x[1]) : 0, y: y ? Number(y[1]) : 0, inc: [], rows: [] };
      parts.set(name, cur);
    } else if (!cur || !line.trim() || line.trimStart().startsWith('#')) {
      // Between parts, or a note.
    } else if (line.startsWith('@')) {
      const [ref = '', dx = '0', dy = '0'] = line.slice(1).split(/\s+/);
      const far = ref.endsWith('~');
      cur.inc.push({ name: far ? ref.slice(0, -1) : ref, dx: Number(dx), dy: Number(dy), far });
    } else {
      cur.rows.push(line.split(' ')[0] ?? '');
    }
  }
  return parts;
}

/** A far limb, behind the body: the same drawing, in the shade tones. */
const FAR: Readonly<Record<string, string>> = {
  l: 'd',
  f: 'd',
  w: 'v',
  a: 'A',
  p: 'q',
  P: 'q',
  s: 'S',
  t: 'T',
  b: 'B',
  L: 'D',
  F: 'D',
};

let parts: Map<string, Part> | undefined;

function compose(name: string, swap: Readonly<Record<string, string>>): Grid {
  parts ??= parse(ART);
  const part = parts.get(swap[name] ?? name);
  const g: Grid = Array.from({ length: PET_H }, () => Array.from({ length: PET_W }, () => '.'));
  if (!part) return g;
  for (const inc of part.inc) {
    const under = compose(inc.name, swap);
    for (let y = 0; y < PET_H; y++) {
      for (let x = 0; x < PET_W; x++) {
        const c = under[y]?.[x] ?? '.';
        const row = g[y + inc.dy];
        const tx = x + inc.dx;
        if (c === '.' || !row || tx < 0 || tx >= PET_W) continue;
        row[tx] = inc.far ? (FAR[c] ?? c) : c;
      }
    }
  }
  part.rows.forEach((line, dy) => {
    const row = g[part.y + dy];
    if (!row) return;
    [...line].forEach((c, dx) => {
      const x = part.x + dx;
      if (c === '.' || x < 0 || x >= PET_W) return;
      row[x] = c === '_' ? '.' : c;
    });
  });
  return g;
}

/** A pricked-eared dog (shiba, husky): its own head, and a tail curled over its back. */
const PRICKED: Readonly<Record<string, string>> = {
  dhead: 'dheadU',
  dshead: 'dsheadU',
  dstail: 'dstailU',
  dstailw: 'dstailwU',
  dhalf: 'dhalfU',
  dshut: 'dshutU',
  dhappy: 'dhappyU',
  dup: 'dupU',
};

const drawn = new Map<string, Grid>();

/** The drawing of a frame, before it is coloured for a coat. */
function drawing(species: Species, ears: 'up' | 'flop', pose: PetPose, n: number): Grid {
  const key = `${species}:${ears}:${pose}:${n}`;
  const made = drawn.get(key);
  if (made) return made;
  const g = compose(`${species}.${pose}.${n}`, species === 'dog' && ears === 'up' ? PRICKED : {});
  drawn.set(key, g);
  return g;
}

// ---------------------------------------------------------------- a coat's pattern

/** A number in [0, 1) for a position, the same every time: patches that stay put. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const TONE: Readonly<Record<string, 'l' | 'f' | 'd'>> = {
  l: 'l',
  f: 'f',
  d: 'd',
  s: 'f',
  S: 'd',
  L: 'l',
  F: 'f',
  D: 'd',
};

/** A calico's patches, a Dalmatian's spots: the fur a coat marks, not drawn but placed. */
function marks(g: Grid, coat: Coat): Grid {
  if (coat.pattern !== 'patches' && coat.pattern !== 'spots') return g;
  return g.map((row, y) =>
    row.map((c, x) => {
      const tone = TONE[c];
      if (!tone) return c;
      if (coat.pattern === 'patches') {
        // Big patches: cells of 5x4, their edges nudged so they do not look ruled.
        const cx = Math.floor((x + (hash(0, y, 7) < 0.5 ? 0 : 1)) / 5);
        const cy = Math.floor((y + (hash(x, 0, 9) < 0.5 ? 0 : 1)) / 4);
        const r = hash(cx, cy, 3);
        if (r < 0.3) return `X${tone}`;
        if (r < 0.48) return `Y${tone}`;
        return c;
      }
      // Spots: a pixel or two, scattered.
      const r = hash(Math.floor(x / 2), Math.floor(y / 2), 5);
      return r < 0.16 && (x + y) % 2 === 0 ? `X${tone}` : c;
    }),
  );
}

// ---------------------------------------------------------------- glyphs over the pet

/** A little glyph of pixels, stamped: the z's of sleep, a heart. */
function glyph(g: Grid, rows: readonly string[], key: string, x: number, y: number): void {
  rows.forEach((line, dy) => {
    [...line].forEach((ch, dx) => {
      const row = g[y + dy];
      if (ch !== '.' && row && x + dx >= 0 && x + dx < PET_W) row[x + dx] = ch === 'D' ? 'H' : key;
    });
  });
}

/** One frame, as a grid of colour keys. */
export function petFrame(species: Species, coat: Coat, pose: PetPose, n: number): Grid {
  const count = PET_FRAMES[pose].count;
  const k = ((n % count) + count) % count;
  const g = marks(drawing(species, coat.ears ?? 'flop', pose, k), coat).map((row) => [...row]);
  if (pose === 'sleep') glyph(g, ['zzz', '..z', '.z.', 'zzz'], 'z', 27, 8 - k);
  if (pose === 'happy') glyph(g, ['.h.h.', 'hhhhh', 'hhhhD', '.hhD.', '..D..'], 'h', 25, 2 - k);
  return g;
}

// ---------------------------------------------------------------- colours

/** A colour pulled toward black by `t` (0..1): the outline, a dark shade of the fur itself. */
function darker(hex: string, t: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (s: number): string =>
    Math.round(((n >> s) & 255) * (1 - t))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** The colour for a key, in this coat. */
export function colourOf(coat: Coat, key: string): string | undefined {
  const [fl, fm, fd] = coat.fur;
  const second = coat.second ?? coat.fur;
  const third = coat.third ?? second;
  const pale = coat.pale ?? 'some';
  const cream: [string, string] = pale === 'none' ? [fm, fd] : coat.cream;
  const belly: [string, string] = pale === 'lots' ? coat.cream : [fm, fd];
  const points = coat.pattern === 'points';
  const tabby = coat.pattern === 'tabby';
  const point: [string, string, string] = points ? second : coat.fur;
  // The saddle: a beagle's black back, a husky's darker one; on any other coat, only fur.
  const saddle: [string, string, string] =
    coat.pattern === 'saddle' || coat.pattern === 'mask' ? second : coat.fur;
  // A coloured outline, as Stardew draws it: the darkest fur, darker still. A black coat's has to
  // be near black, or the silhouette melts into the fur.
  const dark = Number.parseInt(fd.slice(1, 3), 16) < 0x40;
  const table: Record<string, string> = {
    o: dark ? '#121015' : darker(fd, 0.58),
    l: fl,
    f: fm,
    d: fd,
    s: tabby ? second[1] : fm,
    S: tabby ? second[2] : fd,
    P: point[0],
    p: point[1],
    q: point[2],
    L: saddle[0],
    F: saddle[1],
    D: saddle[2],
    w: cream[0],
    v: cream[1],
    b: belly[0],
    B: belly[1],
    c: cream[0],
    a: points ? second[1] : cream[0],
    A: points ? second[2] : cream[1],
    Xl: second[0],
    Xf: second[1],
    Xd: second[2],
    Yl: third[0],
    Yf: third[1],
    Yd: third[2],
    e: coat.eye,
    u: dark ? '#050406' : '#1b120e',
    k: '#ffffff',
    n: coat.nose ?? (coat.species === 'dog' ? '#221816' : '#e0707e'),
    m: '#5a2a22',
    t: '#f0a0a8',
    T: '#c47a84',
    r: '#ef8a9a',
    // The contact shadow: see-through, so it darkens whatever wood the shelf is.
    g: 'rgba(20, 10, 4, 0.32)',
    z: '#ffffff',
    h: '#f0506e',
    H: '#b8304c',
  };
  return table[key];
}
