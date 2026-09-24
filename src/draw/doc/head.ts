/**
 * The document head: the vendored faces, and every variable the stylesheet
 * reads.
 *
 * Shared by the page and the board, because they are the same materials on
 * different substrates. Everything that differs between them arrives as an
 * option; everything that does not is defined once, here, so a change to the
 * ink or the grain cannot apply to one document type and not the other.
 */

import type { Direction } from '~/draw/doc/model.ts';
import { STYLESHEET } from '~/draw/doc/style.ts';
import type { Surface } from '~/draw/doc/surface.ts';
import { textOn } from '~/draw/look/colour.ts';
import { grain } from '~/draw/look/grain.ts';
import type { PaperKind } from '~/draw/look/grid.ts';
import { ruling } from '~/draw/look/grid.ts';
import { FACES, facePath, fontFamily, uiFontFamily, weightRule } from '~/draw/type/faces.ts';

export interface HeadOptions {
  paper?: PaperKind | undefined;
  grain?: boolean | number | undefined;
  fonts?: { body?: string; mono?: string; hand?: string; marker?: string } | undefined;
  imageMaxHeight?: number | undefined;
  /** Extra `--name: value` pairs, for whatever the substrate needs. */
  extra?: Record<string, string>;
}

/** The `@font-face` rules, registering each file as an asset as it goes. */
export function faceRules(ctx: Surface): string[] {
  const rules: string[] = [];
  for (const face of FACES) {
    const served = `f/${face.file}`;
    try {
      ctx.assets[served] = facePath(face);
    } catch (error) {
      ctx.warnings.push(String(error instanceof Error ? error.message : error));
      continue;
    }
    rules.push(
      `@font-face{font-family:'${face.family}';font-weight:${weightRule(face)};` +
        // block, not swap: a document is captured once, and a capture that
        // catches the fallback face looks like a font bug in whatever is being
        // documented rather than a timing artefact of the capture.
        `font-style:normal;font-display:block;src:url('${served}') format('truetype');}`,
    );
  }
  return rules;
}

/** Every variable the stylesheet reads, resolved against this surface. */
export function styleVars(
  ctx: Surface,
  direction: Direction,
  options: HeadOptions = {},
): Record<string, string> {
  const pal = ctx.pal;
  const fonts = options.fonts ?? {};
  const rule = ruling(options.paper ?? 'blank', { colour: pal.ink });
  const dirt = options.grain === true ? 1 : typeof options.grain === 'number' ? options.grain : 0;

  const dots = pal.dark
    ? 'radial-gradient(var(--paper) 0.8px, transparent 0.9px)'
    : 'radial-gradient(var(--ink) 0.8px, transparent 0.9px)';

  return {
    '--paper': pal.paper,
    '--ink': pal.ink,
    '--accent': pal.accent,
    '--chip-text': textOn(pal.accent, [pal.paper, pal.ink]),
    // Derived shades are color-mix in oklab and resolved by the browser. Naive
    // RGB darkening turns these saturated inks to mud.
    '--edge': 'color-mix(in oklab, var(--ink) 88%, var(--paper))',
    '--shade': 'color-mix(in oklab, var(--paper) 88%, var(--ink))',
    '--rule': 'color-mix(in oklab, var(--ink) 30%, transparent)',
    '--body-font': fontFamily('body', fonts, direction),
    '--mono-font': fontFamily('mono', fonts, direction),
    '--ui-font': uiFontFamily(fonts, direction),
    '--hand-font': fontFamily('hand', fonts, direction),
    '--marker-font': fontFamily('marker', fonts, direction),
    '--body-size': '15px',
    '--body-leading': '1.5',
    '--title-size': '22px',
    '--chip-size': '17px',
    '--label-size': '11px',
    '--label-tracking': '0.12em',
    '--keyline': '2.5px',
    '--shadow-x': '7px',
    '--shadow-y': '8px',
    '--shadow-opacity': '0.85',
    '--halftone': dots,
    '--halftone-period': '5px',
    '--halftone-opacity': '0.16',
    '--halftone-blend': pal.dark ? 'screen' : 'multiply',
    // Photo paper is photo paper, whatever the document is printed on -- but it
    // picks up a trace of the palette so a mount never reads as a foreign white
    // rectangle dropped onto a coloured sheet.
    '--mat-paper': `color-mix(in oklab, #fdfbf6 86%, ${pal.paper})`,
    '--mat-ink': `color-mix(in oklab, #14110e 86%, ${pal.ink})`,
    // The desk the sheet lies on. Dark enough that the paper reads as lit, and
    // derived from the palette so it is the same room in every one of them.
    '--desk': 'color-mix(in oklab, var(--ink) 78%, var(--paper))',
    '--image-max-height': `${options.imageMaxHeight ?? 1400}px`,
    '--paper-rule': rule.image || 'none',
    '--paper-rule-size': rule.size || 'auto',
    // Declared, not left as a var() fallback: a live board reads this back to work out how
    // far it may step the ruling as the camera moves, and a fallback is not readable.
    ...(rule.period ? { '--rule-p': `${rule.period}px` } : {}),
    ...(rule.coarse ? { '--rule-p2': `${rule.coarse}px` } : {}),
    // One tile, shared by every sheet in the document -- the same speckle the note
    // extension paints on a canvas. It is multiply-blended, so it is colour-agnostic.
    '--grain': dirt ? grain() : 'none',
    '--grain-opacity': dirt ? (0.5 * dirt).toFixed(3) : '0',
    ...(options.extra ?? {}),
  };
}

/** The whole `<head>`, faces and variables and stylesheet. */
export function renderHead(ctx: Surface, direction: Direction, options: HeadOptions = {}): string {
  const root = `:root{${Object.entries(styleVars(ctx, direction, options))
    .map(([k, v]) => `${k}:${v};`)
    .join('')}}`;
  return [
    '<head>',
    '<meta charset="utf-8">',
    '<style>',
    faceRules(ctx).join('\n'),
    root,
    STYLESHEET,
    '</style>',
    '</head>',
  ].join('\n');
}
