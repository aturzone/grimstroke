/**
 * A note's own settings.
 *
 * The panel from chevaletNote, brought across: name, paper, type, material. Every control
 * writes a SPARSE override onto the note, so a field nobody touched keeps following the
 * default and changing the default still moves it. A field that has been overridden is
 * marked, and the mark is a button that puts it back.
 *
 * Plain DOM, built once and thrown away on close. It is a form, not a hot path, and it lives
 * in the same bundle as everything else -- which has to stay dependency-free, because the
 * whole product is a URL.
 */

import { PALETTES } from '~/draw/look/palette.ts';
import {
  DEFAULT_NOTE_STYLE,
  type NoteStyle,
  paletteById,
  resolveNoteStyle,
} from '~/draw/material/note/model.ts';

type Field = keyof NoteStyle;

export interface SettingsHost {
  /** The note's own sparse overrides. */
  overrides(): Partial<NoteStyle>;
  /** The note's name, or '' if it has none. */
  name(): string;
  rename(next: string): void;
  /** Apply overrides, and drop the ones named in `clear` in the same patch. */
  change(patch: Partial<NoteStyle>, clear?: readonly Field[]): void;
  /** Drop one override so the field follows the default again. */
  reset(key: Field): void;
  close(): void;
}

export class NoteSettings {
  readonly el: HTMLDivElement;
  private readonly host: SettingsHost;
  private readonly marks = new Map<Field, HTMLButtonElement>();

  constructor(host: SettingsHost) {
    this.host = host;
    this.el = document.createElement('div');
    this.el.className = 'gs-settings';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Note settings');
    this.build();
    this.el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') host.close();
    });
  }

  /** Park the panel beside the note, and never off the screen. */
  placeBy(anchor: HTMLElement): void {
    const box = anchor.getBoundingClientRect();
    const panel = this.el.getBoundingClientRect();
    const gap = 12;
    // Prefer the right of the note, fall back to the left, then clamp -- a panel that opens
    // half off the viewport is a panel with unreachable controls.
    let left = box.right + gap;
    if (left + panel.width > window.innerWidth - 8) left = box.left - panel.width - gap;
    this.el.style.left = `${Math.max(8, Math.min(left, window.innerWidth - panel.width - 8))}px`;
    this.el.style.top = `${Math.max(8, Math.min(box.top, window.innerHeight - panel.height - 8))}px`;
  }

  refresh(): void {
    const overrides = this.host.overrides();
    for (const [key, mark] of this.marks) {
      const custom = overrides[key] !== undefined;
      mark.hidden = !custom;
      mark.title = 'Custom. Click to follow the default again.';
    }
  }

  private get style(): NoteStyle {
    return resolveNoteStyle(this.host.overrides());
  }

  // ---------------------------------------------------------------- build

  private build(): void {
    const s = this.style;
    this.el.append(
      this.head(),
      // The name first: it is the one field here that is about WHAT the note is rather than
      // how it looks, and nobody should read past eight colour controls to find the box.
      this.section('Name', [this.nameRow()]),
      this.section('Paper', [
        this.swatches(),
        this.colour('paper', 'Paper', s.paper ?? paletteById(s.palette).paper),
        this.colour('ink', 'Ink', s.ink ?? paletteById(s.palette).ink),
        this.colour('accent', 'Accent', s.accent ?? paletteById(s.palette).accent),
      ]),
      this.section('Type', [
        this.range('fontSize', 'Size', 11, 28, 1, s.fontSize, (v) => `${v}px`),
        this.range('lineHeight', 'Line height', 1.1, 2.2, 0.05, s.lineHeight, (v) => v.toFixed(2)),
        this.select(
          'dir',
          'Direction',
          [
            ['auto', 'Automatic'],
            ['ltr', 'Left to right'],
            ['rtl', 'Right to left'],
          ],
          s.dir,
        ),
        this.select(
          'align',
          'Align',
          [
            ['start', 'Start'],
            ['center', 'Centre'],
            ['end', 'End'],
          ],
          s.align,
        ),
      ]),
      this.section('Material', [
        this.range(
          'opacity',
          'Opacity',
          0.25,
          1,
          0.05,
          s.opacity,
          (v) => `${Math.round(v * 100)}%`,
        ),
        this.range('tornEdges', 'Torn edge', 0, 6, 0.2, s.tornEdges, (v) => v.toFixed(1)),
        this.range('grain', 'Grain', 0, 0.6, 0.02, s.grain, (v) => v.toFixed(2)),
        this.select(
          'tape',
          'Tape',
          [
            ['none', 'None'],
            ['one', 'One corner'],
            ['two', 'Two corners'],
          ],
          s.tape,
        ),
        this.select(
          'shadow',
          'Shadow',
          [
            ['hard', 'Hard'],
            ['soft', 'Soft'],
            ['none', 'None'],
          ],
          s.shadow,
        ),
        this.select(
          'physics',
          'Motion',
          [
            ['full', 'Full'],
            ['reduced', 'Reduced'],
            ['off', 'Off'],
          ],
          s.physics,
        ),
      ]),
    );
    this.refresh();
  }

  private head(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'gs-set-head';
    const title = document.createElement('span');
    title.textContent = 'Note';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'gs-set-close';
    close.textContent = '×';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => this.host.close());
    bar.append(title, close);
    return bar;
  }

  private section(label: string, rows: HTMLElement[]): HTMLElement {
    const box = document.createElement('section');
    box.className = 'gs-set-section';
    const head = document.createElement('h3');
    head.textContent = label;
    box.append(head, ...rows);
    return box;
  }

  /** The little dot that says "this note has its own opinion about this field". */
  private mark(key: Field): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gs-set-mark';
    button.hidden = true;
    button.textContent = '●';
    button.setAttribute('aria-label', `Reset ${key}`);
    button.addEventListener('click', () => {
      this.host.reset(key);
      this.refresh();
    });
    this.marks.set(key, button);
    return button;
  }

  private row(key: Field, label: string, control: HTMLElement, value?: HTMLElement): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'gs-set-row';
    const name = document.createElement('span');
    name.className = 'gs-set-label';
    name.textContent = label;
    name.append(this.mark(key));
    wrap.append(name, control);
    if (value) wrap.append(value);
    return wrap;
  }

  private nameRow(): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'gs-set-row';
    const label = document.createElement('span');
    label.className = 'gs-set-label';
    label.textContent = 'Name';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'gs-set-text';
    input.maxLength = 120;
    input.value = this.host.name();
    input.placeholder = 'Untitled';
    input.autocomplete = 'off';
    input.spellcheck = false;
    // Written on change, not on every keystroke: a name is saved when it is finished rather
    // than eleven times while it is typed.
    input.addEventListener('change', () => this.host.rename(input.value));
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        this.host.rename(input.value);
        input.blur();
      }
    });
    wrap.append(label, input);
    return wrap;
  }

  private swatches(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'gs-set-row gs-set-swatches';
    for (const p of PALETTES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gs-set-swatch';
      button.title = p.label;
      button.setAttribute('aria-label', p.label);
      button.style.background = p.paper;
      button.style.borderColor = p.ink;
      button.addEventListener('click', () => {
        // Choosing a palette clears the three custom colours, or the swatch appears to do
        // nothing: a note with a custom paper would keep it and only the accent would move.
        this.host.change({ palette: p.id }, ['paper', 'ink', 'accent']);
        this.refresh();
      });
      wrap.append(button);
    }
    return wrap;
  }

  private colour(key: 'paper' | 'ink' | 'accent', label: string, value: string): HTMLElement {
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'gs-set-colour';
    input.value = value;
    input.addEventListener('input', () => {
      this.host.change({ [key]: input.value });
      this.refresh();
    });
    return this.row(key, label, input);
  }

  private range(
    key: Field,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    format: (v: number) => string,
  ): HTMLElement {
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'gs-set-range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const read = document.createElement('output');
    read.className = 'gs-set-value';
    read.textContent = format(value);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      read.textContent = format(v);
      this.host.change({ [key]: v } as Partial<NoteStyle>);
      this.refresh();
    });
    return this.row(key, label, input, read);
  }

  private select(
    key: Field,
    label: string,
    options: ReadonlyArray<readonly [string, string]>,
    value: string,
  ): HTMLElement {
    const select = document.createElement('select');
    select.className = 'gs-set-select';
    for (const [id, text] of options) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = text;
      if (id === value) option.selected = true;
      select.append(option);
    }
    select.addEventListener('change', () => {
      this.host.change({ [key]: select.value } as Partial<NoteStyle>);
      this.refresh();
    });
    return this.row(key, label, select);
  }
}

export { DEFAULT_NOTE_STYLE };
