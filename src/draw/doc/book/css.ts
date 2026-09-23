/**
 * The open book.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The open book. */
export const SPREAD = `/* ---- the open book ---- */

/* The book sits in the MIDDLE of the desk.

   Left in normal flow it pinned itself to the top-left corner with the whole desk empty to
   the right of it, which does not read as a notebook lying open on a surface; it reads as a
   layout that was never finished. */
body.on-book { display: grid; place-content: center; }

.book {
  position: relative;
  margin-inline: auto;
  width: calc(var(--leaf-width) * 2 + 80px);
  padding: 40px;
  /*
   * A long perspective, and it is a measurement rather than a taste.
   *
   * A turning leaf pivots about the spine, so its outer edge swings towards the viewer by
   * up to a leaf's width. Perspective scales that edge by P / (P - width): at 2400 a 790px
   * page grew to 1030 mid-turn and the sheet swept up over the title bar and down past the
   * page turner, outside the book entirely. At 6400 the same page peaks at 866 -- which is
   * the height of the book including its 40px of board, so the leaf lifts clear of the
   * covers, as it should, and stops there.
   */
  perspective: 6400px;
}
/* The covers, open flat under the leaves.

   Without them the spread is two ruled rectangles floating on a desk. The board showing
   round the edge of the paper is most of what makes it a BOOK rather than two pages: it is
   the same reason the shelf view works, and it costs one pseudo-element. */
.book::before {
  content: '';
  position: absolute;
  inset: 24px;
  z-index: -1;
  background: var(--cover, color-mix(in oklab, var(--desk) 62%, #000));
  box-shadow: 0 20px 38px rgba(0, 0, 0, .42);
}
.book-spread {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  /* No gap. The leaves MEET at the binding; a gap between them is two sheets
     of paper lying next to each other, which is a different object. */
  gap: 0;
  filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.36));
}

.leaf {
  position: relative;
  min-height: var(--leaf-height);
  padding: 44px 40px 52px;
  background-color: var(--paper);
  background-image: var(--paper-rule, none);
  background-size: var(--paper-rule-size, auto);
  overflow: hidden;
}
/* The curve into the binding. Paper does not lie flat next to a spine, and the
   shadow that falls into the gutter is most of what says these two leaves are
   joined rather than adjacent. */
.leaf-verso {
  background-image:
    linear-gradient(to left, rgba(0, 0, 0, 0.19), rgba(0, 0, 0, 0) 9%),
    var(--paper-rule, none);
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.1);
}
.leaf-recto {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.19), rgba(0, 0, 0, 0) 9%),
    var(--paper-rule, none);
}
/* Paper tooth, the same translucent tile as a sticky note's. A leaf is paper; the
   only reason it is not torn is that it was cut, not ripped. */
.leaf::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--grain, none);
  background-repeat: repeat;
  opacity: .13;
}
.leaf > * { position: relative; z-index: 1; }
.leaf-absent { background: none; }
.leaf-absent::after { display: none; }
.leaf-body > .block:first-child { margin-block-start: 0; }
/* A note bound into a leaf is printed there: its toolbar would be six buttons that do
   nothing, and its tape reaches up past its own top, so it keeps clear of the line above. */
.leaf .note .actions, .leaf .note .grips { display: none; }
.leaf .note .handle { justify-content: flex-start; }
.leaf-body > .note { margin-block: 26px 6px; }
.leaf-folio {
  position: absolute;
  inset-block-end: 20px;
  inset-inline-end: 34px;
  font-family: var(--mono-font);
  font-size: var(--label-size);
  opacity: 0.45;
}
.leaf-verso .leaf-folio { inset-inline-end: auto; inset-inline-start: 34px; }

/* The binding: a dark seam with stitches down it. Two leaves that merely touch are two
   sheets of paper; the stitching is what says they are held together. */
.book-gutter {
  position: absolute;
  inset-block: 40px;
  inset-inline-start: 50%;
  width: 16px;
  transform: translateX(-50%);
  background:
    linear-gradient(90deg, rgba(0, 0, 0, .04), rgba(0, 0, 0, .26) 45%, rgba(0, 0, 0, .26) 55%, rgba(0, 0, 0, .04));
  pointer-events: none;
}
.book-gutter::after {
  content: '';
  position: absolute;
  inset-block: 6%;
  inset-inline-start: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: repeating-linear-gradient(
    to bottom,
    color-mix(in oklab, var(--paper) 62%, #000) 0 11px,
    transparent 11px 21px
  );
  opacity: .7;
}

`;

/** The cover, its materials and its stickers. */
export const COVER = `/* ---- the cover ---- */
.cover {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--cover, var(--accent));
  overflow: hidden;
  /* Everything on a cover is sized against the cover, so the same markup is a
     shelf thumbnail and a full-screen cover. "font-size: 15%" looked like it
     did this and does not -- a percentage font-size is a percentage of the
     INHERITED size, so the title came out about two pixels tall. */
  container-type: inline-size;
}
.cover-face {
  position: absolute;
  inset: 0;
  display: block;
}
.cover-title {
  position: absolute;
  inset-inline: 9%;
  inset-block-start: 12%;
  font-family: var(--marker-font);
  font-size: 14cqw;
  line-height: 1.06;
  white-space: pre-line;
  color: var(--cover-ink, #fbf9f4);
}

/* Materials. Each is a different surface, not a different hue -- which is the
   point of choosing one. */
.cover-card { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25); }
.cover-cloth {
  background-image:
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.08) 0 1px, transparent 1px 3px);
}
.cover-kraft {
  background-image:
    repeating-linear-gradient(74deg, rgba(0, 0, 0, 0.05) 0 2px, transparent 2px 7px),
    var(--grain, none);
  background-blend-mode: multiply;
}
/* A cover may still blend the tile, for a sheen the plain tile cannot give. It is one
   element, not a board of them, so the extra pass is affordable here. The tile was opaque
   once and an unblended layer then painted solid noise -- a dark green leather cover came
   out flat grey -- which is why it is translucent now. */
.cover-leather {
  background-image:
    radial-gradient(ellipse at 30% 18%, rgba(255, 255, 255, 0.11), transparent 62%),
    var(--grain, none);
  background-blend-mode: screen, soft-light;
}
.cover-plastic {
  background-image: linear-gradient(118deg, rgba(255, 255, 255, 0.14), transparent 42%);
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.18);
}

/* ---- stickers ----

   Positioned in percent of the cover, so a sticker stays where it was put
   whether the book is two hundred pixels wide on a shelf or filling the
   screen. Pixels would move every sticker at every size. */
.sticker {
  position: absolute;
  width: var(--sticker-width, 40%);
  transform: translate(-50%, -50%) rotate(var(--tilt, 0deg));
  transform-origin: 50% 50%;
}
.sticker img { display: block; width: 100%; }
.sticker .face-art { display: block; width: 100%; height: auto; }

/* Whose notebook it is: their card, pasted on below the title, slightly off true. */
.cover-profile {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-end: 6%;
  width: 54%;
  transform: translateX(-50%) rotate(-2.5deg);
}
:root[dir='rtl'] .cover-profile { transform: translateX(50%) rotate(2.5deg); }
.cover.has-profile .cover-title { font-size: 11.5cqw; inset-block-start: 8%; }
.sticker-text {
  display: block;
  padding: 0.35em 0.7em;
  background: var(--sticker, #f7d117);
  color: #14110e;
  font-family: var(--marker-font);
  font-size: 13cqw;
  line-height: 1.1;
  text-align: center;
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
}
.shape { display: block; width: 100%; aspect-ratio: 1; background: var(--sticker, #ff2e63); }
.shape-circle { border-radius: 50%; }
/* A star is a clip, so it stays a star at any sticker size. It had no rule at all, and every
   star on every cover was a square. */
.shape-star {
  clip-path: polygon(50% 0%, 61.8% 35.4%, 98% 35.4%, 68.6% 57.3%, 79.4% 91.2%, 50% 70%,
    20.6% 91.2%, 31.4% 57.3%, 2% 35.4%, 38.2% 35.4%);
}
.shape-band { aspect-ratio: 5 / 1; border-radius: 2px; }
.shape-tape {
  aspect-ratio: 4 / 1;
  background: color-mix(in oklab, var(--sticker, #f7f4ea) 40%, #fffdf6);
  opacity: 0.85;
  border-inline: 1px solid rgba(0, 0, 0, 0.16);
}

`;

/** The shelf, and books stood up in three dimensions. */
export const SHELF = `/* ---- the shelf ---- */
.shelves { padding: 40px 44px 60px; container-type: inline-size; }
.is-live .shelves { padding-block-start: 104px; }
.shelf-link { display: block; color: inherit; text-decoration: none; border-radius: 2px; }
.shelf-link:focus-visible { outline: 2.5px solid var(--paper); outline-offset: 10px; }
.shelf-link:focus-visible .book3d-stage { transform: rotateY(-12deg) rotateX(1deg); }
.shelf-empty {
  max-width: 440px;
  margin: 8vh auto 0;
  padding: 26px 28px;
  background: var(--mat-paper);
  color: var(--mat-ink);
  border: 1.5px solid var(--mat-ink);
  box-shadow: 5px 7px 0 rgba(0, 0, 0, 0.3);
  font-family: var(--mono-font);
  font-size: 12.5px;
  line-height: 1.7;
  transform: rotate(-1deg);
}
.shelf-empty-title { font-family: var(--marker-font); font-size: 34px; line-height: 1; margin-block-end: 10px; }
.shelf { margin-block-end: 44px; }
.shelf-name {
  margin-block-end: 18px;
  font-family: var(--mono-font);
  font-size: var(--label-size);
  letter-spacing: var(--label-tracking);
  color: color-mix(in oklab, var(--paper) 86%, var(--desk));
}
.shelf-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 42px;
  padding-block-end: 22px;
  /* The books stand on something. A row of floating covers is a grid of
     rectangles; a line under them is a shelf. */
  border-block-end: 3px solid color-mix(in oklab, var(--desk) 60%, #000);
  box-shadow: 0 5px 0 color-mix(in oklab, var(--desk) 82%, #000);
}

.book3d {
  --book-width: 176px;
  --book-height: 236px;
  position: relative;
  width: var(--book-width);
  perspective: 900px;
}
.book3d-stage {
  position: relative;
  width: var(--book-width);
  height: var(--book-height);
  transform-style: preserve-3d;
  /* Turned towards the viewer so the spine is visible. A book square-on is a
     rectangle, and the whole reason to draw it in three dimensions is to show
     that it is an object with a thickness that depends on how full it is. */
  transform: rotateY(-26deg) rotateX(3deg) rotateZ(var(--lean, 0deg));
  transition: transform 220ms ease;
}
.book3d:hover .book3d-stage { transform: rotateY(-12deg) rotateX(1deg); }

.book3d-cover {
  position: absolute;
  inset: 0;
  transform: translateZ(calc(var(--spine-depth) / 2));
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.38);
}
.book3d-spine {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: var(--spine-depth);
  transform: rotateY(-90deg) translateZ(calc(var(--spine-depth) / 2));
  transform-origin: left center;
  background: color-mix(in oklab, var(--cover, var(--accent)) 82%, #000);
  display: grid;
  place-items: center;
  overflow: hidden;
}
.book3d-spine span {
  font-family: var(--marker-font);
  font-size: 12px;
  color: #fbf9f4;
  white-space: nowrap;
  writing-mode: vertical-rl;
  /* The spine is rotated to face left, so what the viewer sees is its BACK -- and the title
     on it came out mirrored, every glyph reversed. The scaleX un-mirrors it in the spine's
     own coordinates; the rotate is what makes it read bottom to top, as a spine does. */
  transform: rotate(180deg) scaleX(-1);
  max-height: 88%;
  overflow: hidden;
}
/* The block of paper inside the cover.

   A rectangle slightly smaller than the cover, sitting just behind it, so the
   page edges peek out along the open side -- which is what actually says
   "there is paper in here". It was a rotated FACE first, translated by the
   book's width, and after perspective it landed as a dotted white line
   somewhere off to the right of the shelf.

   The stripes are the leaves. The gradient is 3px per line, so a fat book and
   a thin one have visibly different numbers of them. */
.book3d-leaves {
  position: absolute;
  inset-block: 4px;
  inset-inline-start: 5px;
  inset-inline-end: -4px;
  transform: translateZ(calc(var(--spine-depth) / 2 - 2px));
  background-color: #efece2;
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.16) 0 1px,
    transparent 1px 3px
  );
  box-shadow: inset -2px 0 3px rgba(0, 0, 0, 0.18);
}

.shelf-tag {
  display: inline-block;
  margin-block-start: 12px;
  padding: 2px 8px;
  background: color-mix(in oklab, var(--desk) 55%, #000);
  color: color-mix(in oklab, var(--paper) 80%, var(--desk));
  font-family: var(--mono-font);
  font-size: 10px;
  letter-spacing: var(--label-tracking);
}
.book3d.is-archived .book3d-cover { filter: saturate(0.72) brightness(0.92); }


`;

/** Turning a page. */
export const FLIP = `/* ---- turning a page ----

   The leaf being turned is a copy laid over the spread, rotated about the
   binding, with the page it reveals printed on its back. Underneath, the spread
   is already set to where it will be when the turn finishes -- so the moment
   the copy is removed nothing moves, which is what makes it feel like paper
   rather than like a transition. */
.flipper {
  position: absolute;
  inset-block-start: 40px;
  height: var(--leaf-height);
  width: var(--leaf-width);
  inset-inline-start: 50%;
  transform-style: preserve-3d;
  transform-origin: left center;
  pointer-events: none;
  z-index: 5;
  transition: transform 520ms cubic-bezier(0.34, 0.03, 0.2, 1);
  transform: rotateY(0deg);
}
.flipper.turn-back {
  inset-inline-start: auto;
  inset-inline-end: 50%;
  transform-origin: right center;
  transform: rotateY(-180deg);
}
.flipper.turn-forward[data-turning] { transform: rotateY(-180deg); }
.flipper.turn-back[data-turning] { transform: rotateY(0deg); }

.flip-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  overflow: hidden;
}
/* The back of a leaf is the same sheet seen from behind, so it is mirrored. */
.flip-face.face-back { transform: rotateY(180deg); }
.flip-face .leaf { width: 100%; height: 100%; min-height: 0; }

/* The shading that sweeps across a turning page. Paper catches the light as it
   lifts, and without it the turn reads as a flat rectangle rotating. */
.flip-shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0) 45%);
  opacity: 0;
  transition: opacity 520ms ease;
}
.flipper[data-turning] .flip-shade { opacity: 1; }

`;

/** Every leaf at once, for rearranging. */
export const PAGES = `/* ---- every page at once ----

   Flipping is for reading and this is for rearranging, and they want different
   things on screen: one shows two leaves at full size, the other shows forty so
   a chapter can be picked up and moved somewhere else. */
.pages-grid {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  align-content: start;
  gap: 14px;
  padding: 84px 28px 28px;
  overflow: auto;
  background: color-mix(in oklab, var(--desk) 88%, #000);
}
.page-cell {
  position: relative;
  aspect-ratio: 5 / 7;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  padding: 8px;
  border: 1.5px solid color-mix(in oklab, var(--paper) 30%, transparent);
  background-color: var(--paper);
  background-image: var(--paper-rule, none);
  color: var(--ink);
  font-family: var(--mono-font);
  font-size: 10px;
  text-align: start;
  cursor: grab;
}
.page-cell[data-selected] { outline: 3px solid var(--accent); outline-offset: 2px; }
.page-cell .page-number { font-size: 15px; font-weight: 700; }
.page-cell .page-hint { opacity: 0.55; }

`;

/** A book is a physical size, scaled rather than re-laid out. */
export const BOOK_SCALE = `/* A book is a PHYSICAL SIZE and a phone is not.

   The spread is 1200px across because that is what two leaves and their boards measure. Laid
   out smaller it stops being a spread -- a book whose two pages are different widths at
   different screen sizes is not a book. So it is scaled to fit instead, which is what
   holding one further away does, and the page stops scrolling sideways. */
body.on-book { overflow-x: clip; }
.book {
  /* Set by the app, which can divide a length by a length -- calc() cannot. */
  transform: scale(var(--book-scale, 1));
  transform-origin: top center;
}

@media (prefers-reduced-motion: reduce) {
  .book3d-stage, .flipper, .flip-shade { transition: none; }
}
`;
