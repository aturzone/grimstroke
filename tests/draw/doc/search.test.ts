import { describe, expect, it } from 'vitest';
import { fold, search } from '~/draw/doc/search.ts';

const docs = {
  boards: [
    {
      id: 'work',
      title: 'Wallet audit',
      items: [
        {
          id: 'n1',
          at: [0, 0] as [number, number],
          block: {
            kind: 'note' as const,
            title: 'masking',
            text: 'The account number is never masked.',
          },
        },
        {
          id: 'p1',
          at: [0, 0] as [number, number],
          block: { kind: 'text' as const, text: 'دکمهٔ ورود کار نمی‌کند' },
        },
        { id: 'i1', at: [0, 0] as [number, number], ink: { d: 'M0 0' } },
      ],
    },
  ],
  books: [
    {
      id: 'old',
      title: 'Last quarter',
      archived: true,
      leaves: [{ id: 'l1', blocks: [{ kind: 'bullets' as const, items: ['contrast is 1.02:1'] }] }],
    },
    { id: 'now', title: 'Sprint', cover: { title: 'Sprint 14' }, leaves: [] },
  ],
  faces: [{ id: 'rio', name: 'Rio', role: 'design lead', parts: {} }],
};

describe('search', () => {
  it('finds an item on a board and says where it is', () => {
    const [hit] = search(docs, 'masked');
    expect(hit?.kind).toBe('board');
    expect(hit?.href).toBe('/?board=work&focus=n1');
    expect(hit?.title).toBe('masking');
    expect(hit?.snippet.find((r) => r.mark)?.text).toBe('masked');
  });

  it('searches the archive like everything else, and says it is the archive', () => {
    const [hit] = search(docs, 'contrast');
    expect(hit?.kind).toBe('archive');
    expect(hit?.href).toBe('/book?id=old&leaf=0');
  });

  it('needs every word, not any of them', () => {
    expect(search(docs, 'account never')).toHaveLength(1);
    expect(search(docs, 'account sprint')).toHaveLength(0);
  });

  it('finds people by what they do', () => {
    const [hit] = search(docs, 'design');
    expect(hit?.kind).toBe('person');
    expect(hit?.href).toBe('/profile?id=rio');
  });

  it('finds Persian typed on either keyboard, with or without the half-space', () => {
    // Arabic yeh and kaf in the query, Persian ones in the text; a space where the text has a
    // half-space.
    expect(search(docs, 'نمي كند')).toHaveLength(1);
    expect(search(docs, 'نمی کند')).toHaveLength(1);
    expect(search(docs, 'دکمه')).toHaveLength(1);
  });

  it('marks the words in the text as it was written, not as it was folded', () => {
    const [hit] = search(docs, 'نمي');
    const marked = hit?.snippet.find((r) => r.mark)?.text;
    expect(marked).toBe('نمی');
  });

  it('folds digits, case and accents', () => {
    expect(fold('Café ۱۴').folded).toBe('cafe 14');
  });

  it('returns nothing for nothing', () => {
    expect(search(docs, '   ')).toEqual([]);
  });
});
