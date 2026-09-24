/**
 * A sticker: a mark, an emoji or a few words, printed on vinyl and die-cut round the shape with
 * a white border, lying on the paper with a hard little shadow.
 *
 * The border is the shape grown outwards -- a stack of offset drop shadows in white, which
 * follows any outline, a brand mark's or an emoji's alike -- so one rule cuts every sticker.
 */

import { markOf, SHORTCODES } from '~/draw/material/sticker/marks.ts';
import { escapeHtml } from '~/draw/type/text.ts';

export interface StickerFace {
  /** A name from the sheet (marks.ts). */
  mark?: string | undefined;
  /** Or an emoji. */
  emoji?: string | undefined;
  /** Or a few words, as a stamp. */
  words?: string | undefined;
  /** The ink, for words or to recolour a symbol. */
  colour?: string | undefined;
}

/** The face of a sticker, as markup, for a board, a page or a cover. */
export function renderStickerFace(face: StickerFace): string {
  const mark = markOf(face.mark);
  const colour = face.colour ?? mark?.colour ?? '#14110e';
  if (mark?.family === 'stamp' || (!mark && face.words)) {
    const words = face.words ?? mark?.words ?? '';
    return (
      `<span class="dcut dcut-stamp" style="--mark:${escapeHtml(colour)}" role="img" ` +
      `aria-label="${escapeHtml(mark?.label ?? words)}"><span class="dcut-words">${escapeHtml(words)}</span></span>`
    );
  }
  if (mark?.path) {
    const paint = mark.fill
      ? `fill="${escapeHtml(colour)}"`
      : `fill="none" stroke="${escapeHtml(colour)}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
    return (
      `<span class="dcut dcut-${mark.family}" role="img" aria-label="${escapeHtml(mark.label)}">` +
      `<svg viewBox="-1 -1 26 26" aria-hidden="true"><path d="${escapeHtml(mark.path)}" ${paint}/></svg></span>`
    );
  }
  const emoji = face.emoji ?? '⭐';
  return `<span class="dcut dcut-emoji" role="img" aria-label="sticker"><span>${escapeHtml(emoji)}</span></span>`;
}

/** A sticker block on a board or a page. */
export function renderSticker(face: StickerFace): string {
  return `<div class="block sticker-block">${renderStickerFace(face)}</div>`;
}

/**
 * `:rocket:` in written text as a small sticker of a rocket, the way GitHub and GitLab write
 * them. Run over text that is already escaped; a word that is not a known shortcode, and any
 * colon that is only a colon -- 10:30:45 -- is left exactly as it was.
 */
export function withShortcodes(html: string): string {
  return html.replace(/:([a-z0-9_+-]{1,32}):/g, (whole, name: string) => {
    const emoji = SHORTCODES[name];
    return emoji
      ? `<span class="emoji-sticker" role="img" aria-label="${escapeHtml(name)}">${emoji}</span>`
      : whole;
  });
}
