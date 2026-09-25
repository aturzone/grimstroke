/**
 * Repository cards: index cards with a typed header, a hand-written title and a rubber stamp
 * for the state. Same paper and hard shadow as everything else placed on a page.
 */

export const REMOTE = `/* ---- repository cards ---- */
.remote-block { margin: 0; }
:is(.board, .leaf-items) .item:has(> .remote-block) { width: var(--card-width, 320px); }
.rc {
  position: relative;
  overflow: hidden;
  container-type: inline-size;
  display: grid;
  gap: 8px;
  padding: 12px 14px 12px;
  background: #fbf9f3;
  color: #1b1a17;
  border: 1.5px solid #1b1a17;
  box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.22);
  font-family: var(--body-font);
  font-size: 13px;
  line-height: 1.4;
  background-image: linear-gradient(to bottom, transparent 44px, rgba(192, 38, 45, 0.28) 44px 45.5px, transparent 45.5px);
}
.rc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
  font-family: var(--mono-font);
  font-size: 11px;
  letter-spacing: 0.02em;
}
.rc-brand { flex: none; width: 20px; }
.rc-where { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #5b5a55; }
.rc-tag { margin-inline-start: auto; font-weight: 700; }
.rc-title-row { display: flex; align-items: flex-start; gap: 10px; margin-block-start: 4px; }
.rc-title {
  margin: 0;
  font-family: var(--hand-font);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.rc-issue.is-closed .rc-title { text-decoration: line-through 2px rgba(27, 26, 23, 0.55); }
/* The tick: a box drawn by hand. Ticked, the issue is closed. */
.rc-tick {
  flex: none;
  width: 20px;
  height: 20px;
  margin-block-start: 2px;
  padding: 0;
  border: 2px solid #1b1a17;
  border-radius: calc(3px * var(--round, 1) + var(--round-up, 0px)) calc(2px * var(--round, 1) + var(--round-up, 0px)) calc(4px * var(--round, 1) + var(--round-up, 0px)) calc(2px * var(--round, 1) + var(--round-up, 0px));
  background: #fff;
  cursor: pointer;
}
.rc-tick[aria-pressed='true'] {
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 13l5 5L21 5' fill='none' stroke='%2315803d' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 120% no-repeat;
}
.rc-stamp {
  position: absolute;
  top: 38px;
  right: 10px;
  padding: 1px 8px;
  border: 2px solid currentColor;
  border-radius: calc(3px * var(--round, 1) + var(--round-up, 0px));
  font-family: var(--marker-font);
  font-size: 15px;
  letter-spacing: 0.06em;
  opacity: 0.82;
  rotate: 8deg;
  pointer-events: none;
}
.rc-stamp-open { color: #15803d; }
.rc-stamp-closed { color: #7c3aed; }
.rc-stamp-merged { color: #6b21a8; }
.rc-stamp-draft { color: #8a8f98; }
.rc-stamp-failed { color: #c0262d; }
.rc-fixed { margin: 0; padding: 2px 8px; background: #e7f6ec; border-inline-start: 3px solid #15803d; font-size: 11.5px; }
.rc-fixed code { font-family: var(--mono-font); }
.rc-type { justify-self: start; padding: 0 6px; border: 1px solid #1b1a17; font-family: var(--mono-font); font-size: 10px; text-transform: uppercase; }
.rc-labels { display: flex; flex-wrap: wrap; gap: 5px; }
.rc-label, .rc-closes {
  padding: 1px 7px 1px 9px;
  background: color-mix(in oklab, var(--label, #8a8f98) 22%, #fff);
  border-inline-start: 4px solid var(--label, #8a8f98);
  font-family: var(--mono-font);
  font-size: 10.5px;
}
.rc-closes { --label: #15803d; }
.rc-body { max-height: 8.5em; overflow: hidden; color: #33322e; font-size: 12.5px; -webkit-mask-image: linear-gradient(black 70%, transparent); mask-image: linear-gradient(black 70%, transparent); }
.rc-body p, .rc-body ul, .rc-body ol { margin: 0 0 4px; }
.rc-foot { display: flex; align-items: center; gap: 10px; min-height: 22px; font-family: var(--mono-font); font-size: 10.5px; color: #5b5a55; }
.rc-people { display: inline-flex; }
.rc-face {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-inline-end: -5px;
  border: 1.5px solid #fff;
  border-radius: calc(50% * min(1, var(--round, 1)));
  background: #1f3fd0;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
}
.rc-face:nth-child(2) { background: #c26a00; }
.rc-face:nth-child(3) { background: #15803d; }
.rc-face:nth-child(4) { background: #6b4c9a; }
.rc-seen { margin-inline-start: auto; opacity: 0.8; }
.rc-error { margin: 0; padding: 4px 8px; background: #fde8e8; border-inline-start: 3px solid #c0262d; color: #7f1d1d; font-size: 11.5px; }
.rc-reply { display: flex; gap: 6px; align-items: center; }
.rc-reply-line {
  flex: 1;
  min-width: 0;
  padding: 3px 2px;
  border: 0;
  border-block-end: 1.5px solid #1b1a17;
  background: transparent;
  font: inherit;
  font-family: var(--hand-font);
  font-size: 15px;
}
.rc-reply-line:focus { outline: none; border-block-end-color: #1f3fd0; }
.rc-send { padding: 2px 10px; border: 1.5px solid #1b1a17; background: #fff; font-family: var(--mono-font); font-size: 11px; cursor: pointer; }
.rc-open { justify-self: end; font-family: var(--mono-font); font-size: 10px; color: #1f3fd0; }
.rc-branches { margin: 0; font-size: 12px; }
.rc-branches code, .rc-title code { font-family: var(--mono-font); font-size: 0.85em; padding: 0 4px; background: rgba(0, 0, 0, 0.06); }
.rc-checks { font-weight: 700; }
.rc-checks-passed { color: #15803d; }
.rc-checks-failed { color: #c0262d; }
.rc-sha {
  justify-self: start;
  margin: 0;
  padding: 2px 10px;
  background: #1b1a17;
  color: #f4efe2;
  font-family: var(--mono-font);
  font-size: 13px;
  letter-spacing: 0.12em;
  rotate: -1.5deg;
}
.rc-more { margin: 0; white-space: pre-line; color: #4a4944; font-size: 12px; }
.rc-jobs { display: flex; flex-wrap: wrap; gap: 4px; }
.rc-job { width: 18px; height: 18px; border: 1.5px solid #1b1a17; background: #d4d4d8; }
.rc-job-passed { background: #4ade80; }
.rc-job-failed { background: #f87171; }
.rc-job-running { background: #60a5fa; }
.rc-job-pending { background: #fde68a; }
.rc-rows { display: grid; gap: 3px; margin: 0; padding: 0; list-style: none; }
.rc-row { display: flex; align-items: baseline; gap: 7px; padding: 3px 0; border-block-end: 1px dashed rgba(0, 0, 0, 0.15); }
.rc-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #15803d; translate: 0 -1px; }
.rc-row-closed .rc-dot { background: #7c3aed; }
.rc-row-merged .rc-dot { background: #6b21a8; }
.rc-row-n { flex: none; font-family: var(--mono-font); font-size: 11px; color: #5b5a55; }
.rc-row-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-row-more, .rc-empty { margin: 0; color: #8a8f98; font-size: 12px; }
.rc-loading { opacity: 0.75; }
/* A narrow card -- a tracker column -- keeps what matters: the title, the rows, the count. */
@container (max-width: 190px) {
  .rc-where, .rc-seen, .rc-tag { display: none; }
  .rc { gap: 6px; padding: 10px 10px 8px; }
  .rc-title { font-size: 17px; }
  .rc-row-n { display: none; }
}
/* A tracker column over its limit: said on the card, in red, without shouting. */
.rc-query.is-over { box-shadow: 4px 5px 0 rgba(192, 38, 45, 0.35); border-color: #c0262d; }
.rc-over { color: #c0262d; font-weight: 700; }
/* Printed, a card keeps its box and its line; the controls that only a live page can answer
   are drawn as what they are on paper. */
:where(body:not(.live)) :is(.rc-send, .rc-open) { display: none; }
@media print { .rc-send, .rc-open { display: none; } }
.rc-count { padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 2px; }
.rc-count:hover { color: var(--ink); text-decoration-style: solid; }
`;
