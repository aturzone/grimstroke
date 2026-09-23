/**
 * A character, as SVG.
 *
 * Pure: nothing here opens a browser or touches the network. The output is one self-contained
 * <svg> that can go on a board, on a notebook cover, in a sticky note, or into an export --
 * and because it is vector it is as sharp at 40px as it is at 400.
 *
 * Colour comes in as custom properties, so the same drawing re-themes without being redrawn.
 */

import { Rng } from '~/draw/look/rng.ts';
import {
  type Character,
  CLIPPED,
  DEFAULT_FACE,
  DEFAULT_PALETTE,
  FACE_HEIGHT,
  FACE_WIDTH,
  ORDER,
  type Palette,
  type Slot,
} from '~/draw/material/face/model.ts';
import { CATALOGUE, type Part } from '~/draw/material/face/parts.ts';
import { PIXEL_H, PIXEL_W, stamp } from '~/draw/material/face/pixels.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export interface FaceOptions {
  /** Rendered size in px. The drawing is vector; this only sets the box. */
  size?: number;
  /** A disc of backdrop colour behind the head, the way an avatar usually sits. */
  badge?: boolean;
  /** Leaves the id off, for a face that is being previewed rather than addressed. */
  chrome?: boolean;
}

function find(slot: Slot, id: string | undefined): Part | undefined {
  if (!id) return undefined;
  const list = CATALOGUE[slot as keyof typeof CATALOGUE] as readonly Part[] | undefined;
  return list?.find((p) => p.id === id);
}

/** The custom properties a palette maps to. Writing these is the whole re-colour. */
export function faceVars(palette: Partial<Palette> | undefined): Record<string, string> {
  const p = { ...DEFAULT_PALETTE, ...palette };
  return {
    '--fc-skin': p.skin,
    '--fc-hair': p.hair,
    '--fc-ink': p.ink,
    '--fc-eyes': p.eyes,
    '--fc-mouth': p.mouth,
    '--fc-accent': p.accent,
    '--fc-cloth': p.cloth ?? DEFAULT_PALETTE.cloth ?? '#35508f',
    '--fc-backdrop': p.backdrop ?? 'transparent',
  };
}

/**
 * The scale applied to one feature, about its own centre.
 *
 * About its OWN centre, which is the whole reason this is a transform per group rather than a
 * number baked into the path: scaling the eyes from the middle of the face moves them apart
 * as it enlarges them, and a face whose eyes drift outwards as you make them bigger is a face
 * nobody can tune.
 */
const PIVOTS: Partial<Record<Slot, [number, number]>> = {
  eyes: [100, 104],
  brows: [100, 88],
  nose: [100, 118],
  mouth: [100, 148],
  hair: [100, 60],
};

function sized(slot: Slot, character: Character): string {
  const key = slot === 'shape' ? 'head' : slot;
  const scale = (character.sizes as Record<string, number | undefined> | undefined)?.[key];
  if (!scale || scale === 1) return '';
  const [cx, cy] = PIVOTS[slot] ?? [100, 104];
  return ` transform="translate(${cx} ${cy}) scale(${scale.toFixed(3)}) translate(${-cx} ${-cy})"`;
}

/**
 * The character as pixel art.
 *
 * One <rect> per filled cell, merged along each row so a run of identical cells is a single
 * rectangle -- a 32x36 grid is 1152 cells and perhaps 250 rects, which matters when a shelf
 * shows forty of them. crispEdges is the whole point: no antialiasing, so a pixel stays a
 * pixel at any size, which is what makes it pixel ART rather than a small picture blown up.
 */
function renderPixelFace(face: Character, size: number, badge: boolean): string {
  const grid = stamp(face);
  const parts: string[] = [];
  for (const [y, row] of grid.entries()) {
    let x = 0;
    while (x < row.length) {
      const cell = row[x] as string;
      if (cell === '.') {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === cell) run += 1;
      parts.push(`<rect class="px px-${cell}" x="${x}" y="${y}" width="${run}" height="1"/>`);
      x += run;
    }
  }
  const vars = Object.entries(faceVars(face.palette))
    .map(([k, v]) => `${k}:${escapeHtml(v)}`)
    .join(';');
  const backdrop = badge
    ? `<rect class="px-backdrop" x="0" y="0" width="${PIXEL_W}" height="${PIXEL_H}"/>`
    : '';
  return (
    `<svg class="face-art face-pixel" viewBox="0 0 ${PIXEL_W} ${PIXEL_H}" ` +
    `width="${size}" height="${Math.round((size * PIXEL_H) / PIXEL_W)}" ` +
    `style="${vars}" shape-rendering="crispEdges" role="img" aria-hidden="true">` +
    backdrop +
    parts.join('') +
    '</svg>'
  );
}

export function renderFace(character: Character, options: FaceOptions = {}): string {
  const face = {
    ...DEFAULT_FACE,
    ...character,
    parts: { ...DEFAULT_FACE.parts, ...character.parts },
  };
  const size = options.size ?? 160;
  // A different art style is a different drawing, not a different character.
  if (face.style === 'pixel') return renderPixelFace(face, size, options.badge === true);
  const vars = Object.entries(faceVars(face.palette))
    .map(([k, v]) => `${k}:${escapeHtml(v)}`)
    .join(';');

  /*
   * A degree or so of lean, taken from the id.
   *
   * Every face drawn dead upright in a row reads as a spritesheet. The tilt is seeded rather
   * than chosen so a character keeps the same one for as long as it exists, which is the
   * difference between a drawing and a jitter.
   */
  const rng = new Rng(`${face.id}:face`);
  const tilt = face.tilt ?? Number(rng.range(-2.4, 2.4).toFixed(2));

  /*
   * Everything painted ON the face is clipped to the head this character actually has.
   *
   * Stubble drawn to the jawline of a wide head hangs off the chin of a narrow one, and
   * blush placed for a round face sits half on the background of a long one. Clipping is
   * the only thing that lets the parts be independent of each other.
   */
  const shape = find('shape', face.parts.shape);
  const clipId = `fc-head-${face.id.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const clip = shape?.outline
    ? `<clipPath id="${clipId}"><path d="${shape.outline}"/></clipPath>`
    : '';

  /*
   * THE HAIR, AS SOMETHING WITH DEPTH.
   *
   * Two things a comic artist does to every head of hair and a flat fill does neither of: the
   * hair throws a shadow down onto the forehead, and it catches the light in a couple of
   * strands. Both are made from the hair's own outline -- the shadow is that outline shifted
   * down and clipped to the head, the strands are two strokes clipped to the hair -- so every
   * hairstyle gets them, including the ones not drawn yet.
   */
  const hair = find('hair', face.parts.hair);
  const lit = face.shading !== false;
  const hairPaths = [...(hair?.d ?? '').matchAll(/<path class="fc-hair" d="([^"]+)"/g)].map(
    (m) => m[1] as string,
  );
  const hairScale = sized('hair', face);
  const cast =
    lit && clip && hairPaths.length
      ? `<g class="fc-cast" clip-path="url(#${clipId})"><g transform="translate(2 8)">` +
        `<g${hairScale}>${hairPaths.map((d) => `<path d="${d}"/>`).join('')}</g></g></g>`
      : '';
  const strands =
    lit && hairPaths.length
      ? `<g class="fc-strands" clip-path="url(#${clipId}-hair)">` +
        '<path d="M56 62C66 46 82 37 100 34"/><path d="M63 72C71 59 84 51 99 47"/>' +
        '<path d="M126 36C136 40 146 48 152 58"/></g>'
      : '';
  const hairClip = hairPaths.length
    ? `<clipPath id="${clipId}-hair">${hairPaths.map((d) => `<path d="${d}"${hairScale}/>`).join('')}</clipPath>`
    : '';
  // On a badge the shoulders stop at the disc, the way a portrait is cut out for one.
  const disc = options.badge
    ? `<clipPath id="${clipId}-disc"><circle cx="100" cy="104" r="98"/></clipPath>`
    : '';

  const pieces = ORDER.map((slot) => {
    const part = find(slot, face.parts[slot]);
    if (!part) return '';
    const held =
      slot === 'outfit' && disc
        ? ` clip-path="url(#${clipId}-disc)"`
        : clip && CLIPPED.includes(slot)
          ? ` clip-path="url(#${clipId})"`
          : '';
    const group = `<g class="fc-part fc-${slot}"${sized(slot, face)}${held}>${part.d}</g>`;
    if (slot === 'hair') return cast + group + strands;
    return group;
  }).join('');

  /*
   * THE LIGHT.
   *
   * Flat fills with a uniform keyline is a diagram of a face, not a drawing of one -- parts
   * laid on parts, which is exactly how it looked. Two things turn that into art, and comic
   * artists do both without thinking:
   *
   * A HEAVIER CONTOUR. The silhouette is drawn with a thicker line than anything inside it,
   * so the head reads as one solid object and the features read as marks upon it. Uniform
   * weight gives every edge the same importance and the face falls apart into its pieces.
   *
   * ONE SHADED SIDE. The shadow is the head's own outline, masked by a copy of itself shifted
   * up and to the left -- which leaves a crescent down the lit-from-upper-left side. It costs
   * no new artwork at all: every head shape produces its own correct shadow, and a head that
   * is added later gets one for free.
   */
  const shade =
    shape?.outline && face.shading !== false
      ? `<mask id="${clipId}-lit" maskUnits="userSpaceOnUse" x="0" y="0" ` +
        `width="${FACE_WIDTH}" height="${FACE_HEIGHT}">` +
        `<rect x="0" y="0" width="${FACE_WIDTH}" height="${FACE_HEIGHT}" fill="#fff"/>` +
        `<path d="${shape.outline}" fill="#000" transform="translate(-17 -13)"/>` +
        '</mask>' +
        `<g class="fc-shade" clip-path="url(#${clipId})" mask="url(#${clipId}-lit)">` +
        `<path d="${shape.outline}"/></g>`
      : '';

  const backdrop = options.badge ? '<circle class="fc-backdrop" cx="100" cy="104" r="98"/>' : '';

  const name = face.name ? `<title>${escapeHtml(face.name)}</title>` : '';
  const id = options.chrome === false ? '' : ` data-gs="face" data-gs-id="${escapeHtml(face.id)}"`;

  return (
    `<svg class="face-art" viewBox="0 0 ${FACE_WIDTH} ${FACE_HEIGHT}" ` +
    `width="${size}" height="${Math.round((size * FACE_HEIGHT) / FACE_WIDTH)}" ` +
    `style="${vars}"${id} role="img"${face.name ? '' : ' aria-hidden="true"'}>` +
    name +
    (clip || hairClip || disc ? `<defs>${clip}${hairClip}${disc}</defs>` : '') +
    backdrop +
    `<g transform="rotate(${tilt} 100 110)">${pieces}${shade}</g>` +
    '</svg>'
  );
}
