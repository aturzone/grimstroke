import { describe, expect, it } from 'vitest';
import { board } from '~/draw/doc/board/build.ts';
import { DEFAULT_FACE, ORDER, REQUIRED } from '~/draw/material/face/model.ts';
import { CATALOGUE } from '~/draw/material/face/parts.ts';
import { renderFace } from '~/draw/material/face/render.ts';

describe('a character', () => {
  it('is pure: drawing it twice gives the same bytes', () => {
    const make = (): string => renderFace({ ...DEFAULT_FACE, id: 'same' });
    expect(make()).toBe(make());
  });

  it('paints the hair ON the head, not under it', () => {
    /*
     * Drawn underneath -- which is where it started -- the head covered all of it and the
     * only hair anybody could see was the few pixels of rim sticking past the skull. Every
     * style from a buzz cut to long hair came out as the same thin dark band.
     */
    expect(ORDER.indexOf('hair')).toBeGreaterThan(ORDER.indexOf('shape'));
    // And the ears stay behind it, so the face covers where an ear meets it.
    expect(ORDER.indexOf('ears')).toBeLessThan(ORDER.indexOf('shape'));
  });

  it('clips what is painted on the face to the head it actually has', () => {
    // Stubble drawn to the jawline of a wide head hangs off the chin of a narrow one.
    const html = renderFace({
      id: 'x',
      parts: { ...DEFAULT_FACE.parts, shape: 'long', beard: 'stubble', cheeks: 'blush' },
    });
    expect(html).toContain('<clipPath id="fc-head-x">');
    // The stubble, the blush, the shaded side and the hair's shadow on the forehead -- all
    // four are paint on the face.
    expect(html.match(/clip-path="url\(#fc-head-x\)"/g)?.length).toBe(4);
  });

  it('never draws a face with no eyes', () => {
    // Every required slot falls back to the default rather than being left out: a face with
    // no eyes is not a style, it is a face that failed to load.
    const html = renderFace({ id: 'x', parts: {} });
    for (const slot of REQUIRED) expect(html).toContain(`fc-${slot}`);
  });

  it('scales a feature about its own centre', () => {
    // Scaling the eyes from the middle of the face moves them apart as it enlarges them,
    // and a face whose eyes drift outwards as you tune them is a face nobody can tune.
    const html = renderFace({ id: 'x', parts: DEFAULT_FACE.parts, sizes: { eyes: 1.2 } });
    expect(html).toContain('translate(100 104) scale(1.200) translate(-100 -104)');
  });

  it('carries every part with it when it goes on a board', () => {
    // By value, not by a reference to a studio somewhere: a board with a face on it is
    // still a board with a face on it after it has been archived and opened elsewhere.
    const spec = board('b').place(
      { kind: 'face', character: { id: 'rio', parts: { ...DEFAULT_FACE.parts, hair: 'curls' } } },
      { at: [0, 0], size: [180] },
    ).spec;
    const json = JSON.parse(JSON.stringify(spec)) as typeof spec;
    const block = json.items[0]?.block;
    expect(block?.kind).toBe('face');
    expect(JSON.stringify(block)).toContain('curls');
    // And the board draws it with the same code that draws it anywhere else.
    const html = board('c')
      .place(
        { kind: 'face', character: { id: 'rio', parts: { ...DEFAULT_FACE.parts, hair: 'curls' } } },
        { at: [0, 0], size: [180] },
      )
      .render().html;
    expect(html).toContain('class="face-art"');
    expect(html).toContain('width="180"');
  });

  it('draws every part in the catalogue without throwing', () => {
    for (const [slot, parts] of Object.entries(CATALOGUE)) {
      for (const one of parts) {
        const html = renderFace({
          id: `${slot}-${one.id}`,
          parts: { ...DEFAULT_FACE.parts, [slot]: one.id },
        });
        expect(html, `${slot}/${one.id}`).toContain(`fc-${slot}`);
        // Every path has to close or carry a command; an empty d is a part that is simply
        // absent while appearing to be present.
        expect(html, `${slot}/${one.id}`).not.toContain('d=""');
      }
    }
  });
});

describe('art styles', () => {
  it('draws the same character either way', async () => {
    const { PIXEL_W } = await import('~/draw/material/face/pixels.ts');
    const who = { id: 'x', parts: { ...DEFAULT_FACE.parts, hair: 'crop' } };
    const ink = renderFace(who);
    const pixel = renderFace({ ...who, style: 'pixel' });
    expect(ink).toContain('viewBox="0 0 200 220"');
    expect(pixel).toContain(`viewBox="0 0 ${PIXEL_W} 36"`);
    // Pixel art that is allowed to antialias is not pixel art.
    expect(pixel).toContain('shape-rendering="crispEdges"');
    expect(pixel).toContain('class="px px-S"');
  });

  it('shades the drawn style from the head it actually has', () => {
    // The shadow is the head's own outline masked by a copy of itself shifted up and left,
    // so every head shape produces its own correct crescent and a new one costs no artwork.
    const html = renderFace({ id: 'x', parts: { ...DEFAULT_FACE.parts, shape: 'heart' } });
    expect(html).toContain('mask id="fc-head-x-lit"');
    expect(html).toContain('class="fc-shade"');
    expect(renderFace({ id: 'x', parts: DEFAULT_FACE.parts, shading: false })).not.toContain(
      'fc-shade',
    );
  });

  it('merges runs of identical cells into one rectangle', () => {
    // A 32x36 grid is 1152 cells. Emitting one rect each is a shelf of forty characters
    // costing forty-six thousand elements.
    const pixel = renderFace({ id: 'x', style: 'pixel', parts: DEFAULT_FACE.parts });
    const rects = pixel.match(/<rect/g)?.length ?? 0;
    expect(rects).toBeGreaterThan(20);
    expect(rects).toBeLessThan(400);
  });

  it('offers every drawn part in pixels too, and every one changes the picture', async () => {
    // A choice the studio shows that does nothing in one style is a choice that lies. Twenty
    // parts once did exactly that in pixel style, silently.
    const { PIXEL_PARTS, stamp } = await import('~/draw/material/face/pixels.ts');
    for (const [slot, parts] of Object.entries(CATALOGUE)) {
      const offered = PIXEL_PARTS[slot as keyof typeof PIXEL_PARTS] ?? [];
      for (const one of parts) {
        expect(offered, `${slot}/${one.id}`).toContain(one.id);
        const base = {
          id: 'p',
          style: 'pixel' as const,
          parts: { ...DEFAULT_FACE.parts, [slot]: undefined },
        };
        const without = JSON.stringify(stamp(base));
        const withIt = JSON.stringify(stamp({ ...base, parts: { ...base.parts, [slot]: one.id } }));
        if (slot !== 'shape') expect(withIt, `${slot}/${one.id}`).not.toBe(without);
      }
    }
  });

  it('sizes a pixel face too', async () => {
    // The sliders did nothing in pixel style: a sprite has one size.
    const { stamp } = await import('~/draw/material/face/pixels.ts');
    const at = (sizes: object): string =>
      JSON.stringify(stamp({ id: 'p', parts: DEFAULT_FACE.parts, sizes }));
    for (const key of ['head', 'eyes', 'mouth', 'hair']) {
      expect(at({ [key]: 1.34 }), key).not.toBe(at({}));
    }
  });

  it('keeps the pixel face in the middle of its grid', async () => {
    const { stamp, PIXEL_W } = await import('~/draw/material/face/pixels.ts');
    for (const shape of ['round', 'square', 'long', 'heart', 'jaw']) {
      const grid = stamp({
        id: 'p',
        parts: { shape, eyes: 'open', nose: 'button', mouth: 'smile' },
      });
      const row = grid[14] as string[];
      const first = row.findIndex((c) => c !== '.');
      const last = PIXEL_W - 1 - [...row].reverse().findIndex((c) => c !== '.');
      expect(first + last, shape).toBe(PIXEL_W - 1);
    }
  });
});
