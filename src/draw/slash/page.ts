/**
 * The / board as a page of its own, for a core served with no face: everything it needs in
 * one document -- its colours, the box's and the cards' styles -- and nothing of any face.
 *
 * With a face, the face frames the same column in its own chrome instead (host/serve/face.ts).
 */

import { KIT, TOKENS } from '~/draw/chrome/css/kit.ts';
import { SHAPE_BAR } from '~/draw/chrome/css/shape.ts';
import { SHAPE } from '~/draw/shape/css.ts';
import { SLASH } from '~/draw/slash/css.ts';
import { TODAY } from '~/draw/today/css.ts';
import { escapeHtml } from '~/draw/type/text.ts';

/** Light and dark, as the core knows them: the paper, the ink, and the one blue. */
const THEMES = {
  light: { paper: '#fcfaf4', ink: '#15120f', accent: '#1f3fd0', on: '#ffffff', lo: 0, hi: 0.42 },
  dark: { paper: '#1d2026', ink: '#eef0f4', accent: '#6d8bff', on: '#0d1020', lo: 0.72, hi: 1 },
} as const;

const OWN = `/* ---- the core's own page ---- */
html, body { margin: 0; }
body.on-slash { min-height: 100vh; background: color-mix(in oklab, var(--gs-ink) 7%, var(--gs-paper)); color: var(--gs-ink); font-family: var(--ui-font); -webkit-text-size-adjust: 100%; }
.sl-top { position: fixed; inset-block-start: calc(14px + env(safe-area-inset-top, 0px)); inset-inline: 16px; z-index: 40; display: flex; align-items: center; gap: 10px; width: min(528px, calc(100% - 32px)); margin: 0 auto; padding: 8px 12px; box-sizing: border-box; border: 1.5px solid var(--gs-ink); border-radius: var(--gs-radius); background: var(--gs-paper); box-shadow: var(--gs-shadow); }
.sl-top b { display: grid; place-items: center; width: 30px; height: 30px; flex: none; border-radius: 50%; background: var(--accent); color: var(--chip-text); font-size: 16px; }
.sl-top span { min-width: 0; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
`;

export function slashDocument(
  main: string,
  options: { scripts: string[]; theme: 'light' | 'dark'; title?: string },
): string {
  const t = THEMES[options.theme];
  const vars =
    `:root { color-scheme: ${options.theme}; --mat-paper: ${t.paper}; --mat-ink: ${t.ink}; ` +
    `--accent: ${t.accent}; --chip-text: ${t.on}; --brand-lo: ${t.lo}; --brand-hi: ${t.hi}; ` +
    "--round: 1; --round-up: 0px; --ui-font: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, sans-serif; " +
    '--hand-font: var(--ui-font); --marker-font: var(--ui-font); }';
  const title = options.title ?? 'everything made with /';
  return [
    '<!doctype html>',
    '<html lang="en" dir="ltr">',
    '<head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<meta name="theme-color" content="${t.paper}">`,
    `<title>${escapeHtml(title)} · grimstroke</title>`,
    `<style>${vars}${TOKENS}${KIT}${SHAPE}${SHAPE_BAR}${TODAY}${SLASH}${OWN}</style></head>`,
    '<body class="is-live on-today on-slash">',
    `<header class="sl-top"><b aria-hidden="true">g</b><span>${escapeHtml(title)}</span></header>`,
    `<main class="td-page sl-page" data-gs="slash">${main}</main>`,
    ...options.scripts.map((src) => `<script type="module" src="${escapeHtml(src)}"></script>`),
    '</body></html>',
    '',
  ].join('\n');
}
