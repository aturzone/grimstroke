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

import { mapPath } from '~/app/board/handles.ts';
import { pathOf } from '~/app/board/ink.ts';
import { confirmCard, toast } from '~/app/chrome.ts';
import { go, must, onClick, typing } from '~/app/dom.ts';
import { letterOf } from '~/app/keys.ts';
import { detailRow } from '~/draw/chrome/detail.ts';
import {
  COATS,
  coatOf,
  colourOf,
  PET_H,
  PET_W,
  type PetPose,
  petFrame,
} from '~/draw/material/pet/art.ts';
import {
  DEFAULT_PET,
  type Pet,
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
  /** New strokes go on the sketch layer. */
  private sketching = false;
  /** Every stroke is drawn on both sides of the centre line too. */
  private mirror = false;
  /** A photo laid under the paper to trace. Held in memory only; it is never saved. */
  private photo: string | undefined;
  private readonly sketchLayer: SVGGElement | null;
  private erasing = false;
  private timer = 0;
  private pending = false;

  constructor(profile: Profile) {
    this.profile = { ...profile, portrait: { strokes: [], ...profile.portrait } };
    this.canvas = must<HTMLElement>('[data-gs="canvas"]');
    this.svg = must<SVGSVGElement>('[data-gs="canvas"] svg');
    this.layer = must<SVGGElement>('[data-gs="portrait-ink"]');
    this.sketchLayer = document.querySelector<SVGGElement>('[data-gs="portrait-sketch"]');
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
    this.bindHelpers();
    this.bindPet();
    void this.bindCorners();
    this.redraw();

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
      if (letter === 's') {
        this.setSketching(!this.sketching);
        return;
      }
      if (letter === 'y') {
        this.setMirror(!this.mirror);
        return;
      }
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
    (this.sketching ? (this.sketchLayer ?? this.layer) : this.layer).append(path);
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
    const made: PortraitStroke = {
      d,
      colour: this.ink,
      weight: Number((WEIGHT[tool] * this.size).toFixed(1)),
      tool,
      ...(tool === 'highlighter' ? { fill: true } : {}),
      ...(this.sketching ? { sketch: true } : {}),
    };
    // Mirrored about the centre of the frame: the other half of a face, drawn with this one.
    const twin: PortraitStroke[] = this.mirror
      ? [{ ...made, d: mapPath(d, (x, y) => [PORTRAIT_WIDTH - x, y]) }]
      : [];
    this.commit([...this.strokes, made, ...twin]);
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

  /** Rub out the stroke under the pointer, whichever it is in the stack -- sketch or drawing. */
  private eraseAt(event: PointerEvent): void {
    for (const under of document.elementsFromPoint(event.clientX, event.clientY)) {
      const index = Number((under as SVGElement).dataset?.i);
      if (!(under instanceof SVGPathElement) || Number.isNaN(index)) continue;
      // A hidden sketch cannot be rubbed out by accident.
      if (under.closest('.pt-sketch') && this.canvas.hasAttribute('data-hide-sketch')) continue;
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

  /**
   * The drawing, from the strokes. Only after a stroke is made, undo, redo and erasing -- never
   * while drawing. Each path knows which stroke it is, so the eraser takes the right one.
   */
  private redraw(): void {
    const ink: SVGPathElement[] = [];
    const sketch: SVGPathElement[] = [];
    this.strokes.forEach((stroke, i) => {
      const path = document.createElementNS(NS, 'path');
      const tool = stroke.tool ?? 'pen';
      path.setAttribute('class', `pt-stroke tool-${tool} ${stroke.fill ? 'fill' : 'line'}`);
      path.setAttribute(
        'style',
        `--stroke:${stroke.colour ?? '#14110e'};--stroke-weight:${stroke.weight ?? 3}px`,
      );
      path.setAttribute('d', stroke.d);
      path.dataset.i = String(i);
      (stroke.sketch && this.sketchLayer ? sketch : ink).push(path);
    });
    this.layer.replaceChildren(...ink);
    this.sketchLayer?.replaceChildren(...sketch);
    this.buttons();
  }

  // ---------------------------------------------------------------- helpers

  private setSketching(on: boolean): void {
    this.sketching = on;
    this.canvas.toggleAttribute('data-sketching', on);
    document.querySelector('[data-gs="sketch-mode"]')?.setAttribute('aria-pressed', String(on));
    if (on) this.showSketch(true);
  }

  private showSketch(on: boolean): void {
    this.canvas.toggleAttribute('data-hide-sketch', !on);
    document.querySelector('[data-gs="sketch-show"]')?.setAttribute('aria-pressed', String(on));
  }

  private setMirror(on: boolean): void {
    this.mirror = on;
    this.canvas.toggleAttribute('data-mirror', on);
    document.querySelector('[data-gs="mirror"]')?.setAttribute('aria-pressed', String(on));
  }

  private bindHelpers(): void {
    onClick('sketch-mode', () => this.setSketching(!this.sketching));
    onClick('sketch-show', () => this.showSketch(this.canvas.hasAttribute('data-hide-sketch')));
    onClick('sketch-clear', () => {
      if (this.strokes.some((s) => s.sketch)) this.commit(this.strokes.filter((s) => !s.sketch));
    });
    onClick('mirror', () => this.setMirror(!this.mirror));
    const file = document.querySelector<HTMLInputElement>('[data-gs="trace-file"]');
    const controls = document.querySelector<HTMLElement>('[data-gs="trace-controls"]');
    const remove = document.querySelector<HTMLElement>('[data-gs="trace-remove"]');
    const fade = document.querySelector<HTMLInputElement>('[data-gs="trace-opacity"]');
    onClick('trace', () => file?.click());
    file?.addEventListener('change', () => {
      const picked = file.files?.[0];
      file.value = '';
      if (!picked) return;
      this.dropPhoto();
      this.photo = URL.createObjectURL(picked);
      const image = document.createElementNS(NS, 'image');
      image.setAttribute('class', 'pt-trace');
      image.setAttribute('href', this.photo);
      image.setAttribute('width', String(PORTRAIT_WIDTH));
      image.setAttribute('height', String(PORTRAIT_HEIGHT));
      image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      image.style.opacity = String(Number(fade?.value ?? 35) / 100);
      // Over the paper, under every line.
      this.svg.querySelector('.pt-paper')?.after(image);
      if (controls) controls.hidden = false;
      if (remove) remove.hidden = false;
      toast('The photo is only on this screen, for tracing. It is not saved or sent anywhere.');
    });
    fade?.addEventListener('input', () => {
      const image = this.svg.querySelector<SVGImageElement>('.pt-trace');
      if (image) image.style.opacity = String(Number(fade.value) / 100);
    });
    remove?.addEventListener('click', () => {
      this.dropPhoto();
      if (controls) controls.hidden = true;
      remove.hidden = true;
    });
  }

  private dropPhoto(): void {
    this.svg.querySelector('.pt-trace')?.remove();
    if (this.photo) URL.revokeObjectURL(this.photo);
    this.photo = undefined;
  }

  private buttons(): void {
    const undo = document.querySelector<HTMLButtonElement>('[data-gs="undo"]');
    const redo = document.querySelector<HTMLButtonElement>('[data-gs="redo"]');
    if (undo) undo.disabled = this.past.length === 0;
    if (redo) redo.disabled = this.future.length === 0;
  }

  // ---------------------------------------------------------------- the pet

  /** Draw one pose of a pet into a canvas, from the same sprites the bookcase uses. */
  private static drawPet(canvas: HTMLCanvasElement, pet: Pet, pose: PetPose, n = 0): void {
    const c = canvas.getContext('2d');
    if (!c) return;
    const coat = coatOf(pet.coat, pet.species);
    const g = petFrame(pet.species, coat, pose, n);
    c.clearRect(0, 0, canvas.width, canvas.height);
    // Centred on its ground: the canvas is a little larger than the pet's grid.
    const ox = Math.floor((canvas.width - PET_W) / 2);
    const oy = canvas.height - PET_H;
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < (g[y]?.length ?? 0); x++) {
        const colour = colourOf(coat, g[y]?.[x] ?? '.');
        if (!colour) continue;
        c.fillStyle = colour;
        c.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  /** The workspace's corners: shown live as the slider moves, saved when it settles. */
  private async bindCorners(): Promise<void> {
    const range = document.querySelector<HTMLInputElement>('[data-gs="corners"]');
    const out = document.querySelector<HTMLOutputElement>('[data-gs="corners-value"]');
    if (!range) return;
    try {
      const { look } = (await (await fetch('/api/look')).json()) as { look: { corners: number } };
      range.value = String(Math.round(look.corners * 100));
    } catch {
      // Unreadable: the slider stays at as designed.
    }
    let wait = 0;
    const show = (save: boolean): void => {
      const corners = Number(range.value) / 100;
      document.documentElement.style.setProperty('--gs-round', String(corners));
      if (out) out.value = `${range.value}%`;
      for (const b of document.querySelectorAll<HTMLElement>('[data-gs="corners-stop"]')) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.gsValue) === corners));
      }
      if (!save) return;
      window.clearTimeout(wait);
      wait = window.setTimeout(() => {
        void fetch('/api/look', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ corners }),
        });
      }, 250);
    };
    range.addEventListener('input', () => show(true));
    for (const b of document.querySelectorAll<HTMLElement>('[data-gs="corners-stop"]')) {
      b.addEventListener('click', () => {
        range.value = String(Math.round(Number(b.dataset.gsValue) * 100));
        show(true);
      });
    }
    show(false);
  }

  private bindPet(): void {
    const preview = document.querySelector<HTMLCanvasElement>('[data-gs="pet-preview"]');
    if (!preview) return;
    const pet = (): Pet => this.profile.pet ?? { ...DEFAULT_PET };
    for (const b of document.querySelectorAll<HTMLElement>('[data-gs="pet-coat"]')) {
      const canvas = b.querySelector('canvas');
      if (canvas)
        ProfileEditor.drawPet(
          canvas,
          { species: b.dataset.species === 'dog' ? 'dog' : 'cat', coat: b.dataset.gsValue ?? '' },
          'sit',
        );
    }
    // The preview: sitting, blinking now and then, happy when you point at it.
    let frame = 0;
    let hover = false;
    preview.addEventListener('pointerenter', () => (hover = true));
    preview.addEventListener('pointerleave', () => (hover = false));
    const loop = (): void => {
      frame += 1;
      const pose: PetPose = hover
        ? 'happy'
        : frame % 12 === 0
          ? 'blink'
          : frame % 17 === 0
            ? 'flick'
            : 'sit';
      ProfileEditor.drawPet(preview, pet(), pose, pose === 'blink' ? 1 : frame);
      window.setTimeout(loop, hover ? 330 : 420);
    };
    loop();
    const write = (patch: Partial<Pet>): void => {
      this.profile = { ...this.profile, pet: { ...pet(), ...patch } };
      ProfileEditor.drawPet(preview, pet(), 'happy');
      this.changed();
    };
    for (const b of document.querySelectorAll<HTMLElement>('[data-gs="pet-species"]')) {
      b.addEventListener('click', () => {
        const species = b.dataset.gsValue === 'dog' ? 'dog' : 'cat';
        for (const o of document.querySelectorAll<HTMLElement>('[data-gs="pet-species"]'))
          o.setAttribute('aria-pressed', String(o === b));
        for (const c of document.querySelectorAll<HTMLElement>('[data-gs="pet-coat"]'))
          c.hidden = c.dataset.species !== species;
        const first = COATS.find((c) => c.species === species);
        const coat = pet().species === species ? pet().coat : (first?.id ?? 'ginger');
        for (const c of document.querySelectorAll<HTMLElement>('[data-gs="pet-coat"]'))
          c.setAttribute(
            'aria-pressed',
            String(c.dataset.gsValue === coat && c.dataset.species === species),
          );
        write({ species, coat });
      });
    }
    for (const b of document.querySelectorAll<HTMLElement>('[data-gs="pet-coat"]')) {
      b.addEventListener('click', () => {
        for (const o of document.querySelectorAll<HTMLElement>('[data-gs="pet-coat"]'))
          o.setAttribute('aria-pressed', String(o === b));
        write({ coat: b.dataset.gsValue ?? 'ginger' });
      });
    }
    document
      .querySelector<HTMLInputElement>('[data-gs="pet-name"]')
      ?.addEventListener('input', (e) => {
        write({ name: (e.target as HTMLInputElement).value });
      });
    document
      .querySelector<HTMLInputElement>('[data-gs="pet-on"]')
      ?.addEventListener('change', (e) => {
        write({ on: (e.target as HTMLInputElement).checked });
      });
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
      if (res.ok) go('/');
      else toast('the card could not be put on the board', 'error');
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
