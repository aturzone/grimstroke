/**
 * The materials made of words: headings, paragraphs, marker labels, lists, tables, code and
 * quotes.
 *
 * Every one of them takes its text through inline(), which is the single place escaping,
 * technical marking and digit shaping happen -- so a hex colour inside a Persian sentence is
 * marked the same way in a heading as it is in a table cell.
 *
 * Pure. Nothing here opens a browser or touches the network.
 */

import type { Surface } from '~/draw/doc/surface.ts';
import { textOn } from '~/draw/look/colour.ts';
import { raggedBand } from '~/draw/look/hand.ts';
import { Rng } from '~/draw/look/rng.ts';
import type { Block } from '~/draw/material/model.ts';
import { escapeHtml, inline, label } from '~/draw/type/text.ts';

/**
 * Per-block base direction.
 *
 * A page has one direction, but the text on it may not. An English sentence in a
 * right-to-left page gets its full stop moved to the far end, because the
 * paragraph's base direction decides where trailing punctuation lands. `auto`
 * takes the direction from the first strong character in the block, and an
 * isolated technical run is skipped when working that out -- so a Persian
 * sentence beginning with a hex colour still reads as Persian.
 */
export const AUTO = ' dir="auto"';

export function renderHeading(block: Extract<Block, { kind: 'heading' }>, ctx: Surface): string {
  const d = { digits: ctx.digits };
  const written = block.hand ? ' written' : '';
  const ink = block.colour ? ` style="color:${escapeHtml(block.colour)}"` : '';
  return block.level === 2
    ? `<h3 class="block${written}"${AUTO}${ink}>${inline(block.text, d)}</h3>`
    : `<h2 class="block${written}"${AUTO}${ink}>${inline(block.text, d)}</h2>`;
}

export function renderText(block: Extract<Block, { kind: 'text' }>, ctx: Surface): string {
  const d = { digits: ctx.digits };
  const ink = block.colour ? ` style="color:${escapeHtml(block.colour)}"` : '';
  const kind = block.hand ? ' written' : block.caption ? ' caption' : '';
  return `<p class="block${kind}"${AUTO}${ink}>${inline(block.text, d)}</p>`;
}

export function renderBullets(block: Extract<Block, { kind: 'bullets' }>, ctx: Surface): string {
  const d = { digits: ctx.digits };
  return `<ul class="block">${block.items
    .map((item) => `<li${AUTO}>${inline(item, d)}</li>`)
    .join('')}</ul>`;
}

export function renderCode(block: Extract<Block, { kind: 'code' }>, ctx: Surface): string {
  return (
    `<pre class="block">` +
    (block.label ? `<span class="pre-label">${label(block.label, ctx.uppercase)}</span>` : '') +
    escapeHtml(block.text) +
    '</pre>'
  );
}

export function renderQuote(block: Extract<Block, { kind: 'quote' }>, ctx: Surface): string {
  const d = { digits: ctx.digits };
  return (
    `<blockquote class="block"${AUTO}>${inline(block.text, d)}` +
    (block.cite ? `<span class="cite">${inline(block.cite, d)}</span>` : '') +
    '</blockquote>'
  );
}

/**
 * A marker label.
 *
 * The lettering colour is derived from the fill, never authored, exactly as a
 * chip's is: a label whose words cannot be read against their own band is a
 * label that made the page worse, and deriving it means no palette can ship
 * one however many are added.
 */
export function renderLabel(block: Extract<Block, { kind: 'label' }>, ctx: Surface): string {
  const pal = ctx.pal;
  const tone = block.tone ?? 'highlight';
  const fill =
    block.colour ?? (tone === 'ink' ? pal.ink : tone === 'paper' ? pal.paper : pal.accent);
  ctx.seq += 1;
  const seed = `${ctx.id}:label:${ctx.seq}`;
  const rng = new Rng(`${seed}:tilt`);
  const style =
    `--label-bg:${escapeHtml(fill)};--label-fg:${textOn(fill, [pal.paper, pal.ink])};` +
    `--tilt:${(rng.gauss() * 1.3).toFixed(2)}deg;clip-path:${raggedBand(seed)}`;
  const written = block.hand === false ? '' : ' written';
  return `<p class="label block${written}"${AUTO} style="${style}">${inline(block.text, {
    digits: ctx.digits,
  })}</p>`;
}

export function renderTable(rows: string[][], head: boolean, ctx: Surface): string {
  const d = { digits: ctx.digits };
  const body = head ? rows.slice(1) : rows;
  const parts = ['<table class="block">'];
  if (head && rows[0]) {
    parts.push(
      `<thead><tr>${rows[0].map((c) => `<th${AUTO}>${inline(c, d)}</th>`).join('')}</tr></thead>`,
    );
  }
  parts.push('<tbody>');
  for (const row of body) {
    parts.push(`<tr>${row.map((c) => `<td${AUTO}>${inline(c, d)}</td>`).join('')}</tr>`);
  }
  parts.push('</tbody></table>');
  return parts.join('');
}
