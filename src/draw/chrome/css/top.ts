/**
 * The top of every surface: the masthead, the places, and the actions.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The masthead, the places and the actions, and how they fold on a small screen. */
export const TOP = `/* ---- the top ----

   Three cards along the top edge: who and where on the left, the places in the middle, the
   things you can do on the right. The row itself takes no pointer, so the board under the
   gaps between the cards is still the board. */
.gs-top {
  position: fixed;
  inset-block-start: 14px;
  inset-inline: 14px;
  /* Above the other chrome cards, because its menus hang down over them. */
  z-index: 55;
  display: grid;
  /* The middle column takes what is left, so the places centre in the space between the
     other two instead of on the window -- and can never be overlapped by either of them. */
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  pointer-events: none;
}
.gs-top > * { pointer-events: auto; }

.gs-mast {
  justify-self: start;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  height: 46px;
  padding: 0 14px 0 7px;
}
.gs-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: none;
  color: inherit;
  text-decoration: none;
  border-radius: var(--gs-radius);
}
.gs-brand:focus-visible { outline: 2.5px solid var(--gs-ink); outline-offset: 3px; }
/* The mark is a stamp: a disc of the hot ink with a hand-written g, set a little off true,
   the way a rubber stamp never lands straight. */
.gs-brand-mark {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  border: 1.5px solid var(--gs-line);
  border-radius: 50%;
  background: var(--gs-hot);
  color: var(--gs-on-hot);
  font-family: var(--marker-font);
  font-size: 23px;
  line-height: 1;
  transform: rotate(-8deg);
  transition: transform var(--gs-mid) var(--gs-ease);
}
.gs-brand:hover .gs-brand-mark { transform: rotate(4deg); }
.gs-brand-word { font-family: var(--marker-font); font-size: 21px; line-height: 1; letter-spacing: 0.01em; }
.gs-mast .gs-back { flex: none; }
.gs-name {
  min-width: 0;
  overflow: hidden;
  padding-inline-start: 11px;
  border-inline-start: 1.5px solid var(--gs-faint);
  font-family: var(--hand-font);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* The save state, as a word and a dot. Quiet when everything is written, the hot ink while
   something is on its way, and printed in reverse when the server cannot be reached -- that
   one is not quiet, because it is the one that matters. */
.gs-saved {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 3px 7px;
  border-radius: 2px;
  color: var(--gs-soft);
  font-size: var(--gs-t1);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.gs-saved::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
.gs-saved[data-state='saving'] { color: var(--gs-ink); }
.gs-saved[data-state='saving']::before { background: var(--gs-hot); opacity: 1; animation: gs-pulse 700ms ease-in-out infinite alternate; }
.gs-saved[data-state='offline'] { background: var(--gs-ink); color: var(--gs-paper); font-weight: 700; }
.gs-saved[data-state='offline']::before { background: var(--gs-hot); opacity: 1; }

.gs-places { justify-self: center; display: flex; gap: 2px; padding: 5px; }
/* A surface's own actions fold into the menu when there is no room for them on the bar. */
.gs-narrow-only { display: none; }
.gs-place {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 13px 0 10px;
  border-radius: var(--gs-radius);
  color: var(--gs-soft);
  text-decoration: none;
  transition: background-color var(--gs-fast) linear, color var(--gs-fast) linear;
}
.gs-place .gs-icon { width: 18px; height: 18px; }
.gs-place:hover { background: var(--gs-wash); color: var(--gs-ink); }
.gs-place[aria-current='page'] { background: var(--gs-ink); color: var(--gs-paper); }

.gs-acts {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px;
}
.gs-acts-own { display: flex; align-items: center; gap: 3px; }
.gs-search-open {
  min-width: 164px;
  justify-content: flex-start;
  margin-inline-start: 3px;
  padding-inline: 9px 6px;
  border-color: var(--gs-faint);
  color: var(--gs-soft);
}
.gs-search-open .gs-kbd { margin-inline-start: auto; }
.gs-search-open:hover:not(:disabled) { color: var(--gs-ink); }
/* On a wide screen the places are tabs and the menu does not repeat them. */
.gs-menu-places { display: none; }

/* A surface with many things to do -- a notebook has six -- gives up their words before it lets
   the cards overlap: the places used to slide over the notebook's own name. */
@media (max-width: 1600px) {
  .gs-acts-own:has(> .gs-btn:nth-of-type(4)) > .gs-btn:not(.gs-btn-primary) .gs-btn-text { display: none; }
  .gs-acts-own:has(> .gs-btn:nth-of-type(4)) > .gs-btn:not(.gs-btn-primary) { padding-inline: 8px; }
}
@media (max-width: 1180px) {
  .gs-brand-word { display: none; }
  .gs-search-open { min-width: 0; }
  .gs-search-open .gs-btn-text { display: none; }
}
@media (max-width: 900px) {
  .gs-top { display: flex; justify-content: space-between; }
  .gs-places { display: none; }
  .gs-menu-places { display: block; }
  .gs-wide-only { display: none; }
  .gs-narrow-only { display: block; }
  .gs-search-open .gs-kbd { display: none; }
  .gs-search-open { width: var(--gs-control); padding: 0; justify-content: center; border-color: transparent; }
}
@media (max-width: 520px) {
  .gs-top { inset-block-start: 8px; inset-inline: 8px; gap: 6px; }
  .gs-mast { height: 44px; padding-inline-end: 10px; gap: 6px; }
  .gs-name { font-size: 19px; padding-inline-start: 8px; }
  .gs-saved { font-size: 0; gap: 0; padding: 3px; }
  .gs-saved[data-state='offline'] { font-size: var(--gs-t1); gap: 6px; padding: 3px 7px; }
  .gs-acts .gs-btn-text { display: none; }
  .gs-acts > .gs-menu:not([data-gs='more']) > summary { width: var(--gs-control); padding: 0; }
}
`;
