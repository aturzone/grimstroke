/**
 * The portrait and the profile card, as HTML.
 *
 * Pure: nothing here opens a browser or touches the network. The card is an object in its
 * own right -- a press pass, a crew card, a "hello my name is" that grew up -- with the drawn
 * portrait on it, the name in marker, the role in a hand, and the details typed underneath.
 *
 * Everything is sized against the card's own width (container units), so the same markup is
 * a 200px card on a board, a pasted-on panel on a notebook cover, and a full-size card on its
 * own page, with nothing recomputed.
 */

import { textOn } from '~/draw/look/colour.ts';
import { Rng } from '~/draw/look/rng.ts';
import {
  DEFAULT_ACCENT,
  DEFAULT_PAPER,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
  type Portrait,
  type PortraitStroke,
  type Profile,
} from '~/draw/material/profile/model.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export interface ProfileOptions {
  /** Straight, for a card that is not lying on anything. */
  flat?: boolean;
}

/** A card number, taken from the name: the same person always has the same number. */
export function cardNumber(name: string): string {
  const rng = new Rng(`${name}:card`);
  return String(Math.floor(rng.range(1, 9999))).padStart(4, '0');
}

/**
 * The drawing, in its 3:4 frame.
 *
 * Strokes are drawn with the board's own rules -- a line has a round cap and join, a fill is
 * a band -- so a portrait drawn with the marker looks like the marker on the board.
 */
export function renderPortrait(
  portrait: Portrait | undefined,
  empty = 'no portrait yet',
  /** The easel's copy: the one the app draws into, so the only one with hooks. */
  easel = false,
): string {
  const paper = portrait?.paper ?? DEFAULT_PAPER;
  const path = (stroke: PortraitStroke): string => {
    const tool = stroke.tool ?? 'pen';
    const vars = [
      stroke.colour ? `--stroke:${escapeHtml(stroke.colour)}` : '',
      stroke.weight ? `--stroke-weight:${stroke.weight}px` : '',
    ]
      .filter(Boolean)
      .join(';');
    return (
      `<path class="pt-stroke tool-${tool} ${stroke.fill ? 'fill' : 'line'}" ` +
      `d="${escapeHtml(stroke.d)}"${vars ? ` style="${vars}"` : ''}/>`
    );
  };
  const all = portrait?.strokes ?? [];
  const strokes = all
    .filter((s) => !s.sketch)
    .map(path)
    .join('');
  // The sketch is the easel's alone: under the drawing, pale, and never anywhere else.
  const sketch = easel
    ? all
        .filter((s) => s.sketch)
        .map(path)
        .join('')
    : '';
  const hint =
    strokes || !empty
      ? ''
      : `<text class="pt-empty" x="${PORTRAIT_WIDTH / 2}" y="${PORTRAIT_HEIGHT / 2}">${escapeHtml(empty)}</text>`;
  return (
    `<svg class="portrait" viewBox="0 0 ${PORTRAIT_WIDTH} ${PORTRAIT_HEIGHT}" ` +
    `${easel ? 'data-gs="portrait" ' : ''}role="img" aria-label="portrait">` +
    `<rect class="pt-paper" width="${PORTRAIT_WIDTH}" height="${PORTRAIT_HEIGHT}" style="fill:${escapeHtml(paper)}"/>` +
    (easel ? `<g class="pt-sketch" data-gs="portrait-sketch">${sketch}</g>` : '') +
    `<g${easel ? ' data-gs="portrait-ink"' : ''}>${strokes}</g>${hint}</svg>`
  );
}

/**
 * The stamp in the corner.
 *
 * Words on a circle, in the accent, at a seeded angle -- a rubber stamp never lands straight.
 */
function stamp(key: string, role: string): string {
  const id = `pf-ring-${cardNumber(key)}`;
  const words = `${(role || 'crew').toUpperCase()} · GRIMSTROKE · `;
  return (
    '<svg class="profile-stamp" viewBox="0 0 100 100" aria-hidden="true">' +
    `<defs><path id="${id}" d="M50 50 m-34 0 a34 34 0 1 1 68 0 a34 34 0 1 1 -68 0"/></defs>` +
    '<circle cx="50" cy="50" r="46" class="profile-stamp-ring"/>' +
    '<circle cx="50" cy="50" r="23" class="profile-stamp-ring"/>' +
    `<text><textPath href="#${id}" textLength="212">${escapeHtml(words)}</textPath></text>` +
    '<path d="M40 50 L47 57 L61 42" class="profile-stamp-tick"/>' +
    '</svg>'
  );
}

export function renderProfile(profile: Profile, options: ProfileOptions = {}): string {
  const accent = profile.accent ?? DEFAULT_ACCENT;
  const name = profile.name?.trim() || 'me';
  const rng = new Rng(`${name}:profile`);
  const tilt = options.flat ? 0 : Number(rng.range(-1.6, 1.6).toFixed(2));
  const stampTilt = Number(rng.range(-24, 18).toFixed(1));
  const role = profile.role?.trim() ?? '';
  const details = (profile.details ?? []).filter((d) => d.label.trim() || d.value.trim());
  const rows = details
    .map(
      (d) =>
        `<div class="profile-row"><dt dir="auto">${escapeHtml(d.label)}</dt>` +
        `<dd dir="auto">${escapeHtml(d.value)}</dd></div>`,
    )
    .join('');
  // The lettering on the band is derived from the band, never authored: a blue accent with
  // ink written on it is a band nobody can read.
  const onAccent = textOn(accent, ['#fbf8f0', '#14110e']);
  return (
    `<article class="profile" style="--pf-accent:${escapeHtml(accent)};` +
    `--pf-on-accent:${onAccent};--pf-tilt:${tilt}deg;--pf-stamp:${stampTilt}deg" ` +
    `aria-label="${escapeHtml(name)}">` +
    '<div class="profile-card">' +
    '<header class="profile-band">' +
    '<span class="profile-kind">profile</span>' +
    `<span class="profile-no">no. ${cardNumber(name)}</span>` +
    '</header>' +
    `<div class="profile-photo">${renderPortrait(profile.portrait)}</div>` +
    `<h3 class="profile-name" dir="auto">${escapeHtml(name)}</h3>` +
    (role ? `<p class="profile-role" dir="auto">${escapeHtml(role)}</p>` : '') +
    (rows ? `<dl class="profile-details">${rows}</dl>` : '') +
    (profile.bio?.trim()
      ? `<p class="profile-bio" dir="auto">${escapeHtml(profile.bio.trim())}</p>`
      : '') +
    stamp(name, role) +
    '</div>' +
    '</article>'
  );
}
