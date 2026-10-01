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

import { COATS, type Coat, coatOf, type Species } from '~/draw/material/pet/coats.ts';
import { ART } from '~/draw/material/pet/sprites.ts';

export { COATS, type Coat, coatOf, type Species };

export const PET_W = 32;
export const PET_H = 28;
/** The row the pet stands on: its contact shadow. The paws are the row above. */
export const PET_GROUND = 26;

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
  | 'land'
  | 'stand'
  | 'sitdown'
  | 'standup'
  | 'liedown'
  | 'getup'
  | 'curl'
  | 'wake';

interface Frames {
  count: number;
  /** How long each frame is held, in milliseconds: timing is per frame, not one speed a pose. */
  ms: readonly number[];
  /** Played through once and held on its last frame, rather than looped. */
  once?: true;
}

/**
 * Frames per pose and how long each is held. The walk is eight frames -- contact, down, passing,
 * up, for each pair of legs -- the gallop six; a blink is quick on the way down and quicker on
 * the way up; the in-betweens (standup, sitdown, liedown, getup, curl, wake) join the poses so
 * nothing pops from one to the next.
 */
export const PET_FRAMES: Readonly<Record<PetPose, Frames>> = {
  walk: { count: 8, ms: [110, 110, 110, 110, 110, 110, 110, 110] },
  run: { count: 6, ms: [70, 60, 70, 90, 60, 70] },
  sit: { count: 2, ms: [1600, 1200] },
  blink: { count: 3, ms: [60, 110, 70] },
  flick: { count: 4, ms: [120, 110, 120, 320] },
  happy: { count: 2, ms: [320, 320] },
  look: { count: 1, ms: [1000] },
  yawn: { count: 4, ms: [220, 260, 700, 300], once: true },
  wash: { count: 4, ms: [200, 200, 220, 200] },
  lick: { count: 4, ms: [260, 220, 260, 220] },
  loaf: { count: 1, ms: [1000] },
  sleep: { count: 2, ms: [1700, 1400] },
  stretch: { count: 4, ms: [160, 300, 900, 260], once: true },
  eat: { count: 2, ms: [260, 260] },
  crouch: { count: 2, ms: [160, 220], once: true },
  leap: { count: 2, ms: [220, 400], once: true },
  land: { count: 2, ms: [110, 170], once: true },
  stand: { count: 3, ms: [900, 600, 500] },
  sitdown: { count: 3, ms: [90, 220, 160], once: true },
  standup: { count: 3, ms: [150, 190, 110], once: true },
  liedown: { count: 2, ms: [150, 220], once: true },
  getup: { count: 3, ms: [200, 150, 110], once: true },
  curl: { count: 2, ms: [500, 420], once: true },
  wake: { count: 2, ms: [350, 480], once: true },
};

export const POSES = Object.keys(PET_FRAMES) as PetPose[];

/** How long a pose takes to play through once. */
export function poseLength(pose: PetPose): number {
  return PET_FRAMES[pose].ms.reduce((a, b) => a + b, 0);
}

/**
 * The frame showing `elapsed` milliseconds into a pose: looped, or held on its last frame if the
 * pose plays once.
 */
export function frameAt(pose: PetPose, elapsed: number): number {
  const { ms, once } = PET_FRAMES[pose];
  const total = poseLength(pose);
  let t = once ? Math.min(Math.max(0, elapsed), total - 1) : ((elapsed % total) + total) % total;
  for (let n = 0; n < ms.length; n++) {
    t -= ms[n] as number;
    if (t < 0) return n;
  }
  return ms.length - 1;
}

/** How long until the frame after the one showing `elapsed` into a pose; Infinity if none. */
export function nextFrameIn(pose: PetPose, elapsed: number): number {
  const { ms, once, count } = PET_FRAMES[pose];
  const total = poseLength(pose);
  if (count < 2 || (once && elapsed >= total)) return Number.POSITIVE_INFINITY;
  let t = once ? Math.max(0, elapsed) : ((elapsed % total) + total) % total;
  for (const d of ms) {
    if (t < d) return d - t;
    t -= d;
  }
  return 1;
}

// ---------------------------------------------------------------- joining one pose to the next

/**
 * Which way up the body is in a pose: facing you (sitting), side-on on its feet, lying (the
 * loaf), or curled asleep. Moving between two families goes through the in-betweens, so a walking
 * cat sits down side-on and turns to face you instead of jumping from one drawing to the other.
 * An in-between belongs to the family it ends in.
 */
export type PetFamily = 'front' | 'side' | 'lying' | 'asleep';

export const FAMILY: Readonly<Record<PetPose, PetFamily>> = {
  sit: 'front',
  blink: 'front',
  flick: 'front',
  happy: 'front',
  look: 'front',
  yawn: 'front',
  wash: 'front',
  lick: 'front',
  sitdown: 'front',
  walk: 'side',
  run: 'side',
  stand: 'side',
  eat: 'side',
  stretch: 'side',
  crouch: 'side',
  leap: 'side',
  land: 'side',
  standup: 'side',
  getup: 'side',
  loaf: 'lying',
  liedown: 'lying',
  wake: 'lying',
  sleep: 'asleep',
  curl: 'asleep',
};

/** One step toward another family: side from lying, lying from asleep... */
const STEP: Readonly<Record<PetFamily, Partial<Record<PetFamily, PetPose>>>> = {
  front: { side: 'standup', lying: 'standup', asleep: 'standup' },
  side: { front: 'sitdown', lying: 'liedown', asleep: 'liedown' },
  lying: { side: 'getup', front: 'getup', asleep: 'curl' },
  asleep: { lying: 'wake', side: 'wake', front: 'wake' },
};

/** The in-betweens, in order, from one pose to another: none if they are of one family. */
export function between(from: PetPose, to: PetPose): PetPose[] {
  const route: PetPose[] = [];
  let at = FAMILY[from];
  const goal = FAMILY[to];
  while (at !== goal && route.length < 4) {
    const step = STEP[at][goal];
    if (!step) break;
    route.push(step);
    at = FAMILY[step];
  }
  return route;
}

// ---------------------------------------------------------------- coats

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

/**
 * The top of a leg, drawn in keys of its own: two rows that reach up into the body. A leg that
 * stopped at the hip met the body only through the body's bottom outline, so whenever the body
 * rose a pixel in its stride a dark line ran across the hip and the leg read as a stick held on
 * underneath. A near leg's reach replaces that bottom outline with fur, and nothing else: never
 * the outline where it turns up at the rump or the chest, never the body's own fur, never bare
 * background. A far leg has none: it is behind the body, and meeting it at its outline is how
 * that is said.
 */
const REACH: Readonly<Record<string, string>> = { '7': 'l', '8': 'f', '9': 'd' };

/**
 * A dog's face: its fur drawn in keys of its own (1 2 3 for l f d), coloured the same, so that a
 * Dalmatian's spots keep off it -- at this size a spotted face reads as noise, or as extra eyes.
 */
const FACE = new Set(['dhead', 'dheadU', 'dshead', 'dsheadU']);
const FACE_FUR: Readonly<Record<string, string>> = { l: '1', f: '2', d: '3' };

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
        let c = under[y]?.[x] ?? '.';
        const row = g[y + inc.dy];
        const tx = x + inc.dx;
        if (c === '.' || !row || tx < 0 || tx >= PET_W) continue;
        const ext = REACH[c];
        if (ext) {
          // A leg's top, reaching up into the body (see REACH): it joins the leg to the body.
          const here = row[tx] ?? '.';
          const above = g[y + inc.dy - 1]?.[tx] ?? '.';
          const fur = (k: string): boolean => k !== '.' && k !== 'o';
          // The body's bottom outline, and only that: fur above it, outline running on both
          // sides -- not a corner of the rump or the chest, where the outline turns up.
          const bottomEdge =
            here === 'o' && fur(above) && row[tx - 1] !== '.' && row[tx + 1] !== '.';
          if (inc.far || !bottomEdge) continue;
          c = ext;
        }
        row[tx] = inc.far ? (FAR[c] ?? c) : c;
      }
    }
  }
  const face = FACE.has(name);
  part.rows.forEach((line, dy) => {
    const row = g[part.y + dy];
    if (!row) return;
    [...line].forEach((c, dx) => {
      const x = part.x + dx;
      if (c === '.' || x < 0 || x >= PET_W) return;
      row[x] = c === '_' ? '.' : face ? (FACE_FUR[c] ?? c) : c;
    });
  });
  return g;
}

/** A pricked-eared dog (shiba, husky): its own head, and a tail curled over its back. */
const PRICKED: Readonly<Record<string, string>> = {
  dhead: 'dheadU',
  dshead: 'dsheadU',
  dhalf: 'dhalfU',
  dshut: 'dshutU',
  dhappy: 'dhappyU',
  dup: 'dupU',
  dtailflat: 'dtailflatU',
  dtongue: 'dtongueU',
  // Walking, running, bowing and eating, the tail stays curled over the back; sitting, on the haunch.
  dtw0: 'dstailU',
  dtw1: 'dstailU',
  dtw2: 'dstailU',
  drtail: 'dstailU',
  dsitT: 'dsitTU',
};

/** A Siamese: the heads with a mask, the soft dark oval of its points over the muzzle and eyes. */
const MASKED: Readonly<Record<string, string>> = {
  fhead: 'fheadP',
  chead: 'cheadP',
  csleepH: 'csleepHP',
  cshut: 'cshutP',
};

const drawn = new Map<string, Grid>();

/** The drawing of a frame, before it is coloured for a coat. */
function drawing(species: Species, coat: Coat, pose: PetPose, n: number): Grid {
  const ears = coat.ears ?? 'flop';
  const masked = species === 'cat' && coat.pattern === 'points';
  const key = `${species}:${ears}:${masked}:${pose}:${n}`;
  const made = drawn.get(key);
  if (made) return made;
  const swap = species === 'dog' && ears === 'up' ? PRICKED : masked ? MASKED : {};
  const g = compose(`${species}.${pose}.${n}`, swap);
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

/** Ears and tail, which a Dalmatian's spots mark too. */
const EARS: Readonly<Record<string, 'l' | 'f' | 'd'>> = { P: 'l', p: 'f', q: 'd' };

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
      // A dog's face stays clear (see FACE); a Dalmatian's spots go on its ears and tail instead.
      const tone = coat.pattern === 'spots' ? (TONE[c] ?? EARS[c]) : TONE[c];
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
  const g = marks(drawing(species, coat, pose, k), coat).map((row) => [...row]);
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

/** Two colours mixed, `t` of the way from the first to the second. */
function mix(a: string, b: string, t: number): string {
  const na = Number.parseInt(a.slice(1), 16);
  const nb = Number.parseInt(b.slice(1), 16);
  const ch = (s: number): string =>
    Math.round(((na >> s) & 255) * (1 - t) + ((nb >> s) & 255) * t)
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
    '1': fl,
    '2': fm,
    '3': fd,
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
    // A Siamese's mask: its edge, halfway from the fur to the point, and its middle.
    x: mix(fm, second[0], 0.5),
    y: second[0],
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
    // The inner ear: pink, but a Siamese's ears are its points, dark to the tip.
    t: points ? second[1] : '#f0a0a8',
    T: points ? second[2] : '#c47a84',
    r: '#ef8a9a',
    // The contact shadow: see-through, so it darkens whatever wood the shelf is.
    g: 'rgba(20, 10, 4, 0.32)',
    z: '#ffffff',
    h: '#f0506e',
    H: '#b8304c',
  };
  return table[key];
}
