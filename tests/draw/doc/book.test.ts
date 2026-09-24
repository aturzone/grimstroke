import { describe, expect, it } from 'vitest';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { blankLeaf, boundLeaves, isFull, MAX_SPINE, spineWidth } from '~/draw/doc/book/model.ts';
import { renderSpread } from '~/draw/doc/book/render.ts';

const book = (over: Partial<BookSpec> = {}): BookSpec => ({
  id: 'b',
  palette: 'studio',
  leaves: [],
  ...over,
});

const written = (n: number): BookSpec['leaves'] =>
  Array.from({ length: n }, (_, i) => ({ id: `l${i}`, blocks: [{ kind: 'text', text: 'x' }] }));

describe('a notebook, as data', () => {
  it('pads out to its minimum with blanks, without storing them', () => {
    // Storing the blanks means every new notebook ships forty empty objects
    // that have to be kept in step whenever the minimum changes.
    const spec = book({ minLeaves: 12, leaves: written(3) });
    expect(spec.leaves).toHaveLength(3);
    expect(boundLeaves(spec)).toHaveLength(12);
    expect(boundLeaves(spec)[11]).toEqual(blankLeaf('blank-12'));
  });

  it('gets visibly fatter as it fills up', () => {
    // The whole reason to draw a shelf rather than a list of names.
    expect(spineWidth(book({ leaves: written(4) }))).toBeLessThan(
      spineWidth(book({ leaves: written(90) })),
    );
    expect(spineWidth(book({ leaves: written(4000) }))).toBe(MAX_SPINE);
  });

  it('counts a minimum it has not reached towards its thickness', () => {
    // A forty-leaf notebook is forty leaves thick on the day you buy it.
    expect(spineWidth(book({ minLeaves: 90, leaves: [] }))).toBe(
      spineWidth(book({ leaves: written(90) })),
    );
  });

  it('knows when it is full, and an empty book is not full', () => {
    expect(isFull(book({ leaves: [] }))).toBe(false);
    expect(isFull(book({ leaves: written(3) }))).toBe(true);
    expect(isFull(book({ leaves: [...written(2), { id: 'x', blocks: [] }] }))).toBe(false);
  });
});

describe('a notebook, as HTML', () => {
  it('is pure: rendering twice gives the same bytes', () => {
    const spec = book({ leaves: written(2) });
    expect(renderSpread(spec).html).toBe(renderSpread(spec).html);
  });

  it('opens at a spread of two leaves, and numbers them', () => {
    const html = renderSpread(book({ leaves: written(6) }), { leaf: 2 }).html;
    expect(html).toContain('data-gs-index="2"');
    expect(html).toContain('data-gs-index="3"');
    expect(html).toContain('>3</span>');
    expect(html).toContain('>4</span>');
  });

  it('clamps a leaf number nobody has, rather than rendering nothing', () => {
    const html = renderSpread(book({ leaves: written(2) }), { leaf: 99 }).html;
    expect(html).toContain('data-gs-index="1"');
  });

  it('gives a blank leaf a number too, because a blank page is still a place', () => {
    const html = renderSpread(book({ minLeaves: 4, leaves: written(1) }), { leaf: 2 }).html;
    expect(html).toContain('data-gs-index="2"');
    expect(html).toContain('leaf-verso');
  });

  it('renders the same materials a page does', () => {
    const html = renderSpread(
      book({ leaves: [{ id: 'a', blocks: [{ kind: 'note', text: 'stuck' }] }] }),
    ).html;
    expect(html).toContain('class="note"');
  });

  it('puts a sticker on the cover in percent, so it holds at any size', () => {
    // Pixels would move every sticker when the cover is drawn at another size.
    const html = renderSpread(
      book({
        cover: {
          colour: '#1f3fd0',
          stickers: [{ id: 's', kind: 'label', at: [70, 74], width: 40, text: 'live' }],
        },
      }),
      { closed: true },
    ).html;
    expect(html).toContain('left:70%');
    expect(html).toContain('top:74%');
    expect(html).toContain('--sticker-width:40%');
  });
});
