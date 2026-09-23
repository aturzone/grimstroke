/**
 * A sticky note, as HTML.
 *
 * The element tree is the one chevaletNote builds at run time, emitted statically instead:
 * shadow, tilt, card, face, and inside the face the grain, the paper, the header, the name,
 * the body, the curl. Same classes, same layer order, same art. A note rendered here and a
 * note rendered by the extension are the same object, and the app attaches the same physics
 * to it afterwards.
 *
 * Pure. Nothing here opens a browser or touches the network.
 *
 * The one substitution: the extension paints its grain onto a canvas, which a server cannot
 * do, so the grain is a baked tile behind a div. It is the same tile, pixel for pixel -- see
 * `look/grain.ts`.
 */

import { CURL_LEVELS, curlPath, tapeStrip, tornRectPath } from '~/draw/look/paper.ts';
import type { NoteInk } from '~/draw/material/model.ts';
import { renderMarkdown } from '~/draw/material/note/markdown.ts';
import {
  DEFAULT_NOTE_STYLE,
  NOTE_COLLAPSED,
  NOTE_HEIGHT,
  NOTE_WIDTH,
  type NoteStyle,
  noteIsDark,
  noteVars,
  resolveNoteStyle,
} from '~/draw/material/note/model.ts';
import { escapeHtml } from '~/draw/type/text.ts';

/** The ids the shared halftone patterns are registered under. */
export const HALFTONE_DARK = 'cn-halftone-dark';
export const HALFTONE_LIGHT = 'cn-halftone-light';

/**
 * The one shared `<defs>` block, emitted once per document.
 *
 * Every note references it, which is the whole reason there is one: the halftone tile is
 * defined once and the browser caches its rasterisation for all of them.
 *
 * The halftone is a `<pattern>` used directly as a fill, NOT via a CSS mask. The mask version
 * was tried first and rendered nothing: the CSS `mask` shorthand resets `mask-clip` and
 * `mask-origin` to box values that produce an empty mask region on an SVG element.
 */
export function halftoneDefs(): string {
  const tile = (id: string, dot: string): string =>
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="5" height="5">` +
    `<circle cx="1.25" cy="1.25" r="1" fill="${dot}"/>` +
    `<circle cx="3.75" cy="3.75" r="1" fill="${dot}"/></pattern>`;
  return (
    '<svg class="cn-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    // Two tiles rather than one recoloured tile: a multiply blend of black dots is invisible
    // on a dark palette, so dark paper gets white dots and a screen blend instead.
    tile(HALFTONE_DARK, '#000') +
    tile(HALFTONE_LIGHT, '#fff') +
    '</defs></svg>'
  );
}

/**
 * The note's own toolbar.
 *
 * Brought over from chevaletNote, paths and all. Sliders rather than a cog for settings: at
 * 15px a cog's teeth turn into a grey blob. The targets are 24px because the first version
 * used 18px glyphs at 55% opacity and the first person to try that build could not hit them --
 * notably, could not delete a note at all.
 */
const TOOLBAR: ReadonlyArray<readonly [name: string, label: string, path: string]> = [
  [
    'pen',
    'Draw',
    'M3 17.3V21h3.7L17.6 10.1l-3.7-3.7L3 17.3zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7L20.7 7z',
  ],
  ['settings', 'Settings', 'M3 7H21V9H3ZM13 4H17V12H13ZM3 15H21V17H3ZM6 12H10V20H6Z'],
  [
    'palette',
    'Colour',
    'M12 3a9 9 0 1 0 0 18c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  ],
  [
    'lock',
    'Lock',
    'M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zM9 7a3 3 0 0 1 6 0v2H9V7zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  ],
  ['collapse', 'Collapse', 'M5 11h14v2H5z'],
  ['delete', 'Delete', 'M6 7h12l-1 14H7L6 7zm3-4h6l1 2h4v2H4V5h4l1-2z'],
] as const;

function toolbar(): string {
  return (
    '<div class="actions">' +
    TOOLBAR.map(
      ([name, label, path]) =>
        `<button type="button" class="act act-${name}" data-gs="note-${name}" tabindex="-1" ` +
        `title="${label}" aria-label="${label}">` +
        `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></button>`,
    ).join('') +
    '</div>'
  );
}

export interface NoteSpec {
  /** Seeds the tear and the tape. A note always looks like itself. */
  id: string;
  text: string;
  /** Shown on its own line under the toolbar, when it has one. */
  name?: string;
  width?: number;
  height?: number;
  collapsed?: boolean;
  locked?: boolean;
  /** Strokes drawn on the sheet itself, in the note's own coordinates. */
  ink?: readonly NoteInk[];
  style?: Partial<NoteStyle>;
  /** Digit shaping for the body, as everywhere else. */
  digits?: string | undefined;
}

/**
 * The note.
 *
 * The toolbar and the resize grips are on by default, because that is what a note IS in the
 * product it comes from -- the buttons are part of the object, not chrome laid over it.
 * `chrome: false` leaves them off for a context where the note is only being illustrated.
 */
export function renderNote(spec: NoteSpec, options: { chrome?: boolean } = {}): string {
  const style = resolveNoteStyle(spec.style);
  const w = spec.collapsed ? NOTE_COLLAPSED : (spec.width ?? NOTE_WIDTH);
  const h = spec.collapsed ? NOTE_COLLAPSED : (spec.height ?? NOTE_HEIGHT);
  const box = `0 0 ${w} ${h}`;
  const torn = tornRectPath(w, h, spec.id, { amplitude: style.tornEdges });
  const dark = noteIsDark(style);

  const vars = Object.entries(noteVars(style))
    .map(([k, v]) => `${k}:${escapeHtml(v)}`)
    .join(';');

  // The drop shadow is the SAME torn path, not a rectangle behind it -- a rectangular shadow
  // peeks out past every tear and instantly reads as a bug.
  const shadow =
    `<svg class="shadow" viewBox="${box}" preserveAspectRatio="none" aria-hidden="true">` +
    `<path d="${torn}"/></svg>`;

  const corners: Array<0 | 1 | 2 | 3> =
    style.tape === 'none' ? [] : style.tape === 'one' ? [0] : [0, 2];
  const tape = corners
    .map((corner) => {
      const strip = tapeStrip(w, h, corner, spec.id);
      return `<path class="tape-strip" d="${strip.d}" transform="${strip.transform}"/>`;
    })
    .join('');

  const paper =
    `<svg class="paper" viewBox="${box}" preserveAspectRatio="none" aria-hidden="true">` +
    `<path class="paper-fill" d="${torn}"/>` +
    `<path class="paper-halftone" d="${torn}"/>` +
    `<g class="cn-tape">${tape}</g></svg>`;

  // Five pre-baked folds, cross-faded by opacity. Level 0 is genuinely empty: a wedge there
  // meant every note sat with a hard dark triangle stapled to its corner at rest.
  const curl =
    `<svg class="curl" viewBox="${box}" aria-hidden="true">` +
    Array.from({ length: CURL_LEVELS }, (_, i) => {
      const d = curlPath(w, h, i / (CURL_LEVELS - 1));
      return `<path class="curl-level" d="${d}" style="opacity:0"/>`;
    }).join('') +
    '</svg>';

  const header =
    '<header class="handle"><div class="grip-dots"></div>' +
    (options.chrome === false ? '' : toolbar()) +
    '</header>';

  const name = spec.name
    ? `<div class="note-name">${escapeHtml(spec.name)}</div>`
    : '<div class="note-name" hidden></div>';

  const grips =
    options.chrome === false
      ? ''
      : '<div class="grips">' +
        ['se', 's', 'e']
          .map((g) => `<div class="grip grip-${g}" data-grip="${g}"></div>`)
          .join('') +
        '</div>';

  // Markdown, as in the extension: headings, emphasis, code, links, lists and checklists.
  const body = `<div class="body" dir="${style.dir}">${renderMarkdown(spec.text, { digits: spec.digits })}</div>`;

  /*
   * The drawing layer.
   *
   * Above the paper and below the toolbar, in the note's own coordinates -- so a line drawn
   * across a note belongs to that note, moves with it, and goes when it goes. Board ink is a
   * different thing entirely: that is drawn on the plane.
   */
  // Always emitted, even with nothing on it: this is the surface a stroke is drawn ONTO, and
  // a layer that only appears once there is ink on it can never receive the first stroke.
  const ink =
    `<svg class="note-ink" viewBox="${box}" aria-hidden="true">` +
    (spec.ink ?? [])
      .map((stroke) => {
        const tool = stroke.tool ?? 'pen';
        const vars = [
          stroke.colour ? `--stroke:${escapeHtml(stroke.colour)}` : '',
          stroke.weight ? `--stroke-weight:${stroke.weight}px` : '',
        ]
          .filter(Boolean)
          .join(';');
        return `<path class="ink-stroke tool-${tool}" d="${escapeHtml(stroke.d)}" style="${vars}"/>`;
      })
      .join('') +
    '</svg>';

  return (
    `<div class="note" data-gs="note" data-id="${escapeHtml(spec.id)}" ` +
    // The tear amplitude and the tape corners are written onto the element because the app
    // re-cuts the paper while a grip is being dragged, and it has to cut it the SAME way --
    // a note that changes its own tear and re-places its tape as you resize it is not a
    // sheet of paper being resized, it is a different sheet appearing every frame.
    `data-torn="${style.tornEdges}" data-tape="${style.tape}" ` +
    `data-shadow="${style.shadow}" data-dark="${dark ? '1' : '0'}" ` +
    `data-align="${style.align}"${spec.collapsed ? ' data-collapsed="1"' : ''}` +
    `${spec.locked ? ' data-locked="1"' : ''} style="${vars}">` +
    shadow +
    '<div class="tilt"><div class="card">' +
    `<div class="face" style="width:${w}px;height:${h}px">` +
    '<div class="grain"></div>' +
    paper +
    ink +
    header +
    name +
    body +
    curl +
    grips +
    '</div></div></div></div>'
  );
}

export { DEFAULT_NOTE_STYLE, NOTE_HEIGHT, NOTE_WIDTH };
