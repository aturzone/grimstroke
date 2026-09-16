/**
 * The notebook and its pages.
 *
 * Two ways in, on purpose. A fluent builder for code that is being written by
 * hand or by a model that can call an API, and a plain object for anything that
 * can only write JSON and run a command -- which is a real constraint when the
 * caller is an agent you do not control.
 */

import { renderPage } from '~/render/document.ts';
import type {
  Block,
  Chip,
  Direction,
  ImageSource,
  Mark,
  NotebookSpec,
  PageSpec,
  RenderedPage,
  ZoomSpec,
} from '~/types.ts';

export class Page {
  readonly spec: PageSpec;

  constructor(spec: PageSpec) {
    this.spec = { ...spec, blocks: [...spec.blocks] };
  }

  static create(id: string, options: Omit<Partial<PageSpec>, 'id' | 'blocks'> = {}): Page {
    return new Page({ id, blocks: [], ...options });
  }

  // -- header ----------------------------------------------------------
  title(text: string): this {
    this.spec.title = text;
    return this;
  }

  chip(text: string, colour?: string): this {
    const entry: Chip = colour === undefined ? { text } : { text, colour };
    this.spec.chips = [...(this.spec.chips ?? []), entry];
    return this;
  }

  /** Segments, not a joined string, so the separator can mirror. */
  trail(...segments: string[]): this {
    this.spec.trail = segments;
    return this;
  }

  // -- blocks ----------------------------------------------------------
  add(block: Block): this {
    this.spec.blocks.push(block);
    return this;
  }

  heading(text: string, level: 1 | 2 = 1): this {
    return this.add({ kind: 'heading', text, level });
  }

  text(text: string): this {
    return this.add({ kind: 'text', text });
  }

  bullets(...items: string[]): this {
    return this.add({ kind: 'bullets', items });
  }

  table(rows: string[][], head = true): this {
    return this.add({ kind: 'table', rows, head });
  }

  /** Verbatim. Never reflowed, never digit-shaped: a log excerpt is evidence. */
  code(text: string, label?: string): this {
    return this.add(label === undefined ? { kind: 'code', text } : { kind: 'code', text, label });
  }

  quote(text: string, cite?: string): this {
    return this.add(cite === undefined ? { kind: 'quote', text } : { kind: 'quote', text, cite });
  }

  image(src: string, options: Omit<ImageSource, 'src'> & { zoom?: ZoomSpec } = {}): this {
    const { zoom, ...image } = options;
    return this.add(
      zoom === undefined
        ? { kind: 'image', image: { src, ...image } }
        : { kind: 'image', image: { src, ...image }, zoom },
    );
  }

  /** Two or more images side by side. The first is the reference. */
  compare(images: ImageSource[], syncMarks = true): this {
    return this.add({ kind: 'compare', images, syncMarks });
  }

  /** A sticky note: an aside in its own palette, stuck onto the page. */
  note(text: string, options: { title?: string; palette?: string } = {}): this {
    return this.add({ kind: 'note', text, ...options });
  }

  divider(): this {
    return this.add({ kind: 'divider' });
  }

  spacer(size?: number): this {
    return this.add(size === undefined ? { kind: 'spacer' } : { kind: 'spacer', size });
  }

  // -- output ----------------------------------------------------------
  render(): RenderedPage {
    return renderPage(this.spec);
  }

  toJSON(): PageSpec {
    return this.spec;
  }
}

export class Notebook {
  readonly spec: NotebookSpec;

  constructor(spec: Partial<NotebookSpec> = {}) {
    this.spec = { pages: [], ...spec };
  }

  /** Defaults flow down to every page that does not override them. */
  page(id: string, options: Omit<Partial<PageSpec>, 'id' | 'blocks'> = {}): Page {
    const page = Page.create(id, {
      ...(this.spec.palette === undefined ? {} : { palette: this.spec.palette }),
      ...(this.spec.direction === undefined ? {} : { direction: this.spec.direction }),
      ...options,
    });
    this.spec.pages.push(page.spec);
    return page;
  }

  get pages(): PageSpec[] {
    return this.spec.pages;
  }

  render(): RenderedPage[] {
    return this.spec.pages.map((page) => renderPage(page));
  }

  toJSON(): NotebookSpec {
    return this.spec;
  }

  static from(spec: NotebookSpec): Notebook {
    const book = new Notebook({
      ...(spec.title === undefined ? {} : { title: spec.title }),
      ...(spec.palette === undefined ? {} : { palette: spec.palette }),
      ...(spec.direction === undefined ? {} : { direction: spec.direction }),
    });
    book.spec.pages = [...spec.pages];
    return book;
  }
}

export function notebook(options: Partial<NotebookSpec> = {}): Notebook {
  return new Notebook(options);
}

export function page(id: string, options: Omit<Partial<PageSpec>, 'id' | 'blocks'> = {}): Page {
  return Page.create(id, options);
}

export type { Block, Chip, Direction, ImageSource, Mark, NotebookSpec, PageSpec, ZoomSpec };
