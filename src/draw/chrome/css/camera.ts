/**
 * The live board: the viewport, the camera, the cursors.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The live board: the viewport, the camera, the cursors. */
export const CAMERA = `/* The workspace, as somewhere you work.

   The paper goes on for ever. It was a sheet lying on a desk once, and the sheet was
   pinned at the size it had on the first day: things dragged past its edge hung off the
   paper onto the desk, and there was no way to ask for more. Now the viewport itself is
   the paper and the ruling is drawn over all of it, so there is always more room in every
   direction. Only an export has an edge, and it is cut round whatever is on the board.

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
  /* Every drag here is a tool, never a text selection. Without this a pen stroke or an
     eraser pass that crossed a note selected the page's words as it went, and the whole
     board lit up in the selection colour. The editor is a textarea, which selects anyway. */
  -webkit-user-select: none;
  user-select: none;
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

/* The paper, under everything, as far as the window goes. The board element itself is
   transparent: it only carries the items, and its extent is a coordinate origin now, not
   an edge. Its grain moves here too, onto a layer that never scales -- tooth is a property
   of the paper, not of the zoom. */
.live .viewport { background-color: var(--paper); }
.live .viewport::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--grain, none);
  background-repeat: repeat;
  opacity: var(--grain-opacity, 0);
}
.live .board { background: none; }
.live .board::before { display: none; }

/* A page of a notebook, opened as a board: a sheet with an edge, lying on the desk, ruled
   the way its leaf is. Everything else about it is the board. One page is small, so the
   shadow here is an ordinary hard box-shadow -- it is the ten-thousand-pixel board that
   could not afford one. */
.live.on-page .viewport { background-color: var(--desk); }
.live.on-page .viewport::before { display: none; }
.live.on-page .board {
  background-color: var(--paper);
  background-image: var(--paper-rule, none);
  background-size: var(--paper-rule-size, auto);
  box-shadow: 10px 12px 0 rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.live.on-page .board::before { display: block; opacity: 0.13; }
.gs-page-nav { display: flex; align-items: center; gap: 2px; }
.gs-page-no {
  min-width: 64px;
  font-family: var(--mono-font);
  font-size: var(--gs-t1);
  text-align: center;
  color: var(--gs-soft);
  white-space: nowrap;
}

`;
