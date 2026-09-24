/**
 * Selection, the screen-space ruling, the marquee and the drop target.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** Selection, the screen-space ruling, the marquee and the drop target. */
export const SELECT = `/* ---- selection ----

   An outline, never a border: a border changes the item's own box, so selecting
   a note nudged it two pixels and it was dropped somewhere other than where it
   was picked up. */
.live .item[data-selected] { outline: none; }
/* A torn sheet is not a rectangle, so a rectangle drawn around one reads as a rendering
   fault rather than as a selection -- a hard box standing off the tear on all four sides.
   A selected note says so with its OWN edge: the keyline it already has, in the accent. */
.live .item[data-selected]:has(.note) { outline: none; }
.live .item[data-selected] .note .paper-fill { stroke: var(--accent); stroke-width: 4; }
/* The shadow is NOT tinted with it. Recolouring the offset shadow put a blue smear down two
   sides of the sheet that read as a printing fault, not as a selection. */
.viewport[data-tool='select'] .item { cursor: move; }
/* Ink is pointer-transparent so a stroke drawn across a note never swallows a click meant
   for the note. That also made it the one thing the eraser could never hit -- so while the
   eraser is held, and only then, ink answers the pointer. The value 'painted' means the line itself
   has to be touched, not its bounding box. */
.viewport[data-tool='eraser'] .stroke { pointer-events: auto; }
.viewport[data-tool='eraser'] .stroke path { pointer-events: painted; }
/* And the strokes drawn on a note, which come off the note one at a time. */
.viewport[data-tool='eraser'] .note-ink path { pointer-events: painted; }
.viewport[data-tool='eraser'] .item,
.viewport[data-tool='eraser'] .stroke { cursor: cell; }
.live .item[data-gs-locked] { cursor: not-allowed; }

/* The ruling on a live board.

   IT IS NOT INSIDE THE BOARD. The board is scaled by a transform, and a background drawn
   inside a scaled element is rasterised in the element's own coordinates and then resampled
   by the compositor -- so at 30% zoom the grid came out as plaid: lines clumped into groups
   with gaps between them, because each tile rounded to a slightly different number of screen
   pixels and the error accumulated across the sheet.

   Drawn here instead, as a layer the app positions over exactly where the paper is on
   screen, every tile is a whole number of screen pixels and every line is one pixel wide at
   any zoom. The app also steps the period by powers of two as the camera pulls back, so the
   spacing stays in a band the eye reads as a grid.

   The paper itself keeps its own ruling for export and for print, where there is no camera
   and nothing to resample. */
/* The live board's own surface goes transparent and this layer carries the ruling, drawn in
   screen space; the viewport under it is the paper's colour and its grain. It was opaque
   paper itself once, which hid the grain beneath it and put one more full-screen layer into
   every frame. Leaving the board opaque simply painted over the grid, because the board is a
   later sibling. */
.live .board { background-image: none; background-color: transparent; }
.gs-rule {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
/* The tile overhangs the viewport and is only ever TRANSLATED, by the pan modulo one period
   of the ruling, so moving the board never redraws it. The app writes its size and its
   background-size, and only when the period steps. */
.gs-rule-tile {
  position: absolute;
  background-image: var(--paper-rule, none);
  background-repeat: repeat;
  will-change: transform;
}

/* A note in pen mode says so, and offers the way out on itself. */
.live .note[data-drawing] { outline: 1.5px dashed var(--accent); outline-offset: 5px; }
.gs-note-done {
  position: absolute;
  inset-block-start: 84px;
  inset-inline-start: 50%;
  translate: -50% 0;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 6px 5px 14px;
  border: var(--keyline) solid var(--edge);
  background: var(--mat-paper);
  color: var(--gs-ink);
  font-family: var(--hand-font);
  font-size: 15px;
  box-shadow: 3px 3px 0 var(--edge);
}
[dir="rtl"] .gs-note-done { translate: 50% 0; }
.gs-note-done button {
  padding: 3px 12px;
  border: var(--keyline) solid var(--edge);
  background: var(--accent);
  color: var(--mat-paper);
  font-family: var(--marker-font);
  font-size: 14px;
  cursor: pointer;
}
.gs-note-done kbd { font-size: 11px; opacity: 0.6; }

.gs-marquee {
  position: absolute;
  z-index: 40;
  border: 1.5px solid var(--accent);
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  pointer-events: none;
}

.gs-drop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: none;
  place-items: center;
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  pointer-events: none;
}
.gs-drop span {
  padding: 14px 28px;
  background: var(--mat-paper);
  border: var(--keyline) solid var(--edge);
  font-family: var(--marker-font);
  font-size: 27px;
}
body.live[data-dropping] .gs-drop { display: grid; }

/* An item being edited is a textarea sitting exactly where its text was, so the
   paper, the tilt and the shadow all stay put while the words change. */
.gs-link { text-decoration: none; display: inline-block; }

`;

/** The in-place text editor. */
export const EDITOR = `/* Inside the item, in the item's own coordinates -- so it is carried by the board's
   transform exactly as the text under it is, and cannot be left behind. */
.gs-editing {
  position: absolute;
  z-index: 8;
  z-index: 70;
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  resize: none;
  overflow: hidden;
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

`;

/** The frame round a selection and its grips, in screen space. */
export const HANDLES = `/* ---- the frame and its grips ----

   Drawn in screen space by the app, so a grip is the same size at every zoom -- a grip that
   shrinks with the camera is one nobody can take hold of. The frame is ink, not accent: on a
   lime palette an accent frame round a lime note is no frame at all. */
.gs-handles {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 30;
  outline: 1.5px solid var(--gs-ink);
  outline-offset: 5px;
  pointer-events: none;
}
.gs-handles[hidden] { display: none; }
.gs-handles[data-many] { outline-style: dashed; }
/* A note says it is selected with its own torn edge; the frame would stand off it. */
.gs-handles[data-note] { outline-color: transparent; }
.gs-grip {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px;
  background: var(--gs-paper);
  border: 1.5px solid var(--gs-ink);
  pointer-events: auto;
  touch-action: none;
}
.gs-grip-nw { left: -5px; top: -5px; cursor: nwse-resize; }
.gs-grip-ne { right: -5px; top: -5px; margin-right: -6px; margin-left: 0; cursor: nesw-resize; }
.gs-grip-se { right: -5px; bottom: -5px; margin: 0 -6px -6px 0; cursor: nwse-resize; }
.gs-grip-sw { left: -5px; bottom: -5px; margin-bottom: -6px; margin-top: 0; cursor: nesw-resize; }
.gs-grip-e { right: -5px; top: 50%; margin: -9px -6px 0 0; height: 18px; width: 8px; cursor: ew-resize; }
.gs-grip-w { left: -5px; top: 50%; margin-top: -9px; height: 18px; width: 8px; cursor: ew-resize; }
/* The turn: a round grip on a stem above the middle, the way a thing is swung by its top. */
.gs-grip-turn {
  left: 50%;
  top: -34px;
  width: 16px;
  height: 16px;
  margin: 0 0 0 -8px;
  border-radius: 50%;
  cursor: grab;
}
.gs-grip-turn::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 1.5px;
  height: 14px;
  margin-left: -0.75px;
  background: var(--gs-ink);
}
.gs-handles[data-active='turn'] .gs-grip-turn { cursor: grabbing; background: var(--gs-hot); }
/* What is not offered is not drawn: a group has no single size, a note keeps its own grips,
   a stroke is turned by nobody, and a locked thing is not changed at all. */
.gs-handles[data-many] .gs-grip,
.gs-handles[data-locked] .gs-grip,
.gs-handles[data-note] .gs-grip:not(.gs-grip-turn),
.gs-handles[data-ink] .gs-grip-turn,
.gs-handles[data-ink] .gs-grip-w,
.gs-handles[data-ink] .gs-grip-nw,
.gs-handles[data-ink] .gs-grip-sw { display: none; }
@media (pointer: coarse) {
  .gs-grip { width: 20px; height: 20px; margin: -10px; }
  .gs-grip-turn { width: 24px; height: 24px; margin-left: -12px; top: -44px; }
}
`;
