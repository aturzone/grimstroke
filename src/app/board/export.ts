/**
 * Getting a board out of the browser: PDF, SVG and PNG, of everything or of a selection.
 *
 * Each format is the same elements and the same stylesheet the screen shows, never a second
 * renderer's idea of them -- so an export cannot disagree with what was on screen.
 */

import type { BoardContext } from '~/app/board/context.ts';

/** Rules that apply only to a board on its way out of the browser. See portableStyles. */
const EXPORT_ONLY = [
  '.note .actions, .note .grips { display: none !important; }',
  // Without the toolbar the header is an empty 30px band, so it tightens to the divider.
  '.note .handle { justify-content: flex-start; }',
].join('\n');

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Exporter {
  private readonly ctx: BoardContext;
  private readonly status: (text: string) => void;
  private readonly fail: (message: string) => void;

  constructor(ctx: BoardContext, status: (text: string) => void, fail: (message: string) => void) {
    this.ctx = ctx;
    this.status = status;
    this.fail = fail;
  }

  /**
   * What an export should cover.
   *
   * A selection if there is one, everything otherwise. Exporting one finding out of a board
   * with forty on it is the common case rather than the exotic one, and a tool that can only
   * hand you the lot makes you crop it by hand afterwards.
   */
  exportBounds(): Bounds | undefined {
    return this.ctx.selection.size > 0
      ? this.contentBounds(this.ctx.selection.list())
      : this.contentBounds();
  }

  contentBounds(only?: string[]): Bounds | undefined {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    let seen = 0;
    for (const element of this.ctx.board.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      if (only && !only.includes(element.dataset.gsId ?? '')) continue;
      // A stroke is a zero-sized box with the path overflowing it, so the
      // element's own rectangle says nothing about where the ink went -- and
      // offsetLeft does not exist on an SVG element at all, so measuring that
      // way put every stroke at the board's top-left corner and made "fit"
      // frame a thousand pixels of empty paper.
      const measured = element.tagName === 'svg' ? element.querySelector('path') : element;
      const box = (measured ?? element).getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      seen += 1;
      // Through the camera, so this is right at any zoom and for an item that
      // has been rotated.
      const a = this.ctx.view.toBoard({ x: box.left, y: box.top });
      const b = this.ctx.view.toBoard({ x: box.right, y: box.bottom });
      left = Math.min(left, a.x);
      top = Math.min(top, a.y);
      right = Math.max(right, b.x);
      bottom = Math.max(bottom, b.y);
    }
    if (seen === 0) return undefined;
    const margin = 48;
    return {
      x: Math.round(left - margin),
      y: Math.round(top - margin),
      w: Math.round(right - left + margin * 2),
      h: Math.round(bottom - top + margin * 2),
    };
  }

  /**
   * Save a PDF, using the renderer and the PDF writer the browser already has.
   *
   * Nothing is installed and nothing is uploaded: the text stays text, the
   * strokes stay paths, and a PDF of a board is still sharp at four hundred per
   * cent. The page is sized to the CONTENT, because the sheet is much larger
   * than what is on it and printing the sheet gives a faithful PDF of mostly
   * empty paper.
   */
  savePdf(): void {
    const bounds = this.exportBounds();
    if (!bounds) return;
    // Everything outside the export is hidden for the duration of the print, so a selection
    // prints as a page of its own rather than as a crop with the neighbours showing.
    const hidden = this.hideOutside();
    const root = document.documentElement.style;
    root.setProperty('--print-w', `${Math.ceil(bounds.w)}px`);
    root.setProperty('--print-h', `${Math.ceil(bounds.h)}px`);
    root.setProperty('--print-x', `${Math.round(this.ctx.view.origin.x - bounds.x)}px`);
    root.setProperty('--print-y', `${Math.round(this.ctx.view.origin.y - bounds.y)}px`);
    const page = document.createElement('style');
    page.textContent = `@page { size: ${Math.ceil(bounds.w)}px ${Math.ceil(bounds.h)}px; margin: 0 }`;
    document.head.append(page);
    const clean = (): void => {
      page.remove();
      for (const name of ['--print-w', '--print-h', '--print-x', '--print-y']) {
        root.removeProperty(name);
      }
      for (const el of hidden) el.removeAttribute('data-gs-hidden');
    };
    window.addEventListener('afterprint', clean, { once: true });
    window.print();
    // afterprint does not fire everywhere, and leaving the print variables set
    // does nothing on screen -- but leaving the @page rule behind would change
    // the next print.
    window.setTimeout(clean, 4000);
  }

  /** Items outside the current export, marked so print and capture leave them out. */
  private hideOutside(): HTMLElement[] {
    if (this.ctx.selection.size === 0) return [];
    const out: HTMLElement[] = [];
    for (const element of this.ctx.board.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      if (this.ctx.selection.has(element.dataset.gsId ?? '')) continue;
      element.dataset.gsHidden = '1';
      out.push(element);
    }
    return out;
  }

  /**
   * The board as SVG.
   *
   * Built from the live DOM with `foreignObject`, so it is the same elements and the same
   * stylesheet rather than a second renderer's idea of them. Vector throughout: a stroke
   * stays a path and the text stays text, which is the whole point of asking for SVG rather
   * than a picture.
   */
  async saveSvg(): Promise<void> {
    const bounds = this.exportBounds();
    if (!bounds) return;
    const ids = this.ctx.selection.size > 0 ? new Set(this.ctx.selection.list()) : null;
    // XMLSerializer, not outerHTML. An SVG file is XML: `outerHTML` writes HTML void
    // elements unclosed, so the first photograph in a selection produced "mismatched tag,
    // expected </img>" and the whole file refused to parse. It also carries every element's
    // real namespace, which is what the nested paper and shadow SVGs need.
    const xml = new XMLSerializer();
    const pieces: string[] = [];
    for (const element of this.ctx.board.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      if (ids && !ids.has(element.dataset.gsId ?? '')) continue;
      pieces.push(xml.serializeToString(element));
    }

    const style = await this.portableStyles();
    const body = await this.portable(pieces.join(''));
    const ox = this.ctx.view.origin.x - bounds.x;
    const oy = this.ctx.view.origin.y - bounds.y;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.w}" height="${bounds.h}" ` +
      `viewBox="0 0 ${bounds.w} ${bounds.h}">` +
      `<foreignObject width="${bounds.w}" height="${bounds.h}">` +
      '<div xmlns="http://www.w3.org/1999/xhtml" class="on-board">' +
      // CDATA: the stylesheet is text in an XML document, and a bare & or < in it would be
      // a parse error rather than a style.
      `<style><![CDATA[${style}]]></style>` +
      `<div class="board" style="position:relative;width:${bounds.w}px;height:${bounds.h}px">` +
      `<div style="position:absolute;left:${ox}px;top:${oy}px">${body}</div>` +
      '</div></div></foreignObject></svg>';
    this.download(new Blob([svg], { type: 'image/svg+xml' }), 'svg');
  }

  /**
   * Markup that survives leaving the page.
   *
   * RELATIVE URLS POINT AT A SERVER THAT IS NOT THERE. Pictures are fetched and inlined, so
   * what comes out is one file that works anywhere.
   */
  private async portable(html: string): Promise<string> {
    let out = html;
    const sources = [...out.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1] as string);
    for (const src of new Set(sources)) {
      if (src.startsWith('data:')) continue;
      const inlined = await this.asDataUri(src);
      if (inlined) out = out.split(`src="${src}"`).join(`src="${inlined}"`);
    }
    return out;
  }

  /**
   * The stylesheet with its font files carried along.
   *
   * A vendored face is served at a relative path, so an exported file opened from disk falls
   * back to whatever the machine has -- and a document that renders in a different typeface
   * somewhere else is not much use as a record. That is the same reason nothing here is ever
   * resolved from the system font stack in the first place.
   */
  private async portableStyles(): Promise<string> {
    const style = document.querySelector('style')?.textContent ?? '';
    const faces = [...style.matchAll(/url\('(f\/[^']+)'\)/g)].map((m) => m[1] as string);
    let out = style;
    for (const face of new Set(faces)) {
      const inlined = await this.asDataUri(`/${face}`);
      if (inlined) out = out.split(`url('${face}')`).join(`url('${inlined}')`);
    }
    /*
     * An exported board is paper, not an application.
     *
     * The note's toolbar and its grips are controls: they do something when you press them,
     * and in a file that nobody can press they are six grey smudges along the top of every
     * sheet. The grip DOTS stay -- they are printed on the paper in the reference material
     * too, and they are what tells you where a note is held.
     */
    return `${out}\n${EXPORT_ONLY}`;
  }

  private async asDataUri(url: string): Promise<string | undefined> {
    try {
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const blob = await res.blob();
      return await new Promise<string>((done, fail) => {
        const reader = new FileReader();
        reader.onload = () => done(String(reader.result));
        reader.onerror = () => fail(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  }

  private download(blob: Blob, extension: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const part = this.ctx.selection.size > 0 ? '-selection' : '';
    link.download = `${this.ctx.session.spec.id}${part}.${extension}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /** Ask the server for a PNG. It has the renderer and, optionally, a browser. */
  async savePng(): Promise<void> {
    this.status('rendering');
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          board: this.ctx.session.spec.id,
          format: 'png',
          // The server re-renders from the model, so a selection travels as a list of ids
          // rather than as a rectangle -- it captures the items, not whatever happens to
          // overlap them.
          ...(this.ctx.selection.size > 0 ? { only: this.ctx.selection.list() } : {}),
        }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        this.fail(error ?? 'could not render a PNG');
        return;
      }
      this.download(await res.blob(), 'png');
    } finally {
      this.status('');
    }
  }
}
