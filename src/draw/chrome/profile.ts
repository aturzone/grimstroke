/**
 * The profile page: draw yourself, say who you are, and put the card somewhere.
 *
 * Pure. The portrait on the easel and the card beside it are drawn by the same renderPortrait
 * and renderProfile that draw them on a board and on a cover, so what is here is what you get
 * anywhere else.
 *
 * The easel is a 3:4 frame -- the shape of an ID photo -- with the board's own pens. It is the
 * one place the app draws strokes on the page itself before the server has them, which is the
 * same exception the board makes for a stroke still being drawn.
 */

import { detailRow } from '~/draw/chrome/detail.ts';
import { icon } from '~/draw/chrome/icons.ts';
import { button, heading, kbd } from '~/draw/chrome/parts.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import { renderHead } from '~/draw/doc/head.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import { surface } from '~/draw/doc/surface.ts';
import { halftoneDefs } from '~/draw/material/note/render.ts';
import { COATS } from '~/draw/material/pet/art.ts';
import {
  ACCENTS,
  DEFAULT_PET,
  PAPERS,
  type Pet,
  type Profile,
} from '~/draw/material/profile/model.ts';
import { renderPortrait, renderProfile } from '~/draw/material/profile/render.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export interface ProfilePageOptions {
  live?: { scripts?: string[] } | undefined;
}

/** The pens on the easel: the board's, less the ones that place things. */
const PENS: ReadonlyArray<readonly [string, string, string]> = [
  ['pen', 'Pen', 'P'],
  ['pencil', 'Pencil', 'N'],
  ['marker', 'Marker', 'M'],
  ['highlighter', 'Highlighter', 'G'],
  ['eraser', 'Eraser', 'E'],
];

/** Inks for a face: the board's, and the tones a face is actually made of. */
const INKS: readonly string[] = [
  '#14110e',
  '#5a3a22',
  '#8a5a35',
  '#c98b5b',
  '#f1c9a0',
  '#ffffff',
  '#c0392b',
  '#ff2e63',
  '#e07b00',
  '#ffd23f',
  '#15654f',
  '#1f3fd0',
  '#8e44ad',
  '#7b8794',
];

const SIZES: ReadonlyArray<readonly [string, number]> = [
  ['fine', 0.6],
  ['medium', 1],
  ['bold', 2],
];

function swatch(gs: string, colour: string, pressed: boolean, label: string): string {
  return (
    `<button type="button" class="gs-swatch" data-gs="${gs}" data-gs-value="${escapeHtml(colour)}" ` +
    `style="--swatch:${escapeHtml(colour)}" aria-label="${escapeHtml(label)}" aria-pressed="${pressed}"></button>`
  );
}

export function renderProfilePage(
  profile: Profile,
  options: ProfilePageOptions = {},
): RenderedPage {
  const ctx = surface('profile', { palette: 'studio' });
  const head = renderHead(ctx, 'ltr', { paper: 'blank', grain: 0.7 });
  const paper = profile.portrait?.paper ?? PAPERS[0];

  const pens = PENS.map(
    ([id, label, key], i) =>
      `<button type="button" class="gs-btn gs-btn-icon" data-gs="pen" data-gs-tool="${id}" ` +
      `aria-label="${label}" aria-pressed="${i === 0}" aria-keyshortcuts="${key.toLowerCase()}">` +
      `${icon(id as 'pen')}` +
      `<span class="gs-tip" role="presentation">${label} ${kbd(key)}</span></button>`,
  ).join('');
  const sizes = SIZES.map(
    ([name, scale]) =>
      `<button type="button" class="gs-btn gs-chip-btn" data-gs="size" data-gs-value="${scale}" ` +
      `aria-pressed="${scale === 1}">${name}</button>`,
  ).join('');
  const inks = INKS.map((c, i) => swatch('ink', c, i === 0, `ink ${c}`)).join('');
  const papers = PAPERS.map((c) => swatch('paper', c, c === paper, `photo paper ${c}`)).join('');
  const accents = ACCENTS.map((c) =>
    swatch('accent', c, c === (profile.accent ?? ACCENTS[0]), `card colour ${c}`),
  ).join('');
  const details = (profile.details ?? []).map((d) => detailRow(d.label, d.value)).join('');

  const actions =
    button({ gs: 'undo', label: 'undo', icon: 'undo', key: 'mod+Z' }) +
    button({ gs: 'redo', label: 'redo', icon: 'redo', key: 'mod+Shift+Z' }) +
    button({
      gs: 'profile-place',
      label: 'put the card on the board',
      icon: 'board',
      text: 'put on board',
    });

  const html = [
    '<!doctype html>',
    '<html lang="en" dir="ltr" data-script="latin" data-uppercase="on">',
    head,
    '<body class="on-profile">',
    halftoneDefs(),
    topBar({ place: 'profile', title: profile.name || 'me', saved: true, actions }),
    '<main class="pf-page">',

    // ---- the easel
    '<section class="pf-easel" aria-label="your portrait">',
    '<div class="pf-frame">',
    `<div class="pf-canvas" data-gs="canvas">${renderPortrait(profile.portrait, 'draw yourself here', true)}</div>`,
    '</div>',
    '<div class="pf-tools gs-card" role="toolbar" aria-label="pens">',
    `<div class="pf-pens">${pens}</div>`,
    `<div class="pf-sizes gs-chip-row" role="group" aria-label="size">${sizes}</div>`,
    `<div class="pf-inks" role="group" aria-label="ink">${inks}</div>`,
    // Helpers: none of them is part of the portrait. The sketch stays on the easel, the guide
    // is a line only the easel shows, and a photo to trace is never sent anywhere.
    '<div class="pf-helpers gs-chip-row" role="group" aria-label="helpers">',
    '<button type="button" class="gs-btn gs-chip-btn" data-gs="sketch-mode" aria-pressed="false" ' +
      'title="draw light guide lines, shown only here (S)">sketch</button>',
    '<button type="button" class="gs-btn gs-chip-btn" data-gs="sketch-show" aria-pressed="true" ' +
      'title="show or hide the sketch">show sketch</button>',
    '<button type="button" class="gs-btn gs-chip-btn" data-gs="sketch-clear" title="rub out the whole sketch">clear sketch</button>',
    '<button type="button" class="gs-btn gs-chip-btn" data-gs="mirror" aria-pressed="false" ' +
      'title="a centre line, and every stroke drawn on both sides (Y)">mirror</button>',
    '<button type="button" class="gs-btn gs-chip-btn" data-gs="trace" title="lay a photo under the paper to trace -- it is never saved">trace a photo</button>',
    '<label class="pf-trace-fade" data-gs="trace-controls" hidden><span>photo</span>' +
      '<input type="range" min="10" max="80" value="35" data-gs="trace-opacity" aria-label="how strongly the photo shows"></label>',
    '<button type="button" class="gs-btn gs-chip-btn" data-gs="trace-remove" hidden>take the photo away</button>',
    '<input type="file" accept="image/*" hidden data-gs="trace-file">',
    '</div>',
    '<div class="pf-paper-row">',
    `<span class="pf-label">photo paper</span><div class="pf-papers" role="group" aria-label="photo paper">${papers}</div>`,
    button({
      gs: 'clear',
      label: 'start again',
      icon: 'trash',
      text: 'start again',
      tone: 'gs-btn-danger',
    }),
    '</div>',
    '</div>',
    '</section>',

    // ---- who, and the card
    '<aside class="pf-side">',
    '<section class="pf-who gs-card" aria-label="who">',
    heading('who'),
    `<label class="pf-field"><span>name</span><input class="gs-field" data-gs="name" dir="auto" ` +
      `value="${escapeHtml(profile.name ?? '')}" placeholder="your name" maxlength="60" autocomplete="off"></label>`,
    `<label class="pf-field"><span>role</span><input class="gs-field" data-gs="role" dir="auto" ` +
      `value="${escapeHtml(profile.role ?? '')}" placeholder="what you are here for" maxlength="60" autocomplete="off"></label>`,
    `<label class="pf-field"><span>about</span><textarea class="gs-field" data-gs="bio" dir="auto" rows="2" ` +
      `maxlength="240" placeholder="a sentence, in your own words">${escapeHtml(profile.bio ?? '')}</textarea></label>`,
    `<div class="pf-details" data-gs="details">${details}</div>`,
    button({
      gs: 'detail-add',
      label: 'add a line',
      icon: 'plus',
      text: 'add a line',
      tone: 'pf-add',
    }),
    `<div class="pf-accent-row"><span class="pf-label">card colour</span><div class="pf-accents">${accents}</div></div>`,
    '</section>',
    `<section class="pf-card-stage" aria-label="the card"><div data-gs="card">${renderProfile(profile, { flat: true })}</div></section>`,
    petSection(profile.pet ?? DEFAULT_PET),
    cornersSection(),
    '</aside>',
    '</main>',
    `<script type="application/json" data-gs="profile-data">${JSON.stringify(profile).replace(/</g, '\\u003c')}</script>`,
    searchDialog(),
    helpDialog(),
    ...(options.live?.scripts ?? []).map(
      (src) => `<script type="module" src="${escapeHtml(src)}"></script>`,
    ),
    '</body>',
    '</html>',
  ].join('\n');
  return {
    id: 'profile',
    html: `${html}\n`,
    assets: ctx.assets,
    width: 1200,
    selector: '.pf-page',
    warnings: ctx.warnings,
    autofit: true,
  };
}

/**
 * Your pet: which animal, which coat, its name, and whether it lives on the bookcase. The coats
 * are drawn into their buttons by the app, from the same sprites the bookcase uses.
 */
/**
 * How round every corner in the workspace is: one slider, named stops, and a strip of the things
 * it changes, drawn live. The value itself is the workspace's (GET/POST /api/look), not the
 * profile's; the app reads it on arrival.
 */
function cornersSection(): string {
  const stops: Array<[string, number]> = [
    ['square', 0],
    ['crisp', 0.5],
    ['as designed', 1],
    ['soft', 1.8],
    ['round', 3],
  ];
  return (
    '<section class="pf-corners gs-card" aria-label="corners">' +
    heading('corners') +
    '<div class="pf-corners-row"><input type="range" min="0" max="300" step="5" value="100" ' +
    'data-gs="corners" aria-label="how round the corners are" class="pf-corners-range">' +
    '<output data-gs="corners-value" class="pf-corners-value">100%</output></div>' +
    `<div class="gs-chip-row" role="group" aria-label="corner stops">${stops
      .map(
        ([label, v]) =>
          `<button type="button" class="gs-btn gs-chip-btn" data-gs="corners-stop" data-gs-value="${v}">${label}</button>`,
      )
      .join('')}</div>` +
    '<div class="pf-corners-sample" aria-hidden="true"><span class="gs-btn">button</span>' +
    '<span class="gs-card pf-corners-card">card</span><span class="pf-corners-pill">tag</span></div>' +
    '<p class="pf-note">Every box in grimstroke follows this: the bars and menus, cards, pictures, code, pages and covers. ' +
    'A notebook or a board can keep its own. Torn paper, die-cut stickers and pixel art keep their edges.</p>' +
    '</section>'
  );
}

function petSection(pet: Pet): string {
  const species = (['cat', 'dog'] as const)
    .map(
      (s) =>
        `<button type="button" class="gs-btn gs-chip-btn" data-gs="pet-species" data-gs-value="${s}" aria-pressed="${pet.species === s}">${s}</button>`,
    )
    .join('');
  const coats = COATS.map(
    (c) =>
      `<button type="button" class="pf-coat" data-gs="pet-coat" data-gs-value="${c.id}" data-species="${c.species}" ` +
      `aria-pressed="${pet.coat === c.id && pet.species === c.species}" aria-label="${escapeHtml(c.label)}" title="${escapeHtml(c.label)}"` +
      `${c.species === pet.species ? '' : ' hidden'}><canvas width="48" height="40"></canvas><span>${escapeHtml(c.label)}</span></button>`,
  ).join('');
  return (
    '<section class="pf-pet gs-card" aria-label="your pet">' +
    heading('your pet') +
    '<div class="pf-pet-stage"><canvas data-gs="pet-preview" width="48" height="40" aria-hidden="true"></canvas></div>' +
    `<div class="gs-chip-row pf-pet-row" role="group" aria-label="cat or dog">${species}` +
    `<label class="pf-pet-on"><input type="checkbox" data-gs="pet-on"${pet.on === false ? '' : ' checked'}> on the bookcase</label></div>` +
    `<div class="pf-coats" role="group" aria-label="coat">${coats}</div>` +
    '<label class="pf-field"><span class="pf-label">name</span>' +
    `<input class="gs-field" data-gs="pet-name" value="${escapeHtml(pet.name ?? '')}" placeholder="what it answers to" maxlength="30" autocomplete="off"></label>` +
    '<p class="pf-note">It lives on the bookcase: stroke it with the pointer, and feed it from the bookcase’s top bar.</p>' +
    '</section>'
  );
}
