/**
 * The character, in both art styles.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The character, in both art styles. */
export const FACE = `/* The character.

   Comic-book construction: flat fills and ONE keyline weight holding them together. No
   gradients, no soft shadows, no highlights except the two dots in the eyes -- the moment a
   face is shaded it stops looking drawn and starts looking rendered.

   Colour is entirely custom properties, so re-colouring a character is six writes and no
   redraw of any path.

   NO BACKTICKS IN THIS FILE. It is one CSS template literal. */

.face-art {
  --fc-skin: #f6c89a;
  --fc-hair: #2b2118;
  --fc-ink: #14110e;
  --fc-eyes: #14110e;
  --fc-mouth: #c0392f;
  --fc-accent: #ff2e63;
  --fc-cloth: #35508f;
  --fc-backdrop: transparent;
  --fc-key: 5;
  display: block;
  overflow: visible;
}

/* One keyline weight for the whole face. It is set here rather than per path so that a
   character drawn at 40px and the same character at 400px have the SAME line, in proportion
   -- an SVG scales its strokes with it, which is exactly what a drawn line does. */
.face-art .fc-part path,
.face-art .fc-part circle,
.face-art .fc-part ellipse,
.face-art .fc-part rect {
  stroke: var(--fc-ink);
  stroke-width: var(--fc-key);
  stroke-linejoin: round;
  stroke-linecap: round;
  paint-order: stroke fill;
}

/* EVERY ONE OF THESE NAMES .fc-part, and that is not decoration.

   The rule above selects an element (path, circle, ellipse) inside a class, which scores
   higher than a bare class does -- so a plain '.face-art .fc-line { fill: none }' LOST to
   it, and the earring hoops, which are circles meant to be stroked outlines, were filled
   solid black. Matching the same depth puts these back in charge. */
.face-art .fc-part .fc-backdrop { fill: var(--fc-backdrop); stroke: none; }
.face-art .fc-backdrop { fill: var(--fc-backdrop); stroke: none; }
.face-art .fc-part .fc-skin { fill: var(--fc-skin); }
.face-art .fc-part .fc-hair { fill: var(--fc-hair); }
.face-art .fc-part .fc-ink { fill: var(--fc-ink); }
.face-art .fc-part .fc-white { fill: #fffdf8; }
.face-art .fc-part .fc-eyes { fill: var(--fc-eyes); }
.face-art .fc-part .fc-mouth { fill: var(--fc-mouth); }
.face-art .fc-part .fc-accent { fill: var(--fc-accent); }
.face-art .fc-part .fc-cloth { fill: var(--fc-cloth); }
.face-art .fc-part .fc-tongue { fill: color-mix(in oklab, var(--fc-mouth) 55%, #ffb3c1); }
.face-art .fc-part .fc-plaster { fill: #efd2ad; }
/* A bald head's sheen: two short strokes of light, never a gradient -- a gradient is a sheen
   on glass, and this is a drawing. */
.face-art .fc-part .fc-shine { fill: none; stroke: #fffdf8; stroke-width: 4.5; opacity: 0.75; }

/* A HEAVIER CONTOUR ROUND THE SILHOUETTE.

   Uniform line weight gives every edge the same importance, and the face falls apart into
   the parts it was assembled from -- which is exactly what it looked like. A comic artist
   draws the outside of the head with a fatter pen than the inside of it, so the head reads
   as one solid object and the features read as marks upon it. */
.face-art .fc-shape path,
.face-art .fc-ears path,
.face-art .fc-hair path { stroke-width: calc(var(--fc-key) * 1.55); }

/* The lit side. Multiplied rather than filled with a darker skin tone, so it is correct on
   every skin colour without a second swatch anywhere. */
.face-art .fc-shade path {
  fill: var(--fc-ink);
  stroke: none;
  opacity: .13;
  mix-blend-mode: multiply;
}

/* The hair's shadow on the forehead, and the light in the hair. Multiplied and lightened
   rather than coloured, so both are right on every hair and skin colour. */
.face-art .fc-cast path { fill: var(--fc-ink); stroke: none; opacity: 0.16; mix-blend-mode: multiply; }
.face-art .fc-strands path {
  fill: none;
  stroke: color-mix(in oklab, var(--fc-hair) 52%, #fff);
  stroke-width: 3.6;
  stroke-linecap: round;
  opacity: 0.55;
}

/* Stroked, never filled: a line that picks up a fill closes itself into a blob, and an
   eyebrow drawn as a stroke would become a solid wedge. */
.face-art .fc-part .fc-line { fill: none; }
.face-art .fc-part .fc-wide { stroke-width: calc(var(--fc-key) + 1.5); }
.face-art .fc-part .fc-thick { stroke-width: calc(var(--fc-key) + 0.5); fill: none; }
.face-art .fc-part .fc-accent-line { stroke: var(--fc-accent); fill: none; }

/* Stubble and blush are the halftone tile, the same one the sticky notes use. A screen of
   dots is how a printed comic says "darker here" without a second colour. */
.face-art .fc-part .fc-dots {
  fill: url(#cn-halftone-dark);
  stroke: none;
  opacity: .68;
}

/* ---- pixel art ----

   Roles, not colours, so the same sprite re-themes. The shading cells are derived from the
   skin and hair with color-mix, which is safe here: it is an ordinary property, not a
   gradient stop. */
.face-pixel .px { stroke: none; }
.face-pixel .px-K { fill: var(--fc-ink); }
.face-pixel .px-S { fill: var(--fc-skin); }
.face-pixel .px-D { fill: color-mix(in oklab, var(--fc-skin) 76%, var(--fc-ink)); }
.face-pixel .px-H { fill: var(--fc-hair); }
.face-pixel .px-L { fill: color-mix(in oklab, var(--fc-hair) 68%, #fff); }
.face-pixel .px-W { fill: #fffdf8; }
.face-pixel .px-E { fill: var(--fc-eyes); }
.face-pixel .px-M { fill: var(--fc-mouth); }
.face-pixel .px-T { fill: #fffdf8; }
.face-pixel .px-A { fill: var(--fc-accent); }
.face-pixel .px-G { fill: color-mix(in oklab, var(--fc-skin) 55%, #fff); }
.face-pixel .px-C { fill: var(--fc-cloth); }
.face-pixel .px-B { fill: color-mix(in oklab, var(--fc-cloth) 74%, var(--fc-ink)); }
.face-pixel .px-P { fill: color-mix(in oklab, var(--fc-mouth) 55%, #ffb3c1); }
.face-pixel .px-R { fill: color-mix(in oklab, var(--fc-mouth) 40%, var(--fc-skin)); }
.face-pixel .px-Q { fill: #efd2ad; }
.face-pixel .px-backdrop { fill: var(--fc-backdrop); }
/* No smoothing, at any size. A pixel that is allowed to blur is not a pixel. */
.face-pixel { image-rendering: pixelated; shape-rendering: crispEdges; }

@media (forced-colors: active) {
  .face-art .fc-skin, .face-art .fc-hair, .face-art .fc-accent { fill: Canvas; }
  .face-art .fc-part path, .face-art .fc-part circle, .face-art .fc-part ellipse {
    stroke: CanvasText;
  }
}
`;

/** A character's profile card. */
export const PROFILE = `/* ---- the profile card ----

   A card, on photo paper whatever the page is printed on, sized entirely against its own
   width: one container unit is a hundredth of the card, so a card is the same card at 180px
   on a board and at 420px on its own page. */
.profile {
  position: relative;
  width: 100%;
  max-width: 340px;
  container-type: inline-size;
  transform: rotate(var(--pf-tilt, 0deg));
}
.board .item > .profile, .cover .profile { max-width: none; }
.profile-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding-block-end: 6cqw;
  background: var(--mat-paper);
  color: var(--mat-ink);
  border: max(1.5px, 0.7cqw) solid var(--mat-ink);
  box-shadow: 2cqw 2.4cqw 0 rgba(0, 0, 0, 0.32);
}
/* Tooth, as on every other sheet: translucent, so no blend mode. */
.profile-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--grain, none);
  opacity: 0.35;
  pointer-events: none;
}
/* Two strips of tape across the top corners: it was stuck here, by somebody. */
.profile::before, .profile::after {
  content: '';
  position: absolute;
  z-index: 2;
  inset-block-start: -2.6cqw;
  width: 22cqw;
  height: 6.5cqw;
  background: color-mix(in oklab, #f4efe0 88%, var(--pf-accent));
  opacity: 0.78;
  border-inline: 1px solid rgba(0, 0, 0, 0.14);
}
.profile::before { inset-inline-start: -5cqw; transform: rotate(-24deg); }
.profile::after { inset-inline-end: -5cqw; transform: rotate(22deg); }

.profile-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2.6cqw 5cqw 2.4cqw;
  background: var(--pf-accent);
  color: var(--pf-on-accent);
  border-block-end: max(1.5px, 0.7cqw) solid var(--mat-ink);
  font-family: var(--mono-font);
  font-size: 3.7cqw;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1;
  text-transform: uppercase;
}
.profile-no { letter-spacing: 0.08em; font-variant-numeric: tabular-nums; }
.profile-portrait { width: 64cqw; margin: 5cqw auto 1cqw; }
.profile-portrait .face-art { width: 100%; height: auto; }
.profile-name {
  padding-inline: 6cqw;
  font-family: var(--marker-font);
  font-size: 13cqw;
  font-weight: 400;
  line-height: 0.95;
  text-align: center;
  overflow-wrap: anywhere;
}
.profile-role {
  margin: 2cqw 6cqw 0;
  text-align: center;
  font-family: var(--hand-font);
  font-size: 7.4cqw;
  font-weight: 700;
  line-height: 1.15;
}
/* A swipe of the accent under the role -- the highlighter across the one line that says what
   they are for. A plain var() in the stop: a color-mix() there renders nothing in Firefox. */
.profile-role::after {
  content: '';
  display: block;
  width: 46%;
  height: 1.8cqw;
  margin: 0.8cqw auto 0;
  background: var(--pf-accent);
  transform: rotate(-1.5deg);
  opacity: 0.85;
}
.profile-details {
  margin: 5cqw 7cqw 0;
  padding-block-start: 3cqw;
  border-block-start: max(1px, 0.4cqw) dashed color-mix(in oklab, var(--mat-ink) 35%, transparent);
  font-family: var(--mono-font);
  font-size: 3.7cqw;
  line-height: 1.35;
}
.profile-row { display: grid; grid-template-columns: 36% 1fr; gap: 2cqw; padding-block: 0.9cqw; }
.profile-row dt { font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.6; }
.profile-row dd { margin: 0; font-weight: 700; overflow-wrap: anywhere; }
.profile-bio {
  margin: 3.5cqw 7cqw 0;
  font-family: var(--hand-font);
  font-size: 5.6cqw;
  line-height: 1.2;
}
.profile-stamp {
  position: absolute;
  z-index: 1;
  inset-block-start: 50cqw;
  inset-inline-end: 4cqw;
  width: 29cqw;
  height: 29cqw;
  transform: rotate(var(--pf-stamp, -12deg));
  opacity: 0.8;
  mix-blend-mode: multiply;
  pointer-events: none;
}
.profile-stamp-ring { fill: none; stroke: var(--pf-accent); stroke-width: 2.4; }
.profile-stamp-tick {
  fill: none;
  stroke: var(--pf-accent);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.profile-stamp text {
  fill: var(--pf-accent);
  font-family: var(--mono-font);
  font-size: 9.4px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
:root[data-uppercase='off'] .profile-band, :root[data-uppercase='off'] .profile-row dt {
  text-transform: none;
  letter-spacing: 0;
}
`;
