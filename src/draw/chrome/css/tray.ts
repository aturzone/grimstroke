/**
 * The tool tray and the desk controls.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The tools and the inks, and the small card of camera controls in the corner. */
export const TRAY = `/* ---- the tray ---- */
.gs-tray {
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
:root[dir='rtl'] .gs-tray { transform: translateX(50%); }
.gs-tray-tools { display: flex; align-items: center; gap: 2px; }
/* TARGETS NEVER SHRINK below 38px here. A tool is the thing a thumb is aimed at most, and the
   answer to a small screen is never a smaller button. */
.gs-tool { width: 38px; height: 38px; min-width: 38px; }
.gs-tool .gs-icon { width: 21px; height: 21px; }
.gs-tray-inks {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-inline-start: 4px;
  padding-inline: 10px 5px;
  border-inline-start: 1.5px solid var(--gs-faint);
}
.gs-swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 2px solid var(--gs-line);
  border-radius: 50%;
  background: var(--swatch);
  cursor: pointer;
  transition: transform var(--gs-fast) var(--gs-ease);
}
.gs-swatch:hover { transform: scale(1.12); }
.gs-swatch[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--gs-paper), 0 0 0 4px var(--gs-line); }

/* ---- the desk ----

   Undo and the camera: the controls a hand reaches for without looking, in the corner, apart
   from the tools. */
.gs-desk {
  position: fixed;
  inset-block-end: 18px;
  inset-inline-start: 18px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 5px;
  user-select: none;
}
.gs-level { min-width: 60px; font-variant-numeric: tabular-nums; }

/* A board's palettes, as the papers they are rather than as names in a list. */
.gs-paper-swatches { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 2px 8px 8px; }
.gs-paper-swatch {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 1.5px solid var(--gs-line);
  border-radius: 2px;
  background: var(--sw-paper);
  cursor: pointer;
  overflow: hidden;
}
.gs-paper-swatch span {
  position: absolute;
  inset: auto 18% 22% 18%;
  height: 22%;
  background: var(--sw-accent);
  box-shadow: 0 -7px 0 -2px var(--sw-ink);
}
.gs-paper-swatch:hover { transform: rotate(-3deg); }
.gs-paper-swatch[aria-pressed='true'] { outline: 2.5px solid var(--gs-ink); outline-offset: 2px; }

@media (max-width: 1180px) {
  /* The tray is centred and wide, so on a tablet the desk card steps up out of its way. */
  .gs-desk { inset-block-end: 80px; }
}
/* One row on a phone, and nothing out of sight.

   It wrapped into two rows of tools and a third of inks first, which kept everything visible
   and took a fifth of a phone's screen from the board. Now the ten tools share one row, each
   as wide as the row allows and a full 44px tall -- a thumb needs height more than width --
   and the inks come up above the tray only while something that draws is in hand, because
   that is the only time an ink means anything. Nothing scrolls sideways: a strip nobody knows
   can be dragged hides half of what is on it. */
@media (max-width: 760px) {
  .gs-tray {
    inset-inline: 8px;
    inset-block-end: 8px;
    transform: none;
    gap: 0;
    padding: 4px;
  }
  :root[dir='rtl'] .gs-tray { transform: none; }
  .gs-tray .gs-sep { display: none; }
  .gs-tray-tools { flex: 1; display: flex; justify-content: space-between; gap: 0; }
  .gs-tool { flex: 1 1 0; width: auto; min-width: 0; max-width: 48px; height: 44px; }
  .gs-tray-inks {
    position: absolute;
    inset-block-end: calc(100% + 6px);
    inset-inline: 0;
    justify-content: center;
    margin: 0;
    padding: 8px 6px;
    border: 1.5px solid var(--gs-line);
    border-radius: var(--gs-radius);
    background: var(--gs-paper);
    box-shadow: var(--gs-shadow);
  }
  .gs-tray:not([data-inking]) .gs-tray-inks { display: none; }
  .gs-swatch { width: 26px; height: 26px; }
  .gs-desk { inset-block-end: auto; inset-block-start: 62px; inset-inline-start: auto; inset-inline-end: 8px; flex-direction: column; }
  .gs-desk .gs-sep { width: 20px; height: 1.5px; margin: 3px 0; }
  .gs-desk [data-gs='zoom-in'], .gs-desk [data-gs='zoom-out'], .gs-level { display: none; }
}
@media (hover: none) {
  .gs-tip { display: none; }
}

/* The sticker sheet: a card that opens above the tray. */
.gs-sheet { position: relative; display: flex; align-items: center; }
.gs-sheet > summary { list-style: none; cursor: pointer; }
.gs-sheet > summary::-webkit-details-marker { display: none; }
.gs-sheet[open] > summary { background: var(--gs-wash); }
.gs-sheet-card {
  position: absolute;
  bottom: calc(100% + 14px);
  inset-inline-end: -8px;
  width: min(360px, calc(100vw - 24px));
  max-height: 60vh;
  overflow-y: auto;
  padding: 6px 4px 10px;
}
.gs-sheet-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  padding: 4px 12px 8px;
}
.gs-sheet-pick {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  padding: 6px;
  border: 0;
  border-radius: var(--gs-radius);
  background: repeating-conic-gradient(var(--gs-wash) 0 25%, transparent 0 50%) 0 0 / 10px 10px;
  cursor: pointer;
  transition: transform var(--gs-fast) var(--gs-ease);
}
.gs-sheet-pick:hover { transform: rotate(-6deg) scale(1.08); }
/* A stamp is words, so it is given two cells' width. */
.gs-sheet-pick:has(.dcut-stamp) { grid-column: span 2; aspect-ratio: 2.2; }
.gs-sheet-pick .dcut-stamp .dcut-words { font-size: 22cqw; }
/* ---- the repository drawer ---- */
.gs-drawer {
  position: fixed;
  z-index: 45;
  top: 78px;
  right: 14px;
  bottom: 90px;
  width: min(360px, calc(100vw - 28px));
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
}
.gs-drawer-head { display: flex; align-items: center; gap: 10px; }
.gs-drawer-head b { display: block; font-family: var(--ui-font); font-size: var(--gs-t2); }
.gs-drawer-head small { color: var(--gs-soft); font-size: var(--gs-t1); }
.gs-drawer-head .gs-btn-icon { margin-inline-start: auto; font-size: 18px; }
.gs-drawer-mark { width: 28px; flex: none; }
.gs-drawer-title { margin: 0; font-family: var(--hand-font); font-size: 22px; }
.gs-drawer-tabs, .gs-drawer-filters { display: flex; flex-wrap: wrap; gap: 5px; }
.gs-drawer-note { margin: 0; color: var(--gs-soft); font-size: var(--gs-t1); line-height: 1.5; }
.gs-drawer-list { flex: 1; min-height: 0; margin: 0; padding: 0; overflow-y: auto; list-style: none; border-block: 1px solid var(--gs-faint); }
.gs-drawer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 2px;
  border-block-end: 1px dashed var(--gs-faint);
  cursor: grab;
}
.gs-drawer-row:hover { background: var(--gs-wash); }
.gs-drawer-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #15803d; }
.gs-drawer-row.is-closed .gs-drawer-dot { background: #7c3aed; }
.gs-drawer-row.is-merged .gs-drawer-dot { background: #6b21a8; }
.gs-drawer-n { flex: none; font-family: var(--ui-font); font-size: var(--gs-t1); color: var(--gs-soft); }
.gs-drawer-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--gs-t2); }
.gs-drawer-add { flex: none; font-size: 18px; }
.gs-drawer-foot { display: flex; flex-wrap: wrap; gap: 6px; }
.gs-drawer-foot .gs-btn { border: 1.5px solid var(--gs-line); }
`;
