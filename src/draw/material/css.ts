/**
 * The simple materials: headings, lists, tables, code, labels, quotes.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The simple materials: headings, lists, tables, code, labels, quotes. */
export const BLOCKS = `/* ---- blocks ---- */
.block + .block { margin-block-start: 14px; }
/* A document reads by its headings, so they are set apart: bigger than the text by a clear step,
   more room above than below, and a short bar in the accent under the first rank. They were
   barely larger than the text once, and a page an agent wrote read as one long run. */
h2.block { font-size: calc(var(--title-size) * 1.1); font-weight: 700; line-height: 1.2; }
h2.block:not(.written)::after {
  content: '';
  display: block;
  width: 44px;
  height: 3px;
  margin-block-start: 8px;
  background: var(--accent);
}
h3.block { font-size: calc(var(--title-size) * 0.8); font-weight: 700; line-height: 1.25; }
.block + h2.block, .block + h3.block,
.stack > * + h2.block, .stack > * + h3.block { margin-block-start: 26px; }
/* A stack inside a stack -- a figure and its caption -- is spaced like any block beside it. */
.stack > .stack + *, .stack > * + .stack { margin-block-start: 14px; }
h2.block + .block, h3.block + .block { margin-block-start: 10px; }
/* A figure's caption, under what it names: small, quieter than the text, close to its figure. */
p.block.caption { font-size: calc(var(--body-size) * 0.86); line-height: 1.4; opacity: 0.78; }
.block + p.block.caption { margin-block-start: 6px; }

ul.block { padding-inline-start: 20px; }
ul.block li { margin-block-end: 4px; }
ul.block li::marker { color: var(--accent); }

table.block {
  border-collapse: collapse;
  width: 100%;
  font-size: calc(var(--body-size) * 0.95);
}
table.block td, table.block th {
  padding: 5px 9px;
  text-align: start;
  border: 1px solid var(--rule);
  vertical-align: top;
}
table.block thead th {
  background: var(--shade);
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
}

pre.block {
  padding: 10px 12px;
  background: var(--shade);
  border: var(--keyline) solid var(--edge);
  font-family: var(--mono-font);
  font-size: calc(var(--body-size) * 0.88);
  line-height: 1.5;
  overflow: hidden;
  white-space: pre-wrap;
  /* A log excerpt is evidence. It is never reflowed as prose, and it never
     inherits the page direction. */
  direction: ltr;
  text-align: left;
}
pre.block .pre-label {
  display: block;
  margin-block-end: 6px;
  font-family: var(--body-font);
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  font-weight: 700;
  opacity: 0.7;
}

/* ---- written, and labelled ----

   "written" is a voice, not a size. It goes on the things a person would have
   written -- a heading somebody scrawled, a caption under a photo, a note --
   and never on running text: a page of measurements set in marker is a page
   nobody can check against anything. */
.written {
  font-family: var(--marker-font);
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}
h2.written { font-size: calc(var(--title-size) * 3.4); line-height: 1.0; }
h3.written { font-size: calc(var(--title-size) * 2.2); line-height: 1.04; }
p.written { font-size: calc(var(--body-size) * 1.9); line-height: 1.22; }

.label {
  display: inline-block;
  max-width: 100%;
  margin-inline: 6px;
  padding: 10px 26px 12px;
  background: var(--label-bg);
  color: var(--label-fg);
  transform: rotate(var(--tilt, 0deg));
}
p.label.written { font-size: calc(var(--body-size) * 2.1); }
.label code { background: none; color: inherit; }

blockquote.block {
  padding-inline-start: 14px;
  border-inline-start: 4px solid var(--accent);
}
blockquote.block .cite {
  display: block;
  margin-block-start: 6px;
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  opacity: 0.75;
}

hr.block { border: 0; border-block-start: 2px dashed var(--rule); }

`;

/** A technical run, isolated so it never takes on the reading direction around it. */
export const CODE = `code {
  font-family: var(--mono-font);
  direction: ltr;
  unicode-bidi: isolate;
}

`;

/** Tape, as an SVG strip. */
export const TAPE = `/* Tape is an SVG strip, not a box.

   These rules were written for a div with a clip-path and kept their background and
   border when the markup became an svg -- which paints a solid rectangle behind the strip.
   That is the grey slab that sat across the corner of every taped photograph.

   The box is 96x96 with the strip drawn around its own origin, so it is translated by half
   itself to put the strip's CENTRE on the point it was placed at. Without that the strip
   landed 48px down and right of the corner, in the middle of the picture. */
svg.tape {
  position: absolute;
  z-index: 2;
  overflow: visible;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

/* A NOTE's tape is a group inside the paper svg, drawn in the paper's own coordinates. It
   must not pick up the mount rule above: a percentage transform on an SVG element resolves
   against the view-box, so translate(-50%, -50%) threw every note's tape 120 units left and
   85 up -- off the note entirely, lying on the board beside it. Hence the separate class. */
.cn-tape { pointer-events: none; }
/* The strip that holds a whole sheet down sits across its top-left corner. */
.sheet-tape { inset-block-start: 4px; inset-inline-start: 34px; }
.mat svg.tape { opacity: 1; }


/* Rounding. Every corner is its designed radius times --round (0 square, 1 as designed); above 1,
   --round-up lifts even the things drawn square -- pictures, code, quotes, pages -- so the whole
   workspace softens together. Torn paper, die-cut stickers and pixel art keep their own edges. */
.plate, .plate img, pre.block, blockquote.block, .rc, .leaf, .cover { border-radius: var(--round-up, 0px); }
.plate { overflow: clip; }
`;
