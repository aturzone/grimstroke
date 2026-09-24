/**
 * The shelf cat, drawn.
 *
 * Every frame is built from a handful of shapes -- a body, a chest and a haunch, a round head
 * with cheeks, ears, legs as capsules, a tapering tail on a curve -- cut into pixels on a 56 x 36
 * grid, then finished the way pixel art is: a lighting pass (fur catches the light along the
 * back and falls into shadow along the belly), tabby stripes across the back, cream on the
 * muzzle, chest and paws, eyes with a highlight, and a hard one-pixel outline round
 * the whole silhouette. Nothing is fetched and there is no sprite sheet to license: the poses
 * are parameters, so a new one is a few numbers.
 */

export const CAT_W = 56;
export const CAT_H = 36;
/** Where the paws touch the plank, from the top of the grid. */
export const CAT_GROUND = 34;

export const CAT_COLOURS: Readonly<Record<string, string>> = {
  o: '#2b1a10', // outline
  d: '#b35a1e', // fur in shadow
  b: '#e3883d', // fur
  l: '#f5ab62', // fur in the light
  s: '#9c4c17', // stripes
  f: '#c56b28', // the far legs, a step darker
  w: '#f8ead3', // cream
  c: '#e2c7a0', // cream in shadow
  p: '#eb8fa0', // ears, tongue
  n: '#d56a7c', // nose
  e: '#3d5a24', // eye
  i: '#ffffff', // the catch-light in an eye
  m: '#5c2323', // an open mouth
  z: '#ffffff', // the z's of sleep
};

export type CatPose =
  | 'walk'
  | 'trot'
  | 'sit'
  | 'blink'
  | 'flick'
  | 'groom'
  | 'stretch'
  | 'yawn'
  | 'sleep'
  | 'crouch'
  | 'leap'
  | 'land'
  | 'look';

/** How many frames each pose has, and how many a second it plays at. */
export const CAT_FRAMES: Readonly<Record<CatPose, { count: number; fps: number }>> = {
  walk: { count: 8, fps: 10 },
  trot: { count: 6, fps: 14 },
  sit: { count: 1, fps: 1 },
  blink: { count: 3, fps: 12 },
  flick: { count: 6, fps: 10 },
  groom: { count: 6, fps: 6 },
  stretch: { count: 5, fps: 5 },
  yawn: { count: 5, fps: 6 },
  sleep: { count: 4, fps: 1.2 },
  crouch: { count: 2, fps: 10 },
  leap: { count: 2, fps: 8 },
  land: { count: 2, fps: 10 },
  look: { count: 2, fps: 3 },
};

type Grid = string[][];

// ---------------------------------------------------------------- primitives

function blank(): Grid {
  return Array.from({ length: CAT_H }, () => Array.from({ length: CAT_W }, () => '.'));
}

function put(g: Grid, x: number, y: number, c: string): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  const row = g[yi];
  if (row && xi >= 0 && xi < CAT_W) row[xi] = c;
}

/** A filled ellipse, turned by `turn` degrees. */
function ellipse(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  c: string,
  turn = 0,
): void {
  const a = (turn * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const r = Math.max(rx, ry) + 1;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if ((u / rx) ** 2 + (v / ry) ** 2 <= 1) put(g, x, y, c);
    }
  }
}

/** A thick line with round ends -- a leg, a paw raised. */
function capsule(
  g: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  c: string,
): void {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ellipse(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
  }
}

function triangle(
  g: Grid,
  a: [number, number],
  b: [number, number],
  d: [number, number],
  c: string,
): void {
  const side = (p: [number, number], q: [number, number], r: [number, number]): number =>
    (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]);
  const xs = [a[0], b[0], d[0]];
  const ys = [a[1], b[1], d[1]];
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const p: [number, number] = [x, y];
      const s1 = side(a, b, p);
      const s2 = side(b, d, p);
      const s3 = side(d, a, p);
      if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) put(g, x, y, c);
    }
  }
}

/** A tail: a quadratic curve, thick at the root and thin at the tip, with a darker tip. */
function tail(
  g: Grid,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  root = 2.2,
  tip = 1.1,
): void {
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    ellipse(g, x, y, root + (tip - root) * t, root + (tip - root) * t, t > 0.82 ? 's' : 'b');
  }
}

// ---------------------------------------------------------------- finishing

const FUR = new Set(['b', 'l', 'd']);

function filled(g: Grid, x: number, y: number): boolean {
  const c = g[y]?.[x];
  return c !== undefined && c !== '.' && c !== 'k' && c !== 'z';
}

/** Tabby stripes: short dark bands across the top of the back, a little slanted. */
function stripes(g: Grid, x0: number, x1: number, every = 4, depth = 3): void {
  for (let x = x0; x <= x1; x += every) {
    for (let y = 0; y < CAT_H; y++) {
      if (g[y]?.[x] !== 'b') continue;
      // From the first fur pixel down, a few pixels deep.
      for (let k = 0; k < depth; k++) {
        if (g[y + k]?.[x + (k > 1 ? 1 : 0)] === 'b') put(g, x + (k > 1 ? 1 : 0), y + k, 's');
      }
      break;
    }
  }
}

/** Light along every top edge of the fur, shadow along every bottom edge. */
function light(g: Grid): void {
  const src = g.map((row) => [...row]);
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      const c = src[y]?.[x];
      if (c === 'b') {
        if (!filled(src, x, y - 1) || !filled(src, x, y - 2)) put(g, x, y, 'l');
        else if (!filled(src, x, y + 1)) put(g, x, y, 'd');
      } else if (c === 'w' && !filled(src, x, y + 1)) put(g, x, y, 'c');
    }
  }
}

/** A one-pixel outline round the silhouette: every empty pixel touching the cat. */
function outline(g: Grid): void {
  const src = g.map((row) => [...row]);
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      if (src[y]?.[x] !== '.') continue;
      if (
        filled(src, x + 1, y) ||
        filled(src, x - 1, y) ||
        filled(src, x, y + 1) ||
        filled(src, x, y - 1)
      ) {
        put(g, x, y, 'o');
      }
    }
  }
}

// ---------------------------------------------------------------- the parts

interface Head {
  x: number;
  y: number;
  /** Degrees; negative looks up. */
  tilt?: number;
  eyes: 'open' | 'closed' | 'half' | 'up';
  mouth?: 'shut' | 'open' | 'tongue';
  /** Ears back (sleepy) or forward (alert). */
  ears?: 'up' | 'back';
}

function head(g: Grid, h: Head): void {
  const t = ((h.tilt ?? 0) * Math.PI) / 180;
  const rot = (dx: number, dy: number): [number, number] => [
    h.x + dx * Math.cos(t) - dy * Math.sin(t),
    h.y + dx * Math.sin(t) + dy * Math.cos(t),
  ];
  const back = h.ears === 'back' ? 1.5 : 0;
  // Ears first, so the head covers their roots.
  triangle(g, rot(-5.5, -1), rot(-4 - back, -8 + back), rot(-0.5, -4), 'b');
  triangle(g, rot(4.5, -2), rot(4.5 + back * 0.5, -8.5 + back), rot(0.5, -4.5), 'b');
  // The head: round, with cheeks a little wider than the crown.
  ellipse(g, ...rot(0, 0), 6.2, 5.6, 'b', h.tilt ?? 0);
  ellipse(g, ...rot(0, 1.4), 7, 4.4, 'b', h.tilt ?? 0);
  // The inside of the ears.
  triangle(g, rot(-4.6, -2), rot(-3.9 - back, -6.4 + back), rot(-2, -3.6), 'p');
  triangle(g, rot(3.8, -2.6), rot(4 + back * 0.5, -6.8 + back), rot(1.8, -3.8), 'p');
  // Muzzle and chin in cream.
  ellipse(g, ...rot(2.6, 2.6), 3.6, 2.4, 'w', h.tilt ?? 0);
  // Eyes.
  const eye = (dx: number): void => {
    const [ex, ey] = rot(dx, -0.6);
    if (h.eyes === 'closed') {
      put(g, ex - 1, ey, 'o');
      put(g, ex, ey + 0.6, 'o');
      put(g, ex + 1, ey, 'o');
    } else if (h.eyes === 'half') {
      put(g, ex - 1, ey, 'o');
      put(g, ex, ey, 'o');
      put(g, ex + 1, ey, 'o');
      put(g, ex, ey + 1, 'e');
    } else {
      const up = h.eyes === 'up' ? -1 : 0;
      put(g, ex, ey + up, 'e');
      put(g, ex, ey + 1 + up, 'e');
      put(g, ex + 1, ey + up, 'e');
      put(g, ex + 1, ey + 1 + up, 'e');
      put(g, ex + 1, ey + up, 'i');
    }
  };
  eye(-1.4);
  eye(3.4);
  // Nose, and the mouth under it.
  const [nx, ny] = rot(4.6, 1.8);
  put(g, nx, ny, 'n');
  put(g, nx - 1, ny, 'n');
  if (h.mouth === 'open' || h.mouth === 'tongue') {
    const [mx, my] = rot(3.4, 4);
    ellipse(g, mx, my, 1.8, 1.4, 'm');
    if (h.mouth === 'tongue') put(g, mx + 1, my + 1, 'p');
  }
}

/** A leg from its top to its paw, with a cream paw on the end. */
function leg(g: Grid, top: [number, number], paw: [number, number], far: boolean): void {
  capsule(g, top[0], top[1], paw[0], paw[1], 1.7, far ? 'f' : 'b');
  ellipse(g, paw[0] + 0.6, paw[1] - 0.2, 1.9, 1.2, far ? 'c' : 'w');
}

function zees(g: Grid, n: number): void {
  const Z = ['zzz', '..z', '.z.', 'zzz'];
  const small = ['zz', '.z', 'zz'];
  const place = (glyph: string[], x: number, y: number): void => {
    glyph.forEach((row, dy) => {
      [...row].forEach((ch, dx) => {
        if (ch === 'z') put(g, x + dx, y + dy, 'z');
      });
    });
  };
  const rise = n % 4;
  place(small, 44, 12 - rise);
  if (rise > 0) place(Z, 47, 6 - rise);
}

// ---------------------------------------------------------------- the poses

/** Walking and trotting: a four-beat gait, the near and far legs half a stride apart. */
function gait(g: Grid, n: number, count: number, reach: number, lift: number): Head {
  const phase = (n / count) * Math.PI * 2;
  const bob = Math.sin(phase * 2) * 0.5;
  const stride = (offset: number): [number, number] => {
    const a = phase + offset;
    return [Math.sin(a) * reach, Math.max(0, -Math.cos(a)) * lift];
  };
  const foot = (x: number, offset: number): [number, number] => {
    const [dx, up] = stride(offset);
    return [x + dx, CAT_GROUND - 1 - up];
  };
  // The far legs, behind everything.
  leg(g, [37, 23 + bob], foot(38, Math.PI), true);
  leg(g, [18, 23 + bob], foot(17, 0), true);
  tail(g, [13, 19 + bob], [4, 13 + Math.sin(phase) * 2], [7 + Math.sin(phase) * 2, 4]);
  // Body, haunch and chest.
  ellipse(g, 17, 21 + bob, 7.2, 6.6, 'b');
  ellipse(g, 27, 20.5 + bob, 13, 6.2, 'b');
  ellipse(g, 36, 21.5 + bob, 6.4, 6.2, 'b');
  // Cream along the chest and belly.
  ellipse(g, 38, 24 + bob, 3.8, 3, 'w');
  ellipse(g, 27, 25.6 + bob, 8, 1.4, 'w');
  stripes(g, 16, 36, 4, 3);
  // The near legs, in front.
  leg(g, [36, 24 + bob], foot(36, Math.PI * 0.5), false);
  leg(g, [19, 24 + bob], foot(19, Math.PI * 1.5), false);
  return { x: 45, y: 13 + bob * 1.2, eyes: 'open' };
}

function sitting(g: Grid, tailTip: number, paw?: [number, number]): void {
  // Haunch, then the upright chest.
  ellipse(g, 22, 26, 9.5, 8.4, 'b');
  ellipse(g, 30, 21, 6.4, 9.2, 'b', -8);
  ellipse(g, 33, 23, 3.4, 6, 'w', -8);
  stripes(g, 16, 28, 4, 3);
  // Front legs straight down; one raised to wash, if washing.
  leg(g, [30, 25], [30, CAT_GROUND - 1], true);
  if (paw) capsule(g, 33, 23, paw[0], paw[1], 1.6, 'b'), ellipse(g, paw[0], paw[1], 1.9, 1.4, 'w');
  else leg(g, [34, 25], [34, CAT_GROUND - 1], false);
  ellipse(g, 24, CAT_GROUND - 1, 3, 1.4, 'w');
  // The tail lies curled round the front paws, in front of the haunch, its tip lifting now and
  // then.
  tail(g, [14, 32], [24, 35.5], [37, 33.5 - tailTip], 2, 1.1);
}

function build(pose: CatPose, n: number): Grid {
  const g = blank();
  let h: Head | undefined;
  switch (pose) {
    case 'walk':
      h = gait(g, n, CAT_FRAMES.walk.count, 4, 2.2);
      break;
    case 'trot':
      h = gait(g, n, CAT_FRAMES.trot.count, 6, 3.4);
      h.tilt = -4;
      break;
    case 'sit':
    case 'blink':
    case 'flick':
    case 'look': {
      const flick = pose === 'flick' ? ([0, 2, 4, 5, 3, 1][n] ?? 0) : 0;
      sitting(g, flick);
      h = {
        x: 33,
        y: 10,
        eyes: pose === 'blink' ? (n === 1 ? 'closed' : 'half') : pose === 'look' ? 'up' : 'open',
        ...(pose === 'look' ? { tilt: n === 0 ? -10 : -14 } : {}),
      };
      break;
    }
    case 'groom': {
      // Paw up to the mouth, a lick, the paw over the ear, down again.
      const paws: Array<[number, number]> = [
        [36, 19],
        [37, 15],
        [37, 14],
        [36, 11],
        [37, 14],
        [36, 18],
      ];
      sitting(g, 1, paws[n] ?? [36, 19]);
      h = {
        x: 33,
        y: 11 + (n === 2 || n === 3 ? 1 : 0),
        tilt: n === 3 ? 12 : 8,
        eyes: 'closed',
        mouth: n === 1 || n === 2 ? 'tongue' : 'shut',
      };
      break;
    }
    case 'yawn': {
      sitting(g, 0);
      const open = [0, 1, 2, 2, 1][n] ?? 0;
      h = {
        x: 33,
        y: 10 - open * 0.5,
        tilt: -open * 8,
        eyes: open ? 'closed' : 'half',
        mouth: open >= 1 ? (open === 2 ? 'tongue' : 'open') : 'shut',
        ears: open === 2 ? 'back' : 'up',
      };
      break;
    }
    case 'stretch': {
      // Front legs reach forward, the chest goes down, the rear stays up -- then back.
      const k = [0, 0.5, 1, 1, 0.5][n] ?? 0;
      tail(g, [12, 18 - k * 3], [6, 8 - k * 2], [9, 2]);
      ellipse(g, 17, 20 - k * 1.5, 7, 6.4, 'b');
      ellipse(g, 27, 21 + k * 1.5, 12.5, 5.8, 'b', k * 10);
      ellipse(g, 36, 24 + k * 3, 6, 5.4, 'b');
      stripes(g, 16, 34, 4, 3);
      leg(g, [18, 24], [16, CAT_GROUND - 1], true);
      leg(g, [20, 24], [21, CAT_GROUND - 1], false);
      leg(g, [37, 27 + k * 2], [42 + k * 7, CAT_GROUND - 1], true);
      leg(g, [38, 27 + k * 2], [44 + k * 7, CAT_GROUND - 1], false);
      h = { x: 45 + k * 3, y: 16 + k * 7, tilt: k * 6, eyes: k > 0.5 ? 'closed' : 'half' };
      break;
    }
    case 'sleep': {
      // Curled up: a round loaf, the head on the front paws, the tail wrapped round.
      const breath = n % 2 === 0 ? 0 : 0.6;
      ellipse(g, 26, 26.5 - breath / 2, 15, 7.4 + breath, 'b');
      stripes(g, 14, 38, 4, 3);
      tail(g, [12, 30], [18, 36], [34, 34], 2.2, 1.4);
      ellipse(g, 38, 31, 4, 1.8, 'w');
      h = { x: 40, y: 24.5 - breath / 2, tilt: 14, eyes: 'closed', ears: 'back' };
      break;
    }
    case 'crouch': {
      const low = n === 0 ? 1.5 : 3;
      tail(g, [13, 22 + low], [4, 22], [2, 16]);
      ellipse(g, 17, 23 + low, 7.2, 6, 'b');
      ellipse(g, 27, 23 + low, 13, 5.4, 'b');
      ellipse(g, 36, 24 + low, 6, 5.4, 'b');
      stripes(g, 16, 36, 4, 3);
      leg(g, [18, 27], [21, CAT_GROUND - 1], true);
      leg(g, [37, 27], [39, CAT_GROUND - 1], true);
      leg(g, [20, 27], [23, CAT_GROUND - 1], false);
      leg(g, [36, 27], [37, CAT_GROUND - 1], false);
      h = { x: 45, y: 17 + low, tilt: -6, eyes: 'open' };
      break;
    }
    case 'leap': {
      // Stretched out in the air, front paws reaching, back legs trailing.
      const up = n === 0 ? 0 : 1;
      tail(g, [11, 17], [3, 18 - up], [1, 12]);
      ellipse(g, 16, 18, 6.8, 5.6, 'b', -8);
      ellipse(g, 27, 16.5, 13.5, 5.4, 'b', -8);
      ellipse(g, 37, 14, 5.8, 5.2, 'b', -8);
      stripes(g, 16, 36, 4, 3);
      leg(g, [15, 21], [8, 26], true);
      leg(g, [17, 21], [9, 27], false);
      leg(g, [38, 17], [46, 21 - up], true);
      leg(g, [39, 17], [48, 20 - up], false);
      h = { x: 44, y: 9, tilt: -10, eyes: 'open' };
      break;
    }
    case 'land': {
      const k = n === 0 ? 1 : 0;
      tail(g, [13, 19], [5, 14], [4, 6]);
      ellipse(g, 17, 20 - k * 2, 7, 6.2, 'b', k * 8);
      ellipse(g, 27, 21, 13, 5.8, 'b', k * 6);
      ellipse(g, 36, 23, 6.2, 5.8, 'b');
      stripes(g, 16, 36, 4, 3);
      leg(g, [18, 24], [16 - k * 3, CAT_GROUND - 1 - k * 4], true);
      leg(g, [20, 24], [18 - k * 3, CAT_GROUND - 1 - k * 3], false);
      leg(g, [36, 25], [39, CAT_GROUND - 1], true);
      leg(g, [37, 25], [41, CAT_GROUND - 1], false);
      h = { x: 45, y: 15, tilt: 4, eyes: 'open' };
      break;
    }
  }
  if (h) head(g, h);
  light(g);
  outline(g);
  if (pose === 'sleep') zees(g, n);
  return g;
}

/** One frame of one pose, as rows of colour letters. */
export function catFrame(pose: CatPose, n: number): Grid {
  return build(pose, n % CAT_FRAMES[pose].count);
}

/** Unused letters would be a colour nobody picked; the fur set is exported for tests. */
export const FUR_LETTERS: ReadonlySet<string> = FUR;
