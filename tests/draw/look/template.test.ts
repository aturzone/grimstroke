import { describe, expect, it } from 'vitest';
import { leafSize, PAGE_SIZES } from '~/draw/doc/book/model.ts';
import { renderSpread } from '~/draw/doc/book/render.ts';
import { templateLayer } from '~/draw/look/template.ts';

describe('page sizes and templates', () => {
  it('is A5 unless the notebook says otherwise', () => {
    expect(leafSize({})).toEqual(PAGE_SIZES.a5);
    expect(leafSize({ pageSize: 'index' })).toEqual([720, 432]);
  });

  it('draws a template to the page size, and nothing for none', () => {
    expect(templateLayer(undefined, 560, 790, '#000')).toBe('');
    const cornell = templateLayer('cornell', 560, 790, '#000');
    expect(cornell).toContain('width="560"');
    expect(cornell).toContain('SUMMARY');
    expect(templateLayer('kanban', 720, 432, '#000')).toContain('DOING');
  });

  it('prints a page with its own template, or else the book one', () => {
    const html = renderSpread({
      id: 't',
      template: 'kanban',
      pageSize: 'square',
      leaves: [
        { id: 'a', template: 'cornell', items: [] },
        { id: 'b', items: [] },
      ],
    }).html;
    expect(html).toContain('page-template-cornell');
    expect(html).toContain('page-template-kanban');
    expect(html).toContain('--leaf-width:640px');
  });
});
