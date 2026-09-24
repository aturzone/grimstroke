import { describe, expect, it } from 'vitest';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import {
  dropInto,
  heightOf,
  LEAN,
  layOut,
  readLayout,
  SHELF_WIDTH,
  settle,
  spineOf,
} from '~/draw/doc/shelf/model.ts';
import { renderShelf } from '~/draw/doc/shelf/render.ts';

function book(id: string, extra: Partial<BookSpec> = {}): BookSpec {
  return { id, title: id, minLeaves: 40, leaves: [{ id: 'l1', items: [] }], ...extra };
}

const three = [book('a'), book('b'), book('c')];

describe('the bookcase', () => {
  it('stands books side by side from the wall, and leans the last one back', () => {
    const [row] = layOut([[{ id: 'a' }, { id: 'b' }, { id: 'c' }]], three);
    const [a, b, c] = row?.books ?? [];
    expect(a?.x).toBe(0);
    expect(b?.x).toBe((a?.x ?? 0) + (a?.w ?? 0));
    // The last has nothing beside it, so it leans on its neighbour -- its foot a little out.
    expect(c?.lean).toBe(-LEAN);
    expect(c?.x ?? 0).toBeGreaterThan((b?.x ?? 0) + (b?.w ?? 0));
    expect(a?.lean).toBe(0);
  });

  it('stands a lone book straight against the wall', () => {
    const [row] = layOut([[{ id: 'a' }]], three);
    expect(row?.books[0]).toMatchObject({ x: 0, lean: 0, flat: false });
  });

  it('lays a book flat where nothing holds it up, and piles books put on the same spot', () => {
    const [row] = layOut([[{ id: 'a' }, { id: 'b', flat: 600 }, { id: 'c', flat: 610 }]], three);
    const b = row?.books.find((x) => x.id === 'b');
    const c = row?.books.find((x) => x.id === 'c');
    expect(b).toMatchObject({ flat: true, y: 0, x: 600 });
    expect(c?.flat).toBe(true);
    expect(c?.y).toBe(b?.w);
  });

  it('carries a run longer than the shelf onto the next one', () => {
    const many = Array.from({ length: 60 }, (_, i) => book(`b${i}`));
    const rows = layOut([many.map((b) => ({ id: b.id }))], many);
    expect(rows.length).toBeGreaterThan(2);
    for (const row of rows) {
      for (const b of row.books) expect(b.x + b.w).toBeLessThanOrEqual(SHELF_WIDTH + 60);
    }
    expect(rows.flatMap((r) => r.books).length).toBe(60);
  });

  it('always leaves an empty shelf at the bottom to put things on', () => {
    const rows = layOut([[{ id: 'a' }], [{ id: 'b' }], [{ id: 'c' }]], three);
    expect(rows[rows.length - 1]?.books).toEqual([]);
  });

  it('puts every notebook somewhere exactly once, forgetting the ones that are gone', () => {
    const rows = settle({ rows: [[{ id: 'gone' }, { id: 'b' }], [{ id: 'b' }]] }, three);
    const ids = rows.flat().map((s) => s.id);
    expect(ids.sort()).toEqual(['a', 'b', 'c']);
  });

  it('joins a run when dropped near it, and falls flat when dropped out along the shelf', () => {
    const rows = [[{ id: 'a' }, { id: 'b' }]];
    const beside = dropInto(rows, three, ['c'], 0, 5);
    expect(beside[0]?.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    const far = dropInto(rows, three, ['c'], 0, 800);
    const c = far[0]?.find((s) => s.id === 'c');
    expect(c?.flat).toBe(Math.round(800 - heightOf(book('c')) / 2));
    const below = dropInto(rows, three, ['a'], 1, 0);
    expect(below.map((r) => r.map((s) => s.id))).toEqual([['b'], ['a']]);
  });

  it('reads a settings file somebody edited by hand without falling over', () => {
    expect(readLayout(undefined)).toEqual({ rows: [] });
    expect(
      readLayout({ rows: [[{ id: 'a' }, { nope: 1 }, { id: 'b', flat: 'x' }], 'no'] }),
    ).toEqual({
      rows: [[{ id: 'a' }, { id: 'b' }], []],
    });
  });

  it('is fatter for a fuller notebook', () => {
    expect(spineOf(book('a', { minLeaves: 120 }))).toBeGreaterThan(
      spineOf(book('a', { minLeaves: 10 })),
    );
  });

  it('draws the notebooks in use and the archive on their own bookcases', () => {
    const html = renderShelf([
      book('open', { title: 'Open one' }),
      book('done', { title: 'Done one', archived: true }),
    ]).html;
    expect(html).toContain('IN USE');
    expect(html).toContain('ARCHIVE');
    expect(html.indexOf('Open one')).toBeLessThan(html.indexOf('Done one'));
    expect(html).toContain('data-archived');
  });
});
