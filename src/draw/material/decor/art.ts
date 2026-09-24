/**
 * Things to put on a bookcase, drawn in the same pixel style as the pets: a few deliberate
 * shapes, then light along the top edges, shadow along the bottom ones, and a one-pixel outline.
 * Each is small and stands on a plank; a few have two frames (a candle's flame, a lamp's glow).
 */

export interface DecorKind {
  id: string;
  label: string;
  /** Size on the grid, in pixels; drawn at 2x on the bookcase. */
  w: number;
  h: number;
  frames: number;
}

export const DECOR: readonly DecorKind[] = [
  { id: 'plant', label: 'potted plant', w: 22, h: 30, frames: 1 },
  { id: 'cactus', label: 'cactus', w: 14, h: 24, frames: 1 },
  { id: 'lamp', label: 'reading lamp', w: 22, h: 34, frames: 2 },
  { id: 'globe', label: 'globe', w: 22, h: 30, frames: 1 },
  { id: 'clock', label: 'clock', w: 20, h: 24, frames: 2 },
  { id: 'candle', label: 'candle', w: 10, h: 20, frames: 2 },
  { id: 'hourglass', label: 'hourglass', w: 14, h: 22, frames: 1 },
  { id: 'trophy', label: 'trophy', w: 18, h: 24, frames: 1 },
  { id: 'frame', label: 'photo frame', w: 20, h: 24, frames: 1 },
  { id: 'mug', label: 'mug', w: 14, h: 14, frames: 2 },
  { id: 'vase', label: 'vase of flowers', w: 18, h: 30, frames: 1 },
  { id: 'duck', label: 'rubber duck', w: 16, h: 14, frames: 1 },
  { id: 'robot', label: 'little robot', w: 16, h: 22, frames: 2 },
  { id: 'crystal', label: 'crystal', w: 14, h: 18, frames: 1 },
  { id: 'snowglobe', label: 'snow globe', w: 18, h: 20, frames: 2 },
  { id: 'bookend', label: 'bookend', w: 10, h: 26, frames: 1 },
  { id: 'camera', label: 'camera', w: 20, h: 14, frames: 1 },
  { id: 'teapot', label: 'teapot', w: 22, h: 18, frames: 1 },
];

export function decorOf(id: string | undefined): DecorKind | undefined {
  return DECOR.find((d) => d.id === id);
}

type Grid = string[][];

const PALETTE: Record<string, string> = {
  O: '#24160f',
  G: '#4e9a3c', // leaf
  g: '#6fbf52',
  j: '#35702a',
  T: '#c2653a', // terracotta
  t: '#df8a5c',
  u: '#93461f',
  B: '#3f7fbf', // blue
  b: '#76a9dc',
  v: '#2f5f96',
  Y: '#e8b43a', // brass, gold
  y: '#f7d677',
  z: '#b5832a',
  W: '#f4efe3', // paper, porcelain
  w: '#ffffff',
  x: '#d6cdbb',
  R: '#d8453d', // red
  r: '#f07a6c',
  q: '#a5302a',
  K: '#3a3a44', // dark metal
  k: '#5c5c68',
  L: '#fff2a8', // light
  l: '#ffe066',
  P: '#e98aa8', // pink
  p: '#f6b4c8',
  N: '#7a5230', // wood
  n: '#a2703f',
  C: '#9fd8e8', // glass
  c: '#d6f1f8',
  S: '#bda0e6', // crystal
  s: '#e0d0f7',
  F: '#ffb13b', // flame
  f: '#ff7b2e',
  E: '#2a1a12', // eye, ink
};

function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
}

function put(g: Grid, x: number, y: number, c: string): void {
  const row = g[Math.round(y)];
  const xi = Math.round(x);
  if (row && xi >= 0 && xi < row.length) row[xi] = c;
}

function oval(g: Grid, cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) put(g, x, y, c);
    }
  }
}

function rect(g: Grid, x: number, y: number, w: number, h: number, c: string): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, c);
}

/** A trapezoid, wider at the bottom or the top: a pot, a lampshade, a vase. */
function trap(
  g: Grid,
  x: number,
  y: number,
  topW: number,
  botW: number,
  h: number,
  c: string,
): void {
  const cx = x;
  for (let j = 0; j < h; j++) {
    const w = topW + ((botW - topW) * j) / Math.max(1, h - 1);
    rect(g, Math.round(cx - w / 2), y + j, Math.round(w), 1, c);
  }
}

function draw(id: string, n: number, w: number, h: number): Grid {
  const g = blank(w, h);
  const cx = w / 2;
  const floor = h - 2;
  switch (id) {
    case 'plant':
      oval(g, cx - 4, 10, 5, 4, 'G');
      oval(g, cx + 4, 9, 5, 4, 'G');
      oval(g, cx, 6, 5, 5, 'G');
      oval(g, cx - 2, 13, 5, 3.5, 'j');
      oval(g, cx + 3, 13, 4, 3, 'G');
      trap(g, cx, 16, 12, 9, floor - 15, 'T');
      rect(g, Math.round(cx - 7), 15, 14, 2, 'T');
      break;
    case 'cactus':
      rect(g, Math.round(cx - 2), 3, 5, 12, 'G');
      rect(g, Math.round(cx - 6), 7, 3, 5, 'G');
      rect(g, Math.round(cx - 5), 10, 3, 2, 'G');
      rect(g, Math.round(cx + 3), 5, 3, 6, 'G');
      put(g, cx, 2, 'P');
      trap(g, cx, 15, 10, 8, floor - 14, 'T');
      break;
    case 'lamp':
      trap(g, cx, 3, 10, 18, 9, n ? 'L' : 'y');
      rect(g, Math.round(cx - 1), 12, 2, floor - 16, 'Y');
      trap(g, cx, floor - 4, 6, 12, 5, 'Y');
      break;
    case 'globe':
      oval(g, cx, 11, 8.5, 8.5, 'B');
      oval(g, cx - 3, 8, 3.5, 2.5, 'G');
      oval(g, cx + 3, 14, 3, 2, 'G');
      oval(g, cx + 4, 7, 1.6, 1.2, 'G');
      rect(g, Math.round(cx - 1), 20, 2, 4, 'Y');
      trap(g, cx, floor - 3, 6, 12, 4, 'N');
      break;
    case 'clock':
      oval(g, cx, 10, 8, 8, 'N');
      oval(g, cx, 10, 6, 6, 'W');
      put(g, cx, 10, 'E');
      put(g, cx, 9, 'E');
      put(g, cx, 8, 'E');
      put(g, cx + (n ? 1 : 2), 10 + (n ? 1 : 0), 'E');
      put(g, cx + (n ? 2 : 3), 10 + (n ? 2 : 0), 'E');
      rect(g, Math.round(cx - 6), floor - 3, 12, 3, 'N');
      break;
    case 'candle':
      rect(g, Math.round(cx - 3), 8, 6, floor - 8, 'W');
      put(g, cx, 7, 'E');
      oval(g, cx, 4 + (n ? 0.4 : 0), 1.6 + (n ? 0.3 : 0), 3, 'F');
      oval(g, cx, 5, 0.8, 1.4, 'L');
      rect(g, Math.round(cx - 4), floor - 1, 8, 2, 'Y');
      break;
    case 'hourglass':
      rect(g, Math.round(cx - 6), 1, 12, 2, 'N');
      rect(g, Math.round(cx - 6), floor - 1, 12, 2, 'N');
      trap(g, cx, 3, 9, 2, 8, 'C');
      trap(g, cx, 11, 2, 9, 8, 'C');
      trap(g, cx, 14, 2, 7, 5, 'Y');
      break;
    case 'trophy':
      trap(g, cx, 2, 12, 6, 9, 'Y');
      oval(g, cx - 6, 6, 2, 2.5, 'Y');
      oval(g, cx + 6, 6, 2, 2.5, 'Y');
      oval(g, cx - 6, 6, 1, 1.4, '.');
      oval(g, cx + 6, 6, 1, 1.4, '.');
      rect(g, Math.round(cx - 1), 11, 2, 5, 'Y');
      rect(g, Math.round(cx - 5), floor - 4, 10, 5, 'N');
      put(g, cx, 5, 'y');
      break;
    case 'frame':
      rect(g, 1, 1, w - 2, floor - 1, 'N');
      rect(g, 3, 3, w - 6, floor - 5, 'b');
      oval(g, cx + 3, 7, 2, 2, 'L');
      trap(g, cx - 1, floor - 10, 2, 12, 7, 'G');
      break;
    case 'mug':
      rect(g, 2, 3, 9, floor - 3, 'R');
      oval(g, 12, 7, 2.4, 3, 'R');
      oval(g, 12, 7, 1, 1.6, '.');
      rect(g, 3, 3, 7, 1, 'N');
      if (n) put(g, 6, 1, 'x'), put(g, 5, 0, 'x');
      else put(g, 5, 1, 'x'), put(g, 6, 0, 'x');
      break;
    case 'vase':
      oval(g, cx - 4, 5, 3, 3, 'R');
      oval(g, cx + 3, 4, 3, 3, 'P');
      oval(g, cx, 8, 3, 3, 'Y');
      put(g, cx - 4, 5, 'y');
      put(g, cx, 8, 'q');
      rect(g, Math.round(cx - 3), 9, 1, 6, 'j');
      rect(g, Math.round(cx + 2), 8, 1, 7, 'j');
      oval(g, cx, floor - 6, 5.5, 6, 'B');
      rect(g, Math.round(cx - 2), 13, 4, 3, 'B');
      break;
    case 'duck':
      oval(g, cx - 1, 9, 6.5, 4, 'Y');
      oval(g, cx + 3, 5, 3.5, 3.5, 'Y');
      rect(g, Math.round(cx + 6), 5, 3, 2, 'F');
      put(g, cx + 4, 4, 'E');
      put(g, cx - 5, 7, 'y');
      break;
    case 'robot':
      rect(g, Math.round(cx - 5), 3, 10, 8, 'k');
      put(g, cx - 2, 6, n ? 'L' : 'B');
      put(g, cx + 2, 6, n ? 'L' : 'B');
      rect(g, Math.round(cx - 2), 9, 4, 1, 'K');
      put(g, cx, 1, 'R');
      rect(g, Math.round(cx), 2, 1, 1, 'K');
      rect(g, Math.round(cx - 4), 12, 8, 6, 'k');
      rect(g, Math.round(cx - 7), 12, 2, 5, 'K');
      rect(g, Math.round(cx + 5), 12, 2, 5, 'K');
      rect(g, Math.round(cx - 4), floor - 2, 3, 3, 'K');
      rect(g, Math.round(cx + 1), floor - 2, 3, 3, 'K');
      break;
    case 'crystal':
      trap(g, cx, 2, 2, 10, 6, 'S');
      trap(g, cx, 8, 10, 6, floor - 8, 'S');
      rect(g, Math.round(cx - 1), 4, 1, floor - 6, 's');
      break;
    case 'snowglobe':
      oval(g, cx, 8, 7, 7, 'C');
      trap(g, cx, 11, 2, 7, 4, 'G');
      for (const [dx, dy] of n
        ? [
            [-3, 4],
            [2, 3],
            [-1, 7],
            [4, 8],
          ]
        : [
            [-2, 3],
            [3, 5],
            [-4, 7],
            [1, 6],
          ])
        put(g, cx + (dx ?? 0), dy ?? 0, 'w');
      trap(g, cx, floor - 3, 10, 14, 4, 'N');
      break;
    case 'bookend':
      rect(g, 1, 2, 3, floor - 1, 'K');
      rect(g, 1, floor - 3, w - 2, 4, 'K');
      oval(g, 6, 6, 2.5, 2.5, 'Y');
      break;
    case 'camera':
      rect(g, 1, 3, w - 2, floor - 3, 'K');
      rect(g, 3, 1, 5, 2, 'K');
      oval(g, cx + 1, 7, 4, 4, 'k');
      oval(g, cx + 1, 7, 2.4, 2.4, 'B');
      put(g, cx + 2, 6, 'w');
      put(g, 3, 5, 'R');
      break;
    case 'teapot':
      oval(g, cx, 10, 7, 6, 'W');
      oval(g, cx, 4, 2, 1.5, 'W');
      rect(g, Math.round(cx - 4), 4, 8, 2, 'x');
      rect(g, 2, 8, 4, 2, 'W');
      rect(g, 1, 6, 2, 3, 'W');
      oval(g, w - 4, 10, 2.4, 3.5, 'W');
      oval(g, w - 4, 10, 1, 2, '.');
      rect(g, Math.round(cx - 5), 10, 10, 1, 'B');
      break;
  }
  return g;
}

/** Light on top edges, shadow on bottom ones, then an outline: the finish every object gets. */
const LIGHT: Record<string, string> = {
  G: 'g',
  T: 't',
  B: 'b',
  Y: 'y',
  W: 'w',
  R: 'r',
  K: 'k',
  N: 'n',
  C: 'c',
  S: 's',
  P: 'p',
};
const DARK: Record<string, string> = {
  G: 'j',
  T: 'u',
  B: 'v',
  Y: 'z',
  W: 'x',
  R: 'q',
  N: 'N',
  C: 'C',
  S: 'S',
  P: 'P',
  K: 'K',
};

function finish(g: Grid): Grid {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const src = g.map((r) => [...r]);
  const solid = (x: number, y: number): boolean => (src[y]?.[x] ?? '.') !== '.';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = src[y]?.[x] ?? '.';
      if (c === '.') continue;
      if (!solid(x, y - 1) && LIGHT[c]) put(g, x, y, LIGHT[c]);
      else if (!solid(x, y + 1) && DARK[c]) put(g, x, y, DARK[c]);
    }
  }
  const lit = g.map((r) => [...r]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (lit[y]?.[x] !== '.') continue;
      const near = [lit[y]?.[x - 1], lit[y]?.[x + 1], lit[y - 1]?.[x], lit[y + 1]?.[x]];
      if (near.some((c) => c !== undefined && c !== '.' && c !== 'O')) put(g, x, y, 'O');
    }
  }
  return g;
}

/** One frame of an object, as colours (null where there is nothing). */
export function decorFrame(id: string, n = 0): Array<Array<string | null>> {
  const kind = decorOf(id);
  if (!kind) return [];
  const g = finish(draw(id, n % kind.frames, kind.w, kind.h));
  return g.map((row) => row.map((k) => (k === '.' ? null : (PALETTE[k] ?? null))));
}

/** An object as a small SVG of pixel rectangles: pure, so the server can draw it. */
export function decorSvg(id: string, n = 0, scale = 2): string {
  const kind = decorOf(id);
  if (!kind) return '';
  const px = decorFrame(id, n);
  let body = '';
  px.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (!c) {
        x += 1;
        continue;
      }
      let run = 1;
      while (row[x + run] === c) run += 1;
      body += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
      x += run;
    }
  });
  return (
    `<svg class="decor-art" viewBox="0 0 ${kind.w} ${kind.h}" width="${kind.w * scale}" height="${kind.h * scale}" ` +
    `shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`
  );
}
