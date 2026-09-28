/**
 * The day page's look: one column of the tools' own cards on the desk, made for a thumb.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template literal,
 * so it CANNOT CONTAIN A BACKTICK -- not even in a comment.
 */

export const TODAY = `/* ---- the day ---- */
/* A light, quiet page: the morning is not a dark desk. The cards lie on a paper a shade deeper. */
body.on-today { margin: 0; min-height: 100vh; background: color-mix(in oklab, var(--gs-ink) 7%, var(--gs-paper)); font-family: var(--ui-font); color: var(--gs-ink); }
:root:has(> body.on-today) { background-color: color-mix(in oklab, var(--gs-ink) 7%, var(--gs-paper)); }
.td-page {
  box-sizing: border-box;
  display: grid;
  gap: 14px;
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 92px 16px 48px;
}
.td-hello { padding: 4px 4px 6px; color: var(--gs-ink); }
.td-greet { margin: 0; color: var(--gs-soft); font-size: var(--gs-t2); letter-spacing: 0.02em; }
.td-date { margin: 2px 0 0; font-family: var(--hand-font); font-size: 34px; font-weight: 700; line-height: 1.1; }
.td-card { padding: 14px 16px 10px; }
.td-head { margin: 0 0 6px; color: var(--gs-soft); font-size: var(--gs-t1); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.td-list, .td-items { margin: 0; padding: 0; list-style: none; }
.td-row { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 6px 0; border-block-start: 1px dashed var(--gs-faint); }
.td-list > .td-row:first-child { border-block-start: 0; }
.td-row.is-done .td-title { color: var(--gs-soft); text-decoration: line-through 1.5px; }
.td-lead { flex: none; display: grid; place-items: center; width: 72px; color: var(--gs-soft); }
.td-lead .gs-icon { width: 22px; height: 22px; }
.td-time { display: grid; justify-items: center; font-variant-numeric: tabular-nums; font-size: var(--gs-t2); font-weight: 700; color: var(--gs-ink); white-space: nowrap; }
.td-time small { font-size: var(--gs-t1); font-weight: 400; color: var(--gs-soft); }
.td-body { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; }
.td-title { font-size: var(--gs-t3); font-weight: 600; overflow-wrap: anywhere; }
.td-meta { color: var(--gs-soft); font-size: var(--gs-t1); }
.td-where { flex-basis: 100%; color: var(--gs-soft); font-size: var(--gs-t1); text-decoration: none; }
.td-where:hover { color: var(--gs-ink); text-decoration: underline; }
.td-check {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1.5px solid var(--gs-line);
  border-radius: calc(4px * var(--round, 1) + var(--round-up, 0px));
  background: var(--gs-paper);
  color: transparent;
  cursor: pointer;
  transition: background var(--gs-fast) var(--gs-ease), color var(--gs-fast) var(--gs-ease), transform var(--gs-fast) var(--gs-ease);
}
.td-check .gs-icon { width: 20px; height: 20px; }
.td-check:hover { color: var(--gs-soft); }
.td-check:active { transform: scale(0.94); }
.td-check[aria-pressed='true'] { background: var(--gs-ink); color: var(--gs-paper); }
.td-check:focus-visible { outline: 2.5px solid var(--gs-ink); outline-offset: 2px; }
.td-listrow { align-items: flex-start; }
.td-items { flex-basis: 100%; display: grid; gap: 2px; margin-block-start: 6px; }
.td-item { display: flex; align-items: center; gap: 12px; min-height: 44px; font-size: var(--gs-t3); }
.td-more { padding-inline-start: 48px; color: var(--gs-soft); font-size: var(--gs-t1); }
.td-overdue .td-head { color: color-mix(in oklab, var(--gs-hot) 70%, var(--gs-ink)); }
.td-yesterday > summary { cursor: pointer; list-style: none; margin: 0; }
.td-yesterday > summary::-webkit-details-marker { display: none; }
.td-yesterday[open] > summary { margin-block-end: 6px; }
.td-mark { display: grid; place-items: center; width: 28px; height: 28px; color: var(--gs-soft); font-weight: 700; }
.td-mark.is-kept { color: var(--gs-ink); }
.td-mark .gs-icon { width: 18px; height: 18px; }
.td-remind { justify-self: start; margin-block-start: 8px; }
.td-remind[hidden] { display: none; }
.td-empty p { margin: 4px 0 8px; color: var(--gs-soft); line-height: 1.55; }
.td-add { display: flex; justify-content: center; margin: 6px 0 0; }
.td-add .gs-btn { height: 48px; padding: 0 18px; }
@media (max-width: 520px) {
  .td-page { padding: 72px 10px 32px; gap: 10px; }
  .td-date { font-size: 30px; }
}
`;
