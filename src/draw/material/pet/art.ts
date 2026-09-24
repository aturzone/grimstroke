/**
 * The pets, drawn: a cat and a dog, in several coats, in every pose they have.
 *
 * Built the way a pixel artist builds a character: a silhouette from a few deliberate shapes --
 * a big round head, a compact body, short legs, a fluffy tail -- in cute proportions, then
 * finished by hand-written rules: the coat's pattern (tabby stripes, calico patches, Siamese
 * points, Dalmatian spots, a beagle's saddle), light along every top edge and shadow along every
 * bottom one, cream where a coat is pale, big eyes with a catch-light, a touch of blush, and a
 * one-pixel outline round the whole silhouette.
 *
 * Every frame is drawn once into one sprite sheet per pet and coat (see sheet()); after that a
 * pet costs a background-position change when its frame changes, and nothing else.
 */

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
  run: { count: 4, fps: 13 },
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
 * A coat: its colours and its pattern. Two furs -- the main one and a second for patches,
 * points, spots or a saddle -- each in three tones, and cream for a pale chest, muzzle and paws.
 */
export interface Coat {
  id: string;
  label: string;
  species: Species;
  fur: [string, string, string];
  second?: [string, string, string];
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
    fur: ['#f6b06a', '#e2823a', '#b4541c'],
    second: ['#c9651f', '#a84e16', '#86390e'],
    cream: ['#fbf1e0', '#e8cfa8'],
    pattern: 'tabby',
    eye: '#4c8a2e',
  },
  {
    id: 'grey',
    label: 'grey tabby',
    species: 'cat',
    fur: ['#c3cbd3', '#8f98a3', '#636b76'],
    second: ['#6e7680', '#565d67', '#40464e'],
    cream: ['#f6f6f3', '#d9dbd8'],
    pattern: 'tabby',
    eye: '#c9a227',
  },
  {
    id: 'black',
    label: 'black',
    species: 'cat',
    fur: ['#4a4a58', '#2e2e38', '#1c1c24'],
    cream: ['#4a4a58', '#2e2e38'],
    pale: 'none',
    eye: '#d9b634',
    nose: '#6a4048',
  },
  {
    id: 'tuxedo',
    label: 'tuxedo',
    species: 'cat',
    fur: ['#4a4a58', '#2e2e38', '#1c1c24'],
    cream: ['#f7f5f0', '#d8d4cc'],
    pale: 'lots',
    eye: '#8fc34a',
  },
  {
    id: 'white',
    label: 'white',
    species: 'cat',
    fur: ['#ffffff', '#f1ede6', '#d6cfc4'],
    cream: ['#ffffff', '#e6dfd4'],
    pale: 'none',
    eye: '#5fa8d8',
  },
  {
    id: 'calico',
    label: 'calico',
    species: 'cat',
    fur: ['#fdf8ef', '#f1e8d8', '#d8ccb6'],
    second: ['#f0a054', '#d9803a', '#a85c22'],
    cream: ['#fdf8ef', '#e5dac6'],
    pattern: 'patches',
    pale: 'none',
    eye: '#4c8a2e',
  },
  {
    id: 'siamese',
    label: 'siamese',
    species: 'cat',
    fur: ['#f5ead6', '#e6d5b8', '#c8b492'],
    second: ['#7a5a44', '#5c4232', '#3e2c20'],
    cream: ['#fbf4e6', '#e6d5b8'],
    pattern: 'points',
    pale: 'none',
    eye: '#4a90d9',
  },
  {
    id: 'shiba',
    label: 'shiba',
    species: 'dog',
    ears: 'up',
    fur: ['#f2a65a', '#d9823a', '#a85c22'],
    cream: ['#fbf1e0', '#e8cfa8'],
    pale: 'lots',
    eye: '#2a1a12',
  },
  {
    id: 'golden',
    label: 'golden',
    species: 'dog',
    fur: ['#f4cf7c', '#e0ad50', '#b88630'],
    cream: ['#fbeccb', '#e8d3a2'],
    pale: 'some',
    eye: '#2a1a12',
  },
  {
    id: 'lab',
    label: 'black lab',
    species: 'dog',
    fur: ['#4a4a52', '#2e2e34', '#1c1c20'],
    cream: ['#4a4a52', '#2e2e34'],
    pale: 'none',
    eye: '#6b4a2a',
    nose: '#101014',
  },
  {
    id: 'dalmatian',
    label: 'dalmatian',
    species: 'dog',
    fur: ['#ffffff', '#f1ede6', '#d6cfc4'],
    second: ['#2e2e34', '#1c1c20', '#101014'],
    cream: ['#ffffff', '#e6dfd4'],
    pattern: 'spots',
    pale: 'none',
    eye: '#2a1a12',
  },
  {
    id: 'beagle',
    label: 'beagle',
    species: 'dog',
    fur: ['#e7a95e', '#c98a42', '#9c6628'],
    second: ['#3a2c22', '#2a1f18', '#1a130e'],
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
    fur: ['#9aa3ad', '#737c87', '#525a64'],
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

// ---------------------------------------------------------------- the grid

type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: PET_H }, () => Array.from({ length: PET_W }, () => '.'));
}

function put(g: Grid, x: number, y: number, c: string): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  const row = g[yi];
  if (row && xi >= 0 && xi < PET_W) row[xi] = c;
}

function at(g: Grid, x: number, y: number): string {
  return g[y]?.[x] ?? '.';
}

/** A filled ellipse; `turn` in degrees. `only` limits it to pixels already of those letters. */
function oval(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  c: string,
  turn = 0,
  only?: string,
): void {
  const a = (turn * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const r = Math.max(rx, ry) + 1;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if ((u / rx) ** 2 + (v / ry) ** 2 <= 1 && (!only || only.includes(at(g, x, y))))
        put(g, x, y, c);
    }
  }
}

function capsule(
  g: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r0: number,
  r1: number,
  c: string,
): void {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = r0 + (r1 - r0) * t;
    oval(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
  }
}

function tri(
  g: Grid,
  a: [number, number],
  b: [number, number],
  d: [number, number],
  c: string,
): void {
  const side = (p: [number, number], q: [number, number], r: [number, number]): number =>
    (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]);
  for (
    let y = Math.floor(Math.min(a[1], b[1], d[1]));
    y <= Math.ceil(Math.max(a[1], b[1], d[1]));
    y++
  ) {
    for (
      let x = Math.floor(Math.min(a[0], b[0], d[0]));
      x <= Math.ceil(Math.max(a[0], b[0], d[0]));
      x++
    ) {
      const p: [number, number] = [x + 0.5, y + 0.5];
      const s1 = side(a, b, p);
      const s2 = side(b, d, p);
      const s3 = side(d, a, p);
      if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) put(g, x, y, c);
    }
  }
}

/** A curve of circles, thick at the root and thinner at the tip: a tail. */
function curve(
  g: Grid,
  pts: ReadonlyArray<[number, number]>,
  r0: number,
  r1: number,
  c: string,
  tip = c,
): void {
  const [p0, p1, p2] = pts as [[number, number], [number, number], [number, number]];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    oval(g, x, y, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, t > 0.8 ? tip : c);
  }
}

// ---------------------------------------------------------------- the body parts

/** Letters: F fur, S second fur (points, patches), C cream, P pink, E eye, K catch-light,
 *  N nose, M mouth, B blush, T tongue, O outline, Z sleep z, H heart, and later l/d tones. */

interface HeadPose {
  x: number;
  y: number;
  tilt?: number;
  eyes?: 'open' | 'closed' | 'happy' | 'half' | 'up';
  mouth?: 'shut' | 'open' | 'lick' | 'pant';
  /** Ears flat back (sleepy) rather than up. */
  flat?: boolean;
}

function catHead(g: Grid, h: HeadPose): void {
  const t = ((h.tilt ?? 0) * Math.PI) / 180;
  const R = (dx: number, dy: number): [number, number] => [
    h.x + dx * Math.cos(t) - dy * Math.sin(t),
    h.y + dx * Math.sin(t) + dy * Math.cos(t),
  ];
  const lean = h.flat ? 2.2 : 0;
  // Ears, set wide on a big round head, with pink inside.
  tri(g, R(-8.5, -2), R(-6.5 - lean, -11 + lean), R(-1.8, -6), 'F');
  tri(g, R(7.5, -3), R(7 + lean * 0.4, -11.5 + lean), R(1.8, -6.4), 'F');
  tri(g, R(-7, -4), R(-6 - lean, -8.8 + lean), R(-3.4, -6), 'P');
  tri(g, R(6, -4.6), R(6.2 + lean * 0.4, -9.2 + lean), R(3.4, -6.2), 'P');
  // The head: wide cheeks under a round crown.
  oval(g, ...R(0, 0), 9, 8, 'F', h.tilt ?? 0);
  oval(g, ...R(0, 2.2), 10, 6, 'F', h.tilt ?? 0);
  face(g, R, h, 'cat');
}

function dogHead(g: Grid, h: HeadPose, ears: 'up' | 'flop'): void {
  const t = ((h.tilt ?? 0) * Math.PI) / 180;
  const R = (dx: number, dy: number): [number, number] => [
    h.x + dx * Math.cos(t) - dy * Math.sin(t),
    h.y + dx * Math.sin(t) + dy * Math.cos(t),
  ];
  const lean = h.flat ? 2 : 0;
  if (ears === 'up') {
    // Pricked ears, a little narrower and taller than a cat's.
    tri(g, R(-7.5, -2), R(-5.5 - lean, -12 + lean), R(-1.5, -5.5), 'F');
    tri(g, R(5.5, -3.5), R(5 + lean * 0.4, -12.5 + lean), R(1, -6), 'F');
    tri(g, R(-6, -4), R(-5.2 - lean, -9.6 + lean), R(-3, -5.6), 'P');
    tri(g, R(4.2, -4.8), R(4.4, -10), R(2.2, -6), 'P');
  }
  // A round skull, a step at the brow, and a blunt snout out in front.
  oval(g, ...R(-0.5, 0), 8, 7.4, 'F', h.tilt ?? 0);
  oval(g, ...R(6.8, 3.4), 5, 3.4, 'F', h.tilt ?? 0);
  oval(g, ...R(1, 4), 7, 4.4, 'F', h.tilt ?? 0);
  face(g, R, h, 'dog');
  if (ears === 'flop') {
    // Hanging ears, in front of the head, darker, swinging a little with the head.
    oval(g, ...R(-5.4, 1.6 + lean * 0.5), 2.8, 6, 'X', 14 + (h.tilt ?? 0));
  }
}

/** Eyes, nose, mouth, blush -- the part that makes it look like it is looking at you. */
function face(
  g: Grid,
  R: (dx: number, dy: number) => [number, number],
  h: HeadPose,
  species: Species,
): void {
  const dog = species === 'dog';
  // A mask round the eyes and nose (dark on a Siamese, the same fur on anyone else), then the
  // pale muzzle and chin.
  oval(g, ...R(dog ? 4 : 1.6, 1.6), dog ? 8 : 7, dog ? 5 : 5.2, 'V', h.tilt ?? 0, 'F');
  oval(
    g,
    ...(dog ? R(7.4, 4.6) : R(3.8, 4.6)),
    dog ? 4.2 : 3.9,
    dog ? 2.4 : 2.5,
    'C',
    h.tilt ?? 0,
    'FSV',
  );
  const eye = (dx: number): void => {
    const [ex, ey] = R(dx, -0.8);
    const x = Math.round(ex);
    const y = Math.round(ey);
    const eyes = h.eyes ?? 'open';
    if (eyes === 'closed') {
      put(g, x - 1, y + 1, 'O');
      put(g, x, y + 1, 'O');
      put(g, x + 1, y + 1, 'O');
    } else if (eyes === 'happy') {
      put(g, x - 1, y + 1, 'O');
      put(g, x, y, 'O');
      put(g, x + 1, y + 1, 'O');
    } else if (eyes === 'half') {
      put(g, x - 1, y, 'O');
      put(g, x, y, 'O');
      put(g, x + 1, y, 'O');
      put(g, x, y + 1, 'E');
      put(g, x + 1, y + 1, 'E');
    } else {
      const up = eyes === 'up' ? -1 : 0;
      for (let dy = 0; dy < 3; dy++) {
        put(g, x, y + dy + up, 'E');
        put(g, x + 1, y + dy + up, 'E');
      }
      put(g, x + 1, y + up, 'K');
    }
  };
  eye(dog ? -1.5 : -2.6);
  eye(dog ? 3.4 : 3.6);
  // Blush under the near eye.
  const [bx, by] = R(dog ? 4.2 : 5.2, 3);
  if (at(g, Math.round(bx), Math.round(by)) !== 'C') put(g, bx, by, 'B');
  // Nose and mouth.
  const [nx, ny] = dog ? R(11, 2.4) : R(6.8, 2.6);
  put(g, nx, ny, 'N');
  put(g, nx - 1, ny, 'N');
  if (dog) put(g, nx, ny - 1, 'N');
  const [mx, my] = dog ? R(9.4, 5) : R(5.4, 4.6);
  if (h.mouth === 'open' || h.mouth === 'pant') {
    oval(g, mx, my + 0.6, 1.8, 1.5, 'M');
    if (h.mouth === 'pant' || dog) put(g, mx, my + 1.8, 'T'), put(g, mx + 1, my + 1.8, 'T');
  } else if (h.mouth === 'lick') {
    put(g, mx + 1, my + 1, 'T');
    put(g, mx + 1, my + 2, 'T');
  } else {
    put(g, mx, my, 'O');
    put(g, mx + 1, my, 'O');
  }
}

function head(g: Grid, species: Species, h: HeadPose, ears: 'up' | 'flop' = 'flop'): void {
  if (species === 'dog') dogHead(g, h, ears);
  else catHead(g, h);
}

/** A leg: a thigh tapering to the paw, with a pale paw on the end. */
function leg(
  g: Grid,
  top: [number, number],
  paw: [number, number],
  far: boolean,
  thick = 2.6,
): void {
  capsule(g, top[0], top[1], paw[0], paw[1] - 1, thick, thick * 0.7, far ? 'S2' : 'F');
  oval(g, paw[0] + 0.6, paw[1] - 0.6, thick + 0.4, 1.7, far ? 'C2' : 'C');
}

function tail(
  g: Grid,
  species: Species,
  root: [number, number],
  sway: number,
  pose: 'up' | 'curl' | 'down' | 'wrap',
): void {
  const [x, y] = root;
  if (species === 'dog') {
    // A dog's tail: up and over in a curl, wagging.
    curve(
      g,
      [
        [x, y],
        [x - 5 + sway, y - 8],
        [x + 1 + sway * 1.5, y - 11],
      ],
      2.4,
      1.8,
      'F',
      'C',
    );
    return;
  }
  if (pose === 'wrap') {
    curve(
      g,
      [
        [x, y],
        [x + 8, y + 4],
        [x + 20, y + 1 - sway],
      ],
      2.6,
      2,
      'F',
      'S',
    );
  } else if (pose === 'down') {
    curve(
      g,
      [
        [x, y],
        [x - 7, y + 2],
        [x - 10, y + 7],
      ],
      2.6,
      2,
      'F',
      'S',
    );
  } else {
    curve(
      g,
      [
        [x, y],
        [x - 9, y - 6 + sway],
        [x - 5 + sway, y - 15],
      ],
      2.8,
      2.2,
      'F',
      'S',
    );
  }
}

// ---------------------------------------------------------------- the poses

function standing(g: Grid, species: Species, n: number, count: number, run: boolean): HeadPose {
  const phase = (n / count) * Math.PI * 2;
  const reach = run ? 5 : 3.2;
  const lift = run ? 3.5 : 2;
  const bob = run ? Math.sin(phase * 2) * 1.2 : Math.abs(Math.sin(phase)) * 0.8;
  const foot = (x: number, offset: number): [number, number] => {
    const a = phase + offset;
    return [x + Math.sin(a) * reach, PET_GROUND - Math.max(0, -Math.cos(a)) * lift];
  };
  const dog = species === 'dog';
  const body = { x: dog ? 21 : 22, y: 26 - bob, rx: dog ? 12 : 10.5, ry: dog ? 6.6 : 6.4 };
  leg(g, [body.x + 7, body.y + 3], foot(body.x + 8, Math.PI), true);
  leg(g, [body.x - 6, body.y + 3], foot(body.x - 7, 0), true);
  tail(g, species, [body.x - body.rx + 1, body.y - 2], Math.sin(phase) * 2.5, 'up');
  oval(g, body.x, body.y, body.rx, body.ry, 'F');
  oval(g, body.x - body.rx + 4, body.y + 0.5, 5, 5.8, 'F');
  // A pale chest and belly, where the coat has one.
  oval(g, body.x + body.rx - 3, body.y + 2, 4, 4.4, 'C', 0, 'F');
  oval(g, body.x, body.y + body.ry - 1.4, body.rx - 3, 1.6, 'C', 0, 'F');
  leg(g, [body.x + 6, body.y + 4], foot(body.x + 6, Math.PI * 0.5), false);
  leg(g, [body.x - 5, body.y + 4], foot(body.x - 5, Math.PI * 1.5), false);
  return {
    x: body.x + body.rx + (dog ? 3 : 3.5),
    y: body.y - 9 + bob * 0.3,
    tilt: run ? -4 : 0,
    ...(dog && run ? { mouth: 'pant' as const } : {}),
  };
}

function sitting(g: Grid, species: Species, tailLift: number): { x: number; y: number } {
  const dog = species === 'dog';
  // Haunch, the upright chest, front legs straight down, the tail round the paws.
  if (dog) tail(g, 'dog', [14, 31], tailLift, 'up');
  oval(g, 21, 30, 9.6, 7.4, 'F');
  oval(g, 27, 24, 7.2, 9.2, 'F', -10);
  oval(g, 30.5, 25, 3.4, 6.5, 'C', -10, 'F');
  // The far front leg is behind the near one; in the same fur it reads as a leg, not a patch.
  leg(g, [27, 28], [26, PET_GROUND], false);
  leg(g, [31, 28], [31, PET_GROUND], false);
  oval(g, 17, PET_GROUND - 1, 4, 2, 'F');
  oval(g, 18, PET_GROUND - 0.6, 3, 1.4, 'C');
  if (!dog) tail(g, 'cat', [13, 34], tailLift, 'wrap');
  return { x: 30, y: 13 };
}

/** Lying down, and asleep: a loaf, the head down on the paws, the tail round. */
function lying(g: Grid, species: Species, breath: number): { x: number; y: number } {
  oval(g, 22, 31 - breath / 2, 13.5, 6.4 + breath, 'F');
  if (species === 'cat') tail(g, 'cat', [10, 34], 0, 'wrap');
  else tail(g, 'dog', [10, 31], 0, 'down');
  oval(g, 33, 35.6, 4.6, 1.8, 'C');
  return { x: 33, y: 26 };
}

function draw(species: Species, pose: PetPose, n: number, ears: 'up' | 'flop' = 'flop'): Grid {
  const g = blank();
  const dog = species === 'dog';
  let h: HeadPose | undefined;
  let bowl = false;
  switch (pose) {
    case 'walk':
    case 'run':
      h = standing(g, species, n, PET_FRAMES[pose].count, pose === 'run');
      break;
    case 'sit':
    case 'blink':
    case 'flick':
    case 'happy':
    case 'look': {
      const lift =
        pose === 'flick' ? ([0, 2, 4, 2][n] ?? 0) : dog && pose === 'happy' ? (n ? 3 : -2) : 0;
      const at0 = sitting(g, species, lift);
      h = {
        ...at0,
        eyes:
          pose === 'blink'
            ? n === 1
              ? 'closed'
              : 'half'
            : pose === 'happy'
              ? 'happy'
              : pose === 'look'
                ? 'up'
                : 'open',
        ...(pose === 'look' ? { tilt: -12 } : {}),
        ...(pose === 'happy'
          ? { tilt: n ? 6 : 2, ...(dog ? { mouth: 'pant' as const } : {}) }
          : {}),
      };
      break;
    }
    case 'yawn': {
      const at0 = sitting(g, species, 0);
      const open = [0, 1, 2, 1][n] ?? 0;
      h = {
        x: at0.x,
        y: at0.y - open * 0.5,
        tilt: -open * 9,
        eyes: open ? 'closed' : 'half',
        mouth: open ? 'open' : 'shut',
        flat: open === 2,
      };
      break;
    }
    case 'wash': {
      // A paw licked, then drawn over the face and the ear.
      const at0 = sitting(g, species, 0);
      const paws: Array<[number, number]> = [
        [35, 21],
        [36, 17],
        [34, 12],
        [36, 17],
      ];
      const [px, py] = paws[n] ?? [35, 21];
      capsule(g, 31, 26, px, py, 2.4, 2, 'F');
      oval(g, px, py, 2.6, 2, 'C');
      h = {
        x: at0.x,
        y: at0.y + (n === 2 ? 1 : 0),
        tilt: n === 2 ? 14 : 8,
        eyes: 'closed',
        mouth: n % 2 ? 'lick' : 'shut',
      };
      break;
    }
    case 'lick': {
      // Sat back, a hind leg up, washing it: the head bowed down to the leg.
      oval(g, 20, 31, 9.4, 6.8, 'F');
      oval(g, 25, 25, 6.6, 8, 'F', -20);
      capsule(g, 18, 31, 31, 22 - (n % 2), 3, 2.2, 'F');
      oval(g, 32, 21 - (n % 2), 2.8, 2.2, 'C');
      leg(g, [26, 29], [27, PET_GROUND], true);
      oval(g, 16, PET_GROUND - 1, 4, 2, 'F');
      if (!dog) tail(g, 'cat', [12, 34], 0, 'wrap');
      else tail(g, 'dog', [12, 30], 0, 'down');
      h = {
        x: 30,
        y: 17 + (n === 2 ? 1 : 0),
        tilt: 28,
        eyes: 'closed',
        mouth: n % 2 ? 'lick' : 'shut',
      };
      break;
    }
    case 'loaf':
    case 'sleep': {
      const breath = pose === 'sleep' && n === 1 ? 0.6 : 0;
      const at0 = lying(g, species, breath);
      h = {
        ...at0,
        y: at0.y + (pose === 'sleep' ? 1 : -2),
        tilt: pose === 'sleep' ? 16 : 0,
        eyes: pose === 'sleep' ? 'closed' : 'half',
        flat: pose === 'sleep',
      };
      break;
    }
    case 'stretch': {
      const k = [0, 1, 0.5][n] ?? 0;
      tail(g, species, [11, 23 - k * 3], 0, 'up');
      oval(g, 16, 25 - k * 2, 6.4, 6, 'F');
      oval(g, 24, 27 + k * 2, 9.5, 5.6, 'F', k * 16);
      leg(g, [15, 28], [13, PET_GROUND], true);
      leg(g, [18, 28], [19, PET_GROUND], false);
      leg(g, [31, 31 + k * 2], [36 + k * 5, PET_GROUND], true);
      leg(g, [32, 31 + k * 2], [38 + k * 5, PET_GROUND], false);
      h = {
        x: 35 + k * 3,
        y: 22 + k * 7,
        tilt: k * 10,
        eyes: k ? 'closed' : 'half',
        flat: k > 0.5,
      };
      break;
    }
    case 'eat': {
      // Standing at the bowl, head down in it.
      standing(g, species, 0, 6, false);
      h = { x: 38, y: 27 + (n ? 1 : 0), tilt: 30, eyes: 'closed', mouth: n ? 'lick' : 'shut' };
      bowl = true;
      break;
    }
    case 'crouch':
      oval(g, 21, 30, 11, 5.6, 'F');
      oval(g, 13, 30, 5, 5.4, 'F');
      leg(g, [27, 32], [30, PET_GROUND], false);
      leg(g, [15, 32], [18, PET_GROUND], false);
      tail(g, species, [11, 28], 0, 'down');
      h = { x: 33, y: 23, tilt: -6 };
      break;
    case 'leap':
      tail(g, species, [10, 22], 0, 'down');
      oval(g, 22, 22, 12, 5.6, 'F', -10);
      leg(g, [14, 25], [6, 31], true);
      leg(g, [16, 25], [8, 32], false);
      leg(g, [29, 21], [38, 26], true);
      leg(g, [30, 21], [40, 25], false);
      h = { x: 35, y: 13, tilt: -12 };
      break;
    case 'land':
      tail(g, species, [11, 22], 0, 'up');
      oval(g, 21, 27, 11, 6, 'F', 6);
      leg(g, [14, 30], [11, 33], true);
      leg(g, [16, 30], [13, 34], false);
      leg(g, [28, 30], [31, PET_GROUND], true);
      leg(g, [29, 30], [33, PET_GROUND], false);
      h = { x: 35, y: 18, tilt: 4 };
      break;
  }
  if (h) head(g, species, h, ears);
  // The bowl is its own object on the shelf (it stays when the pet walks off); not drawn here.
  void bowl;
  return g;
}

// ---------------------------------------------------------------- finishing

const SOLID = /[^.OZH]/;

function isSolid(g: Grid, x: number, y: number): boolean {
  return SOLID.test(at(g, x, y));
}

/** The coat's pattern, laid over the fur. */
function pattern(g: Grid, coat: Coat, species: Species, pose: PetPose): void {
  const p = coat.pattern;
  for (let y = 0; y < PET_H; y++) {
    for (let x = 0; x < PET_W; x++) {
      const c = at(g, x, y);
      if (c === 'S2') put(g, x, y, coat.second ? 'S' : 'F');
      if (c === 'C2') put(g, x, y, 'C');
      if (c === 'X') put(g, x, y, coat.second ? 'S' : 'E2');
      if (c === 'V') put(g, x, y, coat.pattern === 'points' ? 'S' : 'F');
    }
  }
  if (coat.pale === 'none') {
    for (let y = 0; y < PET_H; y++)
      for (let x = 0; x < PET_W; x++) if (at(g, x, y) === 'C') put(g, x, y, 'F');
  }
  if (!p) return;
  // A fixed sequence of numbers, so a pet's pattern is the same in every frame.
  let seed = 7;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const fur =
    (key: string, only = 'F') =>
    (x: number, y: number, rx: number, ry: number): void =>
      oval(g, x, y, rx, ry, key, 0, only);
  if (p === 'tabby') {
    // Bands across the back and the crown: every fourth column, from the top edge down.
    for (let y = 0; y < PET_H; y++) {
      for (let x = 0; x < PET_W; x++) {
        if (at(g, x, y) === 'F' && (x + Math.floor(y / 3)) % 4 === 0 && !isSolid(g, x, y - 3))
          put(g, x, y, 'S');
      }
    }
  } else if (p === 'patches') {
    // Calico: a few soft patches of ginger and black, the same few every frame.
    const blob = fur('S');
    const dark = fur('Q');
    blob(15, 26, 6, 4.5);
    dark(25, 23, 4.5, 4);
    blob(30, 10, 5, 4);
    dark(22, 11, 3.5, 3);
    blob(9, 20, 3, 3);
  } else if (p === 'spots') {
    // Dalmatian: round spots of two sizes.
    const spot = fur('S');
    for (let i = 0; i < 34; i++) {
      const r = rnd() < 0.3 ? 1.6 : 1.1;
      spot(4 + rnd() * 40, 4 + rnd() * 33, r, r);
    }
  } else if (p === 'saddle') {
    for (let y = 0; y < PET_H; y++) {
      for (let x = 0; x < PET_W; x++) {
        if (at(g, x, y) === 'F' && !isSolid(g, x, y - 4) && y > 17 && y < 30 && x < 34 && x > 8)
          put(g, x, y, 'S');
      }
    }
  } else if (p === 'points') {
    // Siamese: dark ears, face, paws and tail, shading into the pale coat.
    for (let y = 0; y < PET_H; y++) {
      for (let x = 0; x < PET_W; x++) {
        if (at(g, x, y) !== 'F') continue;
        if (y > PET_GROUND - 5 || x < 11) put(g, x, y, 'S');
      }
    }
  } else if (p === 'mask') {
    // A husky: dark over the top, pale underneath and on the face.
    for (let y = 0; y < PET_H; y++) {
      for (let x = 0; x < PET_W; x++) {
        if (at(g, x, y) === 'F' && isSolid(g, x, y + 2) && !isSolid(g, x, y + 3) && y > 18)
          put(g, x, y, 'C');
      }
    }
  }
  void species;
  void pose;
}

/** Light on every top edge, shadow on every bottom edge, for both furs and the cream. */
function light(g: Grid): void {
  const src = g.map((r) => [...r]);
  const s = (x: number, y: number): boolean => SOLID.test(src[y]?.[x] ?? '.');
  for (let y = 0; y < PET_H; y++) {
    for (let x = 0; x < PET_W; x++) {
      const c = src[y]?.[x];
      if (c !== 'F' && c !== 'S' && c !== 'Q' && c !== 'C') continue;
      if (!s(x, y - 1)) put(g, x, y, c === 'C' ? 'C' : `${c}l`);
      else if (!s(x, y + 1) || !s(x, y + 2)) put(g, x, y, c === 'C' ? 'Cd' : `${c}d`);
    }
  }
}

function outline(g: Grid): void {
  const src = g.map((r) => [...r]);
  const s = (x: number, y: number): boolean =>
    SOLID.test(src[y]?.[x] ?? '.') && src[y]?.[x] !== 'K';
  for (let y = 0; y < PET_H; y++) {
    for (let x = 0; x < PET_W; x++) {
      if (src[y]?.[x] !== '.') continue;
      if (s(x + 1, y) || s(x - 1, y) || s(x, y + 1) || s(x, y - 1)) put(g, x, y, 'O');
    }
  }
}

/** A little glyph of pixels, stamped: the z's of sleep, a heart. */
function glyph(g: Grid, rows: readonly string[], key: string, x: number, y: number): void {
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch !== '.') put(g, x + dx, y + dy, key);
    });
  });
}

function extras(g: Grid, pose: PetPose, n: number): void {
  if (pose === 'sleep') glyph(g, ['ZZZ', '..Z', '.Z.', 'ZZZ'], 'Z', 40, 13 - n);
  if (pose === 'happy') glyph(g, ['.H.H.', 'HHHHH', '.HHH.', '..H..'], 'H', 40, 5 - n);
}

/** One frame, as a grid of colour keys. */
export function petFrame(species: Species, coat: Coat, pose: PetPose, n: number): Grid {
  const g = draw(species, pose, n % PET_FRAMES[pose].count, coat.ears ?? 'flop');
  pattern(g, coat, species, pose);
  light(g);
  outline(g);
  extras(g, pose, n % PET_FRAMES[pose].count);
  return g;
}

/** The colour for a key, in this coat. */
export function colourOf(coat: Coat, key: string): string | undefined {
  const [fl, fm, fd] = coat.fur;
  const [sl, sm, sd] = coat.second ?? coat.fur;
  const q = ['#2e2e34', '#1c1c20', '#101014'] as const;
  const table: Record<string, string> = {
    F: fm,
    Fl: fl,
    Fd: fd,
    S: sm,
    Sl: sl,
    Sd: sd,
    E2: fd,
    Q: q[1],
    Ql: q[0],
    Qd: q[2],
    C: coat.cream[0],
    Cd: coat.cream[1],
    P: '#f29fb0',
    E: coat.eye,
    K: '#ffffff',
    N: coat.nose ?? '#d9707f',
    M: '#5c2323',
    T: '#ef7f92',
    B: '#f7a4b4',
    O: '#24160f',
    Z: '#ffffff',
    H: '#f0506e',
    W: '#3f7fbf',
    Y: '#b8743a',
  };
  return table[key];
}
