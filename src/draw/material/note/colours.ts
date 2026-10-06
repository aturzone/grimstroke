/**
 * A note's colours: its style resolved against the palettes, as the custom properties the face
 * writes. The style itself is data (note/model.ts); this is how it is drawn.
 */

import { isDarkPaper, paletteById } from '~/draw/look/palette.ts';
import type { NoteStyle } from '~/draw/material/note/model.ts';

/** The custom properties a resolved style maps to. Writing these is the whole re-theme. */
export function noteVars(s: NoteStyle, fontStack?: string): Record<string, string> {
  const p = paletteById(s.palette);
  const vars: Record<string, string> = {
    '--cn-paper': s.paper ?? p.paper,
    '--cn-ink': s.ink ?? p.ink,
    '--cn-accent': s.accent ?? p.accent,
    '--cn-size': `${s.fontSize}px`,
    '--cn-lh': String(s.lineHeight),
    '--cn-opacity': String(s.opacity),
    '--cn-grain': String(s.grain),
  };
  if (fontStack) vars['--cn-font'] = fontStack;
  return vars;
}

/** Is the paper this note is actually using dark? Decides the halftone variant. */
export function noteIsDark(s: NoteStyle): boolean {
  return isDarkPaper(s.paper ?? paletteById(s.palette).paper);
}

export { isDarkPaper, paletteById };
