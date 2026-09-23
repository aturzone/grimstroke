/**
 * The chrome's tokens and the parts every control is made of: card, button, tooltip, key
 * cap, menu, dialog, toast.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The chrome's own tokens: one scale for space, one for type, one set of inks. */
export const TOKENS = `/* ---- the chrome's tokens ----

   The chrome is printed on PHOTO PAPER, whatever palette the document is in -- a card lying
   on the sheet, not a part of it. So its ink is the photo paper's ink and never the page's:
   the status bar once inherited the page's light text on the dark Carbon palette and drew
   pale grey words on a cream card, every one of them invisible.

   Space steps by four. Type has five sizes and the chrome uses them and nothing between. */
:root {
  --gs-paper: var(--mat-paper);
  --gs-ink: var(--mat-ink);
  --gs-line: color-mix(in oklab, var(--mat-ink) 88%, var(--mat-paper));
  --gs-soft: color-mix(in oklab, var(--mat-ink) 58%, var(--mat-paper));
  --gs-faint: color-mix(in oklab, var(--mat-ink) 22%, var(--mat-paper));
  --gs-wash: color-mix(in oklab, var(--mat-ink) 8%, transparent);
  --gs-wash-2: color-mix(in oklab, var(--mat-ink) 15%, transparent);
  --gs-hot: var(--accent);
  --gs-on-hot: var(--chip-text);
  --gs-shadow: 3px 4px 0 rgba(0, 0, 0, 0.3);
  --gs-shadow-up: 5px 7px 0 rgba(0, 0, 0, 0.3);
  --gs-radius: 3px;
  --gs-s1: 4px;
  --gs-s2: 8px;
  --gs-s3: 12px;
  --gs-s4: 16px;
  --gs-s5: 24px;
  --gs-t1: 10.5px;
  --gs-t2: 12.5px;
  --gs-t3: 14px;
  --gs-t4: 18px;
  --gs-t5: 24px;
  --gs-control: 34px;
  --gs-fast: 90ms;
  --gs-mid: 160ms;
  --gs-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
`;

/** Card, button, tooltip, key cap, rule. */
export const KIT = `/* ---- the parts ---- */

/* A card: photo paper, a keyline, and a hard shadow with no blur -- a thing lying on the
   desk. Every piece of chrome is one of these. */
.gs-card {
  background: var(--gs-paper);
  color: var(--gs-ink);
  border: 1.5px solid var(--gs-line);
  border-radius: var(--gs-radius);
  box-shadow: var(--gs-shadow);
  font-family: var(--mono-font);
  font-size: var(--gs-t2);
  line-height: 1.3;
}

/* The one button. Icon buttons are square and exactly as tall as text buttons, so a row of
   mixed controls lines up without anybody adjusting it. */
.gs-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: var(--gs-control);
  height: var(--gs-control);
  padding: 0 10px;
  border: 1.5px solid transparent;
  border-radius: var(--gs-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--gs-fast) linear, transform var(--gs-fast) var(--gs-ease),
    box-shadow var(--gs-fast) var(--gs-ease);
}
.gs-btn-icon { width: var(--gs-control); padding: 0; }
.gs-btn:hover:not(:disabled) { background: var(--gs-wash); }
.gs-btn:active:not(:disabled) { background: var(--gs-wash-2); transform: translate(0, 1px); }
.gs-btn[aria-pressed='true'] {
  background: var(--gs-hot);
  color: var(--gs-on-hot);
  border-color: var(--gs-line);
}
.gs-btn:disabled { opacity: 0.32; cursor: default; }
/* Focus is drawn in the chrome's own ink, never the palette accent: a lime accent on cream
   photo paper is a focus ring nobody can see, and a ring nobody can see is no ring. */
.gs-btn:focus-visible,
.gs-item:focus-visible,
.gs-place:focus-visible,
.gs-swatch:focus-visible,
.gs-paper-swatch:focus-visible {
  outline: 2.5px solid var(--gs-ink);
  outline-offset: 2px;
  z-index: 1;
}
.gs-btn:focus:not(:focus-visible) { outline: none; }

/* The primary action on a surface. It is the one control that is PRINTED -- a block of hot
   ink with its own small shadow -- and pressing it pushes it into the paper. */
.gs-btn-primary {
  background: var(--gs-hot);
  color: var(--gs-on-hot);
  border-color: var(--gs-line);
  box-shadow: 2px 2px 0 var(--gs-line);
}
.gs-btn-primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--gs-hot) 88%, var(--gs-ink));
}
.gs-btn-primary:active:not(:disabled) {
  background: var(--gs-hot);
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--gs-line);
}
.gs-btn-danger:hover:not(:disabled) { background: var(--gs-hot); color: var(--gs-on-hot); }

.gs-icon { width: 20px; height: 20px; display: block; flex: none; }
.gs-icon path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.gs-icon path.gs-solid { fill: currentColor; stroke-width: 1.1; }

/* A tooltip is the control's name and its key, printed on a strip of ink. It waits a beat
   before it appears, because a label that flashes up under a pointer on its way somewhere
   else is noise; keyboard focus shows it at once. */
.gs-tip {
  position: absolute;
  inset-block-end: calc(100% + 10px);
  inset-inline-start: 50%;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--gs-ink);
  color: var(--gs-paper);
  font-family: var(--mono-font);
  font-size: var(--gs-t1);
  letter-spacing: 0.03em;
  white-space: nowrap;
  border-radius: 2px;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 3px);
  transition: opacity var(--gs-fast) linear, transform var(--gs-fast) var(--gs-ease);
}
:root[dir='rtl'] .gs-tip { transform: translate(50%, 3px); }
.gs-tip .gs-kbd { background: transparent; color: inherit; border-color: color-mix(in oklab, var(--gs-paper) 45%, transparent); }
.gs-btn:hover > .gs-tip { opacity: 1; transform: translate(-50%, 0); transition-delay: 380ms; }
.gs-btn:focus-visible > .gs-tip { opacity: 1; transform: translate(-50%, 0); transition-delay: 0ms; }
:root[dir='rtl'] .gs-btn:hover > .gs-tip,
:root[dir='rtl'] .gs-btn:focus-visible > .gs-tip { transform: translate(50%, 0); }
/* Chrome along the top edge has nowhere above it, so its tips hang below. */
.gs-top .gs-tip { inset-block-end: auto; inset-block-start: calc(100% + 10px); }

.gs-kbd {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border: 1px solid var(--gs-faint);
  border-block-end-width: 2px;
  border-radius: 3px;
  background: var(--gs-paper);
  color: var(--gs-soft);
  font-family: var(--mono-font);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}
.gs-kbd + .gs-kbd { margin-inline-start: 2px; }

.gs-sep {
  display: inline-block;
  flex: none;
  width: 1.5px;
  height: 20px;
  margin-inline: 3px;
  background: var(--gs-faint);
}
.gs-rule-line { border: 0; height: 1.5px; margin: 6px 4px; background: var(--gs-faint); }

/* A choice among a few, set as small chips. */
.gs-chip-btn { height: 28px; padding: 0 9px; border-color: var(--gs-faint); font-size: var(--gs-t1); }
.gs-chip-row { display: flex; flex-wrap: wrap; gap: 5px; padding: 2px 8px 6px; }

/* ---- menus ----

   A native details element: it opens and closes with no script at all. The app adds only the
   conveniences -- closing on a click elsewhere, on Escape, and after a row is chosen. */
.gs-menu { position: relative; }
.gs-menu > summary { list-style: none; }
.gs-menu > summary::-webkit-details-marker { display: none; }
.gs-menu[open] > summary { background: var(--gs-wash-2); }
.gs-menu[open] > summary > .gs-tip { display: none; }
.gs-menu-card {
  position: absolute;
  inset-block-start: calc(100% + 8px);
  inset-inline-end: -1px;
  z-index: 90;
  min-width: 240px;
  max-height: min(70vh, 560px);
  overflow: auto;
  padding: 6px;
  background: var(--gs-paper);
  color: var(--gs-ink);
  border: 1.5px solid var(--gs-line);
  border-radius: var(--gs-radius);
  box-shadow: var(--gs-shadow-up);
  font-family: var(--mono-font);
  font-size: var(--gs-t2);
  animation: gs-drop var(--gs-mid) var(--gs-ease);
  overscroll-behavior: contain;
}
.gs-menu-start > .gs-menu-card { inset-inline-end: auto; inset-inline-start: -1px; }
.gs-menu-up > .gs-menu-card { inset-block-start: auto; inset-block-end: calc(100% + 8px); }
@keyframes gs-drop {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}
.gs-menu-head {
  margin: 6px 8px 5px;
  font-size: var(--gs-t1);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gs-soft);
}
.gs-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 34px;
  padding: 0 8px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
}
.gs-item:hover, .gs-item:focus-visible { background: var(--gs-wash); }
.gs-item .gs-icon { width: 18px; height: 18px; opacity: 0.8; }
.gs-item-text { flex: 1; }
.gs-item-key { display: flex; }
.gs-item-danger { color: color-mix(in oklab, var(--gs-hot) 70%, var(--gs-ink)); }
.gs-item-danger:hover { background: var(--gs-hot); color: var(--gs-on-hot); }

/* ---- dialogs ----

   Native dialogs, opened modally: focus is trapped, Escape closes and the page behind cannot
   be clicked, with no script. The backdrop is the desk, dimmed -- never a blur, which is a
   sheen on glass and this is paper. */
.gs-dialog {
  margin: auto;
  padding: 0;
  max-width: min(92vw, 720px);
  max-height: 86vh;
  background: var(--gs-paper);
  color: var(--gs-ink);
  border: 1.5px solid var(--gs-line);
  border-radius: var(--gs-radius);
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.35);
  font-family: var(--mono-font);
  font-size: var(--gs-t2);
  overflow: auto;
}
.gs-dialog::backdrop { background: rgba(20, 18, 16, 0.46); }
.gs-dialog[open] { animation: gs-rise var(--gs-mid) var(--gs-ease); }
@keyframes gs-rise {
  from { opacity: 0; transform: translateY(8px) rotate(-0.4deg); }
  to { opacity: 1; transform: none; }
}
.gs-dialog-head {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 10px 10px 20px;
  background: var(--gs-paper);
  border-block-end: 1.5px solid var(--gs-faint);
}
.gs-dialog-head h2 { font-family: var(--marker-font); font-size: var(--gs-t5); font-weight: 400; line-height: 1; }
.gs-dialog-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border-block-start: 1.5px solid var(--gs-faint);
  color: var(--gs-soft);
  font-size: var(--gs-t1);
}
.gs-dialog-body { padding: 18px 20px; line-height: 1.55; }
.gs-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px; }

/* ---- toasts ----

   A slip of paper that says what just happened, pinned above the tray. An error is said in
   the accent and stays until it is dismissed; anything else leaves on its own. */
.gs-toasts {
  position: fixed;
  inset-inline: 0;
  inset-block-end: 96px;
  z-index: 120;
  display: grid;
  justify-items: center;
  gap: 8px;
  pointer-events: none;
}
.gs-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(92vw, 520px);
  padding: 9px 10px 9px 14px;
  /* A toast lies over the board, and the board under it is still the board: a click on the
     words goes through to whatever is beneath. Only the dismiss button takes the pointer.
     It did take every click first, and a note put down just after a delete landed on the
     "undo brings it back" slip instead of on the sheet. */
  pointer-events: none;
  animation: gs-rise var(--gs-mid) var(--gs-ease);
}
.gs-toast .gs-btn { pointer-events: auto; }
.gs-toast[data-tone='error'] { border-inline-start: 5px solid var(--gs-hot); }
.gs-toast[data-tone='busy']::before {
  content: '';
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--gs-hot);
  animation: gs-pulse 900ms ease-in-out infinite alternate;
}
@keyframes gs-pulse { from { opacity: 0.25; transform: scale(0.7); } to { opacity: 1; transform: none; } }
.gs-toast-text { flex: 1; line-height: 1.45; }
.gs-toast[data-leaving] { opacity: 0; transform: translateY(6px); transition: opacity var(--gs-mid) linear, transform var(--gs-mid) var(--gs-ease); }

@media (prefers-reduced-motion: reduce) {
  .gs-btn, .gs-tip, .gs-toast { transition: none; }
  .gs-menu-card, .gs-dialog[open], .gs-toast { animation: none; }
}
`;
