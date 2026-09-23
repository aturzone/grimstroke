/**
 * A character's profile card, as HTML.
 *
 * Pure: nothing here opens a browser or touches the network. The card is an object in its
 * own right -- a press pass, a crew card, a "hello my name is" that grew up -- with the face
 * on it, the name in marker, the role in a hand, and the details typed underneath.
 *
 * Everything is sized against the card's own width (container units), so the same markup is
 * a 180px card on a board, a pasted-on panel on a notebook cover, and a full-size card on its
 * own page, with nothing recomputed. That is the same trick the notebook covers use, and for
 * the same reason.
 */

import { textOn } from '~/draw/look/colour.ts';
import { Rng } from '~/draw/look/rng.ts';
import { type Character, DEFAULT_PALETTE } from '~/draw/material/face/model.ts';
import { renderFace } from '~/draw/material/face/render.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export interface ProfileOptions {
  /** Leaves the id off, for a card that is being previewed rather than addressed. */
  chrome?: boolean;
  /** Straight, for a card that is not lying on anything. */
  flat?: boolean;
}

/** A card number, taken from the id: the same character always has the same number. */
export function cardNumber(id: string): string {
  const rng = new Rng(`${id}:card`);
  return String(Math.floor(rng.range(1, 9999))).padStart(4, '0');
}

/**
 * The stamp in the corner.
 *
 * Words on a circle, in the accent, at a seeded angle -- a rubber stamp never lands straight,
 * and it never lands at the same angle twice on two different cards.
 */
function stamp(id: string, role: string): string {
  const words = `${(role || 'crew').toUpperCase()} · GRIMSTROKE · `;
  return (
    '<svg class="profile-stamp" viewBox="0 0 100 100" aria-hidden="true">' +
    `<defs><path id="pf-ring-${escapeHtml(id)}" d="M50 50 m-34 0 a34 34 0 1 1 68 0 a34 34 0 1 1 -68 0"/></defs>` +
    '<circle cx="50" cy="50" r="46" class="profile-stamp-ring"/>' +
    '<circle cx="50" cy="50" r="23" class="profile-stamp-ring"/>' +
    `<text><textPath href="#pf-ring-${escapeHtml(id)}" textLength="212">${escapeHtml(words)}</textPath></text>` +
    '<path d="M40 50 L47 57 L61 42" class="profile-stamp-tick"/>' +
    '</svg>'
  );
}

export function renderProfile(character: Character, options: ProfileOptions = {}): string {
  const palette = { ...DEFAULT_PALETTE, ...character.palette };
  const rng = new Rng(`${character.id}:profile`);
  const tilt = options.flat ? 0 : Number(rng.range(-1.6, 1.6).toFixed(2));
  const stampTilt = Number(rng.range(-24, 18).toFixed(1));
  const name = character.name?.trim() || 'Unnamed';
  const role = character.role?.trim() ?? '';
  const details = (character.details ?? []).filter((d) => d.label.trim() || d.value.trim());
  const id =
    options.chrome === false ? '' : ` data-gs="profile" data-gs-id="${escapeHtml(character.id)}"`;

  const rows = details
    .map(
      (d) =>
        `<div class="profile-row"><dt dir="auto">${escapeHtml(d.label)}</dt>` +
        `<dd dir="auto">${escapeHtml(d.value)}</dd></div>`,
    )
    .join('');

  // The lettering on the band is derived from the band, never authored, exactly as a chip's
  // is: a blue accent with ink written on it is a band nobody can read.
  const onAccent = textOn(palette.accent, ['#fbf8f0', '#14110e']);
  // The disc behind the head is a tint of their own accent, so a card says whose it is at a
  // glance across a board, before the name can be read.
  const portrait = {
    ...character,
    tilt: 0,
    palette: {
      ...palette,
      backdrop: palette.backdrop ?? `color-mix(in oklab, ${palette.accent} 30%, #fbf7ec)`,
    },
  };
  return (
    `<article class="profile"${id} style="--pf-accent:${escapeHtml(palette.accent)};` +
    `--pf-on-accent:${onAccent};` +
    `--pf-tilt:${tilt}deg;--pf-stamp:${stampTilt}deg" aria-label="${escapeHtml(name)}">` +
    '<div class="profile-card">' +
    '<header class="profile-band">' +
    '<span class="profile-kind">profile</span>' +
    `<span class="profile-no">no. ${cardNumber(character.id)}</span>` +
    '</header>' +
    `<div class="profile-portrait">${renderFace(portrait, { badge: true, chrome: false, size: 200 })}</div>` +
    `<h3 class="profile-name" dir="auto">${escapeHtml(name)}</h3>` +
    (role ? `<p class="profile-role" dir="auto">${escapeHtml(role)}</p>` : '') +
    (rows ? `<dl class="profile-details">${rows}</dl>` : '') +
    (character.bio?.trim()
      ? `<p class="profile-bio" dir="auto">${escapeHtml(character.bio.trim())}</p>`
      : '') +
    stamp(character.id, role) +
    '</div>' +
    '</article>'
  );
}
