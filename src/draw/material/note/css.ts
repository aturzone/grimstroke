/**
 * The sticky note.
 *
 * Part of the one stylesheet, assembled in draw/doc/style.ts. It is CSS in a template
 * literal, so it CANNOT CONTAIN A BACKTICK -- not even in a comment. That has closed the
 * string and broken the build four times.
 */

/** The sticky note. */
export const NOTE = `/* The sticky note.

   Brought over from chevaletNote, the extension this whole look comes from. Same classes,
   same layer order, same art -- a note here and a note there are the same object.

   Colour is always a token, so re-theming a note is four custom-property writes and no
   repaint of the art layers.

   NO BACKTICKS IN THIS FILE. It is one CSS template literal; a backtick in a comment ends the
   string, and the error surfaces as a nonsense type error twenty lines later. */

.cn-defs { position: absolute; width: 0; height: 0; overflow: hidden; }

.note {
  --cn-paper: #ffe94a;
  --cn-ink: #14110e;
  --cn-accent: #ff2e63;
  --cn-font: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --cn-size: 15px;
  --cn-lh: 1.45;
  --cn-opacity: 1;
  --cn-grain: .16;
  --cn-edge: color-mix(in oklab, var(--cn-ink) 88%, var(--cn-paper));
  --cn-shade: color-mix(in oklab, var(--cn-paper) 80%, var(--cn-ink));

  position: relative;
  width: max-content;
  opacity: var(--cn-opacity);
  -webkit-user-select: none;
  user-select: none;
}

.note:focus { outline: none; }
.note:focus-visible .face { outline: 3px solid var(--cn-accent); outline-offset: 3px; }

/* The hard, unblurred offset shadow is the single most 90s thing in the whole design.
   It is the SAME torn path as the paper -- a rectangle behind a torn shape peeks out at
   every tear and reads instantly as a bug. */
.shadow {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  opacity: .18;
  transform: translate3d(4px, 5px, 0);
  pointer-events: none;
}
.shadow path { fill: #000; }
.note[data-shadow="none"] .shadow { display: none; }
.note[data-shadow="soft"] .shadow { filter: blur(7px); opacity: .26; }

/* Depth only while the sheet is in the air.

   A note tilts towards you as it is lifted, and that needs a 3D rendering context. It had
   one permanently, on every note, and a board of eighty notes panned at 20fps with them and
   31 without -- each context is a separate composited plane, and nearly all of them were
   holding a sheet lying perfectly flat. The app marks the note that is actually moving. */
.note-lifted .tilt { perspective: 900px; }
.note-lifted .card { transform-style: preserve-3d; }

.face {
  position: relative;
  width: 240px;
  height: 170px;
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  color: var(--cn-ink);
  font: var(--cn-size) / var(--cn-lh) var(--cn-font);
  display: grid;
  /* Three rows: the toolbar, the name if it has one, and the text. The middle row is auto so
     it collapses to nothing when there is no name -- and the rows below are placed
     EXPLICITLY, because the name was added as a fourth child and grid auto-placement put it
     after the 1fr row: the name appeared along the bottom edge of the note. */
  grid-template-rows: 30px auto 1fr;
  isolation: isolate;
  /* Lets the toolbar respond to the NOTE's width rather than the viewport's -- a note is
     resized by hand, so a media query would be measuring the wrong thing entirely. */
  container: note / inline-size;
}

/* ---- paper ---- */

.paper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
  overflow: visible;
}
.paper-fill {
  fill: var(--cn-paper);
  stroke: var(--cn-edge);
  stroke-width: 2.5;
  stroke-linejoin: round;
}
/* Halftone: one shared pattern used directly as a fill. Static, so the browser caches the
   tile once for every note on the page. */
.paper-halftone {
  fill: url(#cn-halftone-dark);
  mix-blend-mode: multiply;
  opacity: .16;
  pointer-events: none;
}
/* Multiplying black dots onto dark paper is invisible, so dark palettes get the inverse. */
.note[data-dark="1"] .paper-halftone {
  fill: url(#cn-halftone-light);
  mix-blend-mode: screen;
  opacity: .16;
}

.note .grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: var(--cn-grain);
  pointer-events: none;
  background-image: var(--grain, none);
  background-repeat: repeat;
}

/* No specular highlight anywhere on the sheet. Paper is matte: it scatters light, it does not
   reflect it. Lifting a note is sold by the shadow separating and the sheet tilting -- a
   moving glare belongs on glass, and on paper it reads as plastic. */

/* The tape is used on a note AND on a photo mount, and only a note defines the --cn- tokens.
   Without the fallbacks the color-mix had an undefined argument, the whole declaration was
   invalid, and the strip fell back to solid black -- a grey slab lying across the corner of
   every taped photograph. */
.tape-strip {
  fill: color-mix(in oklab, var(--cn-paper, var(--paper, #f7f4ea)) 22%, #f7f4ea);
  opacity: .74;
  stroke: color-mix(in oklab, var(--cn-ink, var(--ink, #14110e)) 20%, transparent);
  stroke-width: .8;
}

/* ---- the note's own ink ---- */

/* Above the paper, below the toolbar. A stroke drawn on a note belongs to the note: it moves
   with the sheet, it is re-themed with it, and it is deleted with it. Ink drawn on the BOARD
   is a different object at a different z, lying on the plane under everything. */
.note-ink {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: visible;
  pointer-events: none;
}
.note-ink .ink-stroke {
  fill: none;
  stroke: var(--stroke, var(--cn-ink));
  stroke-width: var(--stroke-weight, 2.4px);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.note-ink .tool-highlighter { opacity: .38; mix-blend-mode: multiply; stroke-width: var(--stroke-weight, 14px); stroke-linecap: butt; }
.note-ink .tool-marker { opacity: .92; stroke-width: var(--stroke-weight, 5px); }

/* Drawing means the pointer must reach the sheet, so the body stops taking it and the
   cursor says what the click will do. */
.note[data-drawing] .body { pointer-events: none; }
.note[data-drawing] .face { cursor: crosshair; }
.note[data-drawing] .note-ink { pointer-events: auto; }

.curl {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.curl-level {
  fill: var(--cn-shade);
  stroke: var(--cn-edge);
  stroke-width: 1.2;
  stroke-linejoin: round;
}

/* ---- header ---- */

/* Above the ink layer, or turning drawing on makes the toolbar unclickable and there is no
   way to turn it off again. */
.note .handle {
  grid-row: 1;
  position: relative;
  z-index: 7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 0 5px 0 7px;
  cursor: grab;
  touch-action: none;
  /* Without min-width:0 a flex item refuses to shrink below its content, so on a narrow note
     the toolbar spilled out over the torn edge -- buttons hanging in mid-air outside it. */
  min-width: 0;
  overflow: hidden;
}
/* The divider is inset rather than a full-width border, because the torn edge wanders inward
   and a full-width line pokes out through the tear. */
.note .handle::before {
  content: '';
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 0;
  height: 2px;
  background: color-mix(in oklab, var(--cn-ink) 18%, transparent);
}
.note.is-dragging .handle { cursor: grabbing; }

.grip-dots {
  flex: 0 1 34px;
  min-width: 0;
  height: 9px;
  opacity: .5;
  background-image: radial-gradient(var(--cn-ink) 1px, transparent 1.2px);
  background-size: 5px 5px;
}

/* The note name, on its own line under the toolbar. It was in the header first, beside the
   toolbar, and a real name did not fit: "Tuesday shopping" came out as "Tuesda..." in the
   seven characters that were left. */
.note-name {
  grid-row: 2;
  padding: 4px 12px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 700 12px/1.3 var(--cn-font);
  letter-spacing: .01em;
  color: var(--cn-ink);
  opacity: .82;
  user-select: none;
}
.note-name[hidden] { display: none; }

.note .actions { display: flex; gap: 1px; flex: 0 0 auto; }
/* 24px targets. The first version used 18px glyphs at 55% opacity and the first person to try
   the build simply could not hit them -- notably, could not delete a note at all. */
.note .act {
  all: unset;
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  color: var(--cn-ink);
  cursor: pointer;
  border-radius: calc(3px * var(--round, 1) + var(--round-up, 0px));
  opacity: .78;
}
.note .act svg { width: 15px; height: 15px; display: block; }
.note .act svg path { fill: currentColor; }
.note .act:hover { opacity: 1; background: color-mix(in oklab, var(--cn-ink) 16%, transparent); }
.note .act:focus-visible { outline: 2px solid var(--cn-accent); outline-offset: -2px; }
.note .act.is-on { opacity: 1; background: var(--cn-accent); color: var(--cn-paper); }
.note .act-delete:hover { background: var(--cn-accent); color: var(--cn-paper); }

/* Below these widths the toolbar would crowd the drag handle, so the lower-priority buttons
   step aside. Widening the note brings them straight back. */
@container note (max-width: 235px) { .grip-dots { display: none; } }
@container note (max-width: 205px) { .note .act-lock { display: none; } }
@container note (max-width: 180px) { .note .act-collapse { display: none; } }

/* ---- body ---- */

.note .body {
  grid-row: 3;
  padding: 7px 11px 12px;
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-user-select: text;
  user-select: text;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  /* unicode-bidi:plaintext makes each paragraph pick its own direction from its first strong
     character -- the correct behaviour for a note mixing Persian and English. */
  unicode-bidi: plaintext;
  scrollbar-width: thin;
}
.note .body:focus { outline: none; }
.note[data-align="center"] .body { text-align: center; }
.note[data-align="end"] .body { text-align: end; }
.note .body code {
  font-family: var(--mono-font);
  font-size: .88em;
  background: color-mix(in oklab, var(--cn-ink) 12%, transparent);
  padding: 0 3px;
}

/* ---- markdown ----

   The body is rendered markdown now, so it is laid out by its elements rather than by its
   whitespace: pre-wrap here doubled every line break the renderer had already turned into a
   break or a paragraph. Spacing is tight, because a note is small. */
.note .body { white-space: normal; }
.note .body > * + * { margin-block-start: .45em; }
.note .body p { margin: 0; }
.note .body .md-h { font-size: 1.12em; font-weight: 700; line-height: 1.2; margin-block-end: .1em; }
.note .body h4.md-h { font-size: 1em; }
.note .body strong { font-weight: 700; }
.note .body del { opacity: .6; }
.note .body a { color: inherit; text-decoration-thickness: 1.5px; text-underline-offset: 2px; }
.note .body .md-list { padding-inline-start: 1.25em; }
.note .body .md-list li + li { margin-block-start: .15em; }
.note .body .md-list li::marker { color: color-mix(in oklab, var(--cn-ink) 70%, var(--cn-accent)); }
.note .body .md-task { list-style: none; margin-inline-start: -1.25em; display: flex; gap: .45em; align-items: baseline; }
/* A drawn box, not the platform's: a checkbox in the operating system's style is the one
   thing on the sheet that would not look printed. */
.note .body .md-check {
  appearance: none;
  flex: none;
  width: .95em;
  height: .95em;
  margin: 0;
  border: 1.6px solid var(--cn-ink);
  border-radius: calc(2px * var(--round, 1) + var(--round-up, 0px));
  background: transparent;
  translate: 0 .12em;
  cursor: pointer;
}
.note .body .md-check:checked {
  background: var(--cn-ink);
  box-shadow: inset 0 0 0 1.6px var(--cn-paper);
}
.note .body .md-task.is-done > .md-item { text-decoration: line-through; opacity: .62; }
.note .body .md-quote { padding-inline-start: .7em; border-inline-start: 3px solid color-mix(in oklab, var(--cn-ink) 45%, transparent); }
.note .body .md-pre {
  padding: .4em .5em;
  background: color-mix(in oklab, var(--cn-ink) 10%, transparent);
  white-space: pre-wrap;
  direction: ltr;
  text-align: left;
}
.note .body .md-pre code { background: none; padding: 0; }
.note .body .md-hr { border: 0; border-block-start: 1.5px dashed color-mix(in oklab, var(--cn-ink) 40%, transparent); }

/* ---- grips ---- */

.note .grips { position: absolute; inset: 0; pointer-events: none; }
.note .grip {
  position: absolute;
  pointer-events: auto;
  touch-action: none;
  opacity: 0;
  transition: opacity 120ms ease;
}
.note:hover .grip, .note:focus-within .grip { opacity: .5; }
.note .grip:hover { opacity: 1; }
.grip-se {
  right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize;
  background:
    linear-gradient(135deg, transparent 48%, var(--cn-ink) 48%, var(--cn-ink) 56%, transparent 56%),
    linear-gradient(135deg, transparent 68%, var(--cn-ink) 68%, var(--cn-ink) 76%, transparent 76%);
}
.grip-s { left: 16px; right: 16px; bottom: 0; height: 7px; cursor: ns-resize; }
.grip-e { top: 30px; bottom: 16px; right: 0; width: 7px; cursor: ew-resize; }

/* Resizing writes width and height, which is layout. Physics is pinned off while it happens. */
.note.is-resizing .card,
.note.is-resizing .face { transform: none; }

.note[data-collapsed] .face { grid-template-rows: 1fr; }
.note[data-collapsed] .body,
.note[data-collapsed] .note-name,
.note[data-collapsed] .note-ink,
.note[data-collapsed] .grips,
.note[data-collapsed] .grip-dots,
.note[data-collapsed] .curl { display: none; }
/* Hiding the whole toolbar is what trapped a collapsed note with no way to reopen it. The
   expand button stays, and at 34px across it is the only one that fits. The container query
   further up would hide it too, so it is restated here where it wins. */
.note[data-collapsed] .act { display: none; }
.note[data-collapsed] .act-collapse { display: grid; }
@container note (max-width: 180px) { .note[data-collapsed] .act-collapse { display: grid; } }
.note[data-collapsed] .handle { padding: 0; justify-content: center; cursor: pointer; height: 100%; }
.note[data-collapsed] .actions { flex: 1 1 auto; justify-content: center; }
.note[data-collapsed] .handle::before { display: none; }

@media (prefers-reduced-motion: reduce) {
  .note, .note * { animation-duration: .001ms; transition-duration: .001ms; }
}

@media (forced-colors: active) {
  .face {
    forced-color-adjust: none;
    background: Canvas;
    color: CanvasText;
    border: 1px solid ButtonBorder;
  }
  .paper, .note .grain, .curl, .shadow { display: none; }
}
`;
