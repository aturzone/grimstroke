/**
 * The "/" bar: one rounded box over the board that grows into the card being typed, and the panel
 * that edits a card's fields by hand.
 *
 * White, quiet, one blue -- the point of the bar is to get out of the way of what is being
 * written -- but framed as the tools' other dialogs are: their keyline, their hard shadow, their
 * corners (see draw/shape/css.ts), so it is one of the set and not a widget from somewhere else.
 *
 * The shell keeps ONE radius whether it is the 72px line or the grown card, so it morphs as one
 * object, capped so it never becomes a blob. --ss-g scales the parts inside, which nest.
 */

export const SHAPE_BAR = `/* ---- the shape bar ---- */
.ss-layer {
  /* The palette's own paper, ink and accent, as the tools mix them (draw/chrome/css/kit.ts): the
     card and the box change with the theme. The accent is held dark on a light theme and light on a
     dark one (--brand-lo/hi, from draw/doc/head.ts) so it reads on the paper whatever it is -- measured for every palette in tests/draw/look. */
  --ss-bg: var(--gs-paper, #ffffff);
  --ss-fg: var(--gs-ink, #1a1a19);
  --ss-soft: var(--gs-soft, #6f6d68);
  --ss-line: color-mix(in oklab, var(--ss-fg) 12%, var(--ss-bg));
  --ss-tile: color-mix(in oklab, var(--ss-fg) 6%, var(--ss-bg));
  --ss-brand: oklch(from var(--accent, #3b5bdb) clamp(var(--brand-lo, 0), l, var(--brand-hi, 0.42)) c h);
  --ss-brand-soft: color-mix(in oklab, var(--ss-brand) 12%, var(--ss-bg));
  --ss-g: calc(var(--round, 1) * 0.4);
  /* The tools' corners, as every dialog has them (see draw/shape/css.ts). */
  --ss-r: min(calc(4px * var(--round, 1) + var(--round-up, 0px)), 26px);
  position: fixed;
  inset: 0;
  z-index: 70;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, Estedad, sans-serif;
}
.ss-scrim { position: absolute; inset: 0; background: rgba(20, 20, 18, 0.18); animation: ss-fade 140ms ease-out; }
.ss-wrap {
  position: absolute;
  top: clamp(64px, 16vh, 180px);
  left: 50%;
  width: min(560px, calc(100vw - 32px));
  translate: -50% 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.ss-shell {
  max-height: calc(100vh - clamp(64px, 16vh, 180px) - 24px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1.5px solid color-mix(in oklab, var(--ss-fg) 80%, var(--ss-bg));
  border-radius: var(--ss-r);
  background: var(--ss-bg);
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.35);
  outline: 4px solid transparent;
  transition: border-color 150ms ease-out, outline-color 150ms ease-out;
  animation: ss-rise 180ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.ss-shell:focus-within { border-color: var(--ss-brand); outline-color: var(--ss-brand-soft); }
.ss-line { display: flex; align-items: center; height: 72px; padding: 0 22px; }
.ss-input {
  width: 100%;
  border: 0;
  background: none;
  color: var(--ss-fg);
  font: inherit;
  font-size: 22px;
  font-weight: 450;
  letter-spacing: -0.01em;
  caret-color: var(--ss-brand);
  outline: none;
}
.ss-input::placeholder { color: color-mix(in oklab, var(--ss-fg) 40%, var(--ss-bg)); }
.ss-card:empty { display: none; }
.ss-card { padding: 0 6px; animation: ss-card 220ms ease-out; }
/* Pictures pasted in for an issue, in a strip that scrolls rather than grows the box. */
.ss-pictures { display: flex; gap: 8px; padding: 8px 6px 2px; overflow-x: auto; scrollbar-width: thin; }
.ss-pictures figure { position: relative; flex: none; margin: 0; }
.ss-pictures img { display: block; width: 72px; height: 56px; object-fit: cover; border: 1px solid var(--gs-line, #c9c5bc); border-radius: calc(6px * var(--round, 1)); }
.ss-picture-out { position: absolute; inset-block-start: -6px; inset-inline-end: -6px; display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; background: var(--gs-ink); color: var(--gs-paper); font: inherit; font-size: 15px; line-height: 1; cursor: pointer; }
.ss-card .sc { min-width: 0; border: 0; box-shadow: none; padding: 4px 16px 6px; }
.ss-card.is-ghost { opacity: 0.35; filter: grayscale(0.6); pointer-events: none; transition: opacity 200ms, filter 200ms; }
.ss-foot:empty { display: none; }
.ss-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; min-height: 52px; padding: 6px 22px 16px; }
.ss-foot-end { display: inline-flex; align-items: center; gap: 8px; margin-inline-start: auto; }
.ss-details { height: 34px; padding: 0 12px; border: 1px solid var(--ss-line); border-radius: calc(999px * var(--round, 1)); background: none; color: var(--ss-fg); font: inherit; font-size: 13px; cursor: pointer; }
.ss-details[aria-expanded='true'] { border-color: var(--ss-brand); background: var(--ss-brand-soft); color: var(--ss-brand); }
.ss-keys { display: inline-flex; align-items: center; gap: 6px; color: var(--ss-soft); font-size: 13px; font-weight: 500; }
.ss-add {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 0 14px;
  border: 0;
  border-radius: calc(999px * var(--round, 1));
  background: var(--ss-fg);
  color: var(--ss-bg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.ss-add span { opacity: 0.6; }
.ss-add:focus-visible { outline: 2px solid var(--ss-brand); outline-offset: 2px; }
.ss-chips { display: flex; justify-content: center; gap: 8px; min-height: 44px; padding-top: 12px; }
.ss-chips:empty { min-height: 12px; }
.ss-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  overflow: hidden;
  padding: 0 12px;
  border: 1px solid var(--ss-line);
  border-radius: calc(999px * var(--round, 1));
  background: var(--ss-bg);
  color: var(--ss-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  animation: ss-card 200ms ease-out;
}
.ss-chip.is-on { border-color: color-mix(in srgb, var(--ss-brand) 45%, transparent); }
.ss-chip-bar { position: absolute; inset: auto 0 0 0; height: 2px; background: var(--ss-brand); transform-origin: left; }
.ss-icon { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.ss-help { margin: 4px 0 0; color: rgba(255, 255, 255, 0.92); font-size: 13px; text-align: center; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45); }
.ss-help .gs-kbd { color: var(--ss-fg); }
.ss-layer.has-card .ss-help { visibility: hidden; }

.ss-palette {
  position: absolute;
  top: 84px;
  left: 50%;
  width: min(480px, 100%);
  translate: -50% 0;
  overflow: hidden;
  border: 1.5px solid color-mix(in oklab, var(--ss-fg) 80%, var(--ss-bg));
  border-radius: var(--ss-r);
  background: var(--ss-bg);
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.35);
}
.ss-palette-head { padding: 8px; }
.ss-palette-search {
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: min(calc(12px * var(--ss-g)), 18px);
  background: var(--ss-tile);
  color: var(--ss-fg);
  font: inherit;
  font-size: 14px;
  outline: none;
}
.ss-palette-list { max-height: min(420px, 56vh); margin: 0; padding: 0 8px 8px; overflow-y: auto; overscroll-behavior: contain; list-style: none; }
.ss-option { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 8px; border-radius: min(calc(14px * var(--ss-g)), 20px); color: var(--ss-fg); cursor: pointer; }
.ss-option.is-on, .ss-option:hover { background: var(--ss-tile); }
.ss-option-tile { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border: 1px solid var(--ss-line); border-radius: min(calc(9px * var(--ss-g)), 14px); background: var(--ss-bg); }
.ss-option b { width: 96px; flex: none; font-size: 14px; font-weight: 500; }
.ss-option-example { min-width: 0; overflow: hidden; color: var(--ss-soft); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.ss-empty { padding: 14px 8px; color: var(--ss-soft); font-size: 13px; }
/* What the box can do besides make a card: in the list under its own name, and in the box. */
.ss-palette-group { padding: 12px 8px 4px; color: var(--ss-soft); font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.ss-option-tile .gs-icon { width: 18px; height: 18px; }
.ss-option b { width: auto; min-width: 96px; }
.ss-command { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 6px 12px; border: 1px solid var(--ss-line); border-radius: min(calc(14px * var(--ss-g)), 20px); background: var(--ss-bg); color: var(--ss-fg); }
.ss-command .gs-icon { width: 22px; height: 22px; flex: none; }
.ss-command b { font-size: 16px; font-weight: 600; }
.ss-command span { min-width: 0; overflow: hidden; color: var(--ss-soft); text-overflow: ellipsis; white-space: nowrap; }
.ss-chip-command .gs-icon { width: 16px; height: 16px; flex: none; }
/* What a command answers with, in the box: a short list, each row a way there. */
.ss-panel { display: grid; gap: 6px; padding: 4px 6px; }
.ss-panel-head { margin: 0; color: var(--ss-soft); font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
.ss-panel-list { display: grid; gap: 2px; max-height: min(320px, 46vh); margin: 0; padding: 0; overflow-y: auto; list-style: none; }
.ss-panel-row { display: flex; align-items: baseline; gap: 10px; min-height: 40px; padding: 8px; border-radius: min(calc(10px * var(--ss-g)), 14px); color: var(--ss-fg); text-decoration: none; }
.ss-panel-row:hover, .ss-panel-row:focus-visible { background: var(--ss-tile); }
.ss-panel-row b { flex: none; color: var(--ss-soft); font-variant-numeric: tabular-nums; }
.ss-panel-row span { min-width: 0; overflow-wrap: anywhere; }
.ss-panel-none { padding: 10px 8px; color: var(--ss-soft); }
.ss-panel-row.is-done span { color: var(--ss-soft); text-decoration: line-through; }
.ss-panel-more { justify-self: start; display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid var(--ss-line); border-radius: calc(999px * var(--round, 1)); color: var(--ss-fg); font-size: 13px; font-weight: 600; text-decoration: none; }
.ss-panel-more:hover { background: var(--ss-tile); }
/* The calendar in the box: a month of small days, and the one chosen under it. */
.ss-cal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ss-cal-head b { font-size: 15px; }
.ss-cal-step { width: 36px; height: 36px; border: 0; border-radius: 50%; background: transparent; color: var(--ss-fg); font: inherit; font-size: 20px; cursor: pointer; }
.ss-cal-step:hover { background: var(--ss-tile); }
.ss-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
.ss-cal-wd { padding: 2px 0; color: var(--ss-soft); font-size: 11px; text-align: center; }
.ss-cal-cell { position: relative; display: grid; place-items: center; min-height: 38px; padding: 0; border: 0; border-radius: min(calc(9px * var(--ss-g)), 12px); background: transparent; color: var(--ss-fg); font: inherit; font-size: 13px; font-variant-numeric: tabular-nums; cursor: pointer; }
.ss-cal-cell:hover { background: var(--ss-tile); }
.ss-cal-cell.is-out { color: var(--ss-soft); opacity: 0.55; }
.ss-cal-cell.is-today { box-shadow: inset 0 0 0 1.5px var(--ss-brand, var(--accent)); font-weight: 700; }
.ss-cal-cell.is-on { background: var(--ss-fg); color: var(--ss-bg); }
.ss-cal-dots { position: absolute; inset-block-end: 4px; width: 4px; height: 4px; border-radius: 50%; background: var(--ss-brand, var(--accent)); }
.ss-cal-dots[data-n="2"] { box-shadow: -6px 0 0 var(--ss-brand, var(--accent)); }
.ss-cal-dots[data-n="3"] { box-shadow: -6px 0 0 var(--ss-brand, var(--accent)), 6px 0 0 var(--ss-brand, var(--accent)); }
.ss-cal-dots.is-done { background: var(--ss-soft); }
.ss-cal-day { display: grid; gap: 6px; padding-block-start: 6px; border-block-start: 1px dashed var(--ss-line); }
/* A setting in the box: what it is, and its choices as chips. */
.ss-set { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 44px; }
.ss-set > span { min-width: 96px; color: var(--ss-soft); font-size: 13px; }

/* ---- a card's fields, by hand ---- */
.se-panel {
  --se-g: calc(var(--round, 1) * 0.4);
  --se-r: min(calc(4px * var(--round, 1) + var(--round-up, 0px)), 26px);
  /* The palette's own paper, ink and accent, as the tools mix them (draw/chrome/css/kit.ts): the
     card and the box change with the theme. The accent is held dark on a light theme and light on a
     dark one (--brand-lo/hi, from draw/doc/head.ts) so it reads on the paper whatever it is -- measured for every palette in tests/draw/look. */
  --ss-bg: var(--gs-paper, #ffffff);
  --ss-fg: var(--gs-ink, #1a1a19);
  --ss-soft: var(--gs-soft, #6f6d68);
  --ss-line: color-mix(in oklab, var(--ss-fg) 12%, var(--ss-bg));
  --ss-tile: color-mix(in oklab, var(--ss-fg) 6%, var(--ss-bg));
  --ss-brand: oklch(from var(--accent, #3b5bdb) clamp(var(--brand-lo, 0), l, var(--brand-hi, 0.42)) c h);
  --ss-brand-soft: color-mix(in oklab, var(--ss-brand) 12%, var(--ss-bg));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--ss-fg);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, Estedad, sans-serif;
  font-size: 14px;
  text-align: start;
}
.se-panel *, .se-panel *::before, .se-panel *::after { box-sizing: border-box; }
.se-float {
  position: fixed;
  z-index: 72;
  width: min(380px, calc(100vw - 24px));
  max-height: min(640px, calc(100vh - 24px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  border: 1.5px solid color-mix(in oklab, var(--ss-fg) 80%, var(--ss-bg));
  border-radius: var(--se-r);
  background: var(--ss-bg);
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.35);
  animation: ss-rise 160ms ease-out;
}
.se-inline { padding: 12px 22px 8px; border-block-start: 1px solid var(--ss-line); }
.se-head { display: flex; align-items: center; gap: 10px; }
.se-head h3 { flex: 1; min-width: 0; margin: 0; font-size: 15px; font-weight: 600; }
.se-x { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: calc(999px * var(--round, 1)); background: none; color: var(--ss-soft); font-size: 20px; cursor: pointer; }
.se-x:hover { background: var(--ss-tile); color: var(--ss-fg); }
.se-form { display: grid; gap: 12px; }
.se-field { display: grid; gap: 6px; min-width: 0; }
.se-field > span { color: var(--ss-soft); font-size: 12px; font-weight: 500; }
.se-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.se-input {
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--ss-line);
  border-radius: min(calc(10px * var(--se-g)), 16px);
  background: var(--ss-bg);
  color: var(--ss-fg);
  font: inherit;
  font-size: 15px;
  outline: none;
}
textarea.se-input { height: auto; min-height: 96px; padding: 10px 12px; resize: vertical; line-height: 1.45; }
.se-input:focus { border-color: var(--ss-brand); box-shadow: 0 0 0 3px var(--ss-brand-soft); }
input[type='color'].se-input { flex: none; width: 56px; padding: 4px; }
.se-colour { display: flex; gap: 8px; }
.se-list { display: grid; gap: 6px; }
.se-list-row { display: flex; gap: 6px; }
.se-mini {
  display: inline-grid;
  place-items: center;
  flex: none;
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--ss-line);
  border-radius: min(calc(10px * var(--se-g)), 16px);
  background: var(--ss-bg);
  color: var(--ss-fg);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.se-mini:hover { background: var(--ss-tile); }
.se-add { justify-self: start; }
.se-days { display: flex; gap: 6px; flex-wrap: wrap; }
.se-day { width: 40px; height: 40px; padding: 0; border: 1px solid var(--ss-line); border-radius: calc(50% * min(1, var(--round, 1))); background: none; color: var(--ss-soft); font: inherit; font-size: 13px; cursor: pointer; }
.se-day[aria-pressed='true'] { border-color: var(--ss-fg); background: var(--ss-fg); color: var(--ss-bg); }
.se-presets { display: flex; gap: 6px; flex-wrap: wrap; }
.se-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.se-reset { margin-inline-end: auto; padding: 0; border: 0; background: none; color: var(--ss-soft); font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; }
.se-save, .se-cancel { height: 38px; padding: 0 16px; border-radius: calc(999px * var(--round, 1)); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
.se-save { border: 0; background: var(--ss-fg); color: var(--ss-bg); }
.se-cancel { border: 1px solid var(--ss-line); background: none; color: var(--ss-fg); }
.se-save:focus-visible, .se-cancel:focus-visible, .se-mini:focus-visible, .se-day:focus-visible { outline: 2px solid var(--ss-brand); outline-offset: 2px; }
/* On a phone the panel is a sheet from the bottom, within a thumb's reach. */
@media (max-width: 520px) {
  .se-float { inset: auto 0 0 0 !important; width: 100%; max-height: 82vh; border-radius: var(--se-r) var(--se-r) 0 0; }
}

/* The notebook's own way in: the spread has no tray. */
/* One of the tools' cards, like the turner beside it. */
.ss-open { position: fixed; z-index: 45; inset-block-end: 18px; inset-inline-end: 18px; display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px; border: 1.5px solid var(--gs-line); border-radius: var(--gs-radius); background: var(--gs-paper); color: var(--gs-ink); font-family: var(--ui-font); font-size: var(--gs-t2); box-shadow: var(--gs-shadow); cursor: pointer; }
.ss-open .gs-kbd { color: var(--gs-ink); }
.ss-keep { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border-radius: var(--ss-r); color: var(--ss-soft); font-size: 13px; cursor: pointer; }
.ss-keep:hover, .ss-keep:focus-visible { background: var(--ss-tile); color: var(--ss-fg); }
/* No keyboard, no key caps: the hint to clear says nothing to a thumb, and "keep as" is a
   button whose words are enough. */
@media (hover: none), (max-width: 520px) {
  .ss-keys:not(.ss-keep) { display: none; }
  .ss-keep .gs-kbd { display: none; }
}
@media (max-width: 760px) {
  /* Beside the page turner, in the corner it leaves free, the same height as it. */
  .ss-open { inset-block-end: calc(8px + env(safe-area-inset-bottom, 0px)); inset-inline-end: 8px; width: 48px; height: 48px; padding: 0; justify-content: center; }
  .ss-open span, .ss-open .gs-kbd { display: none; }
}

@keyframes ss-fade { from { opacity: 0; } }
@keyframes ss-rise { from { opacity: 0; transform: translateY(6px) scale(0.99); } }
@keyframes ss-card { from { opacity: 0; transform: translateY(6px); filter: blur(3px); } }
@media (max-width: 520px) {
  .ss-line { height: 60px; padding: 0 18px; }
  .ss-input { font-size: 18px; }
  .ss-option b { width: 80px; }
}
@media (prefers-reduced-motion: reduce) {
  .ss-scrim, .ss-shell, .ss-card, .ss-chip { animation: none; }
}
`;
