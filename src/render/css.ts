/**
 * The stylesheet, as template strings.
 *
 * CSS lives in TypeScript rather than in .css files on purpose. This library is
 * consumed as a bundle, as raw TypeScript in tests, and as a CLI, and a file
 * that has to be located relative to the module resolves differently in all
 * three. A string has no such problem, and it is the same choice the extension
 * this look comes from made.
 *
 * Three sheets, in this order: layout, look, script. Later ones win.
 */

/** Layout only, written in logical properties so a page mirrors with no branch. */
export const BASE = `/* Layout. Written in logical properties throughout, so a page mirrors for a
   right-to-left script with no branch anywhere in the builder. */

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--body-font);
  font-size: var(--body-size);
  line-height: var(--body-leading);
}

/* .mount carries the hard shadow as a real sibling element.

   It was a ::before with a negative z-index first, which is wrong: inside a
   stacking context an element's own background paints BEFORE its
   negative-z-index descendants, so the shadow covered the whole sheet and every
   page rendered ink on ink. A sibling has no such ordering trap. */
.mount {
  position: relative;
  width: var(--page-width);
  isolation: isolate;
}
.mount > .shadow {
  position: absolute;
  inset: 0;
  background: var(--ink);
  opacity: var(--shadow-opacity);
  clip-path: var(--torn);
  transform: translate(var(--shadow-x), var(--shadow-y));
}

.sheet {
  position: relative;
  width: 100%;
  padding: var(--page-padding);
  background: var(--paper);
}

/* ---- header band ---- */
.band {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-block-end: 12px;
  border-block-end: 3px solid var(--accent);
}
.band .title {
  flex: 1;
  font-size: var(--title-size);
  font-weight: 700;
  line-height: 1.25;
}
.chip {
  flex: none;
  align-self: center;
  padding: 3px 9px;
  font-size: var(--chip-size);
  font-weight: 700;
  line-height: 1.3;
  background: var(--chip-bg, var(--accent));
  color: var(--chip-fg, var(--chip-text));
  border: var(--keyline) solid var(--edge);
  border-radius: 3px;
  white-space: nowrap;
}

.trail {
  margin-block-start: 10px;
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  opacity: 0.85;
}
.trail .sep { opacity: 0.5; padding-inline: 4px; }

/* ---- blocks ---- */
.block + .block { margin-block-start: 14px; }
h2.block { font-size: calc(var(--title-size) * 0.78); font-weight: 700; }
h3.block { font-size: calc(var(--title-size) * 0.62); font-weight: 700; }

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

/* ---- images ---- */
figure.block { margin: 0; }
.plates {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 16px;
  align-items: start;
}
.cell { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
.cell figcaption {
  margin-block-end: 6px;
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  font-weight: 700;
}

/* The plate is an LTR island.

   Image space has no reading direction. Positioning marks with logical
   properties sent every box to the far side of the picture in a right-to-left
   page -- a plausible-looking and completely wrong result. Chrome mirrors; the
   plate never does.

   It also shrink-wraps its image. As a block it stretched to the grid cell, and
   since marks are percentages OF the plate, boxes then extended past the picture
   into empty paper, pointing at nothing. */
.plate {
  direction: ltr;
  position: relative;
  display: block;
  width: fit-content;
  max-width: 100%;
  line-height: 0;
  border: var(--keyline) solid var(--edge);
  box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--ink);
}
.plate img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: var(--image-max-height);
}

.mark { position: absolute; }
.mark.box {
  border: 4px solid var(--accent);
  background: color-mix(in oklab, var(--accent) 14%, transparent);
}
.badge {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  transform: translate(-50%, -50%);
  min-width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  font-size: var(--label-size);
  font-weight: 700;
  line-height: 1;
  background: var(--accent);
  color: var(--chip-text);
  border: 2px solid var(--edge);
}
.callout-note {
  margin-block-start: 8px;
  font-size: var(--label-size);
  line-height: 1.5;
  padding: 6px 9px;
  background: var(--shade);
  border: var(--keyline) solid var(--edge);
}
.callout-note b { color: var(--accent); }

/* ---- zoom inset ---- */
.zoom {
  direction: ltr;
  margin-block-start: 12px;
  overflow: hidden;
  position: relative;
  border: 3px solid var(--accent);
  box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--ink);
}
/* Nearest-neighbour: honest magnification that invents no pixels, and it reads
   as a photocopier enlargement, which is on-register here. */
.zoom img { position: absolute; image-rendering: pixelated; max-width: none; }

code {
  font-family: var(--mono-font);
  direction: ltr;
  unicode-bidi: isolate;
}
`;

/** The look: torn paper, halftone, tape, hard shadows, censor bars. */
export const ZINE = `/* The look: late-80s photocopied zine. Risograph flat spot inks, photocopier
   degradation, xeroxed flyers -- torn edges, tape, thick keylines, halftone.

   Explicitly not: gradients, glassmorphism, Material elevation, neumorphism, or
   any shadow that blurs more than zero pixels. Paper is matte. This has been got
   wrong once already: a glossy highlight was added and read immediately as
   glass. There is no sheen, at any angle, in any state. */

.sheet {
  clip-path: var(--torn);
  font-feature-settings: 'tnum' 1;
}

/* Halftone is CHROME ONLY.

   Putting the texture above the plates laid dots across the screenshots. A page
   must not alter the picture it is showing, so the texture sits below, and the
   plate opens its own stacking context above it. */
.sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--halftone);
  background-size: var(--halftone-period) var(--halftone-period);
  mix-blend-mode: var(--halftone-blend);
  opacity: var(--halftone-opacity);
}
.plate, .zoom, .sticky { z-index: 1; isolation: isolate; }

.tape {
  position: absolute;
  z-index: 2;
  background: color-mix(in oklab, var(--paper) 22%, #f7f4ea);
  border: 0.8px solid color-mix(in oklab, var(--ink) 30%, transparent);
  opacity: 0.74;
}

/* ---- sticky notes ---- */
.sticky {
  position: relative;
  margin-block-start: 16px;
  padding: 14px 16px;
  width: fit-content;
  max-width: 100%;
  min-width: 46%;
  background: var(--note-paper);
  color: var(--note-ink);
  clip-path: var(--note-torn);
  font-size: calc(var(--body-size) * 1.02);
}
.sticky::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--note-ink);
  opacity: 0.16;
  clip-path: var(--note-torn);
  transform: translate(4px, 5px);
}
.sticky h4 {
  margin-block-end: 6px;
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  font-weight: 700;
  color: var(--note-accent);
}

/* Redaction. Never pixelation: it is a digital artefact in a paper world, it
   LOOKS reversible and invites the question, and for a short low-entropy string
   like a card number mosaic redaction is genuinely attackable. Covering is
   irreversible, and a censor bar is the most zine object there is.

   This draws the label. Whoever wrote the page is responsible for the pixels
   underneath already being gone. */
.mark.redact {
  background: var(--ink);
  display: grid;
  place-items: center;
  border: var(--keyline) solid var(--edge);
}
.mark.redact span {
  color: var(--paper);
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  font-weight: 700;
}
.mark.redact.halftone {
  background-color: var(--paper);
  background-image: var(--halftone);
  background-size: var(--halftone-period) var(--halftone-period);
}
.mark.redact.hatch {
  background: repeating-linear-gradient(45deg, var(--ink) 0 3px, var(--paper) 3px 7px);
}
`;

/** Per-script adjustments: casing, tracking, leading. */
export const SCRIPT = `/* Per-script adjustments. Loaded last so it always wins. */

/* Arabic script has no case, and the .12em tracking that reads as authoritative
   in Latin caps looks like broken kerning there. Both are switched off together,
   and weight plus the accent colour do the same work instead. */
:root[data-uppercase='off'] .trail,
:root[data-uppercase='off'] .cell figcaption,
:root[data-uppercase='off'] .sticky h4,
:root[data-uppercase='off'] .mark.redact span,
:root[data-uppercase='off'] table.block thead th,
:root[data-uppercase='off'] pre.block .pre-label {
  text-transform: none;
  letter-spacing: 0;
}

:root[data-uppercase='on'] .trail,
:root[data-uppercase='on'] .cell figcaption,
:root[data-uppercase='on'] .sticky h4,
:root[data-uppercase='on'] .mark.redact span,
:root[data-uppercase='on'] table.block thead th,
:root[data-uppercase='on'] pre.block .pre-label {
  text-transform: uppercase;
}

/* Arabic script needs more leading than Latin at the same size. */
:root[data-script='arabic'] { --body-leading: 1.7; }
:root[data-script='arabic'] .band .title { line-height: 1.4; }
`;

export const STYLESHEET = [BASE, ZINE, SCRIPT].join('\n');
