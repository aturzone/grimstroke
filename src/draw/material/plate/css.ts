/**
 * The picture: the LTR island, hard marks, badges and the zoom inset.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The picture: the LTR island, hard marks, badges and the zoom inset. */
export const PLATE = `/* ---- images ---- */
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

`;

/** The card a picture sits on, and marks made by a hand. */
export const MOUNT = `/* ---- mounts ----

   The card a picture sits on. It is a separate element from the plate on
   purpose: the tilt, the tear and the tape all belong to the card, and the
   picture inside it is never rotated, never clipped and never touched. A torn
   edge that cropped the screenshot would be cropping evidence. */
.mat {
  position: relative;
  z-index: 1;
  isolation: isolate;
  display: block;
  width: fit-content;
  max-width: 100%;
  padding: var(--mat, 12px);
  transform: rotate(var(--tilt, 0deg));
  background: var(--mat-paper);
}
.mat .plate { border: 0; box-shadow: none; }
/* 'none' means none. It shared its rule with 'keyline' and rendered an
   identical bordered, shadowed plate. */
.plate.bare { border: 0; box-shadow: none; }

/* A caption on a mount is handwriting wherever it sits. Only the polaroid
   writes it on the card; for the rest it stays above the picture, and it was
   the one caption still being shouted in uppercase mono next to a photograph. */
.cell.mounted > figcaption {
  font-family: var(--hand-font);
  font-size: calc(var(--body-size) * 1.45);
  letter-spacing: 0;
  text-transform: none;
  font-weight: 400;
}
.mat figcaption {
  display: block;
  margin-block-start: 12px;
  color: var(--mat-ink);
  font-family: var(--hand-font);
  font-size: calc(var(--body-size) * 1.45);
  letter-spacing: 0;
  text-transform: none;
  line-height: 1.2;
}

/* The one blurred shadow in the whole stylesheet, and the reason is narrow.

   Everything else here is printed ON the sheet, and printed things do not cast
   shadows -- which is why the house rule is zero blur and why a glossy
   highlight got reverted the one time it was tried. A mount is different: it is
   a separate piece of card LYING on the sheet, and the small soft shadow under
   its edge is the only thing that says so. Without it a polaroid reads as a
   white rectangle drawn on the page, which is exactly what it is not.

   Kept small and kept dark. It is contact shadow, not elevation, and the moment
   it starts to look like Material elevation it has gone wrong.

   A torn card gets no rectangular shadow: a hard rectangle under a ragged edge
   announces the rectangle the tear was cut from, which is the one thing the
   tear exists to hide. */
.mat-polaroid, .mat-taped, .mat-pinned {
  box-shadow:
    0 1px 2px color-mix(in oklab, var(--ink) 26%, transparent),
    0 6px 16px color-mix(in oklab, var(--ink) 16%, transparent);
}
.mat-torn {
  filter: drop-shadow(0 2px 3px color-mix(in oklab, var(--ink) 20%, transparent));
}
.mat-polaroid { padding: var(--mat); }

/* The tear is on a BACKING element, not on the mount.

   Clipping the mount clips its descendants, and a nick is up to three times
   the edge amplitude deep -- deeper than the mat is wide -- so the tear bit a
   notch out of the screenshot. Cropping evidence to make it look nicer is the
   single worst thing this library could do, so the geometry is arranged to
   make it impossible rather than merely unlikely: the torn paper is painted
   behind the picture and the picture is never inside the clipped box.

   z-index 0 and 1, not -1 and auto. A negative-z-index pseudo-element paints
   below its own parent's background, which is the trap that once made every
   page render ink on ink. */
.mat-torn { background: none; }
.mat-torn::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--mat-paper);
  clip-path: var(--mount-torn);
}
.mat-torn > * { position: relative; z-index: 1; }

.pin {
  position: absolute;
  z-index: 3;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -40%);
  border-radius: 50%;
  background: var(--accent);
  border: 2.5px solid var(--edge);
  /* The ring is what makes it a pin head rather than a list bullet. */
  box-shadow: inset 0 0 0 2.5px color-mix(in oklab, var(--paper) 70%, transparent);
}

/* ---- marks made by a hand ----

   The overlay is the picture's own pixel space, so geometry is authored in
   source pixels. Stroke width is the exception: non-scaling-stroke keeps it a
   constant number of DISPLAYED pixels, because 3px on a 3000px-wide screenshot
   shown at 600px is 0.6px, which is to say nothing at all. */
.hand {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.hand .ink {
  fill: none;
  stroke: var(--accent);
  stroke-width: var(--hand-weight, 5);
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
/* A highlighter multiplies. It does not cover: text under a marker stays
   readable, and a wash that hid the words would be a censor bar with the
   wrong colour. */
.hand .wash {
  fill: var(--accent);
  opacity: 0.38;
  mix-blend-mode: multiply;
  stroke: none;
}
`;

/** Pictures open their own stacking context above the texture. */
export const PLATE_LAYER = `.plate, .zoom, .mat { z-index: 1; isolation: isolate; }

`;

/** The censor bar. */
export const REDACT = `/* Redaction. Never pixelation: it is a digital artefact in a paper world, it
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
