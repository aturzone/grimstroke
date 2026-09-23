import { describe, expect, it } from 'vitest';
import { board } from '~/draw/doc/board/build.ts';
import { NOTE_HEIGHT, NOTE_WIDTH } from '~/draw/material/note/model.ts';
import { renderNote } from '~/draw/material/note/render.ts';

/** The style attribute of the first placed item, which is where placement actually lives. */
function itemStyle(html: string): string {
  return /<div class="item"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? '';
}

describe('a sticky note', () => {
  it('keeps its tape out of the mount rule', () => {
    // `.tape` is the class on a photo MOUNT's tape, which is an absolutely positioned svg
    // shifted by translate(-50%, -50%) to centre the strip on a corner. The note's tape is a
    // group inside the paper svg, in the paper's own coordinates -- and a percentage
    // transform on an SVG element resolves against the view box, so the shared class threw
    // every note's tape 120 units left and 85 up, off the note and onto the board beside it.
    const html = renderNote({ id: 'n', text: 'x' });
    expect(html).toContain('class="cn-tape"');
    expect(html).not.toContain('<g class="tape"');
  });

  it('cuts the paper to the size it was given, at every layer', () => {
    const html = renderNote({ id: 'n', text: 'x', width: 410, height: 266 });
    // Shadow, paper, ink and curl all agree, or the tear is stretched against the sheet it
    // is supposed to be the edge of and the drawing on it slides off the paper.
    expect(html.match(/viewBox="0 0 410 266"/g)?.length).toBe(4);
    expect(html).toContain('width:410px;height:266px');
  });

  it('always has a layer to draw on, even with nothing drawn yet', () => {
    // The ink layer was emitted only once there was ink on it, so the surface a first stroke
    // has to land on did not exist until after that stroke.
    expect(renderNote({ id: 'n', text: 'x' })).toContain('class="note-ink"');
  });

  it('writes its tear and tape settings onto the element', () => {
    // The app re-cuts the paper live while a grip is dragged, and it has to cut it the same
    // way the server did or the sheet changes identity as you resize it.
    const html = renderNote({ id: 'n', text: 'x', style: { tornEdges: 3.5, tape: 'two' } });
    expect(html).toContain('data-torn="3.5"');
    expect(html).toContain('data-tape="two"');
  });
});

describe('a note on a board', () => {
  it('is boxed to exactly the paper inside it', () => {
    // The item declared 260 and the note drew 240, so the selection outline stood twenty
    // pixels off the torn edge on two sides.
    const html = board('b')
      .note('x', { at: [0, 0], size: [260, 180] }, {})
      .render().html;
    expect(itemStyle(html)).toContain('width:260px');
    expect(itemStyle(html)).toContain('height:260px'.replace('260', '180'));
    expect(html).toContain('width:260px;height:180px');
  });

  it('boxes an unsized note at the note default, not the generic item default', () => {
    const html = board('b')
      .note('x', { at: [0, 0] }, {})
      .render().html;
    expect(itemStyle(html)).toContain(`width:${NOTE_WIDTH}px`);
    expect(itemStyle(html)).toContain(`height:${NOTE_HEIGHT}px`);
  });

  it('seeds the tear from the item, so picking a note up does not re-tear it', () => {
    // The seed was the render's sequence number. Items are painted in z order, raising a
    // note changes its z, and so every drag re-cut the paper and moved the tape.
    const one = board('b')
      .note('first', { at: [0, 0] }, {})
      .note('second', { at: [300, 0] }, {})
      .render().html;
    const other = board('b')
      .note('second', { at: [300, 0], z: 1 }, {})
      .note('first', { at: [0, 0], z: 2 }, {})
      .render().html;
    const tears = (html: string): string[] =>
      [...html.matchAll(/class="paper-fill" d="([^"]{0,60})/g)].map((m) => m[1] as string);
    // Same two notes, opposite paint order: the same two tears, whichever way round.
    expect(tears(one).sort()).toEqual(tears(other).sort());
  });
});

describe('ink on a note', () => {
  it('reaches the paper', () => {
    // The block carried the strokes and the renderer accepted them, but the board's sticky
    // renderer never handed one to the other: drawing on a note produced a line under the
    // pointer that vanished the moment it was let go.
    const html = board('b')
      .note('x', { at: [0, 0] }, { ink: [{ d: 'M4,4 L90,70', colour: '#ff2e63', tool: 'marker' }] })
      .render().html;
    expect(html).toContain('M4,4 L90,70');
    expect(html).toContain('ink-stroke tool-marker');
    expect(html).toContain('--stroke:#ff2e63');
  });
});
