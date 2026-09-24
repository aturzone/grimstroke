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
/* The gradient is its own layer with its own size. Given only the ruling's size, it took that
   size too and repeated every 28 pixels across the page -- a column of shadow per rule, which
   turned every lined notebook into squared paper. */
.leaf-verso {
  background-image:
    linear-gradient(to left, rgba(0, 0, 0, 0.19), rgba(0, 0, 0, 0) 9%),
    var(--paper-rule, none);
  background-size: 100% 100%, var(--paper-rule-size, auto);
  background-repeat: no-repeat, repeat;
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.1);
}
.leaf-recto {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.19), rgba(0, 0, 0, 0) 9%),
    var(--paper-rule, none);
  background-size: 100% 100%, var(--paper-rule-size, auto);
  background-repeat: no-repeat, repeat;
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
/* What is on a page is placed from its corner, as on a board: the layer covers the whole
   leaf, padding and all, so an item at (40, 44) sits where the old column started. */
.leaf > .leaf-items { position: absolute; inset: 0; z-index: 1; }
/* A column written to a page, as one object: the rhythm a leaf's body always had. */
.stack > .block:first-child { margin-block-start: 0; }
.stack .note .actions, .stack .note .grips { display: none; }
.stack > .note { margin-block: 26px 6px; }
/* A note bound into a leaf is printed there: its toolbar would be six buttons that do
   nothing, and its tape reaches up past its own top, so it keeps clear of the line above. */
.leaf .note .actions, .leaf .note .grips { display: none; }
.leaf .note .handle { justify-content: flex-start; }
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
/* ---- shut ----

   The cover lies over the right-hand leaf, hinged at the spine, and the left-hand side is the
   bare board of the back cover. Opening it swings the cover over to the left about the spine
   -- the one movement everybody knows a notebook makes -- and the spread is underneath. */
.book[data-closed] .book-spread,
.book[data-closed] .book-gutter { visibility: hidden; }
.book[data-closed]::before { inset-inline-start: calc(50% - 8px); }
/* While the cover swings, the page under it is there (the cover hides it until it lifts), and
   the left-hand page is not until the cover has passed upright and is about to land on it. */
.book:not([data-single])[data-lifting] .leaf-verso { visibility: hidden; }
.book-closed {
  position: absolute;
  z-index: 6;
  inset-block: 24px;
  inset-inline-start: 50%;
  inset-inline-end: 24px;
  transform-origin: left center;
  transform: perspective(3000px) rotateY(0deg);
  /* Nothing on this element may flatten it -- no opacity, no filter, no overflow. Opacity was
     what broke it: a fading hinge is drawn flat, so both faces were drawn on one plane and the
     front showed through the back, mirrored, halfway over. */
  transform-style: preserve-3d;
  cursor: pointer;
  transition: transform 900ms cubic-bezier(0.55, 0.08, 0.2, 1);
}
:root[dir='rtl'] .book-closed { transform-origin: right center; }
.book-face, .book-inside {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
/* Everything on the cover that has a transform of its own -- a sticker, the tilted hint -- is
   its own layer in Firefox, and would show through from behind unless it says so too. */
.book-face * { backface-visibility: hidden; }
.book-closed.is-opening .book-closed-hint { opacity: 0; }
.book-face {
  box-shadow: 14px 18px 0 rgba(0, 0, 0, 0.35);
  transition: box-shadow 900ms linear;
}
.book-face > .cover { position: absolute; inset: 0; }
/* A spine edge on the hinge side, so it reads as a board with thickness rather than a card. */
.book-face::before {
  content: '';
  position: absolute;
  z-index: 2;
  inset-block: 0;
  inset-inline-start: 0;
  width: 14px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.05) 70%, transparent);
  pointer-events: none;
}
:root[dir='rtl'] .book-face::before {
  background: linear-gradient(to left, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.05) 70%, transparent);
}
/* The inside of the front board: an endpaper on the cloth, its own face, turned away. */
.book-inside {
  transform: rotateY(180deg);
  background-color: color-mix(in oklab, var(--paper) 80%, var(--cover, var(--accent)));
  background-image: repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.05) 0 2px, transparent 2px 9px);
  box-shadow: inset 0 0 0 10px var(--cover, var(--accent));
  transition: opacity 260ms linear;
}
.book-closed:hover { transform: perspective(3000px) rotateY(-7deg); }
:root[dir='rtl'] .book-closed:hover { transform: perspective(3000px) rotateY(7deg); }
.book-closed:focus-visible { outline: 3px solid var(--paper); outline-offset: 6px; }
.book-closed.is-opening,
.book-closed.is-opening:hover { transform: perspective(3000px) rotateY(-180deg); pointer-events: none; }
:root[dir='rtl'] .book-closed.is-opening,
:root[dir='rtl'] .book-closed.is-opening:hover { transform: perspective(3000px) rotateY(180deg); }
.book-closed.is-opening .book-face { box-shadow: 0 0 0 rgba(0, 0, 0, 0); }
/* Landed: the inside of the board gives way to the first page beneath it. */
/* The front is put away first: in Firefox a face turned away shows through a fading sibling,
   mirrored, whatever backface-visibility says. */
.book-closed.is-landed .book-face { visibility: hidden; }
.book-closed.is-landed .book-inside { opacity: 0; }
/* The lifting board's shadow sweeps across the page it uncovers. */
.book[data-opening] .leaf-recto::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.28), transparent 60%);
  animation: gs-lift-shade 900ms cubic-bezier(0.55, 0.08, 0.2, 1) forwards;
}
:root[dir='rtl'] .book[data-opening] .leaf-recto::before {
  background: linear-gradient(to left, rgba(0, 0, 0, 0.28), transparent 60%);
}
@keyframes gs-lift-shade { from { opacity: 1; } to { opacity: 0; } }
.book-closed-hint {
  position: absolute;
  z-index: 3;
  inset-block-end: 4%;
  inset-inline-end: 5%;
  padding: 6px 12px;
  background: var(--paper);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  font-family: var(--mono-font);
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transform: rotate(-3deg);
}
/* One page at a time -- a phone -- and the cover is the whole book, not the right half of a
   spread that is not being shown. */
.book[data-single] .book-closed { inset-inline-start: 24px; }
.book[data-single][data-closed]::before { inset-inline-start: 12px; }
/* On a phone the cover is the whole book; it swings open a little way and is gone. */
.book[data-single] .book-closed.is-opening { transform: perspective(1600px) rotateY(-96deg); }
:root[dir='rtl'] .book[data-single] .book-closed.is-opening { transform: perspective(1600px) rotateY(96deg); }
@media (prefers-reduced-motion: reduce) {
  .book-closed, .book-closed:hover { transition: opacity 220ms linear; transform: none; }
  .book-closed.is-opening,
  :root[dir='rtl'] .book-closed.is-opening,
  .book[data-single] .book-closed.is-opening { transform: none; opacity: 0; }
  .book[data-opening] .leaf-recto::before { display: none; }
}

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
/* A portrait stuck on: the drawing as a small photo, keyline and hard shadow. */
.sticker-photo {
  display: block;
  border: 1.5px solid #14110e;
  box-shadow: 1.5px 2px 0 rgba(0, 0, 0, 0.35);
}

/* Whose notebook it is: their card, pasted on wherever they put it. */
.sticker-card > .profile { max-width: none; width: 100%; }
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
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 48px 54px;
  padding: 8px 18px 0;
}
/* The books stand on something. A row of floating covers is a grid of rectangles; a plank
   under them -- a lit top edge and a dark front lip -- is a shelf. Each book carries its own
   length of plank, reaching into the gaps either side, so every row that wraps is a shelf
   too and the lengths meet into one. */
.book3d::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset-inline: -28px;
  top: calc(var(--book-height) + 4px);
  height: 14px;
  background: linear-gradient(to bottom,
    color-mix(in oklab, var(--desk) 55%, #fff) 0 2px,
    color-mix(in oklab, var(--desk) 70%, #000) 2px 100%);
  box-shadow: 0 10px 16px rgba(0, 0, 0, 0.3);
}

.book3d {
  --book-width: 176px;
  --book-height: 236px;
  --board: color-mix(in oklab, var(--cover, var(--accent)) 78%, #000);
  position: relative;
  width: var(--book-width);
  perspective: 1100px;
  /* The eye is above the shelf, so the top of the block of paper is in view. */
  perspective-origin: 50% -60%;
  animation: gs-shelf-in 520ms cubic-bezier(0.2, 0.8, 0.25, 1) both;
  animation-delay: calc(var(--i, 0) * 60ms);
}
@keyframes gs-shelf-in {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: none; }
}

/* Turned so the SPINE faces you, as a book on a shelf is, and looked at slightly from above
   so the block of paper shows along the top. It was turned the other way once: the spine
   faced away, was drawn through the book from behind, and sat half its thickness off the
   cover -- a strip floating beside every notebook, with its lettering mirrored. */
.book3d-stage {
  position: relative;
  width: var(--book-width);
  height: var(--book-height);
  transform-style: preserve-3d;
  transform: rotateX(-7deg) rotateY(24deg) rotateZ(var(--lean, 0deg));
  transition: transform 420ms cubic-bezier(0.2, 0.8, 0.25, 1);
}
/* Pointed at, it is pulled a little out of the row and turned to show its cover. */
.shelf-link:hover .book3d-stage,
.shelf-link:focus-visible .book3d-stage,
.book3d:hover .book3d-stage {
  transform: translate3d(0, -10px, 26px) rotateX(-4deg) rotateY(8deg);
}

.book3d-cover,
.book3d-back {
  position: absolute;
  inset: 0;
}
.book3d-cover { transform: translateZ(calc(var(--spine-depth) / 2)); }
.book3d-cover .cover { box-shadow: inset 3px 0 0 rgba(0, 0, 0, 0.18); }
.book3d-back {
  transform: translateZ(calc(var(--spine-depth) / -2));
  background: var(--board);
}
/* The spine: at the left edge, spanning front to back, facing out. */
.book3d-spine {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: var(--spine-depth);
  transform-origin: left center;
  transform: translateZ(calc(var(--spine-depth) / -2)) rotateY(-90deg);
  background:
    linear-gradient(to bottom, transparent 7%, rgba(0, 0, 0, 0.28) 7% 7.8%, transparent 7.8% 92.2%,
      rgba(0, 0, 0, 0.28) 92.2% 93%, transparent 93%),
    linear-gradient(to right, rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.08) 45%, rgba(0, 0, 0, 0.25)),
    var(--board);
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
  /* Read bottom to top, as a spine is on a European shelf. */
  transform: rotate(180deg);
  max-height: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The block of paper, seen from above between the boards: one fine line per leaf, so a full
   notebook is visibly thicker than a new one. */
.book3d-top {
  position: absolute;
  top: 0;
  left: 2px;
  width: calc(var(--book-width) - 5px);
  height: var(--spine-depth);
  transform-origin: top center;
  transform: translateZ(calc(var(--spine-depth) / 2 - 1px)) rotateX(-90deg);
  background-color: #f1ede1;
  background-image: repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.13) 0 1px, transparent 1px 3px);
}
/* Where it stands: a soft contact shadow on the shelf, which is what puts it ON the shelf. */
.book3d-shadow {
  position: absolute;
  inset-inline: 6% -2%;
  top: calc(var(--book-height) - 6px);
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.5), transparent);
  filter: blur(2px);
  transition: transform 420ms cubic-bezier(0.2, 0.8, 0.25, 1), opacity 420ms linear;
}
.shelf-link:hover .book3d-shadow,
.book3d:hover .book3d-shadow { transform: scale(0.86); opacity: 0.6; }

.book3d-caption {
  display: grid;
  gap: 2px;
  margin-block-start: 26px;
  color: color-mix(in oklab, var(--paper) 88%, var(--desk));
  font-family: var(--mono-font);
  font-size: 11px;
  line-height: 1.35;
}
.book3d-caption b {
  overflow: hidden;
  font-family: var(--hand-font);
  font-size: 19px;
  font-weight: 700;
  color: var(--paper);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.book3d-caption span { opacity: 0.7; }

.shelf-tag {
  justify-self: start;
  margin-block-start: 6px;
  padding: 2px 8px;
  background: color-mix(in oklab, var(--desk) 55%, #000);
  color: color-mix(in oklab, var(--paper) 80%, var(--desk));
  font-family: var(--mono-font);
  font-size: 10px;
  letter-spacing: var(--label-tracking);
}
.book3d.is-archived .book3d-cover { filter: saturate(0.72) brightness(0.92); }
@media (prefers-reduced-motion: reduce) {
  .book3d { animation: none; }
  .book3d-stage { transition: none; }
}


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
  /* Under the top bar, not over it: the bar is how you get out again -- "pages" closes it,
     and the other actions stay in reach. Over it, the grid was a room with no door. */
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  align-content: start;
  gap: 14px;
  padding: 84px 28px 28px;
  overflow: auto;
  background: color-mix(in oklab, var(--desk) 88%, #000);
}
.page-thumb {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.page-thumb > .leaf {
  width: var(--leaf-width);
  height: var(--leaf-height);
  min-height: 0;
  transform: scale(var(--thumb-scale, 0.17));
  transform-origin: 0 0;
}
.page-thumb .gs-leaf-edit, .page-thumb .leaf-folio { display: none; }
.page-cell .page-number, .page-cell .page-hint { position: relative; z-index: 1; }
.page-cell .page-number {
  justify-self: start;
  padding: 0 4px;
  background: var(--paper);
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
