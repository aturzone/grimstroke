/**
 * A core page -- the / board -- in this face's frame: its head, its top bar, its search and
 * help, so it sits among the face's own pages as one of them.
 */

import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import { renderHead } from '~/draw/doc/head.ts';
import { surface } from '~/draw/doc/surface.ts';
import { escapeHtml } from '~/draw/type/text.ts';
import type { Drawn, Face } from '~/host/serve/face.ts';
import { appUrl } from '~/host/serve/http.ts';

export const frame: NonNullable<Face['frame']> = (page): Drawn => {
  const ctx = surface(page.id, { palette: page.palette });
  const head = renderHead(ctx, 'ltr', { paper: 'blank', grain: 0.7 });
  const html = [
    '<!doctype html>',
    '<html lang="en" dir="ltr" data-script="latin">',
    head,
    '<body class="is-live on-today on-slash">',
    topBar({
      place: 'slash',
      title: page.title,
      ...(page.short ? { short: page.short } : {}),
      saved: false,
    }),
    `<main class="td-page sl-page" data-gs="${escapeHtml(page.id)}">${page.main}</main>`,
    searchDialog(),
    helpDialog(),
    `<script type="module" src="${escapeHtml(appUrl())}"></script>`,
    '</body>',
    '</html>',
  ].join('\n');
  return { html: `${html}\n`, assets: ctx.assets };
};
