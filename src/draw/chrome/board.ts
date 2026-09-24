/**
 * The board's chrome: the tools, the desk controls, and what a selection can do.
 *
 * Deliberately not a generic application toolbar. The whole product is pretending to be
 * paper on a surface, and a flat grey strip of icons would be the moment it stopped
 * pretending. The tools are a tray, a card with a keyline and a hard shadow lying on the
 * board with the rest of it; the camera and the undo stack are a second, smaller card in the
 * corner; and what you can do to a selection appears beside the selection, only when there is
 * one.
 *
 * EVERY CLASS HERE IS PREFIXED `gs-`, and that is not decoration. The chrome and the
 * documents share one stylesheet, so a chrome class that collides with a document class
 * inherits its rules -- the zoom button was called `zoom`, which is also the magnified inset
 * on a picture, and it arrived wearing a seven-pixel hard black shadow that looked like a
 * rendering fault.
 *
 * Markup and nothing else.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { button, heading, item, kbd, RULE } from '~/draw/chrome/parts.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import type { BoardSpec } from '~/draw/doc/board/model.ts';
import { PAPERS } from '~/draw/look/grid.ts';
import { PALETTES } from '~/draw/look/palette.ts';
import { TEMPLATES } from '~/draw/look/template.ts';
import { PACKS, type PackItem } from '~/draw/material/sticker/packs.ts';
import { renderStickerFace } from '~/draw/material/sticker/render.ts';
import { escapeHtml } from '~/draw/type/text.ts';

interface Tool {
  id:
    | 'select'
    | 'pan'
    | 'sticky'
    | 'text'
    | 'label'
    | 'image'
    | 'pen'
    | 'marker'
    | 'highlighter'
    | 'eraser';
  label: string;
  key: string;
}

/**
 * The tools, in the order a hand reaches for them.
 *
 * Pointer first, because it is where you return between everything else, then the things you
 * put down, then the things you draw with. The shortcuts are the ones every other tool of
 * this kind already uses -- v, h, t, p -- and being original about that only costs the person
 * time.
 */
const TOOLS: readonly Tool[] = [
  { id: 'select', label: 'Select', key: 'v' },
  { id: 'pan', label: 'Pan', key: 'h' },
  { id: 'sticky', label: 'Sticky note', key: 'n' },
  { id: 'text', label: 'Text', key: 't' },
  { id: 'label', label: 'Marker label', key: 'l' },
  { id: 'image', label: 'Picture', key: 'i' },
  { id: 'pen', label: 'Pen', key: 'p' },
  { id: 'marker', label: 'Marker', key: 'm' },
  { id: 'highlighter', label: 'Highlighter', key: 'g' },
  { id: 'eraser', label: 'Eraser', key: 'e' },
];

/** The inks. Enough to mean something, few enough to choose without thinking. */
const INKS: ReadonlyArray<readonly [string, string]> = [
  ['#1b1a17', 'carbon'],
  ['#1f3fd0', 'blue'],
  ['#15654f', 'green'],
  ['#c0392b', 'red'],
  ['#8e44ad', 'violet'],
  ['#e07b00', 'orange'],
  ['#ffd23f', 'yellow'],
];

function toolButton(tool: Tool, divider: boolean): string {
  return (
    (divider ? '<span class="gs-sep" aria-hidden="true"></span>' : '') +
    `<button type="button" class="gs-btn gs-btn-icon gs-tool" data-gs="tool" data-gs-tool="${tool.id}" ` +
    `data-gs-key="${tool.key}" aria-label="${escapeHtml(tool.label)}" aria-pressed="false" ` +
    `aria-keyshortcuts="${tool.key}">` +
    icon(tool.id) +
    `<span class="gs-tip" role="presentation">${escapeHtml(tool.label)} ${kbd(tool.key.toUpperCase())}</span>` +
    '</button>'
  );
}

/**
 * The sticker sheet: every mark and a handful of emoji, each a button that puts one on the
 * middle of what you are looking at. The faces are drawn by the same renderer as the stickers.
 */
export function stickerSheet(): string {
  const pick = (item: PackItem): string =>
    `<button type="button" class="gs-sheet-pick" data-gs="sticker-choice" ` +
    (item.mark
      ? `data-mark="${escapeHtml(item.mark)}"`
      : `data-emoji="${escapeHtml(item.emoji ?? '')}"`) +
    ` title="${escapeHtml(item.name)}" aria-label="${escapeHtml(item.name)} sticker">${renderStickerFace({ mark: item.mark, emoji: item.emoji })}</button>`;
  const packs = PACKS.map(
    (pack) =>
      `<p class="gs-menu-head">${escapeHtml(pack.label)}</p><div class="gs-sheet-grid">${pack.items.map(pick).join('')}</div>`,
  ).join('');
  return (
    '<details class="gs-sheet" data-gs="sticker-sheet">' +
    `<summary class="gs-btn gs-btn-icon" aria-label="stickers">${icon('sticker')}` +
    '<span class="gs-tip" role="presentation">stickers</span></summary>' +
    `<div class="gs-sheet-card gs-card" role="menu" aria-label="the sticker sheet">${packs}</div></details>`
  );
}

/** What can be done to a selection, shown beside it. */
function selectionBar(onPage: boolean): string {
  const b = (gs: string, label: string, name: Parameters<typeof icon>[0], key?: string): string =>
    button({ gs, label, icon: name, ...(key ? { key } : {}) });
  const sep = '<span class="gs-sep" aria-hidden="true"></span>';
  return (
    '<div class="gs-selbar gs-card" data-gs="selbar" role="toolbar" aria-label="selection" hidden>' +
    '<span class="gs-scope" data-gs="scope" hidden>1 selected</span>' +
    `<span class="gs-selbar-many" data-gs="selbar-many">${sep}` +
    b('align-left', 'align left edges', 'alignLeft') +
    b('align-centre', 'align centres', 'alignCentre') +
    b('align-right', 'align right edges', 'alignRight') +
    b('align-top', 'align tops', 'alignTop') +
    b('align-middle', 'align middles', 'alignMiddle') +
    b('align-bottom', 'align bottoms', 'alignBottom') +
    b('spread-x', 'space evenly across', 'spreadX') +
    b('spread-y', 'space evenly down', 'spreadY') +
    `${sep}${b('group', 'group', 'group', 'mod+G')}</span>` +
    b('ungroup', 'ungroup', 'ungroup', 'mod+Shift+G') +
    '<span class="gs-sep gs-sep-lead" aria-hidden="true"></span>' +
    b('front', 'bring to front', 'front') +
    b('send', 'send to back', 'send') +
    b('duplicate', 'duplicate', 'duplicate', 'mod+D') +
    b('lock-selection', 'lock', 'lock') +
    // Across surfaces: off a page onto the board, or off the board onto a page.
    button({
      gs: 'move-surface',
      label: onPage ? 'send to the board' : 'send to a page of a notebook',
      icon: onPage ? 'board' : 'book',
    }) +
    sep +
    button({
      gs: 'delete-selection',
      label: 'remove',
      icon: 'trash',
      key: 'Delete',
      tone: 'gs-btn-danger',
    }) +
    '</div>'
  );
}

/** The page before and after this one, and which this is. */
function pageNav(sheet: NonNullable<BoardSpec['sheet']>): string {
  const to = (n: number): string => `/page?book=${encodeURIComponent(sheet.book)}&leaf=${n + 1}`;
  const link = (n: number, gs: string, label: string, name: 'prev' | 'next'): string =>
    n < 0 || n >= sheet.count
      ? `<button type="button" class="gs-btn gs-btn-icon" data-gs="${gs}" aria-label="${label}" disabled>${icon(name)}</button>`
      : `<a class="gs-btn gs-btn-icon" data-gs="${gs}" href="${to(n)}" aria-label="${label}">${icon(name)}` +
        `<span class="gs-tip" role="presentation">${label}</span></a>`;
  return (
    '<span class="gs-page-nav">' +
    link(sheet.index - 1, 'page-prev', 'the page before', 'prev') +
    `<span class="gs-page-no" data-gs="page-no" dir="ltr">${sheet.index + 1} of ${sheet.count}</span>` +
    link(sheet.index + 1, 'page-next', 'the page after', 'next') +
    '</span>'
  );
}

export function chrome(spec: BoardSpec): string {
  const tools = TOOLS.map((tool, i) => toolButton(tool, i === 2 || i === 6)).join('');
  const inks = INKS.map(
    ([ink, name], i) =>
      `<button type="button" class="gs-swatch" data-gs="ink" data-gs-ink="${ink}" ` +
      `style="--swatch:${ink}" aria-label="${name} ink" aria-pressed="${i === 1}"></button>`,
  ).join('');

  const palettes = PALETTES.map(
    (p) =>
      `<button type="button" class="gs-paper-swatch" data-gs="palette-choice" data-gs-palette="${p.id}" ` +
      `style="--sw-paper:${p.paper};--sw-ink:${p.ink};--sw-accent:${p.accent}" ` +
      `aria-label="${escapeHtml(p.label)}" aria-pressed="${p.id === (spec.palette ?? 'studio')}" ` +
      `title="${escapeHtml(p.label)}"><span></span></button>`,
  ).join('');
  const papers = PAPERS.map(
    (kind) =>
      `<button type="button" class="gs-btn gs-chip-btn" data-gs="paper-choice" data-gs-paper="${kind}" ` +
      `aria-pressed="${kind === (spec.paper ?? 'squared')}">${kind}</button>`,
  ).join('');

  const exportMenu =
    '<details class="gs-menu" data-gs="export-menu">' +
    `<summary class="gs-btn" aria-label="export">${icon('export')}<span class="gs-btn-text">export</span></summary>` +
    '<div class="gs-menu-card" role="menu">' +
    '<p class="gs-menu-head" data-gs="export-scope">the whole board</p>' +
    item({ gs: 'pdf', text: 'PDF, for printing', icon: 'export' }) +
    item({ gs: 'png', text: 'PNG, a picture', icon: 'image' }) +
    item({ gs: 'svg', text: 'SVG, sharp at any size', icon: 'pen' }) +
    RULE +
    item({ gs: 'backup', text: 'back up everything', icon: 'archive' }) +
    item({ gs: 'restore', text: 'restore from a backup', icon: 'restore' }) +
    '</div></details>';

  const sheet = spec.sheet;
  // A page takes its palette from its notebook, so only its ruling is its own to choose.
  const more =
    (sheet
      ? ''
      : heading('palette') +
        `<div class="gs-paper-swatches" role="group" aria-label="palette">${palettes}</div>`) +
    heading(sheet ? 'this page is' : 'paper') +
    `<div class="gs-chip-row" role="group" aria-label="paper">${papers}</div>` +
    (sheet
      ? heading('printed on it') +
        `<div class="gs-chip-row" role="group" aria-label="template">${['none', ...TEMPLATES]
          .map(
            (kind) =>
              `<button type="button" class="gs-btn gs-chip-btn" data-gs="template-choice" ` +
              `data-gs-template="${kind}" aria-pressed="${kind === (spec.template ?? 'none')}">${kind}</button>`,
          )
          .join('')}</div>`
      : '');

  const bar = sheet
    ? topBar({
        place: 'shelf',
        title: spec.title ?? spec.id,
        back: {
          href: `/book?id=${encodeURIComponent(sheet.book)}&leaf=${sheet.index - (sheet.index % 2)}`,
          label: sheet.bookTitle,
        },
        saved: true,
        actions: pageNav(sheet) + exportMenu,
        more,
      })
    : topBar({
        place: 'board',
        title: spec.title ?? spec.id,
        saved: true,
        actions: exportMenu,
        more,
      });

  return [
    bar,

    '<div class="gs-tray gs-card" data-gs="tray" role="toolbar" aria-label="tools">',
    `<div class="gs-tray-tools">${tools}</div>`,
    `<div class="gs-tray-inks" data-gs="inks" role="group" aria-label="ink">${inks}</div>`,
    stickerSheet(),
    // A page's repository: its drawer of issues, merge requests and commits.
    spec.sheet
      ? `<button type="button" class="gs-btn gs-btn-icon" data-gs="repo-drawer" aria-pressed="false" ` +
        `aria-label="the repository">${icon('branch')}<span class="gs-tip" role="presentation">repository</span></button>`
      : '',
    '</div>',

    // The camera and the undo stack: the two things you reach for without looking.
    '<div class="gs-desk gs-card" data-gs="desk" role="toolbar" aria-label="view">',
    button({ gs: 'undo', label: 'undo', icon: 'undo', key: 'mod+Z' }),
    button({ gs: 'redo', label: 'redo', icon: 'redo', key: 'mod+Shift+Z' }),
    '<span class="gs-sep" aria-hidden="true"></span>',
    button({ gs: 'zoom-out', label: 'zoom out', icon: 'minus' }),
    '<button type="button" class="gs-btn gs-level" data-gs="zoom" aria-label="actual size" ' +
      'aria-keyshortcuts="1">100%<span class="gs-tip" role="presentation">actual size ' +
      `${kbd('1')}</span></button>`,
    button({ gs: 'zoom-in', label: 'zoom in', icon: 'plus' }),
    button({ gs: 'fit', label: 'fit everything', icon: 'fit', key: '0' }),
    '</div>',

    selectionBar(Boolean(spec.sheet)),

    // The first thing anyone sees on a new board, and the last thing anybody builds.
    '<div class="gs-empty" data-gs="empty" hidden>',
    '<p class="gs-empty-title">an empty sheet</p>',
    `<p class="gs-empty-line">Drop a screenshot anywhere, or paste one with ${kbd('mod+V')}.</p>`,
    `<p class="gs-empty-line">${kbd('N')} for a sticky note, ${kbd('P')} for a pen, ` +
      `${kbd('?')} for everything else.</p>`,
    '</div>',

    '<input type="file" accept="image/*" multiple hidden data-gs="file">',
    '<input type="file" accept=".grimstroke,application/json" hidden data-gs="restore-file">',
    '<div class="gs-drop" data-gs="drop"><span>drop it anywhere</span></div>',
    searchDialog(),
    helpDialog(),
  ].join('\n');
}

export { INKS, TOOLS };
