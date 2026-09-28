/**
 * Every icon the chrome uses, as path data on one 24-unit grid.
 *
 * Drawn, not typeset. The first tray used characters -- ⬉ ✥ ▤ ✎ ✒ -- and a typeface draws
 * those at whatever weight and size it happens to have them: half were hairlines, one was a
 * full-height block, and the row read as a mistake rather than as a set. Paths on one grid,
 * stroked at one weight with round ends, read as one hand drew them, which is the look.
 *
 * A path is stroked unless it is listed in SOLID. Keep new ones on the grid: 3.5 to 20.5 is
 * the live area, and anything outside it is cropped by the 24-unit box.
 */

export const ICONS = {
  // ---- tools
  select: 'M6 3.5 L6 18.5 L10 14.5 L12.8 20.5 L15.2 19.4 L12.5 13.6 L18 13.5 Z',
  pan:
    'M12 3 V21 M3 12 H21 M12 3 L9.6 5.6 M12 3 L14.4 5.6 M12 21 L9.6 18.4 M12 21 L14.4 18.4 ' +
    'M3 12 L5.6 9.6 M3 12 L5.6 14.4 M21 12 L18.4 9.6 M21 12 L18.4 14.4',
  // A cog: the settings, where everything that can be made your own is.
  settings:
    'M12 15.2 A3.2 3.2 0 1 0 12 8.8 A3.2 3.2 0 1 0 12 15.2 M12 3.5 V6.2 M12 17.8 V20.5 M3.5 12 H6.2 M17.8 12 H20.5 ' +
    'M6 6 L7.9 7.9 M16.1 16.1 L18 18 M6 18 L7.9 16.1 M16.1 7.9 L18 6',
  // A brush: making the bookcase your own.
  brush: 'M14.5 4.5 L19.5 9.5 L11 18 L6 13 Z M6 13 C4 14 3.5 17 3.5 20.5 C7 20.5 10 20 11 18',
  sticky: 'M4 4 H20 V14.5 L14.5 20 H4 Z M20 14.5 H14.5 V20',
  // A line of text becoming a card: the slash that opens the bar, inside a card.
  shape:
    'M3.5 6 A2.5 2.5 0 0 1 6 3.5 H18 A2.5 2.5 0 0 1 20.5 6 V18 A2.5 2.5 0 0 1 18 20.5 H6 A2.5 2.5 0 0 1 3.5 18 Z M14 7.5 L10 16.5',
  text: 'M5 6.5 V4 H19 V6.5 M12 4 V20 M8.5 20 H15.5',
  label: 'M3 9.4 L21 8.2 L20.6 15.8 L3.4 15 Z',
  image: 'M3 5 H21 V19 H3 Z M3 15.5 L8.5 10 L12.5 14 L16 10.5 L21 15.5 M15.8 8.6 h0.01',
  pen: 'M4 20 L5.6 14.8 L16.2 4.2 L19.8 7.8 L9.2 18.4 Z M14 6.4 L17.6 10',
  pencil:
    'M4.5 19.5 L5.6 15 L15.6 5 L19 8.4 L9 18.4 Z M5.6 15 L9 18.4 M4.5 19.5 L6.6 18.9 M13.4 7.2 L16.8 10.6',
  marker: 'M4 20 V16 L15 5 L19 9 L8 20 Z M4 20 H8',
  highlighter: 'M6 14.5 L14.5 6 L18 9.5 L9.5 18 H6 Z M3.5 21 H20.5',
  eraser: 'M7.5 20 H20 M4.5 16.2 L11.2 9.5 L17 15.3 L13.2 19.8 H8 Z',

  // ---- the desk
  undo: 'M9 14 L4.5 9.5 L9 5 M4.5 9.5 H14 A5.5 5.5 0 0 1 14 20.5 H10.5',
  redo: 'M15 14 L19.5 9.5 L15 5 M19.5 9.5 H10 A5.5 5.5 0 0 0 10 20.5 H13.5',
  minus: 'M5.5 12 H18.5',
  plus: 'M12 5.5 V18.5 M5.5 12 H18.5',
  fit: 'M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15',

  // ---- places
  board: 'M3.5 5 H20.5 V19 H3.5 Z M7 8.5 H12 V13.5 H7 Z M14.5 9 H17.5 M14.5 12 H17.5 M7 16 H17.5',
  book:
    'M5 5.5 A2 2 0 0 1 7 3.5 H19 V17.5 H7 A2 2 0 0 0 5 19.5 Z M5 19.5 A2 2 0 0 0 7 21.5 H19 ' +
    'V17.5 M9 7.5 H15',
  face:
    'M12 20.5 A8.5 8.5 0 1 1 12 3.5 A8.5 8.5 0 0 1 12 20.5 Z M9 9.8 V10.4 M15 9.8 V10.4 ' +
    'M8.6 14.4 C10.2 16.6 13.8 16.6 15.4 14.4',
  profile:
    'M3.5 5.5 H20.5 V18.5 H3.5 Z M7.1 9.6 A2 2 0 1 0 11.1 9.6 A2 2 0 1 0 7.1 9.6 ' +
    'M6 15.6 C6.6 13.4 11.6 13.4 12.2 15.6 M14.3 9 H18 M14.3 12 H18 M14.3 15 H16.6',

  // ---- commands
  search: 'M10.5 17.5 A7 7 0 1 1 10.5 3.5 A7 7 0 0 1 10.5 17.5 Z M15.6 15.6 L20.5 20.5',
  export: 'M12 3.5 V14.5 M7.5 10 L12 14.5 L16.5 10 M4.5 15.5 V20 H19.5 V15.5',
  restore: 'M12 15 V3.5 M7.5 8 L12 3.5 L16.5 8 M4.5 15.5 V20 H19.5 V15.5',
  back: 'M19 12 H5 M11 6 L5 12 L11 18',
  close: 'M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5',
  check: 'M5 12.5 L9.5 17 L19 7',
  help:
    'M12 20.5 A8.5 8.5 0 1 1 12 3.5 A8.5 8.5 0 0 1 12 20.5 Z M9.6 9.6 A2.5 2.5 0 1 1 13.3 11.8 ' +
    'C12.4 12.3 12 12.9 12 13.9 M12 17 V17.1',
  keys: 'M3 6.5 H21 V17.5 H3 Z M6.5 10 H7 M10 10 H10.5 M13.5 10 H14 M17 10 H17.5 M7.5 14 H16.5',
  shuffle:
    'M4 7 H7.5 C11 7 13 17 16.5 17 H20 M17.5 14.5 L20 17 L17.5 19.5 M4 17 H7.5 C9 17 10 15.5 ' +
    '10.8 14 M13.2 10 C14 8.5 15 7 16.5 7 H20 M17.5 4.5 L20 7 L17.5 9.5',
  open: 'M14 4 H20 V10 M20 4 L11 13 M18 14 V20 H4 V6 H10',

  // ---- arranging
  alignLeft: 'M4 3.5 V20.5 M8 6.5 H16 V10.5 H8 Z M8 13.5 H20 V17.5 H8 Z',
  alignCentre: 'M12 3.5 V20.5 M7.5 6.5 H16.5 V10.5 H7.5 Z M5 13.5 H19 V17.5 H5 Z',
  alignRight: 'M20 3.5 V20.5 M8 6.5 H16 V10.5 H8 Z M4 13.5 H16 V17.5 H4 Z',
  alignTop: 'M3.5 4 H20.5 M6.5 8 H10.5 V16 H6.5 Z M13.5 8 H17.5 V20 H13.5 Z',
  alignMiddle: 'M3.5 12 H20.5 M6.5 7.5 H10.5 V16.5 H6.5 Z M13.5 5 H17.5 V19 H13.5 Z',
  alignBottom: 'M3.5 20 H20.5 M6.5 8 H10.5 V16 H6.5 Z M13.5 4 H17.5 V16 H13.5 Z',
  spreadX: 'M4 4 V20 M20 4 V20 M9.5 8 H14.5 V16 H9.5 Z',
  spreadY: 'M4 4 H20 M4 20 H20 M8 9.5 H16 V14.5 H8 Z',
  group:
    'M4 8 V4 H8 M16 4 H20 V8 M20 16 V20 H16 M8 20 H4 V16 M7.5 7.5 H13 V13 H7.5 Z ' +
    'M11 11 H16.5 V16.5 H11 Z',
  ungroup: 'M5 5 H12.5 V12.5 H5 Z M11.5 11.5 H19 V19 H11.5 Z',
  front: 'M9 9 H19.5 V19.5 H9 Z M15 5.5 V4.5 H4.5 V15 H5.5',
  send: 'M4.5 4.5 H15 V15 H4.5 Z M9 19.5 H19.5 V9',
  lock: 'M6.5 11 H17.5 V20 H6.5 Z M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11 M12 14.5 V16.5',
  unlock: 'M6.5 11 H17.5 V20 H6.5 Z M8.5 11 V8 A3.5 3.5 0 0 1 15.2 6.6 M12 14.5 V16.5',
  duplicate: 'M8.5 8.5 H19.5 V19.5 H8.5 Z M5 15.5 H4.5 V4.5 H15.5 V5',
  trash: 'M4.5 7 H19.5 M9.5 7 V4.5 H14.5 V7 M6.5 7 L7.5 20 H16.5 L17.5 7 M10 11 V16 M14 11 V16',
  rotate: 'M19 12 A7 7 0 1 1 16.4 6.6 M17 3.5 V7 H13.5',

  // ---- the notebook
  cover: 'M6 3.5 H18.5 V20.5 H6 A1.5 1.5 0 0 1 4.5 19 V5 A1.5 1.5 0 0 1 6 3.5 Z M9 8 H15 M9 11 H13',
  pages: 'M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z',
  leaf: 'M6 3.5 H14 L18 7.5 V20.5 H6 Z M12 10 V17 M8.5 13.5 H15.5',
  archive: 'M3.5 5 H20.5 V9 H3.5 Z M5 9 V19.5 H19 V9 M10 13 H14',
  sticker:
    'M12 3.5 L14.4 9 L20.3 9.4 L15.8 13.3 L17.2 19.1 L12 16 L6.8 19.1 L8.2 13.3 L3.7 9.4 L9.6 9 Z',
  // A branch: two commits on a line, and one off to the side.
  branch:
    'M7 3.5 A2.2 2.2 0 1 1 7 7.9 A2.2 2.2 0 1 1 7 3.5 Z M7 16.1 A2.2 2.2 0 1 1 7 20.5 A2.2 2.2 0 1 1 7 16.1 Z ' +
    'M17 6 A2.2 2.2 0 1 1 17 10.4 A2.2 2.2 0 1 1 17 6 Z M7 7.9 V16.1 M17 10.4 C17 13.5 7 12.5 7 16.1',
  prev: 'M15 5 L8 12 L15 19',
  next: 'M9 5 L16 12 L9 19',
  today:
    'M4.5 6 H19.5 V19.5 H4.5 Z M4.5 10 H19.5 M8.5 3.5 V7.5 M15.5 3.5 V7.5 M9 14.5 L11 16.5 L15 12.5',
  sound:
    'M4 9.5 H7.5 L12.5 5 V19 L7.5 14.5 H4 Z M15.5 9.2 A3.8 3.8 0 0 1 15.5 14.8 M18 6.5 A7.5 7.5 0 0 1 18 17.5',

  // ---- solid
  more:
    'M4.2 12 A1.8 1.8 0 1 0 7.8 12 A1.8 1.8 0 1 0 4.2 12 Z M10.2 12 A1.8 1.8 0 1 0 13.8 12 ' +
    'A1.8 1.8 0 1 0 10.2 12 Z M16.2 12 A1.8 1.8 0 1 0 19.8 12 A1.8 1.8 0 1 0 16.2 12 Z',
} as const;

export type IconName = keyof typeof ICONS;

/** The ones drawn as a filled shape. */
const SOLID: ReadonlySet<IconName> = new Set<IconName>(['select', 'label', 'more']);

/** An icon, as inline SVG. Decorative: the control that holds it carries the name. */
export function icon(name: IconName, className = 'gs-icon'): string {
  return (
    `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
    `<path d="${ICONS[name]}"${SOLID.has(name) ? ' class="gs-solid"' : ''}/>` +
    '</svg>'
  );
}
