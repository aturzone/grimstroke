/**
 * The notebook's chrome: the page turner.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The page turner. */
export const TURNER = `/* ---- the turner ---- */
.gs-turner {
  position: fixed;
  inset-block-end: 18px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  user-select: none;
}
:root[dir='rtl'] .gs-turner { transform: translateX(50%); }
.gs-jump { display: flex; align-items: center; gap: 8px; padding-inline: 8px; font-variant-numeric: tabular-nums; }
.gs-jump-label { color: var(--gs-soft); font-size: var(--gs-t1); letter-spacing: 0.08em; text-transform: uppercase; }
.gs-jump input {
  width: 58px;
  height: 30px;
  padding: 0 6px;
  border: 1.5px solid var(--gs-faint);
  border-radius: 2px;
  background: var(--paper);
  color: var(--ink);
  font: inherit;
  font-weight: 700;
  text-align: center;
  -moz-appearance: textfield;
}
.gs-jump input::-webkit-inner-spin-button { display: none; }
.gs-jump input:focus-visible { outline: 2.5px solid var(--gs-ink); outline-offset: 1px; }
@media (max-width: 760px) {
  .gs-turner { inset-block-end: 8px; }
  .gs-jump-label { display: none; }
}

/* The book lies between the bar and the turner, never under either. The app scales it to
   fit that room; this makes the room. */
body.on-book.live { padding-block: 76px 84px; }

/* ---- one leaf at a time ----

   A phone reads the notebook a leaf at a time. The spread underneath is still two leaves;
   only one is shown, and the book narrows to one leaf and its boards. */
.book[data-single] { width: calc(var(--leaf-width) + 48px); padding: 24px; }
.book[data-single]::before { inset: 12px; }
.book[data-single] .book-spread { grid-template-columns: 1fr; }
.book[data-single][data-side='verso'] .book-spread > .leaf:nth-child(2),
.book[data-single][data-side='recto'] .book-spread > .leaf:nth-child(1) { display: none; }
.book[data-single] .book-gutter { display: none; }
.book[data-single] .leaf-verso { background-image: var(--paper-rule, none); }
.book[data-single] .leaf-recto { background-image: var(--paper-rule, none); }

/* ---- the cover studio ----

   The closed notebook, large, on the desk, with a card of choices beside it. */
.gs-cover-studio {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 28px;
  align-items: center;
  padding: 84px 28px 28px;
  background: color-mix(in oklab, var(--desk) 90%, #000);
  animation: gs-rise var(--gs-mid) var(--gs-ease);
}
.gs-cover-stage {
  justify-self: center;
  width: min(100%, 460px, calc((100vh - 140px) * 0.75));
  aspect-ratio: 3 / 4;
  touch-action: none;
}
.gs-cover-stage .cover {
  border-radius: 2px 6px 6px 2px;
  box-shadow: -3px 0 0 color-mix(in oklab, var(--cover, var(--accent)) 70%, #000),
    14px 18px 0 rgba(0, 0, 0, 0.32);
}
.gs-cover-stage .sticker { cursor: grab; }
.gs-cover-stage .sticker:active { cursor: grabbing; }
.gs-cover-stage .sticker[data-chosen] { outline: 2px dashed var(--gs-paper); outline-offset: 4px; }
.gs-cover-stage .sticker:focus-visible { outline: 2.5px solid var(--gs-paper); outline-offset: 4px; }
.gs-cover-panel {
  align-self: stretch;
  max-height: calc(100vh - 112px);
  overflow: auto;
  padding: 0 0 12px;
  overscroll-behavior: contain;
}
.gs-cover-head {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px 10px 16px;
  background: var(--gs-paper);
  border-block-end: 1.5px solid var(--gs-faint);
}
.gs-cover-head h2 { font-family: var(--marker-font); font-size: var(--gs-t5); font-weight: 400; line-height: 1; }
.gs-cover-section { padding: 4px 8px 6px; }
.gs-cover-section .gs-field { margin: 0 8px 8px; width: calc(100% - 16px); }
.gs-cover-hint { padding: 10px 16px; color: var(--gs-soft); font-size: var(--gs-t1); line-height: 1.5; }
.gs-cover-chosen { margin: 6px 8px 0; padding: 4px 0 10px; border: 1.5px dashed var(--gs-faint); border-radius: var(--gs-radius); }
.gs-cover-chosen > .gs-btn { margin: 4px 8px 0; }
.gs-cover-swatches { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 8px 8px; }
.gs-cover-swatch {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1.5px solid var(--gs-line);
  border-radius: 2px;
  background: var(--sw);
  cursor: pointer;
}
.gs-cover-swatch[aria-pressed='true'] { outline: 2.5px solid var(--gs-ink); outline-offset: 2px; }
.gs-cover-custom { width: 26px; height: 26px; padding: 0; border: 1.5px solid var(--gs-line); background: none; cursor: pointer; }
.gs-cover-range { display: grid; grid-template-columns: 52px 1fr; align-items: center; gap: 8px; padding: 2px 8px; font-size: var(--gs-t1); }
.gs-cover-range input { width: 100%; accent-color: var(--gs-ink); }
.gs-field {
  display: block;
  padding: 7px 9px;
  border: 1.5px solid var(--gs-faint);
  border-radius: 2px;
  background: var(--gs-paper);
  color: var(--gs-ink);
  font: inherit;
  resize: vertical;
}
.gs-field:focus-visible { outline: 2.5px solid var(--gs-ink); outline-offset: 1px; }
@media (max-width: 820px) {
  .gs-cover-studio { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); align-items: start; padding: 64px 10px 10px; gap: 12px; }
  .gs-cover-stage { width: min(62vw, 300px, calc((45vh) * 0.75)); }
  .gs-cover-panel { max-height: none; }
}
`;
