/**
 * A card's fields, by hand: the panel the pencil opens, and the "details" under the "/" bar.
 *
 * Drawn from the schema in draw/shape/fields.ts, with the browser's own inputs -- a date picker
 * for a date, a clock for a time, a colour well for a colour -- so a timer's minutes or an event's
 * day are changed by choosing, not by retyping the sentence. Enter saves, Esc cancels; "use the
 * words" drops what was set by hand and lets the text speak again.
 */

import {
  FIELDS,
  type FieldDef,
  type Fields,
  type FieldValue,
  fieldValues,
  keepFields,
  readShape,
} from '~/draw/shape/fields.ts';
import { INTENTS, type ShapeIntent } from '~/draw/shape/intents.ts';
import type { ShapeState } from '~/draw/shape/render.ts';
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

export interface EditorOptions {
  intent: ShapeIntent;
  text: string;
  state: ShapeState;
  /** What relative dates in the text are read against. */
  made: Date;
  /** Told on every change, for a live preview. */
  onInput?: (fields: Fields | undefined) => void;
  onSave: (fields: Fields | undefined) => void;
  onCancel: () => void;
  /** Inside the bar (no header, no own buttons) rather than floating over a card. */
  inline?: boolean;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LETTERS_FA = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

/** The editor, built; the caller puts it where it goes. */
export function fieldEditor(o: EditorOptions): {
  root: HTMLElement;
  values: () => Fields | undefined;
  focus: () => void;
} {
  const fa = isPersian(o.text);
  const data = readShape(o.intent, o.text, o.made, o.state);
  const start = fieldValues(o.intent, data);
  const values: Fields = structuredClone(start);
  const root = el('div', `se-panel${o.inline ? ' se-inline' : ' se-float'}`);
  root.dataset.gs = 'shape-editor';
  root.dir = fa ? 'rtl' : 'ltr';
  root.setAttribute('role', o.inline ? 'group' : 'dialog');
  root.setAttribute(
    'aria-label',
    fa ? `ویرایش ${INTENTS[o.intent].fa}` : `edit ${INTENTS[o.intent].label.toLowerCase()}`,
  );

  const collect = (): Fields | undefined => {
    const kept = keepFields(o.intent, o.text, o.made, values);
    // What was set by hand before, and not touched now, stays.
    const before = o.state.fields ?? {};
    const merged: Fields = {};
    for (const def of FIELDS[o.intent]) {
      const k = def.key;
      if (kept && Object.hasOwn(kept, k)) merged[k] = kept[k] as FieldValue;
      else if (Object.hasOwn(before, k) && JSON.stringify(before[k]) === JSON.stringify(values[k]))
        merged[k] = before[k] as FieldValue;
    }
    return Object.keys(merged).length ? merged : undefined;
  };
  const changed = (): void => o.onInput?.(collect());

  if (!o.inline) {
    const head = el('div', 'se-head');
    head.append(
      el(
        'h3',
        '',
        fa ? `ویرایش ${INTENTS[o.intent].fa}` : `Edit ${INTENTS[o.intent].label.toLowerCase()}`,
      ),
    );
    const x = el('button', 'se-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', fa ? 'بستن' : 'close');
    x.addEventListener('click', () => o.onCancel());
    head.append(x);
    root.append(head);
  }
  const form = el('form', 'se-form');
  form.noValidate = true;
  root.append(form);

  const label = (def: FieldDef): string => (fa ? def.fa : def.label);
  const defs = FIELDS[o.intent];
  let firstInput: HTMLElement | undefined;
  const remember = (node: HTMLElement): void => {
    firstInput ??= node;
  };

  const field = (def: FieldDef): HTMLElement => {
    const wrap = el('label', 'se-field');
    wrap.dataset.field = def.key;
    wrap.append(el('span', '', label(def)));
    const v = values[def.key];
    switch (def.type) {
      case 'textarea': {
        const t = el('textarea', 'se-input');
        t.value = String(v ?? '');
        t.dir = 'auto';
        t.rows = 4;
        t.addEventListener('input', () => {
          values[def.key] = t.value;
          changed();
        });
        remember(t);
        wrap.append(t);
        break;
      }
      case 'select': {
        const s = el('select', 'se-input');
        for (const [value, text] of def.options ?? []) {
          const opt = el('option', '', text);
          opt.value = value;
          s.append(opt);
        }
        s.value = String(v ?? '');
        s.addEventListener('change', () => {
          values[def.key] = s.value;
          changed();
        });
        remember(s);
        wrap.append(s);
        break;
      }
      case 'color': {
        const row = el('div', 'se-colour');
        const well = el('input', 'se-input');
        well.type = 'color';
        well.value = /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : '#3b5bdb';
        const hex = el('input', 'se-input');
        hex.value = well.value;
        hex.dir = 'ltr';
        hex.setAttribute('aria-label', 'hex');
        well.addEventListener('input', () => {
          hex.value = well.value;
          values[def.key] = well.value;
          changed();
        });
        hex.addEventListener('input', () => {
          const h = hex.value.trim().startsWith('#') ? hex.value.trim() : `#${hex.value.trim()}`;
          if (/^#[0-9a-f]{6}$/i.test(h)) {
            well.value = h.toLowerCase();
            values[def.key] = h.toLowerCase();
            changed();
          }
        });
        remember(well);
        row.append(well, hex);
        wrap.append(row);
        break;
      }
      case 'duration': {
        const total = Math.max(0, Number(v) || 0);
        const pair = el('div', 'se-pair');
        const mins = el('input', 'se-input');
        mins.type = 'number';
        mins.min = '0';
        mins.inputMode = 'numeric';
        mins.value = String(Math.floor(total / 60));
        mins.setAttribute('aria-label', fa ? 'دقیقه' : 'minutes');
        const secs = el('input', 'se-input');
        secs.type = 'number';
        secs.min = '0';
        secs.max = '59';
        secs.inputMode = 'numeric';
        secs.value = String(Math.round(total % 60));
        secs.setAttribute('aria-label', fa ? 'ثانیه' : 'seconds');
        const set = (): void => {
          values[def.key] = Math.max(
            0,
            (Number(mins.value) || 0) * 60 + Math.min(59, Number(secs.value) || 0),
          );
          changed();
        };
        mins.addEventListener('input', set);
        secs.addEventListener('input', set);
        const m = el('label', 'se-field');
        m.append(el('span', '', fa ? 'دقیقه' : 'min'), mins);
        const sEl = el('label', 'se-field');
        sEl.append(el('span', '', fa ? 'ثانیه' : 'sec'), secs);
        pair.append(m, sEl);
        const presets = el('div', 'se-presets');
        const minus = el('button', 'se-mini', '−1m');
        minus.type = 'button';
        minus.addEventListener('click', () => {
          mins.value = String(Math.max(0, (Number(mins.value) || 0) - 1));
          set();
        });
        const plus = el('button', 'se-mini', '+1m');
        plus.type = 'button';
        plus.addEventListener('click', () => {
          mins.value = String((Number(mins.value) || 0) + 1);
          set();
        });
        presets.append(minus, plus);
        for (const p of [5, 10, 15, 25, 45, 60]) {
          const b = el('button', 'se-mini', `${p}m`);
          b.type = 'button';
          b.addEventListener('click', () => {
            mins.value = String(p);
            secs.value = '0';
            set();
          });
          presets.append(b);
        }
        remember(mins);
        const box = el('div', 'se-field');
        box.dataset.field = def.key;
        box.append(el('span', '', label(def)), pair, presets);
        return box;
      }
      case 'list': {
        const box = el('div', 'se-field');
        box.dataset.field = def.key;
        box.append(el('span', '', label(def)));
        const listEl = el('div', 'se-list');
        const items = Array.isArray(v) ? v.map(String) : [];
        const sync = (): void => {
          values[def.key] = [...listEl.querySelectorAll<HTMLInputElement>('input')].map(
            (i) => i.value,
          );
          changed();
        };
        const row = (value: string): HTMLElement => {
          const r = el('div', 'se-list-row');
          const i = el('input', 'se-input');
          i.value = value;
          i.dir = 'auto';
          i.addEventListener('input', sync);
          const x = el('button', 'se-mini', '×');
          x.type = 'button';
          x.setAttribute('aria-label', fa ? 'حذف' : 'remove');
          x.addEventListener('click', () => {
            r.remove();
            sync();
          });
          r.append(i, x);
          return r;
        };
        for (const item of items) listEl.append(row(item));
        const add = el('button', 'se-mini se-add', fa ? '+ افزودن' : '+ add');
        add.type = 'button';
        add.addEventListener('click', () => {
          const r = row('');
          listEl.append(r);
          r.querySelector('input')?.focus();
          sync();
        });
        const firstRow = listEl.querySelector<HTMLInputElement>('input');
        if (firstRow) remember(firstRow);
        box.append(listEl, add);
        return box;
      }
      case 'days': {
        const box = el('div', 'se-field');
        box.dataset.field = def.key;
        box.append(el('span', '', label(def)));
        const row = el('div', 'se-days');
        const on = new Set(Array.isArray(v) ? (v as number[]).map(Number) : []);
        const order = fa ? [6, 0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 0];
        for (const d of order) {
          const b = el('button', 'se-day', (fa ? DAY_LETTERS_FA : DAY_LETTERS)[d]);
          b.type = 'button';
          b.setAttribute('aria-pressed', String(on.has(d)));
          b.addEventListener('click', () => {
            if (on.has(d)) on.delete(d);
            else on.add(d);
            b.setAttribute('aria-pressed', String(on.has(d)));
            values[def.key] = [...on].sort((a, c) => a - c);
            changed();
          });
          row.append(b);
        }
        box.append(row);
        return box;
      }
      default: {
        const i = el('input', 'se-input');
        i.type =
          def.type === 'number'
            ? 'number'
            : def.type === 'date' ||
                def.type === 'time' ||
                def.type === 'url' ||
                def.type === 'tel' ||
                def.type === 'email'
              ? def.type
              : 'text';
        if (def.min !== undefined) i.min = String(def.min);
        if (def.max !== undefined) i.max = String(def.max);
        if (def.step !== undefined) i.step = String(def.step);
        if (def.type === 'number') i.inputMode = 'decimal';
        if (def.type === 'text') i.dir = 'auto';
        else i.dir = 'ltr';
        i.value = String(v ?? '');
        i.addEventListener('input', () => {
          values[def.key] =
            def.type === 'number' ? (i.value === '' ? '' : Number(i.value)) : i.value;
          changed();
        });
        remember(i);
        wrap.append(i);
      }
    }
    return wrap;
  };

  // Date and time sit side by side; everything else is a row of its own.
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i] as FieldDef;
    const next = defs[i + 1];
    if (
      (def.type === 'date' && next?.type === 'time') ||
      (def.type === 'date' && next?.type === 'date')
    ) {
      const pair = el('div', 'se-pair');
      pair.append(field(def), field(next));
      form.append(pair);
      i++;
    } else form.append(field(def));
  }

  if (!o.inline) {
    const foot = el('div', 'se-foot');
    const reset = el('button', 'se-reset', fa ? 'برگرد به متن' : 'use the words');
    reset.type = 'button';
    reset.title = fa
      ? 'آنچه دستی تنظیم شد پاک شود و متن کارت دوباره حرف بزند'
      : 'drop what was set by hand; the text speaks again';
    reset.addEventListener('click', () => o.onSave(undefined));
    const cancel = el('button', 'se-cancel', fa ? 'انصراف' : 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', () => o.onCancel());
    const save = el('button', 'se-save', fa ? 'ذخیره' : 'Save');
    save.type = 'submit';
    save.dataset.gs = 'shape-editor-save';
    foot.append(reset, cancel, save);
    form.append(foot);
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    o.onSave(collect());
  });
  root.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      o.onCancel();
    } else if (
      event.key === 'Enter' &&
      !(event.target instanceof HTMLTextAreaElement) &&
      !(event.target instanceof HTMLButtonElement)
    ) {
      event.preventDefault();
      o.onSave(collect());
    }
  });
  return { root, values: collect, focus: () => firstInput?.focus() };
}

/** The editor, floating next to a card; closes on save, cancel or a press elsewhere. */
export function openFieldEditor(o: EditorOptions & { anchor: DOMRect }): () => void {
  document.querySelector('.se-float')?.remove();
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    root.remove();
    document.removeEventListener('pointerdown', away, true);
  };
  const { root, focus } = fieldEditor({
    ...o,
    onSave: (f) => {
      close();
      o.onSave(f);
    },
    onCancel: () => {
      close();
      o.onCancel();
    },
  });
  const away = (event: PointerEvent): void => {
    if (!root.contains(event.target as Node)) {
      close();
      o.onCancel();
    }
  };
  document.body.append(root);
  // Beside the card if there is room, else over it; kept inside the window.
  const w = root.offsetWidth;
  const h = root.offsetHeight;
  const gap = 12;
  let x = o.anchor.right + gap;
  if (x + w > window.innerWidth - 8) x = o.anchor.left - w - gap;
  if (x < 8) x = Math.max(8, Math.min(window.innerWidth - w - 8, o.anchor.left));
  const y = Math.max(8, Math.min(window.innerHeight - h - 8, o.anchor.top));
  root.style.left = `${Math.round(x)}px`;
  root.style.top = `${Math.round(y)}px`;
  requestAnimationFrame(() => focus());
  window.setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
  return close;
}
