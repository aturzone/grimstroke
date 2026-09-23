/**
 * The live board: the viewport, the camera, the cursors.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The live board: the viewport, the camera, the cursors. */
export const CAMERA = `/* The workspace, as somewhere you work.

   The board is a SHEET LYING ON A DESK, not an infinite plane of paper. Panning
   past the edge shows the desk, which is honest -- the plane is unbounded, the
   paper is not -- and it avoids the alternative, which is scaling a repeating
   gradient by the zoom factor, something a repeating gradient cannot do.

   EVERY CHROME CLASS IS PREFIXED gs-. The chrome and the documents share one
   stylesheet, so an unprefixed chrome class inherits whatever a document class
   of the same name says: the zoom button was called .zoom, which is also the
   magnified inset on a picture, and it arrived wearing a seven-pixel hard black
   shadow that read as a rendering fault. */

body.live {
  height: 100vh;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}

.viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  touch-action: none;
}
.viewport[data-tool='pan'] { cursor: grab; }
.viewport[data-tool='pan'][data-dragging] { cursor: grabbing; }
.viewport[data-tool='pen'],
.viewport[data-tool='marker'],
.viewport[data-tool='highlighter'] { cursor: crosshair; }
.viewport[data-tool='eraser'] { cursor: cell; }
.viewport[data-tool='sticky'],
.viewport[data-tool='text'],
.viewport[data-tool='label'] { cursor: copy; }

/* Panned and zoomed by transform, which is the one thing a browser will hand
   to the compositor. Changing left/top or width/height instead repaints the
   whole board on every pointer move, and a board with forty screenshots on it
   then moves at about four frames a second. */
.live .board {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  overflow: visible;
  will-change: transform;
}

/* Far out, the fine print goes. See FAR in app/board/view.ts: the attribute is set by the
   camera when a note's toolbar would be a few pixels across. Nothing here changes a size or
   a position, so crossing the threshold moves nothing on screen. */
.board[data-far] .note .grain,
.board[data-far] .note .paper-halftone,
.board[data-far] .note .curl,
.board[data-far] .note .grip-dots { display: none; }
.board[data-far] .note .actions,
.board[data-far] .note .grips { visibility: hidden; }

/* The sheet lies ON the desk, and says so the way everything else here does: a hard offset
   with no blur, as a plain rectangle under the paper that the camera moves exactly as it
   moves the board.

   It is NOT a box-shadow, and it must never become one again. It was a 70px blur first, on
   a ten-thousand-pixel element, and it cost more than two thousand strokes did. Made hard,
   it was still the single most expensive thing on the page: Firefox rasterises a shadow as
   a mask the size of the element, so an empty board panned at 8fps with it and 57 without.
   A solid rectangle is one quad. */
.gs-shadow {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  width: var(--board-width);
  height: var(--board-height);
  transform-origin: 0 0;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
  will-change: transform;
}

`;
