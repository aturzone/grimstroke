/**
 * Type anything, and it becomes a card: the "/" bar, wherever cards can go -- a board, a page,
 * and a notebook's spread. Where a card goes and how a change is kept is the host's (ShapeHost);
 * everything a person sees and presses is here, once.
 *
 * "/" opens one text box. As it is typed into, the classifier (draw/shape/classify.ts) says
 * which card the line is, the calm state machine (decide.ts) decides what to show -- nothing,
 * a faint ghost, "did you mean" between two, or the card -- and the card is drawn below the text
 * by the same renderer a placed card uses. Enter puts it down; Tab keeps a ghost; Esc clears, and
 * closes when empty. "/" in the empty box opens the list of every kind. "Details" sets the card's
 * values by hand before it is put down.
 *
 * A placed card's controls -- tick, vote, start, +/-, the pencil -- change its `state` with an
 * ordinary patch through the host; a running timer is kept moving here, once a second, without a
 * patch per tick.
 */

import { toast } from '~/app/chrome.ts';
import { typing } from '~/app/dom.ts';
import { fieldEditor, openFieldEditor } from '~/app/shape/editor.ts';
import { classify, type ShapeResult } from '~/draw/shape/classify.ts';
import { activeIntent, decide, force, type Memory, promote, START } from '~/draw/shape/decide.ts';
import { type Fields, readShape } from '~/draw/shape/fields.ts';
import { INTENTS, iconSvg, SHAPE_INTENTS, type ShapeIntent } from '~/draw/shape/intents.ts';
import { formatClock } from '~/draw/shape/parse.ts';
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

/** Where the bar's cards live: a board, a page, a notebook's spread. */
export interface ShapeHost {
  /** The element placed cards are drawn in: their controls are listened for here. */
  readonly surface: HTMLElement;
  /** The card an element inside it belongs to. */
  find(inside: HTMLElement): { id: string; block: ShapeBlock } | undefined;
  /** Keep a changed card. */
  save(id: string, block: ShapeBlock): void;
  /** Put a new card down; the host decides where. */
  add(block: ShapeBlock, width: number): void;
  /** False where there is nowhere to put one right now (a shut notebook). */
  ready?(): boolean;
}

export class ShapeIsland {
  private readonly host: ShapeHost;
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
  private editing: { id: string; block: ShapeBlock } | undefined;
  private hint = 0;
  /** Values set in the bar's "details", and the kind they were set for. */
  private fields: Fields | undefined;
  private fieldsFor: ShapeIntent | undefined;
  private details: HTMLElement | undefined;

  constructor(host: ShapeHost) {
    this.host = host;
  }

  bind(): void {
    window.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (typing(event.target) || document.querySelector('dialog[open], .se-float')) return;
      if (this.host.ready && !this.host.ready()) return;
      event.preventDefault();
      this.open();
    });
    for (const b of document.querySelectorAll<HTMLElement>('[data-gs="shape-open"]')) {
      b.addEventListener('click', () => this.open());
    }
    // A card's controls.
    this.host.surface.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.sc-act');
      if (!button || button.disabled) return;
      const card = this.host.find(button);
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      this.act(card.id, card.block, button.dataset.scAct ?? '', button);
    });
    window.setInterval(() => this.tick(), 1000);
  }

  // ---------------------------------------------------------------- the box

  open(text = '', editing?: { id: string; block: ShapeBlock }, intent?: ShapeIntent): void {
    if (this.root) {
      this.input?.focus();
      return;
    }
    this.editing = editing;
    this.fields = editing?.block.state?.fields;
    this.fieldsFor = editing?.block.intent;
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
      details: undefined,
      fields: undefined,
      fieldsFor: undefined,
    });
    this.mem = START;
    this.editing = undefined;
  }

  /** A placed card, back in the box to be changed. */
  edit(id: string, block: ShapeBlock): void {
    this.close();
    this.open(block.text, { id, block }, block.intent);
  }

  private update(keepForced = false): void {
    const input = this.input;
    if (!input) return;
    const text = input.value;
    const result = classify(text, new Date());
    this.last = result;
    if (!keepForced) this.mem = decide(this.mem, result, text);
    if (this.mem.ui.kind === 'choose') this.chip = Math.min(this.chip, 1);
    // Details set by hand belong to one kind: another kind starts clean.
    const now = activeIntent(this.mem.ui);
    if (now && this.fieldsFor && this.fieldsFor !== now) {
      this.fields = undefined;
      this.details?.remove();
      this.details = undefined;
    }
    if (now) this.fieldsFor = now;
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
        {
          kind: 'shape',
          intent,
          text,
          made: this.editing?.block.made ?? new Date().toISOString(),
          ...(this.fields ? { state: { fields: this.fields } } : {}),
        },
        { interactive: false, editable: false },
      );
      card.classList.toggle('is-ghost', ghost);
      const label = (fa ? INTENTS[intent].fa : INTENTS[intent].label).toLowerCase();
      foot.innerHTML = '';
      if (ghost) {
        const keys = el('span', 'ss-keys');
        keys.innerHTML = fa
          ? `<kbd class="gs-kbd">Tab</kbd> برای نگه‌داشتن به‌عنوان ${label}`
          : `<kbd class="gs-kbd">Tab</kbd> to keep as ${label}`;
        foot.append(keys);
      } else {
        const keys = el('span', 'ss-keys');
        keys.innerHTML = `<kbd class="gs-kbd">Esc</kbd> ${fa ? (this.editing ? 'انصراف' : 'پاک کردن') : this.editing ? 'to cancel' : 'to clear'}`;
        // The card's values, by hand, before it is put down.
        const more = el('button', 'ss-details', fa ? 'جزئیات' : 'Details');
        more.type = 'button';
        more.dataset.gs = 'shape-details';
        more.setAttribute('aria-expanded', String(Boolean(this.details)));
        more.title = fa ? 'مقدارها را دستی تنظیم کن' : 'set its values by hand';
        more.addEventListener('mousedown', (e) => e.preventDefault());
        more.addEventListener('click', () => this.toggleDetails(intent));
        const add = el('button', 'ss-add');
        add.type = 'button';
        add.dataset.gs = 'shape-add';
        add.innerHTML = `${fa ? (this.editing ? 'ذخیره' : 'افزودن') : this.editing ? 'Save' : 'Add'} ${label} <span aria-hidden="true">↵</span>`;
        add.addEventListener('mousedown', (e) => e.preventDefault());
        add.addEventListener('click', () => this.commit());
        const end = el('span', 'ss-foot-end');
        end.append(more, add);
        foot.append(keys, end);
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

  /** The fields under the card in the bar, changing the preview as they change. */
  private toggleDetails(intent: ShapeIntent): void {
    if (this.details) {
      this.details.remove();
      this.details = undefined;
      this.draw();
      this.input?.focus();
      return;
    }
    const text = this.input?.value ?? '';
    const made = this.editing?.block.made ? new Date(this.editing.block.made) : new Date();
    const { root, focus } = fieldEditor({
      intent,
      text,
      state: this.fields ? { fields: this.fields } : {},
      made,
      inline: true,
      onInput: (f) => {
        this.fields = f;
        this.fieldsFor = intent;
        this.draw();
      },
      onSave: (f) => {
        this.fields = f;
        this.fieldsFor = intent;
        this.commit();
      },
      onCancel: () => this.toggleDetails(intent),
    });
    this.details = root;
    this.card?.after(root);
    this.draw();
    requestAnimationFrame(focus);
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
        this.fields = undefined;
        this.details?.remove();
        this.details = undefined;
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

  /** Put the card down, or save the one being changed. */
  private commit(): void {
    const input = this.input;
    const ui = this.mem.ui;
    const intent = ui.kind === 'choose' ? ui.options[this.chip] : activeIntent(ui);
    const text = input?.value.trim() ?? '';
    if (!intent || !text) return;
    const fields = this.fieldsFor === intent ? this.fields : undefined;
    if (this.editing) {
      const old = this.editing.block;
      // A different kind, or different words, starts its state afresh; what was set by hand in
      // "details" is kept either way.
      const keep = old.intent === intent && old.text === text;
      const state: ShapeState = { ...(keep && old.state ? old.state : {}) };
      delete state.fields;
      if (fields) state.fields = fields;
      const block: ShapeBlock = {
        kind: 'shape',
        intent,
        text,
        made: old.made ?? new Date().toISOString(),
        ...(Object.keys(state).length ? { state } : {}),
      };
      this.host.save(this.editing.id, block);
      this.close();
      return;
    }
    this.host.add(
      {
        kind: 'shape',
        intent,
        text,
        made: new Date().toISOString(),
        ...(fields ? { state: { fields } } : {}),
      },
      intent === 'timer' ? 400 : 360,
    );
    this.close();
    toast(
      isPersian(text)
        ? `${INTENTS[intent].fa} روی صفحه است · مداد روی کارت ویرایشش می‌کند`
        : `${INTENTS[intent].label} on the page · the pencil on it changes it`,
    );
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

  private act(id: string, block: ShapeBlock, name: string, button: HTMLElement): void {
    const s: ShapeState = structuredClone(block.state ?? {});
    const made = block.made ? new Date(block.made) : new Date();
    const [what, arg = '', extra = ''] = name.split(':');
    const fields: Fields = { ...(s.fields ?? {}) };
    const toggle = (list: readonly number[] | undefined, n: number): number[] => {
      const set = new Set(list ?? []);
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return [...set].sort((a, b) => a - b);
    };
    switch (what) {
      case 'edit': {
        const cardEl = button.closest<HTMLElement>('.sc') ?? button;
        openFieldEditor({
          intent: block.intent,
          text: block.text,
          state: s,
          made,
          anchor: cardEl.getBoundingClientRect(),
          onSave: (f) => {
            const next: ShapeState = { ...s };
            // Values now in fields replace the older per-kind state they were read beneath.
            for (const k of ['people', 'total', 'days', 'current', 'to'] as const) delete next[k];
            if (f) next.fields = f;
            else delete next.fields;
            this.host.save(id, {
              ...block,
              ...(Object.keys(next).length ? { state: next } : { state: {} }),
            });
          },
          onCancel: () => {},
        });
        return;
      }
      case 'todo':
        s.done = toggle(s.done, Number(arg));
        break;
      case 'close':
        s.closed = !s.closed;
        break;
      case 'timer': {
        if (arg === 'reset') {
          s.elapsed = 0;
          s.startedAt = null;
        } else if (arg === 'set') {
          fields.duration = Number(extra) || 0;
        } else if (arg === '+60' || arg === '-60') {
          const now = readShape('timer', block.text, made, s).seconds ?? 0;
          fields.duration = Math.max(60, now + (arg === '+60' ? 60 : -60));
        } else if (typeof s.startedAt === 'number') {
          s.elapsed = (s.elapsed ?? 0) + (Date.now() - s.startedAt) / 1000;
          s.startedAt = null;
        } else s.startedAt = Date.now();
        break;
      }
      case 'day':
        fields.days = toggle(readShape('habit', block.text, made, s).days, Number(arg));
        break;
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
        const n = readShape('split', block.text, made, s).people ?? 2;
        fields.people = Math.max(1, Math.min(99, n + (arg === '+' ? 1 : -1)));
        break;
      }
      case 'goal': {
        const g = readShape('goal', block.text, made, s);
        const step = (g.target ?? 0) >= 1000 ? Math.round((g.target ?? 0) / 20) : 1;
        fields.current = Math.max(
          0,
          Math.min(g.target ?? 0, g.current + (arg === '+' ? step : -step)),
        );
        break;
      }
      case 'to':
        fields.to = arg;
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
    if (Object.keys(fields).length) s.fields = fields;
    // A value moved into fields leaves its older place.
    for (const k of ['people', 'days', 'current', 'to'] as const) if (k in fields) delete s[k];
    this.host.save(id, { ...block, state: s });
  }

  /** Running timers count down on screen without a patch per second. */
  private tick(): void {
    for (const timer of this.host.surface.querySelectorAll<HTMLElement>(
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
  const d = readShape('random', block.text, new Date(), block.state ?? {});
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
