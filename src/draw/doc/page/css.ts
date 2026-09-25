/**
 * A page: the sheet, its shadow, and the header band.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** A page: the sheet, its shadow, and the header band. */
export const PAGE_LAYOUT = `/* .mount carries the hard shadow as a real sibling element.

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
  background-color: var(--paper);
  /* The ruling is the sheet's own background, under everything. Grain and
     halftone are pseudo-elements ABOVE the text, because on real paper the
     fibre is on top of the ink too. */
  background-image: var(--paper-rule, none);
  background-size: var(--paper-rule-size, auto);
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
  border-radius: calc(3px * var(--round, 1) + var(--round-up, 0px));
  white-space: nowrap;
}

.trail {
  margin-block-start: 10px;
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  opacity: 0.85;
}
.trail .sep { opacity: 0.5; padding-inline: 4px; }

`;

/** The look of a sheet: torn, halftoned, grained. */
export const PAGE_SHEET = `/* The look: late-80s photocopied zine. Risograph flat spot inks, photocopier
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
/* Paper grain. Same reasoning and same layer as the halftone above it: below
   the plate, never on top of it. Three background layers -- fibre that runs one
   way, grain that runs none, and the dirt a photocopier leaves. */
.sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--grain, none);
  background-repeat: repeat;
  /* No blend mode. The tile is a sparse field of dark specks with the occasional light
     fleck, mostly transparent, so laid over the paper as it is it leaves the colour alone
     and only adds tooth -- and the light flecks actually show, which under the multiply it
     used to carry they never did: white multiplied by anything is that thing. */
  opacity: var(--grain-opacity, 0);
}

`;
