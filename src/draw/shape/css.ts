/**
 * The shape card's look: quiet, white, rounded, one blue -- the calm of the Shapeshift demo, kept
 * apart from the zine look of the rest of the page on purpose. A card is a small tool laid on the
 * paper, and it reads as one.
 */

export const SHAPE = `/* ---- shape cards ---- */
.sc {
  --sc-bg: #ffffff;
  --sc-fg: #1a1a19;
  --sc-soft: #6f6d68;
  --sc-faint: #a3a19b;
  --sc-line: #e7e5e1;
  --sc-tile: #f3f2ef;
  --sc-brand: #3b5bdb;
  --sc-brand-soft: #eef1fd;
  --sc-good: #2b8a3e;
  --sc-caution: #c2410c;
  box-sizing: border-box;
  width: 100%;
  min-width: 260px;
  padding: 14px 18px 16px;
  border: 1px solid var(--sc-line);
  border-radius: calc(20px * var(--round, 1));
  background: var(--sc-bg);
  color: var(--sc-fg);
  /* The system's own sans for Latin, Estedad for Persian (the system faces rarely carry it). */
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, Estedad, sans-serif;
  font-size: 15px;
  line-height: 1.45;
  box-shadow: 0 1px 2px rgba(20, 20, 18, 0.06), 0 8px 24px -12px rgba(20, 20, 18, 0.18);
  text-align: start;
}
.sc *, .sc *::before, .sc *::after { box-sizing: border-box; }
.sc.is-closed { opacity: 0.62; }
.sc-head { display: flex; align-items: center; gap: 12px; min-height: 40px; margin-block-end: 12px; color: var(--sc-soft); }
.sc-tile { display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: calc(12px * var(--round, 1) + var(--round-up, 0px) * 0.5); background: var(--sc-tile); color: var(--sc-fg); }
.sc-icon { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.sc-mini { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.sc-label { font-size: 14px; font-weight: 500; }
.sc-badge { display: inline-flex; align-items: center; gap: 4px; margin-inline-start: auto; padding: 2px 8px; border: 1px solid var(--sc-line); border-radius: calc(999px * var(--round, 1)); font-size: 12px; }
.sc-caution { border-color: color-mix(in srgb, var(--sc-caution) 30%, transparent); background: color-mix(in srgb, var(--sc-caution) 8%, transparent); color: var(--sc-caution); }
.sc-body { display: flex; flex-direction: column; gap: 10px; }
.sc-title { margin: 0; font-size: 17px; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.sc-meta { margin: 0; color: var(--sc-soft); font-size: 13px; }
.sc-good { color: var(--sc-good); }
.sc-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sc-head-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sc-line { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--sc-soft); }
.sc-line a { color: inherit; }
.sc-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: calc(999px * var(--round, 1)); background: var(--sc-tile); font-size: 13px; font-weight: 500; }
.sc-missing { display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border: 1px dashed var(--sc-line); border-radius: calc(999px * var(--round, 1)); color: var(--sc-faint); font-size: 13px; }
.sc-avatar { display: inline-grid; place-items: center; width: 26px; height: 26px; flex: none; border: 2px solid var(--sc-bg); border-radius: calc(50% * min(1, var(--round, 1))); background: var(--sc-tile); color: var(--sc-soft); font-size: 11px; font-weight: 700; }
.sc-people .sc-avatar + .sc-avatar { margin-inline-start: -10px; }
.sc-avatar-big { width: 48px; height: 48px; font-size: 16px; }
.sc-hero { margin: 0; font-size: 30px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.sc-hero span, .sc-num span { color: var(--sc-soft); font-size: 0.55em; font-weight: 500; }
.sc-num { margin: 0 0 6px; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; }
.sc-count { min-width: 28px; text-align: center; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; }
.sc-split { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.sc-end { text-align: end; }
.sc-note { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.sc-expr { margin: 0; color: var(--sc-soft); font-variant-numeric: tabular-nums; }

/* The controls: quiet until touched. */
.sc-act { font: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.sc-act:disabled { cursor: default; }
.sc-act:focus-visible { outline: 2px solid var(--sc-brand); outline-offset: 2px; }
.sc-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 0; border-radius: calc(999px * var(--round, 1)); background: var(--sc-fg); color: var(--sc-bg); font-size: 13px; font-weight: 500; }
.sc-btn.is-on { background: var(--sc-good); }
.sc-icon-btn { width: 32px; padding: 0; justify-content: center; background: var(--sc-tile); color: var(--sc-fg); }
.sc-btn:disabled { opacity: 0.38; }
.sc-pill { height: 28px; padding: 0 10px; border: 1px solid var(--sc-line); border-radius: calc(999px * var(--round, 1)); background: none; font-size: 13px; }
.sc-pill.is-on { border-color: var(--sc-brand); background: var(--sc-brand-soft); color: var(--sc-brand); }
.sc-check { position: relative; width: 20px; height: 20px; flex: none; padding: 0; border: 1.5px solid var(--sc-faint); border-radius: calc(6px * var(--round, 1) + var(--round-up, 0px)); background: none; }
.sc-check.is-on { border-color: var(--sc-fg); background: var(--sc-fg); }
.sc-check.is-on::after { content: ''; position: absolute; inset: 3px 5px 5px; border: solid var(--sc-bg); border-width: 0 2px 2px 0; transform: rotate(45deg) translate(1px, -1px); }

.sc-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.sc-list li { display: flex; align-items: center; gap: 12px; min-height: 40px; border-block-end: 1px solid var(--sc-line); }
.sc-list li:last-child { border-block-end: 0; }
.sc-list li.is-done span { color: var(--sc-faint); text-decoration: line-through; }
.sc-reminder { display: flex; align-items: flex-start; gap: 12px; }
.sc-reminder .sc-check { margin-block-start: 3px; }
.sc-reminder.is-done .sc-title { color: var(--sc-faint); text-decoration: line-through; }

.sc-timer { position: relative; display: grid; place-items: center; width: 120px; height: 120px; flex: none; }
.sc-ring { position: absolute; inset: 0; transform: rotate(-90deg); }
.sc-ring circle { fill: none; stroke-width: 3; }
.sc-ring-track { stroke: var(--sc-line); }
.sc-ring-bar { stroke: var(--sc-brand); stroke-linecap: round; transition: stroke-dashoffset 0.9s linear; }
.sc-clock { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.sc-timer-body, .sc-body:has(.sc-timer) { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 18px; }
.sc-side { display: flex; flex-direction: column; gap: 10px; }

.sc-week { display: flex; gap: 6px; flex-wrap: wrap; }
.sc-day { width: 34px; height: 34px; border: 1px solid var(--sc-line); border-radius: calc(50% * min(1, var(--round, 1))); background: none; color: var(--sc-soft); font-size: 13px; font-weight: 500; }
.sc-day.is-on { border-color: var(--sc-fg); background: var(--sc-fg); color: var(--sc-bg); }

.sc-swatch { display: flex; align-items: flex-end; height: 96px; padding: 12px; border-radius: calc(14px * var(--round, 1) + var(--round-up, 0px) * 0.5); font-weight: 700; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06); }
.sc-codes { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 0; font-size: 13px; font-variant-numeric: tabular-nums; }
.sc-codes dt { color: var(--sc-soft); }
.sc-codes dd { margin: 0; direction: ltr; text-align: start; }

.sc-convert { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.sc-eq { color: var(--sc-faint); font-size: 20px; }
.sc-wrap { flex-wrap: wrap; }

.sc-poll { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.sc-vote { display: flex; flex-direction: column; gap: 6px; width: 100%; padding: 6px 0; border: 0; background: none; text-align: start; }
.sc-poll-label { display: flex; justify-content: space-between; width: 100%; }
.sc-poll-label span:last-child { color: var(--sc-soft); font-size: 13px; font-variant-numeric: tabular-nums; }
.sc-bar { display: block; width: 100%; height: 4px; overflow: hidden; border-radius: calc(999px * var(--round, 1)); background: var(--sc-tile); }
.sc-bar span { display: block; height: 100%; border-radius: inherit; background: var(--sc-brand); }
.sc-bar-big { height: 8px; }

.sc-contact { display: flex; align-items: center; gap: 14px; }
.sc-contact > div { display: flex; flex-direction: column; gap: 4px; }
.sc-link { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.sc-link b { display: block; }
.sc-link small { display: block; color: var(--sc-soft); font-size: 12px; overflow-wrap: anywhere; }
.sc-zones { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.sc-zones li { display: flex; justify-content: space-between; align-items: baseline; min-height: 36px; border-block-end: 1px solid var(--sc-line); }
.sc-zones li:last-child { border-block-end: 0; }
.sc-zones b { font-size: 20px; font-variant-numeric: tabular-nums; }
.sc-result { min-width: 56px; text-align: center; }

/* A card on a board: the item box is the card. */
.item:has(> .sc) { background: none; }
@media (prefers-reduced-motion: reduce) {
  .sc-ring-bar { transition: none; }
}
`;
