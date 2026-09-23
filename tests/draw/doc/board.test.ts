import { describe, expect, it } from 'vitest';
import { board } from '~/draw/doc/board/build.ts';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import { extentOf, grownExtent, WORKSPACE_EDGE } from '~/draw/doc/board/render.ts';
import { UI } from '../../fixtures/index.ts';

/** The style attribute of the first placed item, which is where placement actually lives. */
function itemStyle(html: string): string {
  return /<div class="item"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? '';
}

describe('the board', () => {
  it('is pure: rendering twice gives the same bytes', () => {
    const make = () =>
      board('same')
        .note('hello', { at: [10, 10] })
        .render().html;
    expect(make()).toBe(make());
  });

  it('places an item where it was put, in board units', () => {
    const html = board('b', { extent: [0, 0, 800, 600] })
      .note('x', { at: [120, 240] }, {})
      .render().html;
    expect(html).toContain('left:120px');
    expect(html).toContain('top:240px');
  });

  it('accepts negative coordinates, because a plane has no corner', () => {
    const b = board('b').note('x', { at: [-500, -300], size: [200, 100] });
    const [x, y, w, h] = extentOf(b.spec);
    expect(x).toBeLessThan(-500);
    expect(y).toBeLessThan(-300);
    expect(w).toBeGreaterThan(200);
    expect(h).toBeGreaterThan(100);
    // The origin is subtracted, so the item lands inside the drawn rectangle.
    const html = b.render().html;
    expect(html).toContain('left:72px');
    expect(html).toContain('top:72px');
  });

  it('asks the exporter to measure rather than guessing a height', () => {
    // The height of a note is whatever its text turned out to need, and
    // nothing outside a browser knows that. An estimate that is low clips the
    // bottom off a note and the export looks like it was written that way.
    expect(
      board('b')
        .note('x', { at: [0, 0] })
        .render().autofit,
    ).toBe(true);
  });

  it('lets an item be as wide as its content when no width is given', () => {
    // A fixed default wrapped every heading onto a second line and then hid that line under
    // whatever was placed next.
    const html = board('b')
      .heading('A long title that would wrap', { at: [0, 0] })
      .render().html;
    expect(itemStyle(html)).toContain('width:max-content');
    const sized = board('c')
      .note('x', { at: [0, 0], size: [280] })
      .render().html;
    // Read off the ITEM's own style attribute. Searching the whole document matched the
    // stylesheet, which mentions max-content for exactly this rule.
    expect(itemStyle(sized)).toContain('width:280px');
    expect(itemStyle(sized)).not.toContain('max-content');
  });

  it('gives every item a handle an agent can address it by', () => {
    const html = board('b')
      .note('x', { at: [0, 0] }, {})
      .render().html;
    expect(html).toMatch(/data-gs="item" data-gs-id="[^"]+"/);
    expect(html).toContain('data-gs="board"');
  });

  it('draws ink as a path, never as an image', () => {
    // A stroke is a path so it stays a hairline at any zoom and in a printed
    // PDF. That is the whole reason the board is DOM and SVG, not a canvas.
    const html = board('b')
      .ink({ d: 'M0,0 C10,10 20,-10 30,0', colour: '#1f3fd0', tool: 'marker' }, { at: [5, 6] })
      .render().html;
    expect(html).toContain('<path d="M0,0 C10,10 20,-10 30,0"');
    expect(html).toContain('tool-marker');
    expect(html).toContain('--stroke:#1f3fd0');
  });

  it('renders the same materials a page does', () => {
    // An item is a Block. A sticky note on a board is the sticky note on a
    // page, so improving one improves both.
    const html = board('b', { palette: 'studio' })
      .note('stuck', { at: [0, 0] }, { title: 'measured' })
      .label('shipped', { at: [0, 200] })
      .image(UI, { at: [0, 300], size: [400] }, { frame: 'polaroid', caption: 'cap' })
      .render().html;
    expect(html).toContain('class="note"');
    expect(html).toContain('class="label block written"');
    expect(html).toContain('mat mat-polaroid');
  });

  it('round trips through plain JSON', () => {
    const b = board('b', { palette: 'studio' }).note('x', { at: [4, 5] }, {});
    const again = JSON.parse(JSON.stringify(b));
    expect(again.items[0].at).toEqual([4, 5]);
    expect(again.palette).toBe('studio');
  });
});

describe('a sheet that grows', () => {
  const note = (id: string, at: [number, number]) => ({
    id,
    at,
    size: [200, 200] as [number, number],
    block: { kind: 'note' as const, text: id },
  });
  const spec = (items: BoardSpec['items']): BoardSpec => ({
    id: 'b',
    extent: [-900, -900, 2800, 2400],
    items,
  });

  it('stays as it is while everything fits', () => {
    expect(grownExtent(spec([note('a', [0, 0])]))).toBeUndefined();
  });

  it('grows right without moving the origin', () => {
    const grown = grownExtent(spec([note('a', [0, 0]), note('b', [1800, 0])]));
    expect(grown?.[0]).toBe(-900);
    expect(grown?.[1]).toBe(-900);
    expect((grown?.[0] ?? 0) + (grown?.[2] ?? 0)).toBeGreaterThan(1800 + 200 + WORKSPACE_EDGE);
  });

  it('moves the origin when it grows left', () => {
    const grown = grownExtent(spec([note('a', [-800, 0])]));
    expect(grown?.[0]).toBeLessThan(-900);
  });
});
