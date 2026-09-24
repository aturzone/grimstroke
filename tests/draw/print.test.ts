/**
 * A notebook printed whole: the cover, the contents found from the pages, and no trailing
 * blank pages.
 */

import { describe, expect, it } from 'vitest';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import { contentsOf, printedLeaves, renderPrint } from '~/draw/doc/book/print.ts';

const book: BookSpec = {
  id: 'p',
  title: 'Printed',
  minLeaves: 12,
  leaves: [
    {
      id: 'a',
      items: [
        { id: 't', at: [40, 200], size: [480], block: { kind: 'text', text: 'Below the heading' } },
        { id: 'h', at: [40, 44], size: [480], block: { kind: 'heading', text: 'First things' } },
      ],
    },
    { id: 'b' },
    {
      id: 'c',
      items: [
        {
          id: 's',
          at: [40, 44],
          size: [480],
          block: {
            kind: 'stack',
            blocks: [
              { kind: 'text', text: 'lead' },
              { kind: 'heading', text: 'Inside a stack' },
            ],
          },
        },
      ],
    },
    {
      id: 'd',
      items: [
        { id: 'x', at: [40, 44], size: [480], block: { kind: 'text', text: 'only words here' } },
      ],
    },
  ],
};

describe('printing a notebook', () => {
  it('stops at the last written page and keeps the blank ones between', () => {
    expect(printedLeaves(book).map((l) => l.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('finds each page by its topmost heading, in a stack too, or by its words', () => {
    expect(contentsOf(book)).toEqual([
      { page: 1, title: 'First things', from: 'heading' },
      { page: 3, title: 'Inside a stack', from: 'heading' },
      { page: 4, title: 'only words here', from: 'text' },
    ]);
  });

  it('prints the cover, the contents and every page at the page size', () => {
    const { html } = renderPrint(book);
    expect(html).toContain('@page { size: 560px 790px; margin: 0; }');
    expect(html.match(/class="print-sheet/g)?.length).toBe(6);
    expect(html).toContain('print-cover');
    expect(html).toContain('First things');
  });
});
