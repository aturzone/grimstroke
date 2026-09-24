/**
 * The bookcase, as geometry.
 *
 * Where each notebook stands, which way it leans, and which ones lie flat -- worked out here,
 * purely, from the notebooks and the order somebody put them in. The server draws from this and
 * the app sends back only the order; neither guesses where a book ended up.
 *
 * Books stand spine out, touching, packed from the left-hand wall, which holds them up. The last
 * book of a run that does not fill its shelf has nothing on its right, so it leans back on its
 * neighbour, as a real one does. A book put down where nothing holds it up -- out along an empty
 * stretch of shelf -- tips over and lies flat, and books put down on the same spot pile up.
 */

import { type BookSpec, spineWidth } from '~/draw/doc/book/model.ts';
import { Rng } from '~/draw/look/rng.ts';

/** The inside width of a shelf, in the bookcase's own pixels. */
export const SHELF_WIDTH = 1040;
/** The clear height between one plank and the next. */
export const SHELF_CLEAR = 272;
/** How far a leaning book tips back. */
export const LEAN = 9;
/** Dropped within this of the end of a run, a book joins the run instead of falling. */
export const REACH = 26;

/** One place on a shelf, as it is saved: a notebook, and where it lies if it lies flat. */
export interface ShelfSlot {
  id: string;
  /** Lying flat, from this x along the shelf. Standing books have no x: they are packed. */
  flat?: number;
}

/**
 * The saved bookcase: the shelves of notebooks in use, top to bottom. The archive is its own
 * shelf and keeps no order but the notebooks' own.
 */
export interface ShelfLayout {
  rows: ShelfSlot[][];
}

/** One book, placed. */
export interface PlacedBook {
  id: string;
  /** Left edge on the shelf; for a leaning book, the corner it pivots on. */
  x: number;
  /** How far up from the plank: nothing, unless it lies on another book. */
  y: number;
  /** The spine's width, which is the book's thickness. */
  w: number;
  /** The book's height -- its length along the shelf when it lies flat. */
  h: number;
  lean: number;
  flat: boolean;
}

export interface PlacedRow {
  books: PlacedBook[];
  /** The x at which the standing run ends: the first free place on the shelf. */
  end: number;
}

/** A spine is the book's thickness, drawn a little fatter so its title can be read. */
export function spineOf(spec: BookSpec): number {
  return Math.round(spineWidth(spec) * 0.9) + 16;
}

/** A notebook's height: its own, from its id, so a shelf is not a row of identical boxes. */
export function heightOf(spec: BookSpec): number {
  const rng = new Rng(`${spec.id}:height`);
  return Math.round(206 + rng.next() * 40);
}

/** The saved layout, read defensively: it is a settings file somebody may have edited. */
export function readLayout(raw: unknown): ShelfLayout {
  const rows = (raw as { rows?: unknown } | undefined)?.rows;
  if (!Array.isArray(rows)) return { rows: [] };
  return {
    rows: rows.map((row) =>
      Array.isArray(row)
        ? row
            .filter((s): s is ShelfSlot => typeof (s as ShelfSlot)?.id === 'string')
            .map((s) => (typeof s.flat === 'number' ? { id: s.id, flat: s.flat } : { id: s.id }))
        : [],
    ),
  };
}

/**
 * Every notebook in use, on some shelf, exactly once.
 *
 * Notebooks the layout does not know -- new ones, or the first time the shelf is drawn -- go on
 * after the last one on the lowest shelf that has any; ones it names that are gone are dropped.
 */
export function settle(layout: ShelfLayout, books: readonly BookSpec[]): ShelfSlot[][] {
  const known = new Map(books.map((b) => [b.id, b]));
  const seen = new Set<string>();
  const rows = layout.rows.map((row) =>
    row.filter((slot) => {
      if (!known.has(slot.id) || seen.has(slot.id)) return false;
      seen.add(slot.id);
      return true;
    }),
  );
  const fresh = books.filter((b) => !seen.has(b.id)).map((b) => ({ id: b.id }));
  if (fresh.length) {
    let last = rows.length - 1;
    while (last > 0 && (rows[last]?.length ?? 0) === 0) last -= 1;
    if (last < 0) rows.push([]);
    rows[Math.max(0, last)]?.push(...fresh);
  }
  return rows;
}

/**
 * The shelves, laid out: what stands where, what leans, what lies flat, and which shelf a run
 * spills onto when it is longer than a shelf is wide. Always at least `min` shelves, and always
 * one empty shelf at the bottom to put something on.
 */
export function layOut(
  rows: readonly ShelfSlot[][],
  books: readonly BookSpec[],
  min = 3,
): PlacedRow[] {
  const byId = new Map(books.map((b) => [b.id, b]));
  const queue = rows.map((row) => [...row]);
  const out: PlacedRow[] = [];
  for (let r = 0; r < queue.length; r += 1) {
    const row = queue[r] ?? [];
    const standing = row.filter((s) => s.flat === undefined);
    const lying = row.filter((s) => s.flat !== undefined);
    const placed: PlacedBook[] = [];
    let x = 0;
    const spill: ShelfSlot[] = [];
    for (const slot of standing) {
      const spec = byId.get(slot.id);
      if (!spec) continue;
      const w = spineOf(spec);
      if (x + w > SHELF_WIDTH && placed.length > 0) {
        spill.push(slot);
        continue;
      }
      placed.push({ id: slot.id, x, y: 0, w, h: heightOf(spec), lean: 0, flat: false });
      x += w;
    }
    const end = x;
    // Lying books keep clear of the standing run and of the far wall, and pile where they meet.
    const flats: PlacedBook[] = [];
    for (const slot of lying) {
      const spec = byId.get(slot.id);
      if (!spec) continue;
      const w = spineOf(spec);
      const h = heightOf(spec);
      const at = Math.round(Math.min(SHELF_WIDTH - h, Math.max(end + 6, slot.flat ?? 0)));
      const under = flats.filter((f) => at < f.x + f.h && at + h > f.x);
      const y = under.reduce((top, f) => Math.max(top, f.y + f.w), 0);
      if (y + w > SHELF_CLEAR - 30) {
        spill.push({ id: slot.id });
        continue;
      }
      flats.push({ id: slot.id, x: at, y, w, h, lean: 0, flat: true });
    }
    // The last of a run with room beside it leans back on the one before.
    const last = placed[placed.length - 1];
    const prev = placed[placed.length - 2];
    const room = (flats.length ? Math.min(...flats.map((f) => f.x)) : SHELF_WIDTH) - end;
    if (last && prev && room > 24) {
      const t = (LEAN * Math.PI) / 180;
      const touch = Math.min(prev.h, last.h * Math.cos(t));
      last.x = Math.round(prev.x + prev.w + touch * Math.tan(t));
      last.lean = -LEAN;
    }
    out.push({ books: [...placed, ...flats], end });
    if (spill.length) {
      if (r + 1 >= queue.length) queue.push([]);
      queue[r + 1]?.unshift(...spill);
    }
  }
  while (out.length < min || (out[out.length - 1]?.books.length ?? 0) > 0) {
    out.push({ books: [], end: 0 });
  }
  return out;
}

/**
 * Where a book dropped at x on a shelf goes: into the run, at the place it was dropped among
 * the standing books, or -- out past the end of the run, where nothing holds it up -- flat.
 */
export function dropInto(
  rows: readonly ShelfSlot[][],
  books: readonly BookSpec[],
  ids: readonly string[],
  row: number,
  x: number,
): ShelfSlot[][] {
  const moving = new Set(ids);
  const next = rows.map((r) => r.filter((s) => !moving.has(s.id)));
  while (next.length <= row) next.push([]);
  const target = next[row] ?? [];
  const placed = layOut([target], books, 1)[0];
  const end = placed?.end ?? 0;
  const byId = new Map(books.map((b) => [b.id, b]));
  // Measured from the book's own near edge: one put down against the wall, or against the end of
  // the run, is held up, however thick it is.
  const first = byId.get(ids[0] ?? '');
  const near = x - (first ? spineOf(first) : 30) / 2;
  if (near > end + REACH) {
    // Nothing to lean on: over it goes, centred where it was let go. Several dropped together
    // fall in a pile.
    target.push(
      ...ids.map((id) => {
        const spec = byId.get(id);
        return { id, flat: Math.round(x - (spec ? heightOf(spec) : 220) / 2) };
      }),
    );
  } else {
    const standing = (placed?.books ?? []).filter((b) => !b.flat);
    const before = standing.filter((b) => b.x + b.w / 2 < x).length;
    const slots = target.filter((s) => s.flat === undefined);
    const next = slots[before];
    const index = next
      ? target.indexOf(next)
      : slots.length
        ? target.indexOf(slots[slots.length - 1] as ShelfSlot) + 1
        : 0;
    target.splice(index, 0, ...ids.map((id) => ({ id })));
  }
  next[row] = target;
  // Trailing empty shelves are not worth keeping; layOut adds the one to put things on.
  while (next.length && (next[next.length - 1]?.length ?? 0) === 0) next.pop();
  return next;
}
