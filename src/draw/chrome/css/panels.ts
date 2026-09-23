/**
 * The panels that open over a surface: search, the shortcut sheet, the selection bar and the
 * empty board's hint.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** Search, help, the selection bar and the empty board. */
export const PANELS = `/* ---- search ---- */
.gs-search { width: min(92vw, 660px); margin-block-start: 11vh; overflow: hidden; }
.gs-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 16px;
  border-block-end: 1.5px solid var(--gs-faint);
}
.gs-search-bar > .gs-icon { color: var(--gs-soft); }
.gs-search-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--gs-ink);
  font-family: var(--mono-font);
  font-size: var(--gs-t4);
  outline: none;
}
.gs-search-input::placeholder { color: var(--gs-faint); }
.gs-search-input::-webkit-search-cancel-button { display: none; }
.gs-search-results { max-height: min(56vh, 480px); overflow: auto; padding: 6px; overscroll-behavior: contain; }
.gs-search-results:empty { display: none; }
.gs-hit {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 2px 12px;
  align-items: baseline;
  padding: 9px 10px;
  border-radius: 2px;
  color: inherit;
  text-decoration: none;
}
.gs-hit[aria-selected='true'], .gs-hit:hover { background: var(--gs-wash); }
.gs-hit[aria-selected='true'] { box-shadow: inset 3px 0 0 var(--gs-hot); }
.gs-hit-kind {
  grid-row: span 2;
  align-self: start;
  justify-self: start;
  padding: 2px 6px;
  border: 1.5px solid var(--gs-line);
  border-radius: 2px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.gs-hit-kind[data-kind='archive'] { background: var(--gs-ink); color: var(--gs-paper); }
.gs-hit-title { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gs-hit-text { color: var(--gs-soft); font-size: var(--gs-t1); line-height: 1.45; overflow-wrap: anywhere; }
/* A highlighter, whatever the palette: the hot ink was blue on the default one, and dark
   words on mid blue is the one highlight that is harder to read than no highlight. */
.gs-hit mark { background: #ffe066; color: #14110e; padding: 0 1px; border-radius: 1px; }
.gs-search-none { padding: 22px 16px; color: var(--gs-soft); text-align: center; }
.gs-search-none b { font-family: var(--hand-font); font-size: var(--gs-t5); color: var(--gs-ink); display: block; margin-block-end: 4px; }

/* ---- the shortcut sheet ---- */
.gs-help { width: min(94vw, 980px); }
.gs-keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 6px 26px;
  padding: 16px 20px 20px;
}
.gs-keys h3 {
  margin: 8px 0 8px;
  font-size: var(--gs-t1);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gs-soft);
}
.gs-keys dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center; }
.gs-keys dt { display: flex; justify-content: flex-end; }
.gs-keys dd { margin: 0; }

/* ---- what a selection can do ----

   Hangs above the selection, placed there by the app, and only exists while there is one.
   The alignment tools only appear for two or more, because aligning one thing to itself is a
   button that does nothing. */
.gs-selbar {
  position: fixed;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 4px;
  user-select: none;
  animation: gs-drop var(--gs-mid) var(--gs-ease);
}
.gs-selbar[hidden] { display: none; }
.gs-selbar .gs-btn { width: 32px; min-width: 32px; height: 32px; }
.gs-selbar .gs-icon { width: 18px; height: 18px; }
.gs-selbar-many { display: contents; }
.gs-selbar[data-count='1'] .gs-selbar-many { display: none; }
/* With one thing chosen nothing comes before this divider, so it would lead the bar. */
.gs-selbar[data-count='1']:not([data-grouped]) .gs-sep-lead { display: none; }
.gs-selbar:not([data-grouped]) [data-gs='ungroup'] { display: none; }
.gs-scope {
  padding: 3px 8px;
  border-radius: 2px;
  background: var(--gs-ink);
  color: var(--gs-paper);
  font-size: var(--gs-t1);
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.gs-scope[hidden] { display: none; }

/* ---- the empty board ----

   A slip of paper taped to the middle of a fresh sheet, saying the three things worth knowing.
   It is chrome, never part of the document, and it goes the moment there is anything else. */
.gs-empty {
  position: fixed;
  inset-inline-start: 50%;
  inset-block-start: 44%;
  z-index: 20;
  width: min(86vw, 430px);
  padding: 26px 28px 22px;
  background: var(--gs-paper);
  color: var(--gs-ink);
  border: 1.5px solid var(--gs-line);
  box-shadow: var(--gs-shadow-up);
  font-family: var(--mono-font);
  font-size: var(--gs-t2);
  line-height: 1.7;
  transform: translate(-50%, -50%) rotate(-1.2deg);
  pointer-events: none;
}
:root[dir='rtl'] .gs-empty { transform: translate(50%, -50%) rotate(1.2deg); }
.gs-empty[hidden] { display: none; }
/* The tape, as a translucent strip over the top edge. */
.gs-empty::before {
  content: '';
  position: absolute;
  inset-block-start: -12px;
  inset-inline-start: 50%;
  width: 110px;
  height: 24px;
  background: color-mix(in oklab, var(--paper) 30%, #f4efe0);
  opacity: 0.8;
  transform: translateX(-50%) rotate(2deg);
  border-inline: 1px solid rgba(0, 0, 0, 0.12);
}
.gs-empty-title { font-family: var(--marker-font); font-size: 34px; line-height: 1; margin-block-end: 12px; }
.gs-empty-line .gs-kbd { vertical-align: 1px; }

/* ---- asking one thing ---- */
.gs-ask { width: min(92vw, 440px); }
.gs-ask-label { display: block; margin-block-end: 8px; font-family: var(--hand-font); font-size: 22px; font-weight: 700; }
.gs-ask-input { width: 100%; font-size: var(--gs-t3); }
.gs-confirm { width: min(92vw, 420px); }
`;
