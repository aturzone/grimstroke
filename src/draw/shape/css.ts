/**
 * The shape card's look: quiet, on the palette's photo paper, one accent -- a small tool laid on
 * the paper, changing with the theme like everything else the tools draw. It is one of
 * the tools' cards: the same keyline, the same hard shadow and the same corners as the bars
 * around it, so a board of notes and cards reads as one set rather than two design languages.
 *
 * Corners. The card's radius is the tools' own, calc(4px x --round + --round-up), capped so a
 * large box never turns into a blob. What is inside nests: a tile or a swatch is never rounder
 * than the card around it less the padding between them. --sc-g scales the parts inside.
 *
 * Size. A card is as wide as its item and only grows downward -- nothing in it may push it wider,
 * so the selection outline on the board is the card's own edge. Below 300px it lays itself out
 * as one column.
 */

export const SHAPE = `/* ---- shape cards ---- */
.sc {
  /* The palette's own paper, ink and accent, as the tools mix them (draw/chrome/css/kit.ts): the
     card and the box change with the theme. The accent is held dark on a light theme and light on a
     dark one (--brand-lo/hi, from draw/doc/head.ts) so it reads on the paper whatever it is -- measured for every palette in tests/draw/look. */
  --sc-bg: var(--gs-paper, #ffffff);
  --sc-fg: var(--gs-ink, #1a1a19);
  --sc-soft: var(--gs-soft, #6f6d68);
  --sc-faint: color-mix(in oklab, var(--sc-fg) 38%, var(--sc-bg));
  --sc-line: color-mix(in oklab, var(--sc-fg) 12%, var(--sc-bg));
  --sc-tile: color-mix(in oklab, var(--sc-fg) 6%, var(--sc-bg));
  --sc-brand: oklch(from var(--accent, #3b5bdb) clamp(var(--brand-lo, 0), l, var(--brand-hi, 0.42)) c h);
  --sc-brand-soft: color-mix(in oklab, var(--sc-brand) 12%, var(--sc-bg));
  --sc-good: #2b8a3e;
  --sc-caution: #c2410c;
  --sc-g: calc(var(--round, 1) * 0.4);
  --sc-r: min(calc(4px * var(--round, 1) + var(--round-up, 0px)), 26px);
  --sc-pad: 16px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 14px var(--sc-pad) var(--sc-pad);
  overflow: hidden;
  container-type: inline-size;
  border: 1.5px solid color-mix(in oklab, var(--sc-fg) 80%, var(--sc-bg));
  border-radius: var(--sc-r);
  background: var(--sc-bg);
  color: var(--sc-fg);
  /* The system's own sans for Latin, Estedad for Persian (the system faces rarely carry it). */
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, Estedad, sans-serif;
  font-size: 15px;
  line-height: 1.45;
  box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.3);
  text-align: start;
}
.sc *, .sc *::before, .sc *::after { box-sizing: border-box; }
.sc.is-closed { opacity: 0.62; }
.sc-head { display: flex; align-items: center; gap: 12px; min-height: 40px; margin-block-end: 12px; color: var(--sc-soft); }
.sc-tile { display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: min(calc(12px * var(--sc-g)), calc(var(--sc-r) - 6px)); background: var(--sc-tile); color: var(--sc-fg); }
.sc-icon { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.sc-mini { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.sc-label { min-width: 0; overflow: hidden; font-size: 14px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.sc-badge { display: inline-flex; align-items: center; gap: 4px; margin-inline-start: auto; padding: 2px 8px; border: 1px solid var(--sc-line); border-radius: calc(999px * var(--round, 1)); font-size: 12px; }
.sc-caution { border-color: color-mix(in srgb, var(--sc-caution) 30%, transparent); background: color-mix(in srgb, var(--sc-caution) 8%, transparent); color: var(--sc-caution); }
/* The pencil: the card's own fields, without retyping it. */
.sc-edit { display: grid; place-items: center; width: 36px; height: 36px; flex: none; margin-inline-start: auto; padding: 0; border: 1px solid transparent; border-radius: min(calc(10px * var(--sc-g)), calc(var(--sc-r) - 6px)); background: none; color: var(--sc-soft); }
.sc-badge + .sc-edit { margin-inline-start: 0; }
.sc-edit:hover, .sc-edit:focus-visible { border-color: var(--sc-line); background: var(--sc-tile); color: var(--sc-fg); }
.sc-edit .sc-mini { width: 17px; height: 17px; }
.sc-body { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.sc-title { margin: 0; font-size: 17px; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.sc-meta { margin: 0; color: var(--sc-soft); font-size: 13px; }
.sc-good { color: var(--sc-good); }
.sc-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.sc-head-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sc-line { display: flex; align-items: center; gap: 8px; min-width: 0; margin: 0; color: var(--sc-soft); overflow-wrap: anywhere; }
.sc-line a { min-width: 0; color: inherit; overflow-wrap: anywhere; }
.sc-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; max-width: 100%; padding: 2px 10px; border-radius: calc(999px * var(--round, 1)); background: var(--sc-tile); font-size: 13px; font-weight: 500; }
.sc-chips { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.sc-issue-kind[data-kind="bug"] { background: color-mix(in oklab, #d1242f 16%, var(--sc-tile)); }
.sc-issue-kind[data-kind="feature"] { background: color-mix(in oklab, #1a7f37 16%, var(--sc-tile)); }
.sc-labels { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
.sc-labels li { padding: 1px 8px; border: 1px solid var(--sc-line); border-radius: calc(999px * var(--round, 1)); color: var(--sc-soft); font-size: 12px; }
.sc-issue-body { white-space: pre-line; overflow-wrap: anywhere; }
.sc-missing { display: inline-flex; align-items: center; min-height: 28px; max-width: 100%; padding: 2px 10px; border: 1px dashed var(--sc-line); border-radius: calc(999px * var(--round, 1)); color: var(--sc-faint); font-size: 13px; }
.sc-avatar { display: inline-grid; place-items: center; width: 26px; height: 26px; flex: none; border: 2px solid var(--sc-bg); border-radius: calc(50% * min(1, var(--round, 1))); background: var(--sc-tile); color: var(--sc-soft); font-size: 11px; font-weight: 700; }
.sc-people .sc-avatar + .sc-avatar { margin-inline-start: -10px; }
.sc-avatar-big { width: 48px; height: 48px; font-size: 16px; }
.sc-hero { margin: 0; font-size: 30px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.sc-hero span, .sc-num span { color: var(--sc-soft); font-size: 0.55em; font-weight: 500; }
.sc-num { margin: 0 0 6px; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.sc-count { min-width: 28px; text-align: center; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; }
.sc-split { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; min-width: 0; }
.sc-split > * { min-width: 0; }
.sc-end { text-align: end; }
.sc-note { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.sc-expr { margin: 0; color: var(--sc-soft); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }

/* The controls: quiet until touched, and big enough for a thumb. */
.sc-act { font: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.sc-act:disabled { cursor: default; }
.sc-act:focus-visible { outline: 2px solid var(--sc-brand); outline-offset: 2px; }
.sc-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: 0; border-radius: calc(999px * var(--round, 1)); background: var(--sc-fg); color: var(--sc-bg); font-size: 13px; font-weight: 500; }
.sc-btn.is-on { background: var(--sc-good); }
.sc-icon-btn { width: 36px; padding: 0; justify-content: center; background: var(--sc-tile); color: var(--sc-fg); }
.sc-soft-btn { background: var(--sc-tile); color: var(--sc-fg); }
.sc-btn:disabled { opacity: 0.38; }
.sc-pill { min-height: 32px; padding: 0 12px; border: 1px solid var(--sc-line); border-radius: calc(999px * var(--round, 1)); background: none; font-size: 13px; }
.sc-pill.is-on { border-color: var(--sc-brand); background: var(--sc-brand-soft); color: var(--sc-brand); }
.sc-check { position: relative; width: 22px; height: 22px; flex: none; padding: 0; border: 1.5px solid var(--sc-faint); border-radius: min(calc(6px * var(--sc-g)), 9px); background: none; }
/* The whole row is the target, not just the box. */
.sc-check::before { content: ''; position: absolute; inset: -9px; }
.sc-check.is-on { border-color: var(--sc-fg); background: var(--sc-fg); }
.sc-check.is-on::after { content: ''; position: absolute; inset: 3px 6px 6px; border: solid var(--sc-bg); border-width: 0 2px 2px 0; transform: rotate(45deg) translate(1px, -1px); }

.sc-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.sc-list li { display: flex; align-items: center; gap: 12px; min-height: 42px; min-width: 0; border-block-end: 1px solid var(--sc-line); }
.sc-list li span { min-width: 0; overflow-wrap: anywhere; }
.sc-list li:last-child { border-block-end: 0; }
.sc-list li.is-done span { color: var(--sc-faint); text-decoration: line-through; }
.sc-reminder { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.sc-reminder > div { min-width: 0; }
.sc-reminder .sc-check { margin-block-start: 3px; }
.sc-reminder.is-done .sc-title { color: var(--sc-faint); text-decoration: line-through; }

.sc-timer { position: relative; display: grid; place-items: center; width: 120px; height: 120px; flex: none; }
.sc-ring { position: absolute; inset: 0; transform: rotate(-90deg); }
.sc-ring circle { fill: none; stroke-width: 3; }
.sc-ring-track { stroke: var(--sc-line); }
.sc-ring-bar { stroke: var(--sc-brand); stroke-linecap: round; transition: stroke-dashoffset 0.9s linear; }
.sc-clock { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.sc-body:has(> .sc-timer) { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 16px; }
.sc-side { display: flex; flex: 1 1 140px; flex-direction: column; gap: 10px; min-width: 0; }
.sc-steps { gap: 6px; }

.sc-week { display: flex; gap: 6px; flex-wrap: wrap; }
.sc-day { width: 36px; height: 36px; border: 1px solid var(--sc-line); border-radius: calc(50% * min(1, var(--round, 1))); background: none; color: var(--sc-soft); font-size: 13px; font-weight: 500; }
.sc-day.is-on { border-color: var(--sc-fg); background: var(--sc-fg); color: var(--sc-bg); }

.sc-swatch { display: flex; align-items: flex-end; height: 96px; padding: 12px; overflow-wrap: anywhere; border-radius: min(calc(14px * var(--sc-g)), calc(var(--sc-r) - 8px)); font-weight: 700; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06); }
.sc-codes { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 14px; margin: 0; font-size: 13px; font-variant-numeric: tabular-nums; }
.sc-codes dt { color: var(--sc-soft); }
.sc-codes dd { margin: 0; direction: ltr; text-align: start; overflow-wrap: anywhere; }

.sc-convert { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; min-width: 0; }
.sc-eq { color: var(--sc-faint); font-size: 20px; }
.sc-wrap { flex-wrap: wrap; }

.sc-poll { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.sc-vote { display: flex; flex-direction: column; gap: 6px; width: 100%; min-height: 40px; padding: 6px 0; border: 0; background: none; text-align: start; }
.sc-poll-label { display: flex; justify-content: space-between; gap: 10px; width: 100%; }
.sc-poll-label span:first-child { min-width: 0; overflow-wrap: anywhere; }
.sc-poll-label span:last-child { color: var(--sc-soft); font-size: 13px; font-variant-numeric: tabular-nums; }
.sc-bar { display: block; width: 100%; height: 4px; overflow: hidden; border-radius: calc(999px * var(--round, 1)); background: var(--sc-tile); }
.sc-bar span { display: block; height: 100%; border-radius: inherit; background: var(--sc-brand); }
.sc-bar-big { height: 8px; }

.sc-contact { display: flex; align-items: center; gap: 14px; min-width: 0; }
.sc-contact > div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sc-link { display: flex; align-items: center; gap: 12px; min-width: 0; color: inherit; text-decoration: none; }
.sc-link > span:last-child { min-width: 0; }
.sc-link b { display: block; overflow-wrap: anywhere; }
.sc-link small { display: block; color: var(--sc-soft); font-size: 12px; overflow-wrap: anywhere; }
.sc-zones { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.sc-zones li { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; min-height: 36px; border-block-end: 1px solid var(--sc-line); }
.sc-zones li span { min-width: 0; overflow-wrap: anywhere; }
.sc-zones li:last-child { border-block-end: 0; }
.sc-zones b { font-size: 20px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sc-result { min-width: 56px; text-align: center; }

/* Narrow: one column, the numbers a size smaller. */
@container (max-width: 300px) {
  .sc-body:has(> .sc-timer) { flex-direction: column; align-items: flex-start; }
  .sc-split { flex-direction: column; align-items: flex-start; }
  .sc-end { text-align: start; }
  .sc-hero { font-size: 26px; }
  .sc-week { gap: 4px; }
  .sc-day { width: 32px; height: 32px; }
}

/* A card on a board: the item box is the card -- it never gets narrower than a card can be, and
   its height is the card's (a card grows downward as it gains items; a fixed height would cut it). */
.item:has(> .sc) { min-width: 240px; height: auto !important; background: none; }
@media (prefers-reduced-motion: reduce) {
  .sc-ring-bar { transition: none; }
}
@media (hover: none) {
  .sc-edit { width: 40px; height: 40px; }
  .sc-btn { height: 40px; }
  .sc-icon-btn { width: 40px; }
}
`;
