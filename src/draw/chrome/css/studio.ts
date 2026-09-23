/**
 * The character studio, and the profile page beside it.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The studio: a big face on a card, the knobs beside it, every choice as a row of faces. */
export const STUDIO = `/* ---- the studio ----

   A big face on a card, the knobs beside it, and every choice as a row of whole faces. The
   page is chrome, so every class is gs- or fs- prefixed and none of it inherits from a
   document class. */

body.on-studio {
  min-height: 100vh;
  background: var(--desk);
  color: var(--paper);
  padding-block-start: 76px;
}
.fs-studio {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
  padding: 16px 28px 40px;
}
.fs-stage { position: sticky; inset-block-start: 76px; display: grid; gap: 14px; max-height: calc(100vh - 88px); overflow: auto; padding: 2px 8px 8px 2px; scrollbar-width: thin; }
.fs-card { display: grid; justify-items: center; gap: 10px; padding: 18px 18px 10px; }
.fs-face .face-art { width: 100%; max-width: 300px; height: auto; }
.fs-styles { justify-content: center; }

.fs-panel { padding: 12px 14px 14px; }
.fs-panel h3, .fs-slot h3, .fs-shelf h3 {
  margin: 0 0 10px;
  font: 700 var(--gs-t1) / 1.4 var(--mono-font);
  letter-spacing: 0.12em;
  color: var(--gs-soft);
}
.fs-slot h3, .fs-shelf h3 { color: color-mix(in oklab, var(--paper) 72%, var(--desk)); }
.fs-field { display: grid; gap: 4px; margin-block-end: 9px; font-size: var(--gs-t1); color: var(--gs-soft); }
.fs-field .gs-field { width: 100%; color: var(--gs-ink); font-size: var(--gs-t2); }
.fs-details { display: grid; gap: 6px; margin-block-end: 8px; }
.fs-detail { display: grid; grid-template-columns: 34% 1fr auto; gap: 6px; align-items: center; }
.fs-detail .gs-field { width: 100%; min-width: 0; padding: 5px 7px; font-size: var(--gs-t1); }
.fs-add { border: 1.5px dashed var(--gs-faint); width: 100%; }
.fs-row {
  display: grid;
  grid-template-columns: 58px 1fr 42px;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  font-family: var(--mono-font);
  font-size: var(--gs-t2);
}
.fs-row span { color: var(--gs-soft); }
.fs-row input[type='color'] {
  grid-column: 2 / 4;
  width: 100%;
  height: 24px;
  padding: 0;
  border: 1.5px solid var(--gs-line);
  border-radius: 2px;
  background: none;
  cursor: pointer;
}
.fs-row input[type='range'] { width: 100%; accent-color: var(--gs-ink); }
.fs-row output { text-align: end; color: var(--gs-soft); font-variant-numeric: tabular-nums; }

.fs-presets { margin-block-start: 10px; display: grid; gap: 6px; }
.fs-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
.fs-swatch {
  all: unset;
  width: 24px;
  height: 24px;
  cursor: pointer;
  border: 1.5px solid var(--gs-line);
  border-radius: 2px;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  transition: transform var(--gs-fast) var(--gs-ease);
}
.fs-swatch:hover { transform: translate(-1px, -1px) rotate(-4deg); }
.fs-swatch:focus-visible { outline: 2.5px solid var(--gs-ink); outline-offset: 2px; }

.fs-parts { display: grid; gap: 20px; }
.fs-cells { display: flex; flex-wrap: wrap; gap: 8px; }
/* A thumbnail is a whole face, so the frame around it has to be quiet or the row reads as a
   grid of boxes rather than as a row of people. */
.fs-cell {
  all: unset;
  cursor: pointer;
  padding: 3px;
  background: color-mix(in oklab, var(--paper) 90%, var(--desk));
  border: 2px solid transparent;
  border-radius: 2px;
  line-height: 0;
  transition: transform var(--gs-fast) var(--gs-ease), border-color var(--gs-fast) linear;
}
.fs-cell:hover { border-color: color-mix(in oklab, var(--paper) 50%, transparent); transform: translateY(-2px); }
.fs-cell[aria-pressed='true'] { border-color: var(--accent); background: var(--paper); box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.35); }
.fs-cell:focus-visible { outline: 2.5px solid var(--paper); outline-offset: 2px; }

.fs-shelf { padding: 18px 28px 38px; border-block-start: 2px solid color-mix(in oklab, var(--paper) 16%, transparent); }
.fs-shelf-row { display: flex; flex-wrap: wrap; gap: 12px; }
.fs-saved {
  all: unset;
  cursor: pointer;
  display: grid;
  justify-items: center;
  gap: 4px;
  width: 78px;
  padding: 8px 6px 6px;
  background: var(--mat-paper);
  border: 1.5px solid var(--mat-ink);
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.35);
  font: var(--gs-t1) / 1.2 var(--mono-font);
  color: var(--mat-ink);
  text-align: center;
  overflow-wrap: anywhere;
  transition: transform var(--gs-fast) var(--gs-ease);
}
.fs-saved:hover { transform: rotate(-2deg) translateY(-2px); }
.fs-saved[aria-current='true'] { background: var(--accent); color: var(--chip-text); }
.fs-saved:focus-visible { outline: 2.5px solid var(--paper); outline-offset: 3px; }

@media (max-width: 900px) {
  .fs-studio { grid-template-columns: 1fr; padding-inline: 12px; }
  .fs-stage { position: static; max-height: none; overflow: visible; }
  .fs-card { justify-self: center; width: min(100%, 360px); }
  .fs-shelf { padding-inline: 12px; }
}
@media (max-width: 520px) {
  body.on-studio { padding-block-start: 64px; }
}

/* ---- the profile page ----

   The card, large, on the desk, with what can be done with it beside it. */
.pf-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 32px;
  align-items: start;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 28px 48px;
}
.pf-stage { justify-self: center; width: min(100%, 420px); padding: 28px 18px 18px; }
.pf-stage .profile { max-width: none; }
.pf-panel { display: grid; gap: 4px; padding: 6px 0 12px; }
.pf-panel .gs-menu-head { margin-block-start: 10px; }
.pf-panel .gs-field { margin: 0 12px; width: calc(100% - 24px); }
.pf-panel > .gs-btn { margin: 4px 12px 0; justify-content: flex-start; }
.pf-note { padding: 4px 16px 0; color: var(--gs-soft); font-size: var(--gs-t1); line-height: 1.5; }
@media (max-width: 860px) {
  .pf-page { grid-template-columns: 1fr; padding-inline: 12px; }
}
`;
