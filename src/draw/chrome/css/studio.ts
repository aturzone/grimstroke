/**
 * The profile page: the easel, who you are, and the card.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The easel and the card beside it. */
export const STUDIO = `/* ---- the profile page ----

   A photo booth on the desk: the 3:4 frame large on the left with the pens under it, and on
   the right who you are and the card that comes out of it. The page is chrome, so every class
   is gs- or pf- prefixed and none of it inherits from a document class. */

body.on-profile {
  min-height: 100vh;
  background: var(--desk);
  color: var(--paper);
  padding-block-start: 76px;
}
.pf-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 28px;
  align-items: start;
  max-width: 1240px;
  margin: 0 auto;
  padding: 16px 28px 48px;
}
.pf-easel { display: grid; justify-items: center; gap: 16px; }

/* The frame: a mat of photo card round the drawing, taped to the desk, off true by a hair. */
.pf-frame {
  position: relative;
  /* Short enough that the pens under it are on screen without scrolling. */
  width: min(100%, calc((100vh - 360px) * 0.75), 460px);
  min-width: min(100%, 260px);
  padding: 14px 14px 40px;
  background: #fbf8f0;
  border: 1.5px solid #14110e;
  box-shadow: 8px 9px 0 rgba(0, 0, 0, 0.4);
  transform: rotate(-0.6deg);
}
.pf-frame::before, .pf-frame::after {
  content: '';
  position: absolute;
  inset-block-start: -12px;
  width: 92px;
  height: 24px;
  background: color-mix(in oklab, #f4efe0 86%, var(--accent));
  opacity: 0.8;
  border-inline: 1px solid rgba(0, 0, 0, 0.14);
}
.pf-frame::before { inset-inline-start: 18px; transform: rotate(-5deg); }
.pf-frame::after { inset-inline-end: 18px; transform: rotate(4deg); }
.pf-canvas {
  border: 1.5px solid #14110e;
  cursor: crosshair;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.pf-canvas[data-tool='eraser'] { cursor: cell; }
/* The sketch: pale blue, under the drawing, the colour of a non-photo pencil. */
.pf-canvas .pt-sketch .pt-stroke.line { stroke: #6f9be8; opacity: 0.6; }
.pf-canvas .pt-sketch .pt-stroke.fill { fill: #6f9be8; opacity: 0.35; }
.pf-canvas[data-hide-sketch] .pt-sketch { display: none; }
.pf-canvas[data-sketching] .portrait { outline: 2px dashed #6f9be8; outline-offset: 4px; }
/* The mirror's centre line: only on the easel, never in the portrait. */
.pf-canvas { position: relative; }
.pf-canvas[data-mirror]::after {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 50%;
  border-inline-start: 1.5px dashed color-mix(in oklab, var(--gs-hot) 70%, transparent);
  pointer-events: none;
}
.pf-canvas .pt-trace { pointer-events: none; }
.pf-helpers { padding: 4px 0; }
.pf-trace-fade { display: inline-flex; align-items: center; gap: 6px; font-size: var(--gs-t1); color: var(--gs-soft); }
.pf-trace-fade[hidden] { display: none; }
.pf-trace-fade input { width: 90px; accent-color: var(--gs-ink); }
.pf-canvas .portrait { background: #fff; }

.pf-tools {
  display: grid;
  gap: 10px;
  width: min(100%, 560px);
  padding: 10px 12px;
}
.pf-pens { display: flex; gap: 3px; justify-content: center; }
.pf-sizes { justify-content: center; padding: 0; }
.pf-inks, .pf-papers, .pf-accents { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; }
.pf-paper-row, .pf-accent-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.pf-paper-row .gs-btn { margin-inline-start: auto; }
.pf-label {
  color: var(--gs-soft);
  font: 700 var(--gs-t1) / 1.4 var(--ui-font);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pf-side { display: grid; gap: 18px; position: sticky; inset-block-start: 76px; }
.pf-who { padding: 4px 14px 14px; }
.pf-who .gs-menu-head { padding-inline: 0; }
.pf-field { display: grid; gap: 4px; margin-block-end: 9px; font-size: var(--gs-t1); color: var(--gs-soft); }
.pf-field .gs-field { width: 100%; color: var(--gs-ink); font-size: var(--gs-t2); }
.pf-details { display: grid; gap: 6px; margin-block-end: 8px; }
.pf-detail { display: grid; grid-template-columns: 34% 1fr auto; gap: 6px; align-items: center; }
.pf-detail .gs-field { width: 100%; min-width: 0; padding: 5px 7px; font-size: var(--gs-t1); }
.pf-add { border: 1.5px dashed var(--gs-faint); width: 100%; margin-block-end: 12px; }
.pf-accent-row { justify-content: space-between; }

.pf-card-stage { justify-self: center; width: min(100%, 300px); padding: 12px 8px 4px; }
.pf-card-stage .profile { max-width: none; }
.pf-note { padding: 8px 16px 0; color: var(--gs-soft); font-size: var(--gs-t1); line-height: 1.5; }

@media (max-width: 960px) {
  .pf-page { grid-template-columns: 1fr; padding-inline: 12px; }
  .pf-side { position: static; }
  .pf-frame { width: min(100%, 420px); }
}
@media (max-width: 520px) {
  body.on-profile { padding-block-start: 64px; }
}
/* ---- your pet ---- */
.pf-pet { display: grid; gap: 8px; padding-block-end: 12px; }
.pf-pet-stage { display: grid; place-items: center; height: 104px; margin: 0 12px; background: repeating-linear-gradient(0deg, #6e4a2c 0 3px, #7a5230 3px 14px); border-radius: var(--gs-radius); }
.pf-pet-stage canvas { width: 144px; height: 120px; image-rendering: pixelated; margin-block-start: -24px; }
.pf-pet-row { padding: 0 12px; align-items: center; }
.pf-pet-on { margin-inline-start: auto; font-size: var(--gs-t2); display: flex; gap: 6px; align-items: center; }
.pf-coats { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 6px; padding: 0 12px; }
.pf-coat { display: grid; justify-items: center; gap: 2px; padding: 4px 2px; border: 1.5px solid var(--gs-faint); border-radius: var(--gs-radius); background: var(--gs-paper); cursor: pointer; font: inherit; font-size: var(--gs-t1); color: var(--gs-soft); }
.pf-coat[hidden] { display: none; }
.pf-coat canvas { width: 96px; height: 80px; image-rendering: pixelated; }
.pf-coat[aria-pressed='true'] { border-color: var(--gs-ink); box-shadow: 2px 2px 0 var(--gs-line); color: var(--gs-ink); }
.pf-pet .pf-field, .pf-pet .pf-note { padding-inline: 12px; }

/* ---- the corners slider ---- */
.pf-corners-row { display: flex; align-items: center; gap: 12px; }
.pf-corners-range { flex: 1; accent-color: var(--gs-hot); }
.pf-corners-value { min-width: 48px; font-family: var(--ui-font); font-variant-numeric: tabular-nums; text-align: end; }
.pf-corners-sample { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.pf-corners-card { padding: 10px 16px; }
.pf-corners-pill { padding: 4px 12px; border: 1.5px solid var(--gs-line); border-radius: calc(999px * var(--round, 1)); font-family: var(--ui-font); font-size: var(--gs-t1); }
`;
