/**
 * The reset, and the defaults every document inherits.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The reset, and the defaults every document inherits. */
export const RESET = `/* Layout. Written in logical properties throughout, so a page mirrors for a
   right-to-left script with no branch anywhere in the builder. */

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--body-font);
  font-size: var(--body-size);
  line-height: var(--body-leading);
}

`;

/** Per-script adjustments. Loaded last so it always wins. */
export const SCRIPT = `/* Per-script adjustments. Loaded last so it always wins. */

/* Arabic script has no case, and the .12em tracking that reads as authoritative
   in Latin caps looks like broken kerning there. Both are switched off together,
   and weight plus the accent colour do the same work instead. */
:root[data-uppercase='off'] .trail,
:root[data-uppercase='off'] .cell:not(.mounted) > figcaption,
:root[data-uppercase='off'] .mark.redact span,
:root[data-uppercase='off'] table.block thead th,
:root[data-uppercase='off'] pre.block .pre-label {
  text-transform: none;
  letter-spacing: 0;
}

:root[data-uppercase='on'] .trail,
:root[data-uppercase='on'] .cell:not(.mounted) > figcaption,
:root[data-uppercase='on'] .mark.redact span,
:root[data-uppercase='on'] table.block thead th,
:root[data-uppercase='on'] pre.block .pre-label {
  text-transform: uppercase;
}

/* Arabic script needs more leading than Latin at the same size. */
:root[data-script='arabic'] { --body-leading: 1.7; }
:root[data-script='arabic'] .band .title { line-height: 1.4; }
`;

/** The desk every surface lies on. */
export const DESK = `/* The notebook.

   A board is a plane and a notebook is a SEQUENCE, and the difference has to be
   visible: a spread has a gutter, the leaves are bound rather than placed, and
   the thing you flip through is an object with a thickness.

   The 3D is transforms on real elements. A book on the shelf is still text --
   its title is selectable, its stickers are its stickers, and it stays sharp at
   any size and in a printed PDF. An image of a book would be none of that. */

/* The desk.

   The grain goes on a layer of its own, at low opacity, exactly as it does on a
   sheet. The tile is TRANSLUCENT -- a sparse field of dark specks and light flecks
   with alpha, see draw/look/grain.ts -- so it composites over any colour as it is.
   It carried a blend mode for a long time, from an era when the tile was opaque,
   and every blended layer is an extra offscreen pass the size of the layer: the
   grain blends alone were a measurable share of a board's frame time. */
body.on-book, body.on-shelf, body.on-studio, body.live {
  margin: 0;
  position: relative;
  min-height: 100vh;
  background-color: var(--desk);
  color: var(--ink);
}
/* absolute, not fixed. A fixed layer is the size of the VIEWPORT, so on a
   document taller than the window -- which every export is -- the desk had
   texture down to the fold and none below it, as a visible horizontal seam. */
body.on-book::before, body.on-shelf::before, body.on-studio::before, body.live::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--grain, none);
  background-repeat: repeat;
  opacity: 0.5;
}
/* The content sits above the desk texture. Named explicitly and NOT as
   'body > *': that selector is more specific than a class, so it overrode
   'position: fixed' on every piece of chrome -- the tool tray and the page
   turner both became 'relative' and laid themselves out in the flow, full
   width, at whatever height the offsets happened to land on. The chrome does
   not need lifting anyway: it is positioned with a z-index of its own. */
.book, .shelves { position: relative; z-index: 1; }

`;
