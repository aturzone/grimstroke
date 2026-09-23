/**
 * The studio: where a character is made.
 *
 * Pure. It emits the whole page -- the big face, a row of thumbnails per slot, the colours
 * and the sizes -- and the app in the browser only swaps attributes on it afterwards.
 *
 * Every thumbnail is a WHOLE FACE with one part changed, not the part on its own. A nose
 * drawn by itself is an unreadable squiggle; the same nose on a face is obviously that nose.
 * They are SVG, so fifty of them cost less than one screenshot would.
 */

import { detailRow } from '~/draw/chrome/detail.ts';
import { icon } from '~/draw/chrome/icons.ts';
import { button, item } from '~/draw/chrome/parts.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import { renderHead } from '~/draw/doc/head.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { surface } from '~/draw/doc/surface.ts';
import {
  ART_STYLES,
  type Character,
  DEFAULT_FACE,
  DEFAULT_PALETTE,
  type Palette,
  REQUIRED,
  type Sizes,
  type Slot,
} from '~/draw/material/face/model.ts';
import { CATALOGUE } from '~/draw/material/face/parts.ts';
import { renderFace } from '~/draw/material/face/render.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { escapeHtml, label } from '~/draw/type/text.ts';

const SLOT_LABELS: Record<Slot, string> = {
  outfit: 'clothes',
  shape: 'face',
  ears: 'ears',
  hair: 'hair',
  brows: 'brows',
  eyes: 'eyes',
  nose: 'nose',
  mouth: 'mouth',
  beard: 'beard',
  glasses: 'glasses',
  headwear: 'hat',
  earring: 'earring',
  cheeks: 'cheeks',
  mark: 'mark',
};

/** The colours somebody actually reaches for, so nobody has to mix a skin tone by hand. */
const SKINS = ['#f8d9bd', '#f6c89a', '#e0a878', '#c0824f', '#8d5524', '#5b3a1c', '#c6ff3d'];
const HAIRS = ['#14110e', '#2b2118', '#6b4423', '#b07d3a', '#e8c86a', '#c0392f', '#7a2ff7'];

const SIZE_KNOBS: ReadonlyArray<readonly [keyof Sizes, string]> = [
  ['head', 'head'],
  ['hair', 'hair'],
  ['brows', 'brows'],
  ['eyes', 'eyes'],
  ['nose', 'nose'],
  ['mouth', 'mouth'],
];

const COLOUR_KNOBS: ReadonlyArray<readonly [keyof Palette, string]> = [
  ['skin', 'skin'],
  ['hair', 'hair'],
  ['ink', 'line'],
  ['eyes', 'eyes'],
  ['mouth', 'mouth'],
  ['accent', 'accent'],
  ['cloth', 'clothes'],
];

function swatches(name: string, colours: readonly string[]): string {
  return (
    `<div class="fs-swatches" data-gs="face-swatches" data-gs-key="${name}">` +
    colours
      .map(
        (colour) =>
          `<button type="button" class="fs-swatch" data-gs="face-swatch" ` +
          `data-gs-key="${name}" data-gs-colour="${escapeHtml(colour)}" ` +
          `style="background:${escapeHtml(colour)}" aria-label="${name} ${colour}"></button>`,
      )
      .join('') +
    '</div>'
  );
}

function picker(slot: Slot, character: Character): string {
  const options = CATALOGUE[slot as keyof typeof CATALOGUE] ?? [];
  const chosen = character.parts[slot];
  const optional = !REQUIRED.includes(slot);

  /*
   * Thumbnails are drawn from THIS character, not from a neutral one.
   *
   * Choosing a beard on a stranger's face tells you what the beard looks like on a stranger.
   * Seeing it on the face you are actually making is the entire question being asked.
   */
  const cell = (id: string | undefined, name: string): string => {
    const preview: Character = {
      ...character,
      id: `${character.id}-${slot}-${id ?? 'none'}`,
      parts: { ...character.parts, ...(id ? { [slot]: id } : { [slot]: undefined }) },
      // Thumbnails are a row of choices, and a row of choices should not each lean a
      // different way -- that reads as sloppiness rather than as handwork.
      tilt: 0,
    };
    const on = (chosen ?? '') === (id ?? '');
    return (
      `<button type="button" class="fs-cell" data-gs="face-part" data-gs-slot="${slot}" ` +
      `data-gs-part="${escapeHtml(id ?? '')}" aria-pressed="${on}" title="${escapeHtml(name)}">` +
      renderFace(preview, { size: 58, chrome: false }) +
      '</button>'
    );
  };

  return (
    `<section class="fs-slot" data-gs="face-slot" data-gs-name="${slot}">` +
    `<h3>${label(SLOT_LABELS[slot], true)}</h3>` +
    '<div class="fs-cells">' +
    (optional ? cell(undefined, 'none') : '') +
    options.map((option) => cell(option.id, option.label)).join('') +
    '</div></section>'
  );
}

export interface StudioOptions {
  /** Everything already saved, listed along the bottom. */
  saved?: readonly Character[];
  live?: { scripts?: string[] } | undefined;
}

export function renderStudio(character: Character, options: StudioOptions = {}): RenderedPage {
  const ctx = surface('studio', { palette: 'studio' });
  const head = renderHead(ctx, 'ltr', { paper: 'blank', grain: 0.7 });
  const face = {
    ...DEFAULT_FACE,
    ...character,
    parts: { ...DEFAULT_FACE.parts, ...character.parts },
  };
  const palette = { ...DEFAULT_PALETTE, ...face.palette };
  const sizes = face.sizes ?? {};

  const colours = COLOUR_KNOBS.map(
    ([key, name]) =>
      '<label class="fs-row"><span>' +
      `${escapeHtml(name)}</span>` +
      `<input type="color" data-gs="face-colour" data-gs-key="${key}" ` +
      `value="${escapeHtml(palette[key] ?? '#000000')}" aria-label="${escapeHtml(name)}"></label>`,
  ).join('');

  const knobs = SIZE_KNOBS.map(([key, name]) => {
    const value = sizes[key] ?? 1;
    return (
      '<label class="fs-row"><span>' +
      `${escapeHtml(name)}</span>` +
      `<input type="range" min="0.72" max="1.34" step="0.02" value="${value}" ` +
      `data-gs="face-size" data-gs-key="${key}" aria-label="${escapeHtml(name)} size">` +
      `<output data-gs="face-size-value" data-gs-key="${key}">${Math.round(value * 100)}%</output>` +
      '</label>'
    );
  }).join('');

  const shelf = (options.saved ?? [])
    .map(
      (saved) =>
        `<button type="button" class="fs-saved" data-gs="face-open" ` +
        `data-gs-id="${escapeHtml(saved.id)}" title="${escapeHtml(saved.name ?? saved.id)}">` +
        renderFace({ ...saved, tilt: 0 }, { size: 60, chrome: false }) +
        `<span>${escapeHtml(saved.name ?? saved.id)}</span></button>`,
    )
    .join('');

  const details = (face.details ?? []).map((d) => detailRow(d.label, d.value)).join('');
  const styles = ART_STYLES.map(
    (art) =>
      `<button type="button" class="gs-btn gs-chip-btn" data-gs="face-style" ` +
      `data-gs-style="${art}" aria-pressed="${(face.style ?? 'ink') === art}">${art}</button>`,
  ).join('');

  const actions =
    button({ gs: 'face-random', label: 'shuffle', icon: 'shuffle', text: 'shuffle', key: 'R' }) +
    `<a class="gs-btn" data-gs="face-profile" href="/profile?id=${encodeURIComponent(face.id)}">` +
    `${icon('profile')}<span class="gs-btn-text">card</span></a>` +
    button({ gs: 'face-place', label: 'put on the board', icon: 'board', text: 'put on board' }) +
    button({ gs: 'face-save', label: 'save', icon: 'check', text: 'save', tone: 'gs-btn-primary' });
  const compact =
    item({ gs: 'face-random', text: 'shuffle', icon: 'shuffle' }) +
    item({
      gs: 'face-profile',
      text: 'the profile card',
      icon: 'profile',
      href: `/profile?id=${encodeURIComponent(face.id)}`,
    }) +
    item({ gs: 'face-place', text: 'put on the board', icon: 'board' }) +
    item({ gs: 'face-save', text: 'save', icon: 'check' });
  const more =
    item({ gs: 'face-new', text: 'a new character', icon: 'plus' }) +
    item({ gs: 'face-delete', text: 'delete this character', icon: 'trash', danger: true });

  const html = [
    '<!doctype html>',
    '<html lang="en" dir="ltr" data-script="latin" data-uppercase="on">',
    head,
    // NOT class "live": that is the board's own surface class, and it carries
    // height:100vh with overflow:hidden. On a page taller than the window the studio was
    // then a 100vh box with the desk inside it and the rest of the page on bare paper --
    // pale headings on a cream background, invisible, for the last four rows of choices.
    '<body class="on-studio">',
    halftoneDefs(),
    topBar({
      place: 'studio',
      title: face.name || 'a new character',
      saved: true,
      actions,
      compact,
      more,
    }),

    '<main class="fs-studio">',
    '<div class="fs-stage">',
    '<div class="fs-card gs-card">',
    `<div class="fs-face" data-gs="face-stage">${renderFace(face, { size: 320, badge: true })}</div>`,
    // Style is a property of the DRAWING, not of the character, so it sits under the drawing
    // rather than inside the list of what the character is made of.
    `<div class="fs-styles gs-chip-row" role="group" aria-label="art style">${styles}</div>`,
    '</div>',
    '<section class="fs-panel gs-card" aria-label="who">',
    `<h3>${label('who', true)}</h3>`,
    `<label class="fs-field"><span>name</span><input class="gs-field" data-gs="face-name" dir="auto" ` +
      `value="${escapeHtml(face.name ?? '')}" placeholder="a name" maxlength="60" autocomplete="off"></label>`,
    `<label class="fs-field"><span>role</span><input class="gs-field" data-gs="face-role" dir="auto" ` +
      `value="${escapeHtml(face.role ?? '')}" placeholder="what they are here for" maxlength="60" autocomplete="off"></label>`,
    `<label class="fs-field"><span>about</span><textarea class="gs-field" data-gs="face-bio" dir="auto" rows="2" ` +
      `maxlength="240" placeholder="a sentence, in their own words">${escapeHtml(face.bio ?? '')}</textarea></label>`,
    `<div class="fs-details" data-gs="face-details">${details}</div>`,
    button({
      gs: 'face-detail-add',
      label: 'add a line',
      icon: 'plus',
      text: 'add a line',
      tone: 'fs-add',
    }),
    '</section>',
    '<section class="fs-panel gs-card" aria-label="colour"><h3>' +
      `${label('colour', true)}</h3>${colours}` +
      `<div class="fs-presets">${swatches('skin', SKINS)}${swatches('hair', HAIRS)}</div>` +
      '</section>',
    `<section class="fs-panel gs-card" aria-label="size"><h3>${label('size', true)}</h3>${knobs}</section>`,
    '</div>',
    `<div class="fs-parts" data-gs="face-parts">${(Object.keys(CATALOGUE) as Slot[])
      .map((slot) => picker(slot, face))
      .join('')}</div>`,
    '</main>',

    shelf
      ? `<footer class="fs-shelf" data-gs="face-shelf"><h3>${label('everybody', true)}</h3>` +
        `<div class="fs-shelf-row">${shelf}</div></footer>`
      : '',
    // The character the page was built from, so the app starts from exactly what is on
    // screen rather than from a default it would have to reconcile.
    `<script type="application/json" data-gs="face-data">${JSON.stringify(face).replace(
      /</g,
      '\\u003c',
    )}</script>`,
    searchDialog(),
    helpDialog(),
    ...(options.live?.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');

  return {
    id: 'studio',
    html: `${html}\n`,
    assets: ctx.assets,
    width: 1200,
    selector: '.fs-studio',
    warnings: ctx.warnings,
    autofit: true,
  };
}
