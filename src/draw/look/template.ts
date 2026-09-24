/**
 * Page templates: a layout printed on the paper, under whatever is written on it.
 *
 * A ruling repeats; a template does not -- a Cornell page has one cue column and one summary
 * box, a Kanban page has its three columns. So it is drawn once, to the page's own size, as a
 * few lines and small printed labels in the paper's ink, faint enough to write over.
 */

import { escapeHtml } from '~/draw/type/text.ts';

export type PageTemplate = 'cornell' | 'kanban';
export const TEMPLATES: readonly PageTemplate[] = ['cornell', 'kanban'];

/** The template as an SVG layer the size of the page, or nothing. */
export function templateLayer(
  kind: PageTemplate | undefined,
  width: number,
  height: number,
  ink: string,
): string {
  if (kind !== 'cornell' && kind !== 'kanban') return '';
  const stroke = `stroke="${escapeHtml(ink)}" stroke-opacity="0.38" stroke-width="1.5"`;
  const text = (x: number, y: number, words: string): string =>
    `<text x="${x}" y="${y}" fill="${escapeHtml(ink)}" fill-opacity="0.5" ` +
    `font-family="var(--mono-font)" font-size="11" letter-spacing="1.5">${escapeHtml(words)}</text>`;
  let body = '';
  if (kind === 'cornell') {
    // Cues down the left third, notes on the right, a summary across the foot.
    const cue = Math.round(width * 0.3);
    const foot = Math.round(height * 0.8);
    body =
      `<line x1="${cue}" y1="28" x2="${cue}" y2="${foot}" ${stroke}/>` +
      `<line x1="24" y1="${foot}" x2="${width - 24}" y2="${foot}" ${stroke}/>` +
      text(28, 22, 'CUES') +
      text(cue + 12, 22, 'NOTES') +
      text(28, foot + 20, 'SUMMARY');
  } else {
    const cols = ['TO DO', 'DOING', 'DONE'];
    const w = (width - 48) / cols.length;
    body = cols
      .map((name, i) => {
        const x = Math.round(24 + i * w);
        return (
          `<rect x="${x + 4}" y="24" width="${Math.round(w - 8)}" height="${height - 60}" rx="4" ` +
          `fill="none" ${stroke} stroke-dasharray="${i === 0 ? '0' : '0'}"/>` +
          `<line x1="${x + 4}" y1="52" x2="${Math.round(x + w - 4)}" y2="52" ${stroke}/>` +
          text(x + 14, 43, name)
        );
      })
      .join('');
  }
  return (
    `<svg class="page-template page-template-${kind}" aria-hidden="true" width="${width}" ` +
    `height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
  );
}
