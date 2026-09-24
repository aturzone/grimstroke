/**
 * A note's own settings panel.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** A note's own settings panel. */
export const SETTINGS = `/* ---- a note's own settings ----

   Anchored beside the note it belongs to, never off the screen. It is chrome, so every class
   is gs- prefixed and none of it inherits from a document class. */

.gs-settings {
  position: fixed;
  z-index: 80;
  width: 264px;
  max-height: calc(100vh - 24px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 0 0 10px;
  background: var(--mat-paper);
  border: var(--keyline) solid var(--edge);
  box-shadow: 6px 7px 0 rgba(0, 0, 0, .34);
  font-family: var(--ui-font);
  font-size: 12px;
  color: var(--ink);
  scrollbar-width: thin;
}
.gs-set-head {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 8px 7px 12px;
  background: var(--ink);
  color: var(--paper);
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.gs-set-close {
  all: unset;
  cursor: pointer;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  font-size: 17px;
  line-height: 1;
}
.gs-set-close:hover { background: var(--accent); }

.gs-set-section { padding: 8px 12px 2px; }
.gs-set-section h3 {
  margin: 0 0 6px;
  font: 700 10px/1.4 var(--ui-font);
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: .62;
}
.gs-set-row {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  align-items: center;
  gap: 8px;
  min-height: 26px;
}
.gs-set-label { display: flex; align-items: center; gap: 4px; opacity: .86; }
/* The dot that says this note has its own opinion about a field, and puts it back. */
.gs-set-mark {
  all: unset;
  cursor: pointer;
  font-size: 8px;
  line-height: 1;
  color: var(--accent);
}
.gs-set-mark[hidden] { display: none; }
.gs-set-value { justify-self: end; min-width: 34px; text-align: end; opacity: .7; }

.gs-set-text, .gs-set-select {
  grid-column: 2 / 4;
  width: 100%;
  box-sizing: border-box;
  padding: 3px 6px;
  border: 1.5px solid var(--edge);
  background: var(--paper);
  color: inherit;
  font: inherit;
}
.gs-set-range { width: 100%; accent-color: var(--accent); }
.gs-set-colour {
  grid-column: 2 / 4;
  width: 100%;
  height: 22px;
  padding: 0;
  border: 1.5px solid var(--edge);
  background: none;
  cursor: pointer;
}

.gs-set-swatches { display: flex; flex-wrap: wrap; gap: 5px; grid-template-columns: none; }
.gs-set-swatch {
  all: unset;
  width: 24px;
  height: 24px;
  cursor: pointer;
  border: 2px solid;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, .3);
}
.gs-set-swatch:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 rgba(0, 0, 0, .34); }
.gs-set-swatch:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

`;
