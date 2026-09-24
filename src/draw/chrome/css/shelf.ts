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
  border-radius: 12px;
  background: var(--gs-hot);
  color: var(--gs-on-hot);
  font: 700 13px/24px var(--ui-font);
  text-align: center;
}

/* ---- the cat ---- */
.shelf-cat {
  position: absolute;
  z-index: 5;
  left: 0;
  top: 0;
  background-size: 100% 100%;
  image-rendering: pixelated;
  pointer-events: none;
  transform-origin: 50% 50%;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.35));
}
`;
