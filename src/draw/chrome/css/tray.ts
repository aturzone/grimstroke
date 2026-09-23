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
/* Wrapping, not scrolling.

   The tools and the inks both scrolled sideways on a phone first, and on a 390px screen that
   put half the tools past the edge with nothing to say they were there -- reachable only by
   dragging a strip nobody knew could be dragged. Wrapping costs a row of height and keeps
   every control in sight, which on a phone is the whole argument. */
@media (max-width: 760px) {
  .gs-tray {
    inset-inline: 8px;
    inset-block-end: 8px;
    transform: none;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 6px;
  }
  :root[dir='rtl'] .gs-tray { transform: none; }
  .gs-tray .gs-sep { display: none; }
  /* Two even rows of five, never nine and an orphan: the tools are a set, and a set that
     wraps one of its members onto a row of its own reads as a mistake. */
  .gs-tray-tools {
    flex: 1 1 100%;
    display: grid;
    grid-template-columns: repeat(5, 44px);
    justify-content: center;
    gap: 4px 8px;
  }
  .gs-tool { width: 44px; height: 44px; min-width: 44px; }
  .gs-tray-inks {
    flex: 1 1 100%;
    justify-content: center;
    margin: 0;
    padding: 6px 0 2px;
    border-inline-start: 0;
    border-block-start: 1.5px solid var(--gs-faint);
  }
  .gs-swatch { width: 26px; height: 26px; }
  .gs-desk { inset-block-end: auto; inset-block-start: 62px; inset-inline-start: auto; inset-inline-end: 8px; flex-direction: column; }
  .gs-desk .gs-sep { width: 20px; height: 1.5px; margin: 3px 0; }
  .gs-desk [data-gs='zoom-in'], .gs-desk [data-gs='zoom-out'], .gs-level { display: none; }
}
@media (hover: none) {
  .gs-tip { display: none; }
}
`;
