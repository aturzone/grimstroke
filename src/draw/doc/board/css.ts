/**
 * The board: placement and ink.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The board: placement and ink. */
export const BOARD = `/* The board.

   A page is a column and a board is a plane, but they are the same materials:
   an item is a block, rendered by the same code, so a sticky note here is the
   sticky note there. Only placement and ink belong to the board. */

body.on-board { background: var(--paper); }

.board {
  position: relative;
  width: var(--board-width);
  height: var(--board-height);
  isolation: isolate;
  background-color: var(--paper);
  background-image: var(--paper-rule, none);
  background-size: var(--paper-rule-size, auto);
  /* Clipped to its extent for capture. The plane is infinite; a picture of it
     is not, and something has to decide where the picture stops. */
  overflow: hidden;
}

/* Paper grain, same reasoning as on a sheet: it is the surface the things are
   lying on, so it is under all of them. */
.board::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--grain, none);
  background-repeat: repeat;
  opacity: var(--grain-opacity, 0);
}

.board-template { position: absolute; z-index: 0; pointer-events: none; }
.board-template > svg { display: block; }
:is(.board, .leaf-items) .item {
  position: absolute;
  transform-origin: 50% 50%;
}
/* Only a turned item carries a transform. A rotate(0) is still a transform, and every
   transform is its own stacking context and composited plane -- on a board of two thousand
   things, that is two thousand planes holding nothing that moves. */
:is(.board, .leaf-items) .item[data-gs-rotation],
:is(.board, .leaf-items) .stroke[data-gs-rotation] { transform: rotate(var(--tilt, 0deg)); }

/* An item is placed, so the margins a block uses to space itself from its
   neighbours in a column are wrong here -- they offset it from where it was
   put, which on a plane is simply the wrong position. */
:is(.board, .leaf-items) .item > .block { margin: 0; }
/* A card is as wide as its item, so resizing the item resizes the card. */
:is(.board, .leaf-items) .item > .profile { max-width: none; }

/* Ink.

   A zero-sized box at the stroke's own origin with overflow visible, and no
   viewBox: a viewBox would scale the path, and a stroke that changes shape
   when its bounding box is recomputed is not the stroke that was drawn. */
/* A run of strokes sharing one surface: a zero-sized box at the board's corner, like a lone
   stroke's, with every stroke in it placed by its own transform. */
:is(.board, .leaf-items) .ink-run {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
}
:is(.board, .leaf-items) .stroke {
  position: absolute;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
}
:is(.board, .leaf-items) .stroke.line path {
  fill: none;
  stroke: var(--stroke, var(--ink));
  stroke-width: var(--stroke-weight, 3px);
  stroke-linecap: round;
  stroke-linejoin: round;
}
:is(.board, .leaf-items) .stroke.fill path {
  fill: var(--stroke, var(--accent));
  stroke: none;
}

/* A highlighter multiplies and a pencil is never quite opaque. A marker is
   flat and full strength, which is what makes it a marker. */
:is(.board, .leaf-items) .stroke.tool-highlighter path { opacity: 0.38; mix-blend-mode: multiply; }
:is(.board, .leaf-items) .stroke.tool-pencil path { opacity: 0.72; }
:is(.board, .leaf-items) .stroke.tool-marker path { opacity: 1; }
`;
