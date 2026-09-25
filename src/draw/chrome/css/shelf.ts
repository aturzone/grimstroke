/**
 * The bookcase's chrome: a book taken down to look at, the bar for several chosen, the trash,
 * a book being carried, and the cat.
 */

export const SHELF_CHROME = `/* ---- a book taken down ---- */
.gs-preview {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  align-items: center;
  gap: clamp(20px, 5vw, 64px);
  padding: 90px clamp(16px, 6vw, 96px) 40px;
  background: rgba(12, 8, 5, 0.62);
  backdrop-filter: blur(3px);
}
.gs-preview-stage {
  display: grid;
  place-items: center;
  height: 100%;
  perspective: 1600px;
}
.gs-preview-book {
  position: relative;
  width: min(360px, 58vh * 0.72, 100%);
  aspect-ratio: 0.72;
  transform-style: preserve-3d;
  rotate: y 18deg;
  transition: rotate 500ms var(--gs-ease);
}
.gs-preview-book:hover { rotate: y 8deg; }
.gs-preview-front {
  position: absolute;
  inset: 0;
  container-type: inline-size;
  box-shadow: 18px 24px 36px rgba(0, 0, 0, 0.5);
  backface-visibility: hidden;
}
.gs-preview-front > .cover { position: absolute; inset: 0; }
/* The spine, hinged at the left edge and turned towards you, so the book has a thickness. */
.gs-preview-spine {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: var(--depth);
  transform-origin: left center;
  transform: rotateY(90deg);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.45), rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.3)), var(--cover);
  color: var(--cover-ink, #fbf9f4);
}
.gs-preview-spine .spine-title { font-size: 15px; }
.gs-preview-pages {
  position: absolute;
  inset-block: 4px;
  right: 0;
  width: var(--depth);
  transform-origin: right center;
  transform: rotateY(-90deg);
  background: repeating-linear-gradient(to right, #efe9da 0 2px, #d8d0bd 2px 3px);
}
.gs-preview-card {
  position: relative;
  padding: 22px 22px 18px;
  color: var(--gs-ink);
}
.gs-preview-card h2 {
  margin: 0 28px 14px 0;
  font-family: var(--hand-font);
  font-size: 30px;
  line-height: 1.05;
}
.gs-preview-card dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0 0 18px;
  font-size: var(--gs-t2);
}
.gs-preview-card dt {
  color: var(--gs-soft);
  font-family: var(--ui-font);
  font-size: var(--gs-t1);
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  padding-block-start: 2px;
}
.gs-preview-card dd { margin: 0; }
.gs-preview-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.gs-preview-actions .gs-btn { justify-content: center; border: 1.5px solid var(--gs-line); }
.gs-preview-actions [data-gs='preview-open'] { grid-column: 1 / -1; min-height: 42px; font-size: var(--gs-t3); }
.gs-preview-actions .gs-btn-danger { color: var(--gs-hot); }
.gs-preview-close { position: absolute; top: 10px; right: 10px; font-size: 20px; }
.spine.is-out { visibility: hidden; }
@media (max-width: 720px) {
  .gs-preview { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) auto; padding-block-start: 76px; overflow-y: auto; }
  .gs-preview-book { width: min(230px, 60vw); }
}

/* ---- several chosen ---- */
.gs-shelfbar {
  position: fixed;
  z-index: 60;
  left: 50%;
  bottom: 18px;
  translate: -50% 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  max-width: calc(100vw - 24px);
  padding: 6px 8px;
}
.gs-shelfbar-count {
  padding: 0 10px 0 6px;
  font-family: var(--ui-font);
  font-size: var(--gs-t2);
  color: var(--gs-soft);
}
.gs-shelfbar .gs-btn { border: 1.5px solid var(--gs-line); }
.gs-shelfbar .gs-btn-danger { color: var(--gs-hot); }

/* ---- the trash ---- */
.gs-trash-list { list-style: none; margin: 0; padding: 4px 16px; max-height: 50vh; overflow-y: auto; }
.gs-trash-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-block-end: 1px solid var(--gs-faint); }
.gs-trash-list b { display: block; font-family: var(--hand-font); font-size: 18px; }
.gs-trash-list small { color: var(--gs-soft); font-family: var(--ui-font); font-size: var(--gs-t1); }
.gs-trash-list .gs-btn { border: 1.5px solid var(--gs-line); flex: none; }
.gs-trash-note { padding: 8px 16px 0; color: var(--gs-soft); font-size: var(--gs-t1); }

/* ---- carried ---- */
.shelf-carry-count {
  position: absolute;
  top: -10px;
  right: -12px;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: calc(12px * var(--round, 1) + var(--round-up, 0px) * 0.5);
  background: var(--gs-hot);
  color: var(--gs-on-hot);
  font: 700 13px/24px var(--ui-font);
  text-align: center;
}

/* ---- the pet ----
   It stands beside the zoomed room, in the room's parent, so its pixels are whole screen pixels
   (app/shelf/pet.ts); the parent is where it is placed from. */
.shelves { position: relative; }
.shelf-pet {
  position: absolute;
  z-index: 5;
  left: 0;
  top: 0;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  pointer-events: none;
  transform-origin: 50% 50%;
  will-change: transform;
  /* No drop shadow: the art carries its own contact shadow, and the two stacked read as a smear. */
}
/* The food bowl: a little blue bowl, full, then empty. */
.shelf-bowl {
  position: absolute;
  z-index: 4;
  left: 0;
  top: 0;
  width: 36px;
  height: 18px;
  image-rendering: pixelated;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 9' shape-rendering='crispEdges'%3E%3Cpath d='M3 2h12v1H3zM2 3h1v1H2zM15 3h1v1h-1z' fill='%2324160f'/%3E%3Cpath d='M4 1h2v1H4zM7 1h3v1H7zM11 0h2v1h-2zM6 0h1v1H6zM9 0h1v1H9z' fill='%23b8743a'/%3E%3Cpath d='M3 3h12v1H3z' fill='%23d49552'/%3E%3Cpath d='M2 4h14v1H2zM2 5h14v1H2z' fill='%233f7fbf'/%3E%3Cpath d='M3 4h3v1H3z' fill='%2376a9dc'/%3E%3Cpath d='M3 6h12v1H3z' fill='%232f5f96'/%3E%3Cpath d='M1 4h1v3H1zM16 4h1v3h-1zM2 7h14v1H2z' fill='%2324160f'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
  transition: opacity 600ms linear 1800ms;
}
.shelf-bowl.is-empty { opacity: 0; }
body[data-feeding] .case-room { cursor: copy; }
body[data-feeding] .spine { cursor: copy; }

/* ---- your bookcase: the decorate panel ---- */
.gs-decorate {
  position: fixed;
  z-index: 62;
  top: 78px;
  right: 14px;
  bottom: 18px;
  width: min(360px, calc(100vw - 28px));
  overflow-y: auto;
  padding: 10px 12px 14px;
  display: grid;
  align-content: start;
  gap: 4px;
}
@media (max-width: 760px) {
  /* On a phone the panel covers the bookcase, and what was picked goes on the bookcase: while
     something is held the panel steps aside, and comes back once it is put down. */
  .gs-decorate { top: 62px; right: 8px; bottom: 8px; width: calc(100vw - 16px); }
  :where(body[data-placing]) .gs-decorate { display: none; }
}
.gs-decorate-head { display: flex; align-items: center; justify-content: space-between; }
.gs-decorate-head h2 { margin: 0; font-family: var(--hand-font); font-size: 22px; }
.gs-decorate-section { padding: 6px 0; border-block-end: 1px dashed var(--gs-faint); }
.gs-decorate-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
.gs-decorate-swatch { width: 34px; height: 34px; border: 1.5px solid var(--gs-line); border-radius: calc(50% * min(1, var(--round, 1))); cursor: pointer; }
.gs-decorate-swatch[aria-pressed='true'] { outline: 2.5px solid var(--gs-ink); outline-offset: 2px; }
.gs-wood-oak { background: #7a5230; } .gs-wood-walnut { background: #5a3a24; } .gs-wood-pine { background: #c79a5e; }
.gs-wood-cherry { background: #8a3b26; } .gs-wood-ebony { background: #2c2622; } .gs-wood-white { background: #e8e3da; }
.gs-wood-sage { background: #7f9a7a; } .gs-wood-navy { background: #2f4468; } .gs-wood-blush { background: #d69a9a; }
.gs-back-boards { background: repeating-linear-gradient(90deg, #2e1f14 0 7px, #1d130c 7px 8px); }
.gs-back-plain { background: #3a2a1d; }
.gs-back-stripes { background: repeating-linear-gradient(90deg, #3b5a4a 0 5px, #486b59 5px 10px); }
.gs-back-dots { background: radial-gradient(circle, #e6c27a 0 1.5px, transparent 2px) 0 0 / 8px 8px, #2e3b5a; }
.gs-back-floral { background: radial-gradient(circle, #f0a0b4 0 2px, transparent 2.5px) 0 0 / 12px 12px, #5c3f4c; }
.gs-back-brick { background: linear-gradient(#5e2c20 1px, transparent 1px) 0 0 / 100% 8px, #9a4a33; }
.gs-back-cork { background: radial-gradient(circle, #9c7448 0 1px, transparent 1.5px) 0 0 / 5px 5px, #b88a58; }
.gs-back-stars { background: radial-gradient(circle, #fff6c8 0 1px, transparent 1.5px) 0 0 / 9px 11px, #151a33; }
.gs-decorate-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.gs-decorate-pick {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  padding: 4px;
  border: 1.5px solid var(--gs-faint);
  border-radius: var(--gs-radius);
  background: #3a2a1d;
  cursor: pointer;
}
.gs-decorate-pick svg { max-width: 100%; max-height: 100%; width: auto; height: auto; image-rendering: pixelated; }
.gs-decorate-stickers .gs-decorate-pick { background: repeating-conic-gradient(var(--gs-wash) 0 25%, transparent 0 50%) 0 0 / 10px 10px; }
.gs-decorate-pick:hover { border-color: var(--gs-line); transform: translateY(-1px); }
.gs-decorate-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 0; }
.gs-decorate-search { width: 100%; margin: 0; }
.gs-decorate-note { margin: 6px 0 0; color: var(--gs-soft); font-size: var(--gs-t1); }
body[data-placing] .case-room { cursor: copy; }
`;
