import { describe, expect, it } from 'vitest';
import { FRAMES, frame } from '~/draw/look/frame.ts';
import { grain, grainPixels } from '~/draw/look/grain.ts';
import { PAPERS, ruling } from '~/draw/look/grid.ts';
import {
  handArrow,
  handEllipse,
  handLine,
  handSwipe,
  raggedBand,
  smooth,
} from '~/draw/look/hand.ts';

describe('paper grain', () => {
  it('is the same tile every time, so a sheet does not shimmer on reload', () => {
    expect(grain()).toBe(grain());
    expect(grainPixels(32, 'a')).toEqual(grainPixels(32, 'a'));
    expect(grainPixels(32, 'a')).not.toEqual(grainPixels(32, 'b'));
  });

  it('is mostly transparent: a speck field, not a grey wash', () => {
    // A uniform noise reads as television static. The fine threshold picks out sparse specks
    // and the cubed coarse term gives them a field to sit in.
    const px = grainPixels(128);
    let total = 0;
    let specks = 0;
    for (let i = 0; i < 128 * 128; i += 1) {
      const a = px[i * 4 + 3] as number;
      total += a;
      if (a > 20) specks += 1;
    }
    const meanAlpha = total / (128 * 128);
    expect(meanAlpha).toBeGreaterThan(2);
    expect(meanAlpha).toBeLessThan(20);
    expect(specks / (128 * 128)).toBeLessThan(0.25);
  });

  it('has light flecks as well as dark specks', () => {
    // All-dark specks read as dirt on the lens rather than as fibre in the paper.
    const px = grainPixels(128);
    let light = 0;
    for (let i = 0; i < 128 * 128; i += 1) if (px[i * 4] === 255) light += 1;
    expect(light).toBeGreaterThan(0);
  });

  it('bakes to a data URI a stylesheet can use directly', () => {
    const url = grain();
    expect(url.startsWith('url("data:image/png;base64,')).toBe(true);
    expect(url.endsWith('")')).toBe(true);
  });
});

describe('ruled paper', () => {
  it('never puts color-mix inside a gradient stop', () => {
    // color-mix() in a gradient stop does not render in Firefox: the whole
    // layer silently draws nothing, so the ruling was simply absent on a page
    // that reported no warning and looked like blank paper. Ordinary
    // properties are fine and the stylesheet uses it freely; stops are not.
    for (const kind of PAPERS) {
      expect(ruling(kind, { colour: '#181613' }).image, kind).not.toContain('color-mix');
    }
  });

  it('draws nothing for blank paper', () => {
    expect(ruling('blank')).toEqual({ image: '', size: '', period: 0, coarse: 0 });
  });

  it('gives graph paper a coarse rhythm over the fine one', () => {
    const drawn = ruling('graph', { colour: '#000000', period: 10 });
    // The periods live in background-size now, not baked into a repeating gradient, so the
    // app can step them as the camera moves. A fixed period is eight screen pixels at 30%
    // zoom carrying a third-of-a-pixel line, which the rasteriser turns into moire.
    expect(drawn.size).toContain('50px');
    expect(drawn.size).toContain('10px');
    // Four layers: coarse in both axes over fine in both axes.
    expect(drawn.image.split('linear-gradient').length - 1).toBe(4);
  });

  it('leaves the ruling period and thickness open for the camera to set', () => {
    for (const kind of ['ruled', 'squared', 'graph'] as const) {
      const drawn = ruling(kind, { colour: '#181613' });
      expect(drawn.image, kind).toContain('var(--rule-w');
      expect(drawn.size, kind).toContain('var(--rule-p');
    }
  });

  it('resolves the ink to literal rgba', () => {
    expect(ruling('ruled', { colour: '#181613' }).image).toContain('rgba(24,22,19,');
  });
});

describe('marks made by a hand', () => {
  it('is seeded', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 40 };
    expect(handLine(a, b, 's')).toBe(handLine(a, b, 's'));
    expect(handLine(a, b, 's')).not.toBe(handLine(a, b, 't'));
  });

  it('curves rather than joining the samples with straight segments', () => {
    // A polyline reads as a shaky machine, not as a hand: the give-away is
    // that the wobble has corners in it.
    const d = handLine({ x: 0, y: 0 }, { x: 200, y: 0 }, 's');
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('C');
    expect(d).not.toContain('L');
  });

  it('goes round a circle twice', () => {
    // SVG cannot vary stroke width along a path, so one pass is a perfectly
    // even line whatever is done to its shape -- and reads as an <ellipse>.
    const two = handEllipse(50, 50, 40, 30, 's');
    const one = handEllipse(50, 50, 40, 30, 's', { passes: 1 });
    expect((two.match(/M/g) ?? []).length).toBe(2);
    expect((one.match(/M/g) ?? []).length).toBe(1);
  });

  it('never closes a drawn circle exactly', () => {
    const d = handEllipse(50, 50, 40, 30, 's', { passes: 1 });
    expect(d).not.toContain('Z');
  });

  it('gives an arrow a head of two strokes and a shaft that bows', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 400, y: 0 };
    const arrow = handArrow(a, b, 's');
    expect(arrow.head).toHaveLength(2);
    expect(arrow.head[0]).not.toBe(arrow.head[1]);
    // A bow of a few pixels on a 400px shaft is a straight line with an
    // artefact at one end, so the curve is a fraction of the length.
    const ys = [...arrow.shaft.matchAll(/[-\d.]+,([-\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys.map(Math.abs))).toBeGreaterThan(30);
  });

  it('closes a highlighter swipe, because it is a fill and not a stroke', () => {
    const d = handSwipe(0, 0, 200, 24, 's');
    expect(d.endsWith('Z')).toBe(true);
  });

  it('returns a label band as a percentage polygon, so it stretches', () => {
    const band = raggedBand('s');
    expect(band.startsWith('polygon(')).toBe(true);
    expect(band).toContain('%');
    expect(raggedBand('s')).toBe(band);
  });

  it('refuses to smooth fewer than two points', () => {
    expect(smooth([{ x: 1, y: 1 }])).toBe('');
  });
});

describe('picture frames', () => {
  it('is seeded', () => {
    for (const kind of FRAMES) {
      expect(frame(kind, 'seed'), kind).toEqual(frame(kind, 'seed'));
    }
  });

  it('leans enough to be seen, or not at all', () => {
    // gauss() clusters hard around zero: a 2.6 degree cap produced leans of
    // 0.09 and -0.15, which is a photograph that looks accidentally crooked
    // rather than deliberately placed.
    for (let i = 0; i < 24; i += 1) {
      const rotation = Math.abs(frame('polaroid', `p${i}`).rotation);
      expect(rotation).toBeGreaterThan(1.2);
      expect(rotation).toBeLessThanOrEqual(2.6);
    }
    expect(frame('polaroid', 'p', { tilt: 0 }).rotation).toBe(0);
  });

  it('never tilts or clips the two frames that are not a mount', () => {
    for (const kind of ['none', 'keyline'] as const) {
      const f = frame(kind, 's');
      expect(f.rotation, kind).toBe(0);
      expect(f.clipPath, kind).toBe('');
      expect(f.mat, kind).toEqual([0, 0, 0, 0]);
    }
  });

  it('gives a polaroid a bottom mat several times its sides', () => {
    const [top, right, bottom, left] = frame('polaroid', 's').mat;
    expect(bottom).toBeGreaterThan(right * 3);
    expect(top).toBe(right);
    expect(left).toBe(right);
    expect(frame('polaroid', 's').captionInside).toBe(true);
  });

  it('tapes opposite corners, never adjacent ones', () => {
    // Two strips along one edge look like a hinge, and the picture stops
    // reading as something stuck down flat.
    const tapes = frame('taped', 's').tapes;
    expect(tapes).toHaveLength(2);
    expect(Math.abs((tapes[0]?.x ?? 0) - (tapes[1]?.x ?? 0))).toBeGreaterThan(50);
    expect(Math.abs((tapes[0]?.y ?? 0) - (tapes[1]?.y ?? 0))).toBeGreaterThan(50);
  });

  it('tears the mount and never the picture', () => {
    expect(frame('torn', 's').clipPath).toContain('polygon(');
    expect(frame('torn', 's').paper).toBe(true);
  });
});
