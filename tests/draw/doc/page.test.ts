import { describe, expect, it } from 'vitest';
import { notebook, page } from '~/draw/doc/page/build.ts';
import { renderPage } from '~/draw/doc/page/render.ts';
import { DEVICE } from '../../fixtures/index.ts';

function html(build: (p: ReturnType<typeof page>) => void, id = 'p'): string {
  const p = page(id);
  build(p);
  return p.render().html;
}

describe('the page, as a document', () => {
  it('is pure: rendering twice gives the same bytes', () => {
    const build = () => page('same').title('Hello').text('World').render().html;
    expect(build()).toBe(build());
  });

  it('carries the direction and the script on the root element', () => {
    const rtl = page('r', { direction: 'rtl' }).text('\u0633\u0644\u0627\u0645').render().html;
    expect(rtl).toContain('dir="rtl"');
    expect(rtl).toContain('data-script="arabic"');
    const ltr = page('l').text('hello').render().html;
    expect(ltr).toContain('dir="ltr"');
    expect(ltr).toContain('data-script="latin"');
  });

  it('turns uppercase labelling off for a script without case', () => {
    expect(page('a', { direction: 'rtl' }).text('x').render().html).toContain(
      'data-uppercase="off"',
    );
    expect(page('b').text('x').render().html).toContain('data-uppercase="on"');
  });

  it('keeps the plate an LTR island in a right-to-left page', () => {
    // Image space has no reading direction. Positioning marks logically sent
    // every box to the far side of the picture.
    const out = page('rtl-plate', { direction: 'rtl' })
      .image(DEVICE, { marks: [{ rect: 'pct:10,20,30,10' }] })
      .render().html;
    expect(out).toMatch(/\.plate \{[^}]*direction: ltr/);
    const marks = out.match(/class="mark box" style="([^"]+)"/g) ?? [];
    expect(marks).toHaveLength(1);
    expect(marks[0]).toContain('left:');
    expect(marks[0]).not.toContain('inset-inline');
  });

  it('keeps every texture layer below the plate', () => {
    // A page must not alter the picture it is showing. Both texture layers --
    // halftone on ::after, paper grain on ::before -- have to stay under it,
    // and the assertion is written against the z-index each rule sets rather
    // than against the selector list, which grows every time a new surface
    // needs to sit above the texture.
    const out = page('t', { grain: true }).image(DEVICE).render().html;
    for (const pseudo of ['.sheet::after', '.sheet::before']) {
      const rule = out.slice(out.indexOf(pseudo), out.indexOf(pseudo) + 400);
      expect(rule, pseudo).toContain('z-index: 0');
    }
    const above = /^([^{]*)\{[^}]*z-index: 1/m.exec(out.slice(out.indexOf('.plate, ')));
    expect(above?.[1]).toContain('.plate');
  });

  it('shrink-wraps the plate around its image', () => {
    // As a block it stretched to the grid cell and marks then pointed past the
    // picture into empty paper.
    const out = page('w').image(DEVICE).render().html;
    expect(out.slice(out.indexOf('.plate {'), out.indexOf('.plate {') + 400)).toContain(
      'width: fit-content',
    );
  });

  it('puts the sheet shadow on a sibling, never a negative-z-index pseudo', () => {
    // Inside a stacking context the element's own background paints first, so a ::before
    // shadow covered the sheet and every page rendered ink on ink.
    //
    // Scoped to the sheet's own rule. A blanket search for a negative z-index anywhere in the
    // stylesheet was a proxy, and it started failing the moment the real note arrived -- its
    // paper layer sits at -2 inside a face that isolates, which is correct and is not this.
    const out = page('s').text('x').render().html;
    expect(out).toContain('<div class="shadow"></div>');
    const rule = out.slice(out.indexOf('.mount > .shadow'), out.indexOf('.mount > .shadow') + 300);
    expect(rule).not.toContain('z-index');
    expect(out).not.toContain('.mount::before');
  });

  it('resolves marks against the real image size', () => {
    const out = page('m')
      .image(DEVICE, { marks: [{ rect: 'src:72,128,144,256', badge: '1' }] })
      .render().html;
    expect(out).toContain('left:10.000%;top:10.000%;width:20.000%;height:20.000%');
    expect(out).toContain('class="badge"');
  });

  it('never gives two callouts the same number', () => {
    // The implicit counter used to count notes, so an explicit badge '1' and
    // one unbadged note produced two callouts both labelled 1, pointing at
    // different things.
    const out = page('n')
      .image(DEVICE, {
        marks: [
          { rect: 'pct:10,10,20,20', badge: '1', note: 'explicitly one' },
          { rect: 'pct:40,10,20,20', note: 'implicitly numbered' },
          { rect: 'pct:70,10,20,20', note: 'and the next one' },
        ],
      })
      .render().html;
    const tags = [...out.matchAll(/<div class="callout-note"[^>]*><b>([^<]+)<\/b>/g)].map(
      (m) => m[1],
    );
    expect(tags).toEqual(['1', '2', '3']);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('reports a bad mark instead of dropping it silently', () => {
    const rendered = page('bad')
      .image(DEVICE, { marks: [{ rect: '1,2,3,4' }] })
      .render();
    expect(rendered.warnings.join(' ')).toMatch(/not a rectangle/);
  });

  it('serves every asset it references and nothing else', () => {
    const rendered = page('a').image(DEVICE).render();
    const served = Object.keys(rendered.assets);
    for (const key of served) expect(rendered.html).toContain(key);
    expect(served.some((k) => k.startsWith('f/'))).toBe(true);
    expect(Object.values(rendered.assets)).toContain(DEVICE);
  });

  it('reuses one asset entry for an image used twice', () => {
    const rendered = page('twice')
      .compare([
        { src: DEVICE, caption: 'before' },
        { src: DEVICE, caption: 'after' },
      ])
      .render();
    const images = Object.keys(rendered.assets).filter((k) => k.startsWith('a/'));
    expect(images).toHaveLength(1);
  });

  it('lists comparison plates in logical order', () => {
    const out = html((p) =>
      p.compare([
        { src: DEVICE, caption: 'Build 101' },
        { src: DEVICE, caption: 'Build 102' },
      ]),
    );
    expect(out.indexOf('Build 101')).toBeLessThan(out.indexOf('Build 102'));
  });

  it('copies marks onto both halves of a comparison by default', () => {
    const out = html((p) =>
      p.compare([
        { src: DEVICE, caption: 'a', marks: [{ rect: 'pct:10,10,20,20' }] },
        { src: DEVICE, caption: 'b' },
      ]),
    );
    expect(out.match(/class="mark box"/g) ?? []).toHaveLength(2);
  });

  it('warns about a glyph no vendored face can draw', () => {
    // Tofu in something meant to be a record looks like a bug in the subject.
    const rendered = page('cjk').title('\u62a5\u544a missing').render();
    expect(rendered.warnings.join(' ')).toMatch(/U\+/);
  });

  it('never reflows a code block as prose', () => {
    const out = html((p) => p.code('line one\n   line two', 'app log'));
    expect(out).toContain('line one\n   line two');
    expect(out).toContain('APP LOG');
  });

  it('gives a sticky note its own palette without changing the page', () => {
    const out = html((p) => p.text('body').note('stuck on', { palette: 'postit' }));
    expect(out).toContain('--cn-paper:#ffe94a');
    expect(out).toContain('--paper:#f4f1e8'); // the default, Light
  });

  it('renders a note as real torn paper, not as a styled box', () => {
    // The note is the object this whole look is named after. It gets the tear stroked as a
    // keyline, the halftone pattern, the grain tile, tape across a corner, and a shadow that
    // is the SAME torn path -- a rectangle behind a torn shape peeks out at every tear.
    const out = html((p) => p.note('stuck on', { title: 'measured' }));
    expect(out).toContain('class="note"');
    expect(out).toContain('class="paper-fill"');
    expect(out).toContain('class="paper-halftone"');
    expect(out).toContain('class="tape-strip"');
    expect(out).toContain('class="curl-level"');
    const torn = /<path class="paper-fill" d="([^"]+)"/.exec(out)?.[1];
    const shadow = /<svg class="shadow"[^>]*><path d="([^"]+)"/.exec(out)?.[1];
    expect(torn).toBeDefined();
    expect(shadow).toBe(torn);
  });

  it('seeds the tear from the page id, so a page always looks like itself', () => {
    const a = page('alpha').text('x').render().html;
    const b = page('beta').text('x').render().html;
    const tear = (s: string) => /--torn:polygon\(([^)]+)\)/.exec(s)?.[1];
    expect(tear(a)).toBeDefined();
    expect(tear(a)).not.toBe(tear(b));
    expect(tear(page('alpha').text('x').render().html)).toBe(tear(a));
  });
});

describe('the notebook', () => {
  it('flows its defaults down to pages', () => {
    const book = notebook({ palette: 'carbon', direction: 'rtl' });
    book.page('one').text('x');
    const [rendered] = book.render();
    expect(rendered?.html).toContain('--paper:#1e1b17');
    expect(rendered?.html).toContain('dir="rtl"');
  });

  it('lets a page override them', () => {
    const book = notebook({ palette: 'carbon' });
    book.page('one', { palette: 'postit' }).text('x');
    expect(book.render()[0]?.html).toContain('--paper:#ffe94a');
  });

  it('round trips through plain JSON', () => {
    // The JSON shape IS the API, for any agent that can only write a file.
    const book = notebook({ palette: 'newsprint' });
    book.page('one').title('T').bullets('a', 'b');
    const again = JSON.parse(JSON.stringify(book));
    expect(again.pages[0].blocks).toEqual([{ kind: 'bullets', items: ['a', 'b'] }]);
    expect(renderPage(again.pages[0]).html).toContain('>a</li>');
  });

  it('gives each text block its own base direction', () => {
    // A page has one direction; the text on it may not. Without this an English
    // sentence in a right-to-left page gets its full stop moved to the far end.
    const out = page('mixed', { direction: 'rtl' }).text('An English sentence.').render().html;
    expect(out).toContain('<p class="block" dir="auto">');
  });
});

describe('served asset names', () => {
  it('names an asset after the file, not after its place in the document', async () => {
    const { surface, servedPath } = await import('~/draw/doc/surface.ts');
    const first = surface('doc', {});
    const a1 = servedPath('/tmp/one.png', first);
    const b1 = servedPath('/tmp/two.png', first);

    // The same two files in the other order, in a different document.
    const second = surface('other', {});
    const b2 = servedPath('/tmp/two.png', second);
    const a2 = servedPath('/tmp/one.png', second);

    /*
     * Sequence numbers meant `a/0.png` was whichever picture happened to be mentioned first.
     * Add a screenshot above an existing one and every URL below it shifted -- and since
     * these are served immutable for a year, the browser went on showing the picture it had
     * cached at that address. A pasted screenshot displayed the previous screenshot.
     */
    expect(a1).toBe(a2);
    expect(b1).toBe(b2);
    expect(a1).not.toBe(b1);
  });
});
