/**
 * The pets: a cat and a dog, in several coats, in every pose they have.
 *
 * Every frame is drawn by hand, pixel by pixel, in sprites.ts -- as text, one letter per pixel,
 * each letter a role (outline, light fur, shade, cream, points...) rather than a colour. This file
 * puts a frame together from its parts, then colours it for a coat: a ginger tabby's stripes, a
 * Siamese's points, a calico's patches, a Dalmatian's spots, a beagle's saddle.
 *
 * Every frame is drawn once into one sprite sheet per pet and coat (see app/shelf/pet.ts); after
 * that a pet costs a background-position change when its frame changes, and nothing else.
 */

import { CAT_ART, DOG_ART } from '~/draw/material/pet/sprites.ts';

export const PET_W = 48;
export const PET_H = 40;
/** The row the paws stand on. */
export const PET_GROUND = 37;

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

/** Frames per pose, and how many a second they play at. */
export const PET_FRAMES: Readonly<Record<PetPose, { count: number; fps: number }>> = {
  walk: { count: 6, fps: 9 },
  run: { count: 6, fps: 14 },
  sit: { count: 1, fps: 1 },
  blink: { count: 3, fps: 12 },
  flick: { count: 4, fps: 8 },
  happy: { count: 2, fps: 3 },
  look: { count: 1, fps: 1 },
  yawn: { count: 4, fps: 5 },
  wash: { count: 4, fps: 5 },
  lick: { count: 4, fps: 5 },
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

interface Block {
  x: number;
  y: number | undefined;
  inc: Array<{ name: string; dx: number; dy: number; mode: '' | '~' | '%' }>;
  rows: string[];
}

function parse(art: string): Map<string, Block> {
  const blocks = new Map<string, Block>();
  let cur: Block | undefined;
  for (const raw of art.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('==')) {
      const [, name = '', rest = ''] = /^==\s*(\S+)\s*(.*)$/.exec(line) ?? [];
      const x = /\bx=(-?\d+)/.exec(rest);
      const y = /\by=(-?\d+)/.exec(rest);
      cur = { x: x ? Number(x[1]) : 0, y: y ? Number(y[1]) : undefined, inc: [], rows: [] };
      blocks.set(name, cur);
    } else if (!cur || !line.trim() || line.trimStart().startsWith('#')) {
      // Between blocks, or a note.
    } else if (line.startsWith('@')) {
      const [ref = '', dx = '0', dy = '0'] = line.slice(1).split(/\s+/);
      const mode = ref.endsWith('~') ? '~' : ref.endsWith('%') ? '%' : '';
      cur.inc.push({ name: mode ? ref.slice(0, -1) : ref, dx: Number(dx), dy: Number(dy), mode });
    } else {
      cur.rows.push(line.split(' ')[0] ?? '');
    }
  }
  return blocks;
}

/** A far limb, behind the body: the same drawing, in the shade tones. */
const FAR: Readonly<Record<string, string>> = {
  l: 'd',
  f: 'd',
  s: 'S',
  w: 'v',
  b: 'B',
  P: 'q',
  p: 'q',
  a: 'A',
};

/** Fur a mask may mark: the saddle darkens exactly these. */
const MASKABLE = new Set(['l', 'f', 'd', 's', 'S']);

let cat: Map<string, Block> | undefined;
let dog: Map<string, Block> | undefined;

function art(species: Species): { own: Map<string, Block>; shared: Map<string, Block> } {
  cat ??= parse(CAT_ART);
  dog ??= parse(DOG_ART);
  return species === 'dog' ? { own: dog, shared: cat } : { own: cat, shared: cat };
}

function compose(species: Species, name: string, swap: Readonly<Record<string, string>>): Grid {
  const { own, shared } = art(species);
  const key = swap[name] ?? name;
  const block = own.get(key) ?? shared.get(key);
  const g: Grid = Array.from({ length: PET_H }, () => Array.from({ length: PET_W }, () => '.'));
  if (!block) return g;
  for (const inc of block.inc) {
    const part = compose(species, inc.name, swap);
    for (let y = 0; y < PET_H; y++) {
      for (let x = 0; x < PET_W; x++) {
        const c = part[y]?.[x] ?? '.';
        const tx = x + inc.dx;
        const ty = y + inc.dy;
        const row = g[ty];
        if (c === '.' || !row || tx < 0 || tx >= PET_W) continue;
        if (inc.mode === '%') {
          const under = row[tx] ?? '.';
          if (MASKABLE.has(under)) row[tx] = `M${under}`;
        } else row[tx] = inc.mode === '~' ? (FAR[c] ?? c) : c;
      }
    }
  }
  const top = block.y ?? PET_GROUND + 1 - block.rows.length;
  block.rows.forEach((line, dy) => {
    const row = g[top + dy];
    if (!row) return;
    [...line].forEach((c, dx) => {
      const x = block.x + dx;
      if (c === '.' || x < 0 || x >= PET_W) return;
      row[x] = c === '_' ? '.' : c;
    });
  });
  return g;
}

const drawn = new Map<string, Grid>();

/** The drawing of a frame, before it is coloured for a coat. */
function drawing(species: Species, ears: 'up' | 'flop', pose: PetPose, n: number): Grid {
  const key = `${species}:${ears}:${pose}:${n}`;
  const made = drawn.get(key);
  if (made) return made;
  const swap: Record<string, string> =
    species === 'dog' && ears === 'up' ? { _dhead: '_dheadU', _dtail: '_dtailU' } : {};
  const g = compose(species, `${species === 'dog' ? 'd' : ''}${pose}${n}`, swap);
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
  P: 'l',
  f: 'f',
  p: 'f',
  s: 'f',
  y: 'f',
  d: 'd',
  q: 'd',
  S: 'd',
};

/** A calico's patches, a Dalmatian's spots: the fur a coat marks, not drawn but placed. */
function marks(g: Grid, coat: Coat): Grid {
  if (coat.pattern !== 'patches' && coat.pattern !== 'spots') return g;
  return g.map((row, y) =>
    row.map((c, x) => {
      const tone = TONE[c];
      if (!tone) return c;
      if (coat.pattern === 'patches') {
        // Big soft-edged patches: cells of 6x5, their borders nudged so they do not look ruled.
        const cx = Math.floor((x + (hash(0, y, 7) < 0.5 ? 0 : 1)) / 6);
        const cy = Math.floor((y + (hash(x, 0, 9) < 0.5 ? 0 : 1)) / 5);
        const r = hash(cx, cy, 3);
        if (r < 0.34) return `X${tone}`;
        if (r < 0.52) return `Y${tone}`;
        return c;
      }
      // Spots: two by two, scattered, a few of them.
      const r = hash(Math.floor(x / 3), Math.floor(y / 3), 5);
      const inSpot = (x % 3) + (y % 3) < 3 && (x % 3 !== 2 || y % 3 !== 2);
      return r < 0.2 && inSpot ? `X${tone}` : c;
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
  if (pose === 'sleep') glyph(g, ['zzz', '..z', '.z.', 'zzz'], 'z', 42, 12 - k);
  if (pose === 'happy') glyph(g, ['.h.h.', 'hhhhh', 'hhhhD', '.hhD.', '..D..'], 'h', 41, 4 - k);
  return g;
}

// ---------------------------------------------------------------- colours

/** A colour pulled toward black by `t` (0..1): the outline and the line inside the fur. */
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
  // A black coat's outline is blacker still, or the silhouette melts into the fur.
  const dark = Number.parseInt(fd.slice(1, 3), 16) < 0x40;
  // The saddle: a beagle's black back, a husky's darker one; on any other coat, only fur.
  const saddle: [string, string, string] =
    coat.pattern === 'saddle' || coat.pattern === 'mask' ? second : coat.fur;
  const table: Record<string, string> = {
    o: dark ? '#141218' : '#2a1c16',
    i: darker(fd, 0.28),
    l: fl,
    f: fm,
    d: fd,
    s: tabby ? second[1] : fm,
    S: tabby ? second[2] : fd,
    P: point[0],
    p: point[1],
    q: point[2],
    y: tabby ? second[1] : points ? second[2] : fm,
    w: cream[0],
    v: cream[1],
    b: belly[0],
    B: belly[1],
    // A muzzle stays cream even on a Siamese: a dark one this small reads as a moustache.
    c: cream[0],
    C: cream[1],
    a: points ? second[1] : cream[0],
    A: points ? second[2] : cream[1],
    j: coat.second ? second[1] : fd,
    Ml: saddle[0],
    Mf: saddle[1],
    Md: saddle[2],
    Ms: tabby ? second[1] : saddle[1],
    MS: tabby ? second[2] : saddle[2],
    Xl: second[0],
    Xf: second[1],
    Xd: second[2],
    Yl: third[0],
    Yf: third[1],
    Yd: third[2],
    e: coat.eye,
    u: '#1b120e',
    k: '#ffffff',
    n: coat.nose ?? (coat.species === 'dog' ? '#221816' : '#e0707e'),
    m: '#5a2a22',
    t: '#ef8a9a',
    r: '#f3a3b0',
    z: '#ffffff',
    h: '#f0506e',
    H: '#b8304c',
  };
  return table[key];
}
