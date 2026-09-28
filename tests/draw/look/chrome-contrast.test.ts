/**
 * The tools' inks, measured on every palette.
 *
 * The chrome's paper and inks are mixed from the palette in CSS (draw/doc/head.ts and
 * draw/chrome/css/kit.ts), so no one ever sees them as numbers. This works them out the way the
 * browser does and holds them to the floors: ink and the quiet "soft" ink are text, so AA; the
 * faint ink draws keylines and fields, so the 3:1 of a control's boundary is asked of the line
 * ink it sits beside, not of it.
 */
import { describe, expect, it } from 'vitest';
import { photoTint } from '~/draw/doc/head.ts';
import { boundLightness, contrast, mixOklab, textOn } from '~/draw/look/colour.ts';
import { BODY_FLOOR, CHIP_FLOOR, PALETTES } from '~/draw/look/palette.ts';

function chromeOf(p: (typeof PALETTES)[number]) {
  const tint = photoTint(p);
  const paper = mixOklab(tint.paperBase, 0.86, tint.paper);
  const ink = mixOklab(tint.inkBase, 0.86, tint.ink);
  return {
    paper,
    ink,
    line: mixOklab(ink, 0.88, paper),
    soft: mixOklab(ink, 0.58, paper),
    faint: mixOklab(ink, 0.22, paper),
  };
}

describe('the chrome on every palette', () => {
  it('mixes as CSS does', () => {
    expect(mixOklab('#000000', 1, '#ffffff')).toBe('#000000');
    expect(mixOklab('#000000', 0, '#ffffff')).toBe('#ffffff');
    expect(mixOklab('#ff0000', 0.5, '#ff0000')).toBe('#ff0000');
  });

  const table = PALETTES.map((p) => {
    const c = chromeOf(p);
    const chipText = textOn(p.accent, [p.paper, p.ink]);
    return {
      id: p.id,
      ink: contrast(c.ink, c.paper),
      line: contrast(c.line, c.paper),
      soft: contrast(c.soft, c.paper),
      hot: contrast(p.accent, chipText),
      // The / cards' and box's accent: the palette's, held at 0.42 lightness, as text on its
      // own pale tint (draw/shape/css.ts).
      brand: (() => {
        const [lo, hi] = photoTint(p).brand;
        const b = boundLightness(p.accent, lo, hi);
        return contrast(b, mixOklab(b, 0.12, c.paper));
      })(),
    };
  });

  it.each(table)('$id: ink, keyline and soft ink are readable on the photo paper', (row) => {
    expect(row.ink).toBeGreaterThanOrEqual(7);
    expect(row.line).toBeGreaterThanOrEqual(3);
    expect(row.soft).toBeGreaterThanOrEqual(BODY_FLOOR);
    expect(row.hot).toBeGreaterThanOrEqual(CHIP_FLOOR);
    expect(row.brand).toBeGreaterThanOrEqual(BODY_FLOOR);
  });
});
