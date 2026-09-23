/**
 * The character, drawn as pixel art.
 *
 * A second ART STYLE, not a second character model: the same choices -- this hair, those
 * eyes, that colour -- drawn on a 32x36 grid instead of with curves. Choosing a style is
 * choosing how the drawing is made, and nothing about who it is. So every part the drawn
 * style offers has a pixel counterpart; a choice that silently did nothing in one style is a
 * choice the studio should not have shown.
 *
 * HOW IT IS BUILT, and why it is not a sheet of sprites.
 *
 * The first version stamped a hand-authored sprite per part, and every sprite had been drawn
 * against ONE head: sixteen cells wide, sitting at columns 6 to 21. Hair drawn for that head
 * overhung the long one and fell short of the heart; the ears floated a column away from the
 * narrow head; the whole face sat two columns left of the middle of the grid; and the size
 * sliders could do nothing, because a sprite has one size.
 *
 * So the HEAD is rasterised from a profile -- a width at every row, for each shape and at
 * any size -- and everything that has to fit a head is drawn against that profile: hair,
 * hats, beards, ears and shoulders follow the actual outline of the actual head. Only the
 * small features that sit ON the face are authored cell by cell, because that is where a
 * pixel artist's decisions matter most, and they are scaled by nearest neighbour when their
 * size changes, which is the only honest way to scale pixels.
 *
 * The letters are roles, not colours, so a character re-colours without a cell changing:
 *
 *   K outline   S skin    D skin in shadow    G skin in light    H hair    L hair, lit
 *   W white     E iris    M mouth    T teeth    P tongue    R blush    A the accent
 *   C clothes   B clothes in shadow    Q a plaster
 */

import type { Character, Slot } from '~/draw/material/face/model.ts';

/** The grid. Small on purpose: pixel art stops being pixel art when there are enough of them. */
export const PIXEL_W = 32;
export const PIXEL_H = 36;

/** The line down the middle of the face falls between columns 15 and 16. */
const CX = 16;

type Grid = string[][];

/** A small picture, as rows of role letters. `.` is nothing. */
type Rows = readonly string[];

// ---------------------------------------------------------------- the head

interface Head {
  top: number;
  bottom: number;
  /** Half the head's width at a row, in cells: the head spans CX - half .. CX + half - 1. */
  half(row: number): number;
  brow: number;
  eye: number;
  nose: number;
  mouth: number;
}

/**
 * The width of each head shape down its height, as a fraction of its widest.
 *
 * `t` runs from the crown (0) to the chin (1). These are the whole difference between a round
 * face and a heart-shaped one, and everything else is drawn against them.
 */
const PROFILES: Record<string, { half: number; height: number; width: (t: number) => number }> = {
  round: { half: 8, height: 18, width: (t) => superellipse(t, 2.3) },
  square: {
    half: 8,
    height: 18,
    width: (t) => superellipse(t, 5) * (t > 0.82 ? 1 - (t - 0.82) * 1.5 : 1),
  },
  long: { half: 6, height: 20, width: (t) => superellipse(t, 2.7) },
  heart: {
    half: 8,
    height: 18,
    width: (t) => (t < 0.5 ? superellipse(t, 3) : 1 - 0.72 * ((t - 0.5) / 0.5) ** 1.25),
  },
  jaw: {
    half: 8,
    height: 18,
    width: (t) => (t < 0.5 ? superellipse(t, 4) : t < 0.84 ? 1 : 1 - ((t - 0.84) / 0.16) * 0.42),
  },
};

function superellipse(t: number, n: number): number {
  return (1 - Math.abs(2 * t - 1) ** n) ** (1 / n);
}

function makeHead(character: Character): Head {
  const profile =
    PROFILES[character.parts.shape ?? 'round'] ??
    (PROFILES.round as NonNullable<(typeof PROFILES)['round']>);
  const s = character.sizes?.head ?? 1;
  const halfMax = Math.max(5, Math.round(profile.half * s));
  const height = Math.max(13, Math.round(profile.height * s));
  const top = Math.round(14.5 - height / 2);
  const bottom = top + height - 1;
  const half = (row: number): number => {
    if (row < top || row > bottom) return 0;
    const t = (row - top + 0.5) / height;
    return Math.max(1, Math.round(halfMax * profile.width(t)));
  };
  const eye = top + Math.round(height * 0.47);
  return {
    top,
    bottom,
    half,
    brow: eye - 2,
    eye,
    nose: eye + 2,
    mouth: Math.min(bottom - 2, eye + Math.max(4, Math.round(height * 0.28))),
  };
}

// ---------------------------------------------------------------- the canvas

function blank(): Grid {
  return Array.from({ length: PIXEL_H }, () => Array.from({ length: PIXEL_W }, () => '.'));
}

function put(grid: Grid, x: number, y: number, cell: string): void {
  if (cell === '.' || x < 0 || y < 0 || x >= PIXEL_W || y >= PIXEL_H) return;
  (grid[y] as string[])[x] = cell;
}

function get(grid: Grid, x: number, y: number): string {
  return grid[y]?.[x] ?? '.';
}

/** Stamp rows with their top-left at (x, y). */
function stampRows(grid: Grid, rows: Rows, x: number, y: number): void {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx += 1) put(grid, x + dx, y + dy, row[dx] as string);
  });
}

function mirror(rows: Rows): Rows {
  return rows.map((row) => [...row].reverse().join(''));
}

/**
 * Scale rows by nearest neighbour, about nothing in particular -- the caller places the result.
 *
 * The only honest way to resize pixel art: every cell of the result is a cell of the
 * original, and nothing is invented between them.
 */
function scaleRows(rows: Rows, s: number): Rows {
  if (Math.abs(s - 1) < 0.06) return rows;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const nh = Math.max(1, Math.round(h * s));
  const nw = Math.max(1, Math.round(w * s));
  const out: string[] = [];
  for (let y = 0; y < nh; y += 1) {
    const src = rows[Math.min(h - 1, Math.floor((y + 0.5) / s))] ?? '';
    let line = '';
    for (let x = 0; x < nw; x += 1) line += src[Math.min(w - 1, Math.floor((x + 0.5) / s))] ?? '.';
    out.push(line);
  }
  return out;
}

/** A pair, mirrored about the middle of the face, with `gap` empty columns each side of it. */
function pair(grid: Grid, left: Rows, row: number, gap: number, right: Rows = mirror(left)): void {
  const w = Math.max(...left.map((r) => r.length));
  stampRows(grid, left, CX - gap - w, row);
  stampRows(grid, right, CX + gap, row);
}

/** Centred on the middle of the face. */
function centred(grid: Grid, rows: Rows, row: number): void {
  const w = Math.max(...rows.map((r) => r.length));
  stampRows(grid, rows, CX - Math.floor(w / 2), row);
}

/**
 * Fill a region and draw its outline: every cell of it that touches a cell outside it is ink.
 *
 * This is how hair, hats and clothes get their keyline -- the same weight as the head's -- and
 * why a style added later needs no outline drawn by hand.
 */
function region(grid: Grid, cells: Set<string>, fill: string, line = 'K'): void {
  const has = (x: number, y: number): boolean => cells.has(`${x},${y}`);
  for (const key of cells) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    const edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
    put(grid, x, y, edge ? line : fill);
  }
}

// ---------------------------------------------------------------- slots

function drawHead(grid: Grid, head: Head, shaded: boolean): void {
  const cells = new Set<string>();
  for (let y = head.top; y <= head.bottom; y += 1) {
    const h = head.half(y);
    for (let x = CX - h; x < CX + h; x += 1) cells.add(`${x},${y}`);
  }
  region(grid, cells, 'S');
  if (!shaded) return;
  // SHADOW IS PART OF THE DRAWING. Lit from the upper left: a column of shade down the right
  // side and a row under the chin, which is the whole difference between a lit object and a
  // coloured sticker.
  for (let y = head.top + 2; y <= head.bottom; y += 1) {
    const h = head.half(y);
    for (const x of [CX + h - 2, CX + h - 3]) {
      if (get(grid, x, y) === 'S' && (x === CX + h - 2 || y > head.mouth)) put(grid, x, y, 'D');
    }
  }
  for (let x = CX - head.half(head.bottom - 1); x < CX + head.half(head.bottom - 1); x += 1) {
    if (get(grid, x, head.bottom - 1) === 'S') put(grid, x, head.bottom - 1, 'D');
  }
}

const EARS: Record<string, { rows: Rows; lift: number }> = {
  plain: { rows: ['KK', 'KS', 'KD', 'KK'], lift: 1 },
  big: { rows: ['.KK', 'KSS', 'KSS', 'KSD', '.KK'], lift: 2 },
  pointed: { rows: ['K.', 'KK', 'KS', 'KS', 'KK'], lift: 3 },
};

function drawEars(grid: Grid, head: Head, id: string): void {
  const ear = EARS[id];
  if (!ear) return;
  const row = head.eye - ear.lift;
  const w = Math.max(...ear.rows.map((r) => r.length));
  const h = head.half(head.eye);
  stampRows(grid, ear.rows, CX - h - w, row);
  stampRows(grid, mirror(ear.rows), CX + h, row);
}

/**
 * Hair, drawn against the head it is on.
 *
 * Every style is a region of cells defined from the head's own outline -- a dome over the
 * crown, a hairline at the brow, sides that follow the temples -- plus what makes that style
 * itself. That is what lets one style fit every head shape at every size.
 */
function drawHair(grid: Grid, head: Head, id: string, character: Character): void {
  const cells = new Set<string>();
  const add = (x: number, y: number): void => {
    if (x >= 0 && x < PIXEL_W && y >= 0 && y < PIXEL_H) cells.add(`${x},${y}`);
  };
  const volume = Math.round(((character.sizes?.hair ?? 1) - 1) * 4);
  /** The cap of hair over the crown: the head's outline widened by `grow`, down to `line`. */
  const dome = (line: number, grow = 1, lift = 0): void => {
    for (let y = head.top - 1 - lift - Math.max(0, volume); y <= line; y += 1) {
      const ref = Math.max(head.top, y);
      let h = head.half(ref) + grow;
      // Above the crown the hair rounds off like a dome, not a tent: it narrows slowly and
      // then quickly. Narrowed a cell a row, a big afro came to a point.
      if (y < head.top) {
        const d = head.top - y;
        h -= Math.ceil((d * d) / ((lift + Math.max(0, volume) + 1) * 2));
      }
      for (let x = CX - h; x < CX + h; x += 1) add(x, y);
    }
  };
  /** Hair down the sides of the face, outside it, from `from` to `to`. */
  const sides = (from: number, to: number, width: number): void => {
    for (let y = from; y <= to; y += 1) {
      const h = Math.max(head.half(Math.min(y, head.bottom)), head.half(head.eye));
      for (let k = 0; k < width; k += 1) {
        add(CX - h - 1 + 1 - k, y);
        add(CX + h - 1 + k, y);
      }
    }
  };
  const hairline = head.brow - 1;
  const inFace = (x: number, y: number): boolean => {
    const h = head.half(y);
    return h > 0 && x >= CX - h && x < CX + h;
  };

  switch (id) {
    case 'crop':
      dome(hairline);
      sides(hairline, head.eye - 1, 2);
      break;
    case 'fringe':
      dome(head.brow);
      sides(hairline, head.eye - 1, 2);
      // The fringe hangs in locks, not in a ruler-straight line.
      for (let x = CX - 6; x < CX + 6; x += 3) cells.delete(`${x},${head.brow}`);
      break;
    case 'wave':
      dome(hairline);
      sides(hairline, head.eye, 2);
      // A side part: the hair sweeps lower over one brow than the other.
      for (let x = CX - head.half(head.brow); x < CX - 1; x += 1) add(x, head.brow);
      break;
    case 'curls': {
      dome(hairline, 1, 1);
      sides(hairline, head.eye + 1, 2);
      // A crown of curls is a bumpy edge: every other cell along the top and sides pushed
      // out by one, which the outline then follows round each curl.
      const edge = [...cells].map((k) => k.split(',').map(Number) as [number, number]);
      for (const [x, y] of edge) {
        const outside = !cells.has(`${x},${y - 1}`) && y < head.brow;
        if (outside && (x + y) % 2 === 0) add(x, y - 1);
        const left = !cells.has(`${x - 1},${y}`) && x < CX;
        const right = !cells.has(`${x + 1},${y}`) && x >= CX;
        if ((left || right) && y % 2 === 0) add(left ? x - 1 : x + 1, y);
      }
      break;
    }
    case 'long':
      dome(hairline);
      sides(hairline, head.mouth + 3, 3);
      break;
    case 'bun': {
      dome(hairline);
      sides(hairline, head.eye - 1, 2);
      const y0 = head.top - 5 - Math.max(0, volume);
      const bun: Rows = ['.XXXX.', 'XXXXXX', 'XXXXXX', '.XXXX.'];
      bun.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx += 1) if (row[dx] === 'X') add(CX - 3 + dx, y0 + dy);
      });
      break;
    }
    case 'buzz':
      // Close-cropped: the crown is hair and skin at once, cell by cell.
      for (let y = head.top; y <= hairline; y += 1) {
        const h = head.half(y);
        for (let x = CX - h + 1; x < CX + h - 1; x += 1)
          if ((x + y) % 2 === 0) put(grid, x, y, 'H');
      }
      return;
    case 'mohawk': {
      for (let y = head.top; y <= hairline; y += 1) {
        const h = head.half(y);
        for (let x = CX - h + 1; x < CX + h - 1; x += 1)
          if ((x + y) % 2 === 0) put(grid, x, y, 'D');
      }
      for (let y = head.top - 5 - Math.max(0, volume); y <= hairline - 1; y += 1) {
        for (let x = CX - 2; x < CX + 2; x += 1) add(x, y);
      }
      break;
    }
    case 'spike':
      dome(hairline);
      sides(hairline, head.eye - 1, 2);
      for (let x = CX - head.half(head.top) - 1; x < CX + head.half(head.top); x += 3) {
        add(x, head.top - 2);
        add(x + 1, head.top - 2);
        add(x, head.top - 3);
      }
      break;
    case 'afro': {
      // A round mass, not a widened cap: a disc centred a little above the brow, as wide as
      // the head and then some, cut off at the hairline in front.
      const r = head.half(head.eye) + 3 + Math.max(0, volume);
      const cy = head.brow - 1;
      for (let y = cy - r; y <= head.eye + 1; y += 1) {
        const w = Math.round(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))) * 1.08);
        for (let x = CX - w; x < CX + w; x += 1) {
          // The face shows through below the hairline.
          if (y > hairline && inFace(x, y)) continue;
          add(x, y);
        }
      }
      break;
    }
    case 'ponytail': {
      dome(hairline);
      sides(hairline, head.eye - 1, 2);
      const x0 = CX + head.half(head.eye) + 1;
      for (let y = head.eye - 3; y <= head.mouth + 3; y += 1) {
        add(x0, y);
        add(x0 + 1, y);
        if (y > head.eye - 2 && y < head.mouth + 2) add(x0 + 2, y);
      }
      break;
    }
    case 'bob':
      dome(head.brow);
      sides(hairline, head.mouth, 3);
      break;
    case 'bald': {
      // No hair, and the scalp catches the light.
      const y = head.top + 2;
      put(grid, CX - 4, y, 'G');
      put(grid, CX - 3, y, 'G');
      put(grid, CX - 5, y + 1, 'G');
      return;
    }
    default:
      return;
  }
  region(grid, cells, 'H');
  // The light in the hair: a short diagonal streak over the upper left.
  for (const key of cells) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    const d = x - CX + (y - head.top);
    if ((d === -6 || d === -5) && get(grid, x, y) === 'H' && y <= head.top + 3)
      put(grid, x, y, 'L');
  }
  if (id === 'ponytail') put(grid, CX + head.half(head.eye) + 2, head.eye - 1, 'A');
}

const EYES: Record<string, Rows> = {
  open: ['WWW', 'WEW'],
  wide: ['WWW', 'WEW', 'WWW'],
  happy: ['.K.', 'K.K'],
  sleepy: ['KKK', 'WEW'],
  wink: ['WWW', 'WEW'],
  cross: ['K.K', '.K.', 'K.K'],
  closed: ['K.K', '.K.'],
  dot: ['EE', 'EE'],
  star: ['.A.', 'AAA', '.A.'],
  angry: ['K..', '.KK', 'WEW'],
};

const BROWS: Record<string, Rows> = {
  straight: ['KKK'],
  thick: ['KKK', 'KKK'],
  arched: ['.K.', 'K.K'],
  cross: ['K..', '.KK'],
  worried: ['..K', 'KK.'],
};

const NOSES: Record<string, Rows> = {
  button: ['DD'],
  wide: ['D..D', '.DD.'],
  long: ['.D', '.D', 'DD'],
  hook: ['.K', 'KK'],
  sharp: ['.D', 'DK'],
};

const MOUTHS: Record<string, Rows> = {
  smile: ['K....K', '.KKKK.'],
  flat: ['KKKK'],
  grin: ['.KKKKKK.', 'KTTTTTTK', 'KMMMMMMK', '.KKKKKK.'],
  open: ['KKKKKK', 'KMMMMK', '.KMMK.'],
  smirk: ['.....K', 'KKKKK.'],
  oh: ['.KK.', 'KMMK', '.KK.'],
  frown: ['.KKKK.', 'K....K'],
  tongue: ['KKKKKK', 'KMMMMK', '.KPPK.', '..PP..'],
  teeth: ['KKKKKK', 'KTTTTK', '.KKKK.'],
};

function drawBeard(grid: Grid, head: Head, id: string): void {
  if (id === 'moustache') {
    centred(grid, ['.HHHH.', 'HHHHHH'], head.mouth - 2);
    return;
  }
  if (id === 'goatee') {
    centred(grid, ['HHHH', '.HH.'], head.mouth + 2);
    return;
  }
  for (let y = head.nose + 1; y <= head.bottom; y += 1) {
    const h = head.half(y);
    for (let x = CX - h; x < CX + h; x += 1) {
      const cell = get(grid, x, y);
      if (cell === 'K') continue;
      if (id === 'full' && y >= head.mouth - 1) put(grid, x, y, 'H');
      if (id === 'stubble' && y >= head.mouth && (x + y) % 2 === 0) put(grid, x, y, 'D');
    }
  }
}

const GLASSES: Record<string, { lens: Rows; bridge: boolean; right?: boolean }> = {
  round: { lens: ['.KKK.', 'K...K', 'K...K', '.KKK.'], bridge: true },
  square: { lens: ['KKKKK', 'K...K', 'K...K', 'KKKKK'], bridge: true },
  shades: { lens: ['KKKKK', 'KAAAK', 'KAAAK', '.KKK.'], bridge: true },
  monocle: { lens: ['.KKK.', 'K...K', 'K...K', '.KKK.'], bridge: false, right: true },
};

function drawGlasses(grid: Grid, head: Head, id: string): void {
  const g = GLASSES[id];
  if (!g) return;
  const row = head.eye - 2;
  if (g.right) {
    stampRows(grid, g.lens, CX + 1, row);
    for (let y = row + 4; y < row + 8; y += 1)
      put(grid, CX + 3 + Math.floor((y - row - 4) / 2), y, 'K');
    return;
  }
  pair(grid, g.lens, row, 1);
  if (g.bridge) {
    put(grid, CX - 1, row + 1, 'K');
    put(grid, CX, row + 1, 'K');
  }
}

function drawHat(grid: Grid, head: Head, id: string): void {
  const cells = new Set<string>();
  const add = (x: number, y: number): void => {
    cells.add(`${x},${y}`);
  };
  const t = head.top;
  const halfAt = (y: number): number => head.half(Math.max(t, y));
  switch (id) {
    case 'cap': {
      for (let y = t - 2; y <= t + 2; y += 1) {
        const h = halfAt(y) + 1 - Math.max(0, t - y);
        for (let x = CX - h; x < CX + h; x += 1) add(x, y);
      }
      region(grid, cells, 'A');
      const brim = t + 3;
      for (let x = CX - halfAt(brim) - 1; x < CX + halfAt(brim) + 5; x += 1)
        put(grid, x, brim, 'K');
      for (let x = CX + 2; x < CX + halfAt(brim) + 4; x += 1) put(grid, x, brim - 1, 'A');
      return;
    }
    case 'beanie': {
      for (let y = t - 3; y <= t + 3; y += 1) {
        const h = halfAt(y) + 1 - Math.max(0, t - y);
        for (let x = CX - h; x < CX + h; x += 1) add(x, y);
      }
      region(grid, cells, 'A');
      for (let x = CX - halfAt(t + 2); x < CX + halfAt(t + 2); x += 1) put(grid, x, t + 2, 'K');
      return;
    }
    case 'band': {
      const y0 = head.brow - 3;
      for (let y = y0; y <= y0 + 1; y += 1) {
        for (let x = CX - head.half(y) - 1; x < CX + head.half(y) + 1; x += 1) put(grid, x, y, 'A');
      }
      return;
    }
    case 'crown': {
      for (let y = t - 4; y <= t; y += 1) {
        for (let x = CX - 5; x < CX + 5; x += 1) {
          if (y > t - 3 || (x - CX + 5) % 3 === 0) add(x, y);
        }
      }
      region(grid, cells, 'A');
      return;
    }
    case 'beret': {
      for (let y = t - 2; y <= t + 1; y += 1) {
        const h = halfAt(y) + 1 - (y === t - 2 ? 2 : 0);
        for (let x = CX - h - 2; x < CX + h - 1; x += 1) add(x, y);
      }
      add(CX, t - 3);
      region(grid, cells, 'A');
      return;
    }
    case 'tophat': {
      for (let y = t - 7; y <= t - 1; y += 1)
        for (let x = CX - 4; x < CX + 4; x += 1) put(grid, x, y, 'K');
      for (let x = CX - 4; x < CX + 4; x += 1) put(grid, x, t - 2, 'A');
      for (let x = CX - halfAt(t) - 2; x < CX + halfAt(t) + 2; x += 1) put(grid, x, t, 'K');
      return;
    }
    case 'headphones': {
      for (let x = CX - halfAt(t) + 1; x < CX + halfAt(t) - 1; x += 1) put(grid, x, t - 1, 'K');
      const h = head.half(head.eye);
      for (let y = t; y < head.eye; y += 1) {
        put(grid, CX - head.half(y) - 1, y, 'K');
        put(grid, CX + head.half(y), y, 'K');
      }
      const cup: Rows = ['KKK', 'KAA', 'KAA', 'KAA', 'KKK'];
      stampRows(grid, cup, CX - h - 3, head.eye - 1);
      stampRows(grid, mirror(cup), CX + h, head.eye - 1);
      return;
    }
    default:
      return;
  }
}

const EARRINGS: Record<string, Rows> = {
  stud: ['A'],
  hoop: ['.A', 'A.', '.A'],
  drop: ['A', 'A', 'AA'],
};

const CHEEKS: Record<string, Rows> = {
  blush: ['RR'],
  freckles: ['D.D', '.D.'],
  lines: ['K.K'],
};

const MARKS: Record<string, Rows> = {
  bolt: ['.A', 'AA', 'A.'],
  star: ['.A.', 'AAA', '.A.'],
  scar: ['.K', 'KK', 'K.'],
  heart: ['A.A', 'AAA', '.A.'],
  plaster: ['QKQ'],
};

/** A neck, and shoulders down to the bottom of the grid. */
function drawOutfit(grid: Grid, head: Head, id: string, shaded: boolean): void {
  const top = head.bottom + 3;
  for (let y = head.bottom - 1; y < top + 1; y += 1) {
    for (let x = CX - 2; x < CX + 2; x += 1) put(grid, x, y, x === CX + 1 && shaded ? 'D' : 'S');
    put(grid, CX - 3, y, 'K');
    put(grid, CX + 2, y, 'K');
  }
  const cells = new Set<string>();
  for (let y = top; y < PIXEL_H; y += 1) {
    const h = Math.min(15, 4 + (y - top) * 3);
    for (let x = CX - h; x < CX + h; x += 1) cells.add(`${x},${y}`);
  }
  // The bottom edge of the grid is not an edge of the clothes: it carries on out of frame.
  for (let x = 0; x < PIXEL_W; x += 1) cells.add(`${x},${PIXEL_H}`);
  region(grid, cells, 'C');
  if (shaded) {
    for (let y = top + 1; y < PIXEL_H; y += 1) {
      const h = Math.min(15, 4 + (y - top) * 3);
      for (const x of [CX + h - 2, CX + h - 3]) if (get(grid, x, y) === 'C') put(grid, x, y, 'B');
    }
  }
  switch (id) {
    case 'tee':
      stampRows(grid, ['K....K', '.KKKK.'], CX - 3, top);
      break;
    case 'hoodie':
      stampRows(grid, ['KK....KK', '.KKKKKK.'], CX - 4, top - 1);
      put(grid, CX - 2, top + 2, 'W');
      put(grid, CX - 2, top + 3, 'W');
      put(grid, CX + 1, top + 2, 'W');
      put(grid, CX + 1, top + 3, 'W');
      break;
    case 'collar':
      stampRows(grid, ['WW..WW', '.WWWW.', '..WW..'], CX - 3, top);
      break;
    case 'jacket':
      for (let y = top; y < PIXEL_H; y += 1) {
        const w = Math.max(0, 3 - Math.floor((y - top) / 2));
        for (let x = CX - w; x < CX + w; x += 1) put(grid, x, y, 'W');
        if (w > 0) {
          put(grid, CX - w - 1, y, 'K');
          put(grid, CX + w, y, 'K');
        }
      }
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------- the whole face

/** Every pixel part, by slot: what the studio can offer in this style. */
export const PIXEL_PARTS: Readonly<Partial<Record<Slot, readonly string[]>>> = {
  shape: Object.keys(PROFILES),
  ears: Object.keys(EARS),
  hair: [
    'crop',
    'fringe',
    'wave',
    'curls',
    'long',
    'bun',
    'buzz',
    'mohawk',
    'spike',
    'afro',
    'ponytail',
    'bob',
    'bald',
  ],
  brows: Object.keys(BROWS),
  eyes: Object.keys(EYES),
  nose: Object.keys(NOSES),
  mouth: Object.keys(MOUTHS),
  beard: ['stubble', 'moustache', 'goatee', 'full'],
  glasses: Object.keys(GLASSES),
  headwear: ['cap', 'beanie', 'band', 'crown', 'beret', 'tophat', 'headphones'],
  earring: Object.keys(EARRINGS),
  cheeks: Object.keys(CHEEKS),
  mark: Object.keys(MARKS),
  outfit: ['tee', 'hoodie', 'collar', 'jacket'],
};

/**
 * Draw every chosen part onto one grid, back to front.
 *
 * Later parts overwrite earlier ones cell by cell, which is exactly how layers work on a pixel
 * canvas -- and why hair carries its own outline: it is not drawn over the head, it replaces
 * the cells it covers.
 */
export function stamp(character: Character): string[][] {
  const grid = blank();
  const parts = character.parts;
  const head = makeHead(character);
  const shaded = character.shading !== false;
  const size = (key: 'eyes' | 'brows' | 'nose' | 'mouth'): number => character.sizes?.[key] ?? 1;

  if (parts.outfit) drawOutfit(grid, head, parts.outfit, shaded);
  if (parts.ears) drawEars(grid, head, parts.ears);
  drawHead(grid, head, shaded);
  if (parts.beard) drawBeard(grid, head, parts.beard);
  if (parts.cheeks && CHEEKS[parts.cheeks])
    pair(grid, CHEEKS[parts.cheeks] as Rows, head.eye + 2, 3);
  if (parts.mark && MARKS[parts.mark])
    stampRows(grid, MARKS[parts.mark] as Rows, CX + 3, head.eye + 3);
  if (parts.hair) drawHair(grid, head, parts.hair, character);

  if (parts.brows && BROWS[parts.brows]) {
    const rows = scaleRows(BROWS[parts.brows] as Rows, size('brows'));
    pair(grid, rows, head.brow - rows.length + 1, 2);
  }
  if (parts.eyes && EYES[parts.eyes]) {
    const rows = scaleRows(EYES[parts.eyes] as Rows, size('eyes'));
    const right = parts.eyes === 'wink' ? scaleRows(EYES.happy as Rows, size('eyes')) : undefined;
    const row = head.eye - Math.floor((rows.length - 1) / 2);
    pair(grid, rows, row, 2, right);
  }
  if (parts.nose && NOSES[parts.nose]) {
    const rows = scaleRows(NOSES[parts.nose] as Rows, size('nose'));
    centred(grid, rows, head.nose + 1 - rows.length + 1);
  }
  if (parts.mouth && MOUTHS[parts.mouth]) {
    const rows = scaleRows(MOUTHS[parts.mouth] as Rows, size('mouth'));
    centred(grid, rows, head.mouth - Math.floor((rows.length - 1) / 2));
  }
  if (parts.glasses) drawGlasses(grid, head, parts.glasses);
  if (parts.earring && EARRINGS[parts.earring]) {
    const rows = EARRINGS[parts.earring] as Rows;
    const h = head.half(head.eye);
    stampRows(grid, rows, CX - h - 2, head.eye + 2);
    stampRows(grid, mirror(rows), CX + h + 1 - (rows[0]?.length ?? 1) + 1, head.eye + 2);
  }
  if (parts.headwear) drawHat(grid, head, parts.headwear);
  return grid;
}
