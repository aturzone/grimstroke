/**
 * The profile page: an easel to draw yourself on, and the words that go on the card.
 *
 * Everything saves as it changes -- a stroke, a letter in a name -- the way the board does,
 * so there is no save button to forget. The card beside the easel is sent back by the server
 * after each save, drawn by the same renderer as every other card, and never built here.
 *
 * The strokes are drawn on the page while the pointer is down, which is the same one piece of
 * rendering the board app allows itself: a line that appears after a round trip is not a line
 * you drew.
 */

import { pathOf } from '~/app/board/ink.ts';
import { confirmCard, toast } from '~/app/chrome.ts';
import { must, onClick, typing } from '~/app/dom.ts';
import { letterOf } from '~/app/keys.ts';
import { detailRow } from '~/draw/chrome/detail.ts';
import {
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
  type PortraitStroke,
  type PortraitTool,
  type Profile,
} from '~/draw/material/profile/model.ts';

type Pen = PortraitTool | 'eraser';

/** Width in frame units, per pen, before the size is applied. */
const WEIGHT: Record<PortraitTool, number> = { pen: 3, pencil: 2, marker: 7, highlighter: 24 };
const KEYS: Record<string, Pen> = {
  p: 'pen',
  n: 'pencil',
  m: 'marker',
  g: 'highlighter',
  e: 'eraser',
};
const NS = 'http://www.w3.org/2000/svg';

interface Point {
  x: number;
  y: number;
}

class ProfileEditor {
  private profile: Profile;
  private pen: Pen = 'pen';
  private ink = '#14110e';
  private size = 1;
  private readonly canvas: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly layer: SVGGElement;
  private readonly past: PortraitStroke[][] = [];
  private future: PortraitStroke[][] = [];
  private drawing: { points: Point[]; path: SVGPathElement } | undefined;
  private erasing = false;
  private timer = 0;
  private pending = false;

  constructor(profile: Profile) {
    this.profile = { ...profile, portrait: { strokes: [], ...profile.portrait } };
    this.canvas = must<HTMLElement>('[data-gs="canvas"]');
    this.svg = must<SVGSVGElement>('[data-gs="canvas"] svg');
    this.layer = must<SVGGElement>('[data-gs="portrait-ink"]');
  }

  get strokes(): PortraitStroke[] {
    return this.profile.portrait?.strokes ?? [];
  }

  private set strokes(next: PortraitStroke[]) {
    this.profile = { ...this.profile, portrait: { ...this.profile.portrait, strokes: next } };
  }

  bind(): void {
    this.canvas.addEventListener('pointerdown', this.down);
    this.canvas.addEventListener('pointermove', this.move);
    this.canvas.addEventListener('pointerup', this.up);
    this.canvas.addEventListener('pointercancel', this.up);

    for (const button of document.querySelectorAll<HTMLElement>('[data-gs="pen"]')) {
      button.addEventListener('click', () => this.choose(button.dataset.gsTool as Pen));
    }
    this.pick('ink', (value) => {
      this.ink = value;
      if (this.pen === 'eraser') this.choose('pen');
    });
    this.pick('size', (value) => {
      this.size = Number(value) || 1;
    });
    this.pick('paper', (value) => {
      this.profile = { ...this.profile, portrait: { strokes: this.strokes, paper: value } };
      this.svg.querySelector<SVGRectElement>('.pt-paper')?.style.setProperty('fill', value);
      this.changed();
    });
    this.pick('accent', (value) => {
      this.profile = { ...this.profile, accent: value };
      this.changed();
    });

    onClick('undo', () => this.undo());
    onClick('redo', () => this.redo());
    onClick('clear', async () => {
      if (this.strokes.length === 0) return;
      const yes = await confirmCard({
        title: 'Start the portrait again?',
        body: 'Every stroke comes off. Undo brings them back while this page is open.',
        yes: 'start again',
      });
      if (yes) this.commit([]);
    });

    this.bindWords();
    this.bindPlaces();

    document.addEventListener('keydown', (event) => {
      if (typing(event.target)) return;
      const letter = letterOf(event);
      if ((event.metaKey || event.ctrlKey) && letter === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const pen = letter ? KEYS[letter] : undefined;
      if (pen) this.choose(pen);
    });
    // Nothing is lost by closing the tab mid-save, but it is worth a question.
    window.addEventListener('beforeunload', (event) => {
      if (this.pending) event.preventDefault();
    });
    this.buttons();
  }

  // ---------------------------------------------------------------- drawing

  private choose(pen: Pen): void {
    this.pen = pen;
    this.canvas.dataset.tool = pen;
    for (const button of document.querySelectorAll<HTMLElement>('[data-gs="pen"]')) {
      button.setAttribute('aria-pressed', String(button.dataset.gsTool === pen));
    }
  }

  /** A pointer position in the frame's own 300 x 400 units. */
  private local(event: PointerEvent): Point {
    const box = this.svg.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * PORTRAIT_WIDTH,
      y: ((event.clientY - box.top) / box.height) * PORTRAIT_HEIGHT,
    };
  }

  private readonly down = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic or already-released pointer: the stroke still works without capture.
    }
    if (this.pen === 'eraser') {
      this.erasing = true;
      this.eraseAt(event);
      return;
    }
    const path = document.createElementNS(NS, 'path');
    const tool = this.pen;
    path.setAttribute(
      'class',
      `pt-stroke tool-${tool} ${tool === 'highlighter' ? 'fill' : 'line'}`,
    );
    path.setAttribute(
      'style',
      `--stroke:${this.ink};--stroke-weight:${(WEIGHT[tool] * this.size).toFixed(1)}px`,
    );
    this.layer.append(path);
    this.svg.querySelector('.pt-empty')?.remove();
    this.drawing = { points: [this.local(event)], path };
  };

  private readonly move = (event: PointerEvent): void => {
    if (this.erasing) {
      this.eraseAt(event);
      return;
    }
    if (!this.drawing) return;
    this.drawing.points.push(this.local(event));
    this.drawing.path.setAttribute('d', this.shape(this.drawing.points));
  };

  private readonly up = (): void => {
    this.erasing = false;
    const stroke = this.drawing;
    this.drawing = undefined;
    if (!stroke) return;
    const d = this.shape(stroke.points);
    if (!d) {
      stroke.path.remove();
      return;
    }
    const tool = this.pen as PortraitTool;
    this.commit([
      ...this.strokes,
      {
        d,
        colour: this.ink,
        weight: Number((WEIGHT[tool] * this.size).toFixed(1)),
        tool,
        ...(tool === 'highlighter' ? { fill: true } : {}),
      },
    ]);
  };

  private shape(points: readonly Point[]): string {
    const band = this.pen === 'highlighter' ? WEIGHT.highlighter * this.size : undefined;
    // A dot is a stroke too: a tap leaves a mark, as a pen does.
    const pts =
      points.length === 1
        ? [points[0] as Point, { ...(points[0] as Point), x: (points[0] as Point).x + 0.5 }]
        : points;
    return pathOf(pts, band);
  }

  /** Rub out the stroke under the pointer, whichever it is in the stack. */
  private eraseAt(event: PointerEvent): void {
    const paths = [...this.layer.querySelectorAll('path')];
    for (const under of document.elementsFromPoint(event.clientX, event.clientY)) {
      const index = paths.indexOf(under as SVGPathElement);
      if (index < 0) continue;
      under.remove();
      this.commit(this.strokes.filter((_, i) => i !== index));
      return;
    }
  }

  // ---------------------------------------------------------------- history

  private commit(next: PortraitStroke[]): void {
    this.past.push(this.strokes);
    if (this.past.length > 200) this.past.shift();
    this.future = [];
    this.strokes = next;
    this.redraw();
    this.changed();
  }

  private undo(): void {
    const previous = this.past.pop();
    if (!previous) return;
    this.future.push(this.strokes);
    this.strokes = previous;
    this.redraw();
    this.changed();
  }

  private redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.strokes);
    this.strokes = next;
    this.redraw();
    this.changed();
  }

  /** The drawing, from the strokes. Only after undo, redo and erasing, never while drawing. */
  private redraw(): void {
    this.layer.replaceChildren(
      ...this.strokes.map((stroke) => {
        const path = document.createElementNS(NS, 'path');
        const tool = stroke.tool ?? 'pen';
        path.setAttribute('class', `pt-stroke tool-${tool} ${stroke.fill ? 'fill' : 'line'}`);
        path.setAttribute(
          'style',
          `--stroke:${stroke.colour ?? '#14110e'};--stroke-weight:${stroke.weight ?? 3}px`,
        );
        path.setAttribute('d', stroke.d);
        return path;
      }),
    );
    this.buttons();
  }

  private buttons(): void {
    const undo = document.querySelector<HTMLButtonElement>('[data-gs="undo"]');
    const redo = document.querySelector<HTMLButtonElement>('[data-gs="redo"]');
    if (undo) undo.disabled = this.past.length === 0;
    if (redo) redo.disabled = this.future.length === 0;
  }

  // ---------------------------------------------------------------- words

  private bindWords(): void {
    const field = (name: 'name' | 'role' | 'bio'): void => {
      const input = document.querySelector<HTMLInputElement>(`[data-gs="${name}"]`);
      input?.addEventListener('input', () => {
        this.profile = { ...this.profile, [name]: input.value };
        if (name === 'name') {
          const title = document.querySelector('[data-gs="title"]');
          if (title) title.textContent = input.value || 'me';
        }
        this.changed();
      });
    };
    field('name');
    field('role');
    field('bio');

    const rows = must<HTMLElement>('[data-gs="details"]');
    const readRows = (): void => {
      const details = [...rows.querySelectorAll<HTMLElement>('[data-gs="detail"]')].map((row) => ({
        label: row.querySelector<HTMLInputElement>('[data-gs="detail-label"]')?.value ?? '',
        value: row.querySelector<HTMLInputElement>('[data-gs="detail-value"]')?.value ?? '',
      }));
      this.profile = { ...this.profile, details };
      this.changed();
    };
    rows.addEventListener('input', readRows);
    rows.addEventListener('click', (event) => {
      const remove = (event.target as HTMLElement).closest('[data-gs="detail-remove"]');
      if (!remove) return;
      remove.closest('[data-gs="detail"]')?.remove();
      readRows();
    });
    onClick('detail-add', () => {
      const holder = document.createElement('div');
      // Built by the same function the server used for the rows already on the page.
      holder.innerHTML = detailRow('', '');
      const row = holder.firstElementChild;
      if (!row) return;
      rows.append(row);
      row.querySelector<HTMLInputElement>('input')?.focus();
    });
  }

  /** One choice among swatches or chips sharing a data-gs name. */
  private pick(name: string, chosen: (value: string) => void): void {
    const all = document.querySelectorAll<HTMLElement>(`[data-gs="${name}"]`);
    for (const button of all) {
      button.addEventListener('click', () => {
        for (const other of all) other.setAttribute('aria-pressed', String(other === button));
        chosen(button.dataset.gsValue ?? '');
      });
    }
  }

  // ---------------------------------------------------------------- saving

  private changed(): void {
    this.pending = true;
    this.status('saving');
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.save(), 450);
  }

  /** Write the profile, and show the card the server drew from it. */
  async save(): Promise<boolean> {
    window.clearTimeout(this.timer);
    if (!this.pending) return true;
    this.pending = false;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile: this.profile }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { card } = (await res.json()) as { card?: string };
      const stage = document.querySelector('[data-gs="card"]');
      // The card came from our own renderer on our own server; it is not untrusted input.
      if (stage && card) stage.innerHTML = card;
      if (!this.pending) this.status('saved');
      return true;
    } catch {
      this.pending = true;
      this.status('offline');
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => void this.save(), 3000);
      return false;
    }
  }

  private status(state: 'saved' | 'saving' | 'offline'): void {
    const element = document.querySelector<HTMLElement>('[data-gs="saved"]');
    if (!element) return;
    element.dataset.state = state;
    element.textContent = state === 'offline' ? 'offline · not saved' : state;
  }

  // ---------------------------------------------------------------- the card, elsewhere

  private bindPlaces(): void {
    onClick('profile-place', async () => {
      if (!(await this.save())) return;
      const res = await fetch('/api/profile/place', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (res.ok) window.location.href = '/';
      else toast('the card could not be put on the board', 'error');
    });
    onClick('profile-cover', async () => {
      const book = document.querySelector<HTMLSelectElement>('[data-gs="profile-book"]')?.value;
      if (!book || !(await this.save())) return;
      const res = await fetch('/api/patch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'book',
          id: book,
          ops: [{ op: 'cover', patch: { profile: this.profile } }],
        }),
      });
      if (res.ok) window.location.href = `/book?id=${encodeURIComponent(book)}`;
      else toast('the cover could not be changed', 'error');
    });
  }
}

export function bootProfile(): ProfileEditor | undefined {
  const data = document.querySelector<HTMLElement>('[data-gs="profile-data"]');
  if (!data) return undefined;
  const editor = new ProfileEditor(JSON.parse(data.textContent ?? '{}') as Profile);
  editor.bind();
  return editor;
}
