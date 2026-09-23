/**
 * Building a board.
 *
 * Two ways in, on purpose, and for the same reason the page has two: a fluent
 * builder for anything that can call an API, and a plain object for anything
 * that can only write JSON and run a command -- which is a real constraint when
 * the caller is an agent you do not control.
 *
 * Placement is explicit. There is no flow and no layout engine: an item is
 * where you put it. That is what makes a board a board, and it is also what
 * makes it trivial for an agent to reposition one thing without disturbing
 * anything else.
 */

import type { BoardItem, BoardSpec, Ink } from '~/draw/doc/board/model.ts';
import { renderBoard } from '~/draw/doc/board/render.ts';
import type { RenderedPage } from '~/draw/doc/model.ts';
import type { Block, ImageSource, LabelTone, NoteInk } from '~/draw/material/model.ts';
import type { NoteStyle } from '~/draw/material/note/model.ts';

export interface Placement {
  at: [number, number];
  size?: [number, number?];
  rotation?: number;
  z?: number;
  group?: string;
  locked?: boolean;
}

export class Board {
  readonly spec: BoardSpec;
  private counter = 0;

  constructor(spec: Partial<BoardSpec> & { id: string }) {
    this.spec = { items: [], ...spec };
  }

  /** Ids are stable across a build, so a seeded mark does not move. */
  private id(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  add(item: BoardItem): this {
    this.spec.items.push(item);
    return this;
  }

  /** Any block, anywhere. */
  place(block: Block, where: Placement, id?: string): this {
    return this.add({ id: id ?? this.id(block.kind), block, ...where });
  }

  note(
    text: string,
    where: Placement,
    options: {
      title?: string;
      palette?: string;
      style?: Partial<NoteStyle>;
      collapsed?: boolean;
      ink?: NoteInk[];
    } = {},
  ): this {
    return this.place({ kind: 'note', text, ...options }, where);
  }

  text(text: string, where: Placement, options: { hand?: boolean; colour?: string } = {}): this {
    return this.place({ kind: 'text', text, ...options }, where);
  }

  heading(
    text: string,
    where: Placement,
    options: { level?: 1 | 2; hand?: boolean; colour?: string } = {},
  ): this {
    const { level = 1, ...rest } = options;
    return this.place({ kind: 'heading', text, level, ...rest }, where);
  }

  label(
    text: string,
    where: Placement,
    options: { tone?: LabelTone; hand?: boolean; colour?: string } = {},
  ): this {
    return this.place({ kind: 'label', text, ...options }, where);
  }

  image(src: string, where: Placement, options: Omit<ImageSource, 'src'> = {}): this {
    return this.place({ kind: 'image', image: { src, ...options } }, where);
  }

  /** A stroke, in board units relative to its own position. */
  ink(ink: Ink, where: Placement, id?: string): this {
    return this.add({ id: id ?? this.id('ink'), ink, ...where });
  }

  get items(): BoardItem[] {
    return this.spec.items;
  }

  render(): RenderedPage {
    return renderBoard(this.spec);
  }

  toJSON(): BoardSpec {
    return this.spec;
  }

  static from(spec: BoardSpec): Board {
    const made = new Board({ ...spec, items: [] });
    made.spec.items = [...spec.items];
    return made;
  }
}

export function board(id: string, options: Omit<Partial<BoardSpec>, 'id' | 'items'> = {}): Board {
  return new Board({ id, ...options });
}
