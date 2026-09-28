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
  /** This document's own corners (0 square to 3), over the workspace's. */
  round?: number | undefined;
}

/** A corners value as a document may carry it, clamped to what the look can draw. */
/**
 * What the chrome's photo paper and its ink each pick up from the palette. The ink takes the
 * palette's ink, except on a dark paper: there the palette's ink is the light one, and a trace of
 * it greyed the chrome's quiet ink to 3.6:1 on Carbon. It takes the dark paper instead.
 */
export function photoTint(pal: { paper: string; ink: string; dark: boolean }): {
  /** The photo paper's own colour, and the palette colour it takes a trace of. */
  paperBase: string;
  paper: string;
  inkBase: string;
  ink: string;
  /** How light the tools' accent may be: dark on a light theme, light on a dark one. */
  brand: [number, number];
} {
  // A dark theme is dark all the way through: the tools are a dark card with light ink too,
  // not a pale photo lying on a dark desk.
  return pal.dark
    ? { paperBase: '#1d2026', paper: pal.paper, inkBase: '#eef0f4', ink: pal.ink, brand: [0.72, 1] }
    : {
        paperBase: '#fdfbf6',
        paper: pal.paper,
        inkBase: '#14110e',
        ink: pal.ink,
        brand: [0, 0.42],
      };
}

export function cornersOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(3, Math.max(0, value))
    : undefined;
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

  const photo = photoTint(pal);
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
    // Corners: the document's own, or the workspace's (--gs-round, written by the server), or as
    // designed. --round-up is 0 up to 1, then grows, rounding what is drawn square. It is small
    // on purpose: at 12px a step, "soft" made every 34px button a pill while a big card barely
    // changed, and a board -- all small parts -- looked far rounder than settings at one value.
    '--round':
      cornersOf(options.round) !== undefined
        ? String(cornersOf(options.round))
        : 'var(--gs-round, 1)',
    '--round-up': 'calc(max(0, var(--round) - 1) * 5px)',
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
    '--mat-paper': `color-mix(in oklab, ${photo.paperBase} 86%, ${photo.paper})`,
    '--mat-ink': `color-mix(in oklab, ${photo.inkBase} 86%, ${photo.ink})`,
    '--brand-lo': String(photo.brand[0]),
    '--brand-hi': String(photo.brand[1]),
    // The desk the sheet lies on. Dark enough that the paper reads as lit, and
    // derived from the palette so it is the same room in every one of them.
    // On a dark palette the ink is the light colour, and a desk leaning to it came out pale:
    // there the desk is the paper, a shade deeper.
    '--desk': pal.dark
      ? 'color-mix(in oklab, var(--paper) 72%, #000)'
      : 'color-mix(in oklab, var(--ink) 78%, var(--paper))',
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
