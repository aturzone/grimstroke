/**
 * Type anything, and it becomes a card: the "/" bar on a board or a page.
 *
 * "/" opens one text box. As it is typed into, the classifier (draw/shape/classify.ts) says
 * which card the line is, the calm state machine (decide.ts) decides what to show -- nothing,
 * a faint ghost, "did you mean" between two, or the card -- and the card is drawn below the text
 * by the same renderer a placed card uses. Enter puts it on the page, in the middle of the view;
 * Tab keeps a ghost; Esc clears, and closes when empty. "/" in the empty box opens the list of
 * every kind, to choose one by hand. A placed card double-clicked comes back into the box to be
 * changed.
 *
 * A placed card's controls -- tick, vote, start, +/- -- change its `state` with an ordinary
 * patch; a running timer is kept moving here, once a second, without a patch per tick.
 */

import type { BoardContext } from '~/app/board/context.ts';
import { toast } from '~/app/chrome.ts';
import { typing } from '~/app/dom.ts';
import type { BoardItem } from '~/draw/doc/board/model.ts';
import { topZ } from '~/draw/doc/board/patch.ts';
import { classify, type ShapeResult } from '~/draw/shape/classify.ts';
import { activeIntent, decide, force, type Memory, promote, START } from '~/draw/shape/decide.ts';
import { INTENTS, iconSvg, SHAPE_INTENTS, type ShapeIntent } from '~/draw/shape/intents.ts';
import { formatClock, parseShape } from '~/draw/shape/parse.ts';
import { renderShape, type ShapeBlock, type ShapeState } from '~/draw/shape/render.ts';
import { isPersian } from '~/draw/shape/text.ts';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const PLACEHOLDERS = [
  'dinner with priya friday 8pm',
  'buy milk, eggs, bread and coffee',
  'split 2400 between 3',
  '25 min focus',
  'شام با مریم جمعه ساعت ۸ شب',
  'pizza or burgers for friday?',
  'days until christmas',
  '۵ مایل به کیلومتر',
];

export class ShapeBar {
  private readonly ctx: BoardContext;
  private root: HTMLElement | undefined;
  private input: HTMLInputElement | undefined;
  private card: HTMLElement | undefined;
  private chips: HTMLElement | undefined;
  private foot: HTMLElement | undefined;
  private palette: HTMLElement | undefined;
  private mem: Memory = START;
  private last: ShapeResult | undefined;
  private chip = 0;
  /** The placed card being changed, if the box was opened from one. */
  private editing: string | undefined;
  private placed = 0;
  private hint = 0;

  constructor(ctx: BoardContext) {
    this.ctx = ctx;
  }

  bind(): void {
    window.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (typing(event.target) || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      this.open();
    });
    for (const b of document.querySelectorAll<HTMLElement>('[data-gs="shape-open"]')) {
      b.addEventListener('click', () => this.open());
    }
    // A card's controls.
    this.ctx.viewport.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.sc-act');
      if (!button || button.disabled) return;
      const id = button.closest<HTMLElement>('[data-gs="item"]')?.dataset.gsId;
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      this.act(id, button.dataset.scAct ?? '');
    });
    window.setInterval(() => this.tick(), 1000);
  }

  // ---------------------------------------------------------------- the box

  open(text = '', editing?: string, intent?: ShapeIntent): void {
    if (this.root) {
      this.input?.focus();
      return;
    }
    this.editing = editing;
    const root = el('div', 'ss-layer');
    root.dataset.gs = 'shape';
    // The bar reads the way what is typed reads, whatever the page around it does.
    root.dir = isPersian(text) ? 'rtl' : 'ltr';
    const scrim = el('div', 'ss-scrim');
    scrim.addEventListener('pointerdown', () => this.close());
    const wrap = el('div', 'ss-wrap');
    const shell = el('div', 'ss-shell');
    const line = el('div', 'ss-line');
    const input = el('input', 'ss-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.dir = 'auto';
    input.setAttribute('aria-label', 'type anything');
    input.dataset.gs = 'shape-input';
    input.placeholder = PLACEHOLDERS[this.hint++ % PLACEHOLDERS.length] as string;
    line.append(input);
    const card = el('div', 'ss-card');
    card.setAttribute('aria-live', 'polite');
    const foot = el('div', 'ss-foot');
    shell.append(line, card, foot);
    const chips = el('div', 'ss-chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', 'did you mean');
    const help = el('p', 'ss-help');
    help.innerHTML =
      'Type a plan, a list, a colour or a sum. It becomes a card. ' +
      '<kbd class="gs-kbd">/</kbd> every kind · <kbd class="gs-kbd">Enter</kbd> put it on the page · <kbd class="gs-kbd">Esc</kbd> close';
    wrap.append(shell, chips, help);
    root.append(scrim, wrap);
    document.body.append(root);
    Object.assign(this, { root, input, card, chips, foot });
    input.addEventListener('input', () => this.update());
    input.addEventListener('keydown', (event) => this.key(event));
    input.value = text;
    this.mem = intent ? force(intent, text) : START;
    this.update(Boolean(intent));
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  close(): void {
    this.root?.remove();
    Object.assign(this, {
      root: undefined,
      input: undefined,
      card: undefined,
      chips: undefined,
      foot: undefined,
      palette: undefined,
    });
    this.mem = START;
    this.editing = undefined;
  }

  /** A placed card, back in the box to be changed. */
  edit(id: string): void {
    const block = this.ctx.items().get(id)?.block;
    if (block?.kind !== 'shape') return;
    this.close();
    this.open(block.text, id, block.intent);
  }

  private update(keepForced = false): void {
    const input = this.input;
    if (!input) return;
    const text = input.value;
    const result = classify(text, new Date());
    this.last = result;
    if (!keepForced) this.mem = decide(this.mem, result, text);
    if (this.mem.ui.kind === 'choose') this.chip = Math.min(this.chip, 1);
    this.draw();
  }

  private draw(): void {
    const { card, chips, foot, input } = this;
    if (!card || !chips || !foot || !input) return;
    const ui = this.mem.ui;
    const intent = activeIntent(ui);
    const text = input.value;
    const fa = isPersian(text);
    if (this.root) this.root.dir = fa ? 'rtl' : 'ltr';
    this.root?.classList.toggle('has-card', Boolean(intent));
    if (intent) {
      const ghost = ui.kind === 'ghost';
      card.innerHTML = renderShape(
        { kind: 'shape', intent, text, made: new Date().toISOString() },
        { interactive: false },
      );
      card.classList.toggle('is-ghost', ghost);
      const label = (fa ? INTENTS[intent].fa : INTENTS[intent].label).toLowerCase();
      foot.innerHTML = '';
      if (ghost) {
        foot.append(el('span', 'ss-keys'));
        (foot.firstChild as HTMLElement).innerHTML = fa
          ? `<kbd class="gs-kbd">Tab</kbd> برای نگه‌داشتن به‌عنوان ${label}`
          : `<kbd class="gs-kbd">Tab</kbd> to keep as ${label}`;
      } else {
        const keys = el('span', 'ss-keys');
        keys.innerHTML = `<kbd class="gs-kbd">Esc</kbd> ${fa ? (this.editing ? 'انصراف' : 'پاک کردن') : this.editing ? 'to cancel' : 'to clear'}`;
        const add = el('button', 'ss-add');
        add.type = 'button';
        add.dataset.gs = 'shape-add';
        add.innerHTML = `${fa ? (this.editing ? 'ذخیره' : 'افزودن') : this.editing ? 'Save' : 'Add'} ${label} <span aria-hidden="true">↵</span>`;
        add.addEventListener('mousedown', (e) => e.preventDefault());
        add.addEventListener('click', () => this.commit());
        foot.append(keys, add);
      }
    } else {
      card.innerHTML = '';
      foot.innerHTML = '';
    }
    chips.innerHTML = '';
    if (ui.kind === 'choose') {
      ui.options.forEach((option, i) => {
        const b = el('button', `ss-chip${i === this.chip ? ' is-on' : ''}`);
        b.type = 'button';
        const p = this.last?.intent.probabilities[option] ?? 0;
        b.innerHTML = `${iconSvg(option, 'ss-icon')}<span>${INTENTS[option].label}?</span><span class="ss-chip-bar" style="transform:scaleX(${Math.min(1, p).toFixed(2)})"></span>`;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => this.pick(option));
        chips.append(b);
      });
    }
  }

  private key(event: KeyboardEvent): void {
    const input = this.input;
    if (!input) return;
    event.stopPropagation();
    if (this.palette) return;
    const ui = this.mem.ui;
    if (event.key === '/' && input.value === '') {
      event.preventDefault();
      this.openPalette();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (ui.kind === 'choose') this.pick(ui.options[this.chip] as ShapeIntent);
      else this.commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (input.value && !this.editing) {
        input.value = '';
        this.mem = START;
        this.draw();
      } else this.close();
    } else if (event.key === 'Tab' && ui.kind === 'ghost') {
      event.preventDefault();
      this.mem = promote(this.mem);
      this.draw();
    } else if (
      ui.kind === 'choose' &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      input.selectionStart === input.value.length
    ) {
      event.preventDefault();
      this.chip = event.key === 'ArrowLeft' ? 0 : 1;
      this.draw();
    }
  }

  private pick(intent: ShapeIntent): void {
    const input = this.input;
    if (!input) return;
    if (!input.value.trim()) input.value = INTENTS[intent].example;
    this.mem = force(intent, input.value);
    this.closePalette();
    this.draw();
    input.focus();
  }

  /** Put the card on the page, or save the one being changed. */
  private commit(): void {
    const input = this.input;
    const ui = this.mem.ui;
    const intent = ui.kind === 'choose' ? ui.options[this.chip] : activeIntent(ui);
    const text = input?.value.trim() ?? '';
    if (!intent || !text) return;
    const session = this.ctx.session;
    if (this.editing) {
      const item = this.ctx.items().get(this.editing);
      const old = item?.block?.kind === 'shape' ? item.block : undefined;
      // A different kind, or different words for a list, starts its state afresh.
      const keep = old && old.intent === intent && old.text === text;
      const block: ShapeBlock = {
        kind: 'shape',
        intent,
        text,
        made: old?.made ?? new Date().toISOString(),
        ...(keep && old?.state ? { state: old.state } : {}),
      };
      session.run([{ op: 'update', id: this.editing, patch: { block } }], `shape:${this.editing}`);
      this.close();
      return;
    }
    const width = intent === 'timer' ? 400 : 360;
    const at = this.freeSpot(width, 240);
    const id = this.ctx.nextId('card');
    const item: BoardItem = {
      id,
      at,
      z: topZ(session.spec) + 1,
      size: [width],
      block: { kind: 'shape', intent, text, made: new Date().toISOString() },
    };
    session.run([{ op: 'add', item }], 'shape');
    this.ctx.selection.clear();
    this.ctx.selection.set(id, true);
    this.close();
    toast(
      isPersian(text)
        ? `${INTENTS[intent].fa} روی صفحه است · برای تغییر، دوبار کلیک کن`
        : `${INTENTS[intent].label} on the page · double-click it to change it`,
    );
  }

  /**
   * Where a new card goes: the middle of the view if it is clear, else the nearest clear place
   * around it, ring by ring -- cards made one after another sit side by side, not in a pile.
   */
  private freeSpot(w: number, h: number): [number, number] {
    const box = this.ctx.viewport.getBoundingClientRect();
    const centre = this.ctx.view.toBoard({
      x: box.left + box.width / 2,
      y: box.top + box.height * 0.42,
    });
    const taken: Array<[number, number, number, number]> = [];
    for (const node of this.ctx.board.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const a = this.ctx.view.toBoard({ x: r.left, y: r.top });
      const b = this.ctx.view.toBoard({ x: r.right, y: r.bottom });
      taken.push([a.x, a.y, b.x, b.y]);
    }
    const sheet = this.ctx.board.dataset.gsSheet?.split(',').map(Number);
    const clear = (x: number, y: number): boolean =>
      taken.every(
        ([x1, y1, x2, y2]) => x + w + 12 <= x1 || x >= x2 + 12 || y + h + 12 <= y1 || y >= y2 + 12,
      );
    const inside = (x: number, y: number): boolean =>
      !sheet ||
      sheet.length !== 2 ||
      (x >= 8 && y >= 8 && x + w <= (sheet[0] ?? 0) - 8 && y + h <= (sheet[1] ?? 0) - 8);
    const start: [number, number] = [Math.round(centre.x - w / 2), Math.round(centre.y - h / 2)];
    if (clear(...start) && inside(...start)) return start;
    for (let ring = 1; ring <= 14; ring++) {
      const d = ring * 40;
      for (let k = 0; k < ring * 8; k++) {
        const a = (k / (ring * 8)) * Math.PI * 2;
        const x = Math.round(start[0] + Math.cos(a) * d * 1.6);
        const y = Math.round(start[1] + Math.sin(a) * d);
        if (clear(x, y) && inside(x, y)) return [x, y];
      }
    }
    const step = (this.placed++ % 6) * 28;
    return [start[0] + step, start[1] + step];
  }

  // ---------------------------------------------------------------- the list of kinds

  private openPalette(): void {
    if (!this.root || this.palette) return;
    const pal = el('div', 'ss-palette');
    pal.setAttribute('role', 'dialog');
    pal.setAttribute('aria-label', 'choose a card');
    const search = el('input', 'ss-palette-search');
    search.placeholder = 'Show as…';
    search.setAttribute('aria-label', 'show as');
    search.dataset.gs = 'shape-palette-search';
    const list = el('ul', 'ss-palette-list');
    list.setAttribute('role', 'listbox');
    let active = 0;
    let shown: ShapeIntent[] = [...SHAPE_INTENTS];
    const fill = (): void => {
      const q = search.value.trim().toLowerCase();
      shown = SHAPE_INTENTS.filter((k) => {
        const d = INTENTS[k];
        return !q || `${k} ${d.label} ${d.fa} ${d.example} ${d.words}`.toLowerCase().includes(q);
      });
      active = Math.min(active, Math.max(0, shown.length - 1));
      list.replaceChildren(
        ...shown.map((k, i) => {
          const d = INTENTS[k];
          const li = el('li', `ss-option${i === active ? ' is-on' : ''}`);
          li.setAttribute('role', 'option');
          li.dataset.gs = `shape-kind-${k}`;
          li.innerHTML = `<span class="ss-option-tile">${iconSvg(k, 'ss-icon')}</span><b>${d.label}</b><span class="ss-option-example" dir="auto">${d.example}</span>`;
          li.addEventListener('mousedown', (e) => e.preventDefault());
          li.addEventListener('click', () => this.pick(k));
          return li;
        }),
      );
      if (!shown.length)
        list.append(el('li', 'ss-empty', 'No kind matches. Try “timer” or “poll”.'));
      list.querySelector('.is-on')?.scrollIntoView({ block: 'nearest' });
    };
    search.addEventListener('input', fill);
    search.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        active =
          (active + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) %
          Math.max(1, shown.length);
        fill();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const k = shown[active];
        if (k) this.pick(k);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.closePalette();
        this.input?.focus();
      }
    });
    const searchWrap = el('div', 'ss-palette-head');
    searchWrap.append(search);
    pal.append(searchWrap, list);
    this.root.querySelector('.ss-wrap')?.append(pal);
    this.palette = pal;
    fill();
    search.focus();
  }

  private closePalette(): void {
    this.palette?.remove();
    this.palette = undefined;
  }

  // ---------------------------------------------------------------- a placed card's controls

  private act(id: string, name: string): void {
    const item = this.ctx.items().get(id);
    const block = item?.block?.kind === 'shape' ? item.block : undefined;
    if (!block) return;
    const s: ShapeState = structuredClone(block.state ?? {});
    const made = block.made ? new Date(block.made) : new Date();
    const [what, arg = ''] = name.split(':');
    const toggle = (list: number[] | undefined, n: number): number[] => {
      const set = new Set(list ?? []);
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return [...set].sort((a, b) => a - b);
    };
    switch (what) {
      case 'todo':
        s.done = toggle(s.done, Number(arg));
        break;
      case 'close':
        s.closed = !s.closed;
        break;
      case 'timer':
        if (arg === 'reset') {
          s.elapsed = 0;
          s.startedAt = null;
        } else if (typeof s.startedAt === 'number') {
          s.elapsed = (s.elapsed ?? 0) + (Date.now() - s.startedAt) / 1000;
          s.startedAt = null;
        } else s.startedAt = Date.now();
        break;
      case 'day': {
        const base = s.days ?? parseShape('habit', block.text, made).days;
        s.days = toggle(base, Number(arg));
        break;
      }
      case 'habit': {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const log = new Set(s.log ?? []);
        if (log.has(today)) log.delete(today);
        else log.add(today);
        s.log = [...log].sort();
        break;
      }
      case 'people': {
        const n = s.people ?? parseShape('split', block.text, made).people ?? 2;
        s.people = Math.max(1, Math.min(99, n + (arg === '+' ? 1 : -1)));
        break;
      }
      case 'goal': {
        const g = parseShape('goal', block.text, made);
        const step = (g.target ?? 0) >= 1000 ? Math.round((g.target ?? 0) / 20) : 1;
        s.current = Math.max(
          0,
          Math.min(g.target ?? 0, (s.current ?? g.current) + (arg === '+' ? step : -step)),
        );
        break;
      }
      case 'to':
        s.to = arg;
        break;
      case 'vote': {
        const votes = [...(s.votes ?? [])];
        votes[Number(arg)] = (votes[Number(arg)] ?? 0) + 1;
        s.votes = Array.from(votes, (v) => v ?? 0);
        break;
      }
      case 'roll':
        s.result = roll(block);
        break;
      default:
        return;
    }
    this.ctx.session.run(
      [{ op: 'update', id, patch: { block: { ...block, state: s } } }],
      `shape:${id}`,
    );
  }

  /** Running timers count down on screen without a patch per second. */
  private tick(): void {
    for (const timer of this.ctx.board.querySelectorAll<HTMLElement>(
      '.sc-timer[data-sc-started]',
    )) {
      const total = Number(timer.dataset.scTotal) || 0;
      const ran =
        (Number(timer.dataset.scElapsed) || 0) +
        (Date.now() - Number(timer.dataset.scStarted)) / 1000;
      const left = total ? Math.max(0, total - ran) : ran;
      const clock = timer.querySelector('.sc-clock');
      if (clock) clock.textContent = formatClock(left);
      const bar = timer.querySelector<SVGCircleElement>('.sc-ring-bar');
      if (bar) {
        const len = Number(bar.getAttribute('stroke-dasharray')) || 0;
        const progress = total ? Math.min(1, ran / total) : (ran % 60) / 60;
        bar.setAttribute('stroke-dashoffset', (len * progress).toFixed(1));
      }
      if (total && ran >= total && !timer.dataset.scRang) {
        timer.dataset.scRang = '1';
        toast('time is up');
      }
    }
  }
}

/** A throw of the dice, a coin, a number or a pick -- chance is state, so it is kept. */
function roll(block: ShapeBlock): string {
  const d = parseShape('random', block.text, new Date());
  const fa = isPersian(block.text);
  const n = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo + 1));
  if (d.kind === 'coin') return Math.random() < 0.5 ? (fa ? 'شیر' : 'Heads') : fa ? 'خط' : 'Tails';
  if (d.kind === 'number') return String(n(d.min, d.max));
  if (d.kind === 'pick') return d.options[n(0, d.options.length - 1)] ?? '';
  const rolls = Array.from({ length: d.count }, () => n(1, d.sides));
  return rolls.length > 1
    ? `${rolls.join(' + ')} = ${rolls.reduce((a, b) => a + b, 0)}`
    : String(rolls[0]);
}
