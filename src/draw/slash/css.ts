/**
 * The / board's look: the day page's column, with the box at its head and the cards below.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template literal,
 * so it CANNOT CONTAIN A BACKTICK -- not even in a comment.
 */

export const SLASH = `/* ---- the / board ---- */
/* One column that never grows past the page: a long line inside a card wraps, it does not push. */
.sl-page { grid-template-columns: minmax(0, 1fr); }
.sl-box {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 0 16px;
  border: 1.5px solid var(--gs-ink);
  border-radius: var(--round-up, 10px);
  background: var(--gs-paper);
  color: var(--gs-soft);
  font: inherit;
  font-size: 16px;
  text-align: start;
  cursor: text;
  box-shadow: 3px 4px 0 color-mix(in oklab, var(--gs-ink) 22%, transparent);
}
.sl-box > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sl-box .gs-icon { flex: none; width: 22px; height: 22px; color: var(--sc-brand, var(--accent)); }
.sl-box:focus-visible { outline: 2.5px solid var(--accent); outline-offset: 2px; }
.sl-tools { display: grid; gap: 10px; }
.sl-find { width: 100%; min-height: 44px; box-sizing: border-box; font-size: 16px; }
.sl-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sl-chips .gs-chip-btn b { margin-inline-start: 4px; font-weight: 600; color: var(--gs-soft); }
.sl-chips [aria-pressed="true"] { background: var(--gs-ink); color: var(--gs-paper); }
.sl-chips [aria-pressed="true"] b { color: inherit; }
.sl-list { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
.sl-item { display: grid; gap: 6px; min-width: 0; }
.sl-item[hidden] { display: none; }
.sl-item > .sc { width: 100%; max-width: none; box-sizing: border-box; }
.sl-foot { display: flex; align-items: center; gap: 4px; min-height: 40px; padding-inline: 4px; }
.sl-where {
  display: inline-flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 40px;
  color: var(--gs-soft);
  font-size: var(--gs-t1);
  text-decoration: none;
}
.sl-where span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sl-where .gs-icon { flex: none; width: 16px; height: 16px; }
.sl-where:hover span { text-decoration: underline; }
.sl-foot .gs-btn-icon { width: 40px; height: 40px; }
.sl-done > summary { cursor: pointer; padding: 10px 4px; list-style-position: inside; }
.sl-done .sl-list { margin-block-start: 6px; }
.sl-none { margin: 0; padding: 24px 4px; color: var(--gs-soft); text-align: center; }
.sl-empty { padding: 14px 16px; }
.sl-empty p { margin: 0; color: var(--gs-soft); line-height: 1.5; }
`;
