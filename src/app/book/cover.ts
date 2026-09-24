/**
 * The cover editor: the closed notebook on the desk, and a card of choices beside it.
 *
 * The cover itself is drawn by the server -- the app does not render documents -- and fetched
 * again after every change. Stickers are the one thing moved locally while a hand holds them,
 * the way a note is, and committed once when it lets go.
 *
 * Every control writes a book operation: `cover`, `sticker.add`, `sticker.update`,
 * `sticker.remove`. An agent can do all of it over /api/patch with the same vocabulary, and
 * undo does not care which of them did it.
 */

import { confirmCard } from '~/app/chrome.ts';
import type { Session } from '~/app/net.ts';
import type { BookSpec, Cover, CoverMaterial, Sticker } from '~/draw/doc/book/model.ts';
import { MATERIALS, SHAPES } from '~/draw/doc/book/model.ts';
import type { BookOp, Loose } from '~/draw/doc/book/patch.ts';
import type { Profile } from '~/draw/material/profile/model.ts';
import { markOf } from '~/draw/material/sticker/marks.ts';
import { PACKS } from '~/draw/material/sticker/packs.ts';
import { renderStickerFace } from '~/draw/material/sticker/render.ts';

/** Cover boards somebody would actually buy. */
const COLOURS = [
  '#1f3fd0',
  '#15654f',
  '#1f6f5c',
  '#c6512b',
  '#e0a21a',
  '#b3122e',
  '#2b2118',
  '#3a3f4b',
  '#6b4c9a',
  '#d9cfb8',
  '#f2e8cf',
  '#14110e',
];
const STICKER_COLOURS = ['#f7d117', '#ff2e63', '#00d5c8', '#c6ff3d', '#ffffff', '#14110e'];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function chip(label: string, pressed: boolean, onPress: () => void): HTMLButtonElement {
  const b = el('button', 'gs-btn gs-chip-btn', label);
  b.type = 'button';
  b.setAttribute('aria-pressed', String(pressed));
  b.addEventListener('click', onPress);
  return b;
}

function swatch(colour: string, pressed: boolean, onPress: () => void): HTMLButtonElement {
  const b = el('button', 'gs-cover-swatch');
  b.type = 'button';
  b.style.setProperty('--sw', colour);
  b.setAttribute('aria-label', colour);
  b.setAttribute('aria-pressed', String(pressed));
  b.addEventListener('click', onPress);
  return b;
}

export class CoverEditor {
  private readonly session: Session<BookSpec, BookOp>;
  private readonly fail: (message: string) => void;
  private root: HTMLElement | undefined;
  private stage: HTMLElement | undefined;
  private panel: HTMLElement | undefined;
  private chosen: string | undefined;
  /** The workspace's profile, for the card on the front and the portrait sticker. */
  private profile: Profile | undefined;
  private drawing = 0;

  constructor(session: Session<BookSpec, BookOp>, fail: (message: string) => void) {
    this.session = session;
    this.fail = fail;
  }

  get isOpen(): boolean {
    return this.root !== undefined;
  }

  private get cover(): Cover {
    return this.session.spec.cover ?? {};
  }

  private get stickers(): Sticker[] {
    return this.cover.stickers ?? [];
  }

  async open(): Promise<void> {
    if (this.root) return;
    const root = el('div', 'gs-cover-studio');
    root.dataset.gs = 'cover-studio';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'the cover');
    const stage = el('div', 'gs-cover-stage');
    stage.dataset.gs = 'cover-stage';
    const panel = el('div', 'gs-cover-panel gs-card');
    root.append(stage, panel);
    document.body.append(root);
    this.root = root;
    this.stage = stage;
    this.panel = panel;
    this.bindStage();
    // On the window: every change redraws the stage, and the sticker that had focus goes with it.
    window.addEventListener('keydown', this.onKey);
    try {
      const res = await fetch('/api/profile');
      this.profile = ((await res.json()) as { profile: Profile }).profile;
    } catch {
      this.profile = undefined;
    }
    await this.refresh();
  }

  private readonly onKey = (event: KeyboardEvent): void => this.key(event);

  close(): void {
    window.removeEventListener('keydown', this.onKey);
    this.root?.remove();
    this.root = undefined;
    this.stage = undefined;
    this.panel = undefined;
    this.chosen = undefined;
  }

  /** Draw the cover again from the server, and the panel from the model. */
  async refresh(): Promise<void> {
    if (!this.stage) return;
    const ask = ++this.drawing;
    try {
      const res = await fetch(`/api/cover?id=${encodeURIComponent(this.session.spec.id)}`);
      const { html } = (await res.json()) as { html: string };
      if (ask !== this.drawing || !this.stage) return;
      // Markup from our own renderer on our own server; see the board's absorb().
      this.stage.innerHTML = html;
      this.mark();
    } catch {
      this.fail('the cover could not be fetched from the workspace');
    }
    this.drawPanel();
  }

  private run(ops: BookOp[], label = ''): void {
    this.session.run(ops, label);
  }

  private setCover(patch: Loose<Cover>, label = 'cover'): void {
    this.run([{ op: 'cover', patch }], label);
  }

  // ---------------------------------------------------------------- panel

  private drawPanel(): void {
    const panel = this.panel;
    if (!panel) return;
    const cover = this.cover;
    const focused = document.activeElement as HTMLElement | null;
    const keep = focused && panel.contains(focused) ? focused.dataset.gs : undefined;
    panel.replaceChildren();

    const head = el('header', 'gs-cover-head');
    head.append(el('h2', '', 'the cover'));
    const done = el('button', 'gs-btn gs-btn-primary', 'done');
    done.type = 'button';
    done.dataset.gs = 'cover-done';
    done.addEventListener('click', () => this.close());
    head.append(done);
    panel.append(head);

    const section = (title: string, ...rows: HTMLElement[]): void => {
      const box = el('section', 'gs-cover-section');
      box.append(el('h3', 'gs-menu-head', title), ...rows);
      panel.append(box);
    };

    const title = el('textarea', 'gs-field');
    title.rows = 2;
    title.dataset.gs = 'cover-title';
    title.dir = 'auto';
    title.value = cover.title ?? this.session.spec.title ?? '';
    title.addEventListener('change', () => this.setCover({ title: title.value }, 'cover title'));
    const spine = el('input', 'gs-field');
    spine.dataset.gs = 'cover-spine';
    spine.dir = 'auto';
    spine.value = cover.spine ?? '';
    spine.placeholder = 'down the spine';
    spine.addEventListener('change', () => this.setCover({ spine: spine.value }, 'spine'));
    section('words', title, spine);

    const materials = el('div', 'gs-chip-row');
    for (const m of MATERIALS) {
      materials.append(
        chip(m, (cover.material ?? 'card') === m, () =>
          this.setCover({ material: m as CoverMaterial }, 'material'),
        ),
      );
    }
    section('made of', materials);

    const colours = el('div', 'gs-cover-swatches');
    for (const c of COLOURS) {
      colours.append(swatch(c, cover.colour === c, () => this.setCover({ colour: c }, 'colour')));
    }
    const custom = el('input', 'gs-cover-custom');
    custom.type = 'color';
    custom.value = cover.colour ?? '#1f3fd0';
    custom.setAttribute('aria-label', 'any colour');
    custom.addEventListener('change', () => this.setCover({ colour: custom.value }, 'colour'));
    colours.append(custom);
    const inks = el('div', 'gs-chip-row');
    inks.append(
      chip('title: automatic', cover.ink === undefined, () => this.setCover({ ink: null })),
      chip('light', cover.ink === '#fbf9f4', () => this.setCover({ ink: '#fbf9f4' })),
      chip('dark', cover.ink === '#14110e', () => this.setCover({ ink: '#14110e' })),
    );
    section('colour', colours, inks);

    // Your card on the front, as it is now, placed like a sticker. By value: redrawing the
    // portrait later does not change a cover that was already made -- until you ask it to.
    const whose = el('div', 'gs-chip-row');
    whose.dataset.gs = 'cover-profile';
    const card = this.stickers.find((s) => s.kind === 'card');
    if (!card) {
      const put = chip('put your card on', false, () => {
        if (!this.profile) return;
        this.chosen = 'card';
        this.setCover({ profile: this.profile }, 'your card');
      });
      put.dataset.gs = 'card-add';
      put.disabled = !this.profile?.name && !this.profile?.portrait?.strokes.length;
      whose.append(put);
      if (put.disabled)
        whose.append(el('p', 'gs-cover-hint', 'Make your card on the profile page first.'));
    } else {
      const update = chip('update to my current card', false, () => {
        if (this.profile) this.setCover({ profile: this.profile }, 'update card');
      });
      update.dataset.gs = 'card-update';
      const off = chip('take it off', false, () => {
        this.chosen = undefined;
        this.setCover({ profile: null }, 'card off');
      });
      off.dataset.gs = 'card-remove';
      whose.append(update, off);
    }
    section('whose it is', whose);

    // Stickers: add one, then work on whichever is chosen.
    const adds = el('div', 'gs-chip-row');
    const add = (sticker: Omit<Sticker, 'id' | 'at'>, label: string): void => {
      const b = chip(label, false, () => {
        const id = `sticker-${Date.now().toString(36)}`;
        const tilt = Math.round((Math.random() - 0.5) * 16);
        this.chosen = id;
        this.run(
          [{ op: 'sticker.add', sticker: { id, at: [50, 58], rotation: tilt, ...sticker } }],
          '',
        );
      });
      b.dataset.gs = `sticker-add-${label}`;
      adds.append(b);
    };
    add({ kind: 'label', text: 'label', width: 44 }, 'label');
    for (const shape of SHAPES)
      add({ kind: 'shape', shape, width: shape === 'band' || shape === 'tape' ? 46 : 22 }, shape);
    const picture = chip('picture', false, () => file.click());
    picture.dataset.gs = 'sticker-add-picture';
    adds.append(picture);
    const file = el('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', () => void this.addPicture(file));
    adds.append(file);
    if (this.profile?.portrait?.strokes.length) {
      const portrait = this.profile.portrait;
      const b = chip('your portrait', false, () => {
        const id = `sticker-${Date.now().toString(36)}`;
        this.chosen = id;
        this.run(
          [
            {
              op: 'sticker.add',
              sticker: { id, kind: 'portrait', at: [74, 30], width: 24, portrait },
            },
          ],
          '',
        );
      });
      b.dataset.gs = 'sticker-add-portrait';
      adds.append(b);
    }
    section('stick on', adds);

    // The sticker packs: stamps, symbols, the services' marks, and a dozen themes of emoji.
    const sheet = el('div', 'gs-cover-packs');
    for (const pack of PACKS) {
      sheet.append(el('p', 'gs-cover-pack-name', pack.label));
      const grid = el('div', 'gs-cover-sheet');
      for (const one of pack.items) {
        const b = el('button', 'gs-sheet-pick');
        b.type = 'button';
        b.dataset.gs = 'sticker-add-mark';
        b.setAttribute('aria-label', `${one.name} sticker`);
        b.title = one.name;
        // Drawn by the sticker renderer itself -- the same function the server uses.
        b.innerHTML = renderStickerFace({ mark: one.mark, emoji: one.emoji });
        b.addEventListener('click', () => {
          const id = `sticker-${Date.now().toString(36)}`;
          this.chosen = id;
          const stamp = one.mark ? markOf(one.mark)?.family === 'stamp' : false;
          this.run(
            [
              {
                op: 'sticker.add',
                sticker: {
                  id,
                  kind: 'mark',
                  at: [50, 60],
                  width: stamp ? 34 : 18,
                  rotation: Math.round((Math.random() - 0.5) * 16),
                  ...(one.mark ? { mark: one.mark } : { emoji: one.emoji ?? '' }),
                },
              },
            ],
            '',
          );
        });
        grid.append(b);
      }
      sheet.append(grid);
    }
    section('from the sticker sheet', sheet);

    const sticker = this.stickers.find((s) => s.id === this.chosen);
    if (sticker) panel.append(this.stickerControls(sticker));
    else
      panel.append(
        el('p', 'gs-cover-hint', 'Choose a sticker on the cover to move, turn or resize it.'),
      );

    if (keep) panel.querySelector<HTMLElement>(`[data-gs="${keep}"]`)?.focus();
  }

  private stickerControls(sticker: Sticker): HTMLElement {
    const box = el('section', 'gs-cover-section gs-cover-chosen');
    box.append(el('h3', 'gs-menu-head', 'this sticker'));
    const update = (patch: Partial<Omit<Sticker, 'id'>>, label: string): void =>
      this.run([{ op: 'sticker.update', id: sticker.id, patch }], label);

    if (sticker.kind === 'label') {
      const text = el('input', 'gs-field');
      text.dataset.gs = 'sticker-text';
      text.dir = 'auto';
      text.value = sticker.text ?? '';
      text.addEventListener('change', () => update({ text: text.value }, 'sticker text'));
      box.append(text);
    }
    if (sticker.kind === 'label' || sticker.kind === 'shape') {
      const colours = el('div', 'gs-cover-swatches');
      for (const c of STICKER_COLOURS) {
        colours.append(
          swatch(c, sticker.colour === c, () => update({ colour: c }, 'sticker colour')),
        );
      }
      box.append(colours);
    }
    // Size and turn are the grips on the sticker itself, as on the board. What is left here is
    // what has no grip: which is on top.
    const order = el('div', 'gs-chip-row');
    const all = this.stickers;
    const index = all.findIndex((s) => s.id === sticker.id);
    const forward = chip('bring forward', false, () => this.restack(sticker.id, 1));
    forward.dataset.gs = 'sticker-forward';
    forward.disabled = index === all.length - 1;
    const back = chip('send back', false, () => this.restack(sticker.id, -1));
    back.dataset.gs = 'sticker-back';
    back.disabled = index === 0;
    order.append(forward, back);
    box.append(
      order,
      el(
        'p',
        'gs-cover-hint',
        'Drag it to move it; its corners resize it and the round grip turns it. [ and ] turn it too.',
      ),
    );
    const remove = el('button', 'gs-btn gs-btn-danger', 'peel it off');
    remove.type = 'button';
    remove.dataset.gs = 'sticker-remove';
    remove.addEventListener('click', () => this.peel(sticker));
    box.append(remove);
    return box;
  }

  /** One step up or down the pile: the stickers from there up lifted and put back in order. */
  private restack(id: string, by: 1 | -1): void {
    const all = [...this.stickers];
    const from = all.findIndex((s) => s.id === id);
    const to = from + by;
    const sticker = all[from];
    if (!sticker || to < 0 || to >= all.length) return;
    all.splice(from, 1);
    all.splice(to, 0, sticker);
    const lifted = all.slice(Math.min(from, to));
    this.run(
      [
        ...lifted.map((s): BookOp => ({ op: 'sticker.remove', id: s.id })),
        ...lifted.map((s): BookOp => ({ op: 'sticker.add', sticker: s })),
      ],
      by === 1 ? 'forward' : 'back',
    );
  }

  private async peel(sticker: Sticker): Promise<void> {
    if (sticker.kind === 'picture') {
      const yes = await confirmCard({
        title: 'peel off the picture?',
        body: 'Undo brings it back. The picture itself stays in the workspace either way.',
        yes: 'peel it off',
      });
      if (!yes) return;
    }
    this.chosen = undefined;
    this.run([{ op: 'sticker.remove', id: sticker.id }], '');
  }

  private async addPicture(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const res = await fetch(`/api/assets?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': file.type },
      body: file,
    });
    if (!res.ok) {
      this.fail('that picture could not be stored');
      return;
    }
    const { path } = (await res.json()) as { path: string };
    const id = `sticker-${Date.now().toString(36)}`;
    this.chosen = id;
    this.run(
      [
        {
          op: 'sticker.add',
          sticker: { id, kind: 'picture', src: path, at: [50, 62], width: 44, rotation: -3 },
        },
      ],
      '',
    );
  }

  // ---------------------------------------------------------------- stage

  /**
   * Show which sticker is chosen, on the cover itself -- with the same grips a board item has.
   *
   * The grips are chrome laid inside the chosen sticker, so they turn with it and sit on its
   * corners whatever its angle. They were two sliders in the panel, which is not how anything
   * else in the workspace is resized or turned.
   */
  private mark(): void {
    for (const node of this.stage?.querySelectorAll<HTMLElement>('[data-gs="sticker"]') ?? []) {
      const chosen = node.dataset.gsId === this.chosen;
      node.toggleAttribute('data-chosen', chosen);
      node.tabIndex = 0;
      node.querySelector('.gs-sgrips')?.remove();
      if (!chosen) continue;
      const grips = el('span', 'gs-sgrips');
      grips.setAttribute('aria-hidden', 'true');
      for (const g of ['nw', 'ne', 'se', 'sw', 'turn']) {
        const grip = el('span', `gs-sgrip gs-sgrip-${g}`);
        grip.dataset.grip = g;
        grips.append(grip);
      }
      node.append(grips);
    }
  }

  /**
   * A grip on a sticker: a corner scales it about its middle, the round one turns it.
   *
   * Both measured from the sticker's centre, which is where a sticker is placed from, so the
   * sticker's own angle never matters: the distance and the angle to the pointer are the same
   * however it is turned.
   */
  private gripDrag(event: PointerEvent, target: HTMLElement, sticker: Sticker, grip: string): void {
    const face = this.stage?.querySelector<HTMLElement>('.cover') ?? this.stage;
    if (!face) return;
    const box = face.getBoundingClientRect();
    const c = {
      x: box.left + (sticker.at[0] / 100) * box.width,
      y: box.top + (sticker.at[1] / 100) * box.height,
    };
    const d0 = Math.hypot(event.clientX - c.x, event.clientY - c.y) || 1;
    const a0 = Math.atan2(event.clientY - c.y, event.clientX - c.x);
    const w0 = sticker.width ?? 40;
    const r0 = sticker.rotation ?? 0;
    let patch: Partial<Omit<Sticker, 'id'>> | undefined;
    const g = event.target as HTMLElement;
    try {
      g.setPointerCapture(event.pointerId);
    } catch {
      // Without capture the gesture ends if the pointer leaves the grip.
    }
    target.dataset.active = grip;
    const move = (ev: PointerEvent): void => {
      if (grip === 'turn') {
        const a = Math.atan2(ev.clientY - c.y, ev.clientX - c.x);
        let r = r0 + ((a - a0) * 180) / Math.PI;
        r = ((((r + 180) % 360) + 360) % 360) - 180;
        r = ev.shiftKey ? Math.round(r / 15) * 15 : Math.abs(r) < 2 ? 0 : Math.round(r);
        target.style.setProperty('--tilt', `${r}deg`);
        target.dataset.angle = `${r}°`;
        patch = { rotation: r };
      } else {
        const k = Math.hypot(ev.clientX - c.x, ev.clientY - c.y) / d0;
        const w = Math.round(Math.min(100, Math.max(6, w0 * k)) * 10) / 10;
        target.style.setProperty('--sticker-width', `${w}%`);
        patch = { width: w };
      }
    };
    const up = (): void => {
      g.removeEventListener('pointermove', move);
      g.removeEventListener('pointerup', up);
      g.removeEventListener('pointercancel', up);
      delete target.dataset.active;
      delete target.dataset.angle;
      if (patch)
        this.run(
          [{ op: 'sticker.update', id: sticker.id, patch }],
          grip === 'turn' ? 'turn' : 'resize',
        );
    };
    g.addEventListener('pointermove', move);
    g.addEventListener('pointerup', up);
    g.addEventListener('pointercancel', up);
  }

  /**
   * Dragging a sticker, in percent of the cover.
   *
   * Moved on screen as the hand moves and written once when it lets go -- the same bargain the
   * board strikes for a drag, for the same reason.
   */
  private bindStage(): void {
    const stage = this.stage as HTMLElement;
    stage.addEventListener('pointerdown', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-gs="sticker"]');
      if (!target) {
        this.chosen = undefined;
        this.mark();
        this.drawPanel();
        return;
      }
      event.preventDefault();
      const id = target.dataset.gsId ?? '';
      const sticker = this.stickers.find((s) => s.id === id);
      if (!sticker) return;
      const grip = (event.target as HTMLElement).closest<HTMLElement>('.gs-sgrip')?.dataset.grip;
      if (grip && this.chosen === id) {
        this.gripDrag(event, target, sticker, grip);
        return;
      }
      if (this.chosen !== id) {
        this.chosen = id;
        this.mark();
        this.drawPanel();
      }
      const face = stage.querySelector<HTMLElement>('.cover') ?? stage;
      const box = face.getBoundingClientRect();
      const start = { x: event.clientX, y: event.clientY };
      let at: [number, number] = [...sticker.at];
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Without capture the drag ends if the pointer leaves the sticker.
      }
      const move = (ev: PointerEvent): void => {
        const x = sticker.at[0] + ((ev.clientX - start.x) / box.width) * 100;
        const y = sticker.at[1] + ((ev.clientY - start.y) / box.height) * 100;
        at = [
          Math.round(Math.min(100, Math.max(0, x)) * 10) / 10,
          Math.round(Math.min(100, Math.max(0, y)) * 10) / 10,
        ];
        target.style.left = `${at[0]}%`;
        target.style.top = `${at[1]}%`;
      };
      const up = (): void => {
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
        if (at[0] !== sticker.at[0] || at[1] !== sticker.at[1]) {
          this.run([{ op: 'sticker.update', id, patch: { at } }], '');
        }
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
    });
  }

  private key(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      return;
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    // Undo works in here too: the book's own keys stand aside while the editor is open.
    if ((event.metaKey || event.ctrlKey) && event.code === 'KeyZ') {
      event.preventDefault();
      if (event.shiftKey) this.session.redo();
      else this.session.undo();
      return;
    }
    const sticker = this.stickers.find((s) => s.id === this.chosen);
    if (!sticker) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      void this.peel(sticker);
      return;
    }
    if (event.code === 'BracketLeft' || event.code === 'BracketRight') {
      event.preventDefault();
      const step = (event.altKey ? 1 : 15) * (event.code === 'BracketLeft' ? -1 : 1);
      const rotation = Math.round((sticker.rotation ?? 0) + step);
      this.run([{ op: 'sticker.update', id: sticker.id, patch: { rotation } }], 'turn');
      return;
    }
    if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault();
      const width = Math.min(
        100,
        Math.max(6, (sticker.width ?? 40) * (event.key === '-' ? 0.9 : 1.1)),
      );
      this.run(
        [{ op: 'sticker.update', id: sticker.id, patch: { width: Math.round(width * 10) / 10 } }],
        'resize',
      );
      return;
    }
    const step = event.shiftKey ? 5 : 0.5;
    const nudge: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = nudge[event.key];
    if (d) {
      event.preventDefault();
      const at: [number, number] = [sticker.at[0] + d[0], sticker.at[1] + d[1]];
      this.run([{ op: 'sticker.update', id: sticker.id, patch: { at } }], `nudge:${sticker.id}`);
    }
  }
}
