/**
 * The studio, as something you can use.
 *
 * It calls `renderFace` directly, in the browser, and that is NOT the app growing a second
 * renderer: it is the same pure module the server uses, bundled here because it is pure.
 * A character is a few hundred bytes of choices with no assets and no server state behind
 * it, so a round trip per click would buy nothing and cost the thing that matters most in a
 * studio -- that the face changes the instant you choose something.
 */

import { confirmCard, toast } from '~/app/chrome.ts';
import { must, typing } from '~/app/dom.ts';
import { letterOf } from '~/app/keys.ts';
import { detailRow } from '~/draw/chrome/detail.ts';
import {
  type ArtStyle,
  type Character,
  DEFAULT_FACE,
  type Palette,
  REQUIRED,
  type Sizes,
  type Slot,
} from '~/draw/material/face/model.ts';
import { CATALOGUE } from '~/draw/material/face/parts.ts';
import { renderFace } from '~/draw/material/face/render.ts';

const SLOTS = Object.keys(CATALOGUE) as Slot[];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

export class StudioApp {
  private face: Character;
  private readonly stage: HTMLElement;

  constructor(face: Character) {
    this.face = { ...DEFAULT_FACE, ...face, parts: { ...DEFAULT_FACE.parts, ...face.parts } };
    this.stage = must<HTMLElement>('[data-gs="face-stage"]');
    this.bind();
  }

  // ---------------------------------------------------------------- input

  private bind(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;

      const cell = target?.closest<HTMLElement>('[data-gs="face-part"]');
      if (cell) {
        const slot = cell.dataset.gsSlot as Slot;
        const part = cell.dataset.gsPart ?? '';
        const parts = { ...this.face.parts };
        // An empty value is "none", which is a real choice for everything optional.
        if (part === '') delete parts[slot];
        else parts[slot] = part;
        this.face = { ...this.face, parts };
        this.draw();
        this.dirty();
        return;
      }

      const swatch = target?.closest<HTMLElement>('[data-gs="face-swatch"]');
      if (swatch) {
        const key = swatch.dataset.gsKey as keyof Palette;
        const colour = swatch.dataset.gsColour ?? '';
        this.face = { ...this.face, palette: { ...this.face.palette, [key]: colour } };
        const input = document.querySelector<HTMLInputElement>(
          `[data-gs="face-colour"][data-gs-key="${key}"]`,
        );
        if (input) input.value = colour;
        this.draw();
        return;
      }

      const style = target?.closest<HTMLElement>('[data-gs="face-style"]');
      if (style?.dataset.gsStyle) {
        this.face = { ...this.face, style: style.dataset.gsStyle as ArtStyle };
        for (const button of document.querySelectorAll<HTMLElement>('[data-gs="face-style"]')) {
          button.setAttribute('aria-pressed', String(button === style));
        }
        this.draw();
        return;
      }

      const open = target?.closest<HTMLElement>('[data-gs="face-open"]');
      if (open?.dataset.gsId) {
        window.location.href = `/face?id=${encodeURIComponent(open.dataset.gsId)}`;
        return;
      }

      switch (target?.closest<HTMLElement>('[data-gs^="face-"]')?.dataset.gs) {
        case 'face-random':
          this.shuffle();
          break;
        case 'face-new':
          window.location.href = `/face?id=${encodeURIComponent(`face-${Date.now().toString(36)}`)}`;
          break;
        case 'face-save':
          void this.save();
          break;
        case 'face-delete':
          void this.remove();
          break;
        case 'face-place':
          void this.place();
          break;
        default:
          break;
      }
    });

    for (const input of document.querySelectorAll<HTMLInputElement>('[data-gs="face-colour"]')) {
      input.addEventListener('input', () => {
        this.face = {
          ...this.face,
          palette: { ...this.face.palette, [input.dataset.gsKey as keyof Palette]: input.value },
        };
        this.draw();
      });
    }

    for (const input of document.querySelectorAll<HTMLInputElement>('[data-gs="face-size"]')) {
      input.addEventListener('input', () => {
        const key = input.dataset.gsKey as keyof Sizes;
        const value = Number(input.value);
        const read = document.querySelector<HTMLElement>(
          `[data-gs="face-size-value"][data-gs-key="${key}"]`,
        );
        if (read) read.textContent = `${Math.round(value * 100)}%`;
        this.face = { ...this.face, sizes: { ...this.face.sizes, [key]: value } };
        this.draw();
      });
    }

    const text = (gs: string, key: 'name' | 'role' | 'bio'): void => {
      const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[data-gs="${gs}"]`,
      );
      input?.addEventListener('input', () => {
        const value = input.value.trim();
        const next = { ...this.face };
        if (value) next[key] = value;
        else delete next[key];
        this.face = next;
        if (key === 'name') {
          const title = document.querySelector<HTMLElement>('[data-gs="title"]');
          if (title) title.textContent = value || 'a new character';
        }
        this.dirty();
      });
    };
    text('face-name', 'name');
    text('face-role', 'role');
    text('face-bio', 'bio');

    // The details: a list of label and value lines, read back whole whenever one changes.
    const details = document.querySelector<HTMLElement>('[data-gs="face-details"]');
    const readDetails = (): void => {
      const rows = [...(details?.querySelectorAll<HTMLElement>('[data-gs="face-detail"]') ?? [])]
        .map((row) => ({
          label:
            row.querySelector<HTMLInputElement>('[data-gs="face-detail-label"]')?.value.trim() ??
            '',
          value:
            row.querySelector<HTMLInputElement>('[data-gs="face-detail-value"]')?.value.trim() ??
            '',
        }))
        .filter((d) => d.label || d.value);
      this.face = { ...this.face, details: rows };
      this.dirty();
    };
    details?.addEventListener('input', readDetails);
    details?.addEventListener('click', (event) => {
      const remove = (event.target as HTMLElement).closest('[data-gs="face-detail-remove"]');
      if (!remove) return;
      remove.closest('[data-gs="face-detail"]')?.remove();
      readDetails();
    });
    document.querySelector('[data-gs="face-detail-add"]')?.addEventListener('click', () => {
      // The row is chrome built from our own template; its inputs start empty.
      details?.insertAdjacentHTML('beforeend', detailRow('', ''));
      details?.querySelector<HTMLInputElement>('[data-gs="face-detail"]:last-child input')?.focus();
    });

    window.addEventListener('keydown', (event) => {
      if (typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (letterOf(event) === 'r') this.shuffle();
    });
    // The card is drawn from what is saved, so going to it saves first.
    for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-gs="face-profile"]')) {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        if (await this.save()) window.location.href = link.href;
      });
    }
    window.addEventListener('beforeunload', (event) => {
      if (this.unsaved) event.preventDefault();
    });
  }

  private unsaved = false;

  /** Something changed that is not saved yet, and the save state says so. */
  private dirty(): void {
    this.unsaved = true;
    const saved = document.querySelector<HTMLElement>('[data-gs="saved"]');
    if (saved) {
      saved.dataset.state = 'saving';
      saved.textContent = 'not saved';
    }
  }

  // ---------------------------------------------------------------- draw

  /**
   * Redraw the big face and every thumbnail.
   *
   * The thumbnails are THIS character with one part changed, so a colour change has to reach
   * all of them -- a row of choices drawn in the old skin tone stops describing the choice.
   */
  private draw(): void {
    this.dirty();
    this.stage.innerHTML = renderFace(this.face, { size: 320, badge: true });

    for (const cell of document.querySelectorAll<HTMLElement>('[data-gs="face-part"]')) {
      const slot = cell.dataset.gsSlot as Slot;
      const part = cell.dataset.gsPart ?? '';
      const parts = { ...this.face.parts };
      if (part === '') delete parts[slot];
      else parts[slot] = part;
      cell.innerHTML = renderFace(
        { ...this.face, id: `${this.face.id}-${slot}-${part || 'none'}`, parts, tilt: 0 },
        { size: 58, chrome: false },
      );
      cell.setAttribute('aria-pressed', String(part === (this.face.parts[slot] ?? '')));
    }
  }

  // ---------------------------------------------------------------- acts

  /**
   * A whole face at once.
   *
   * Optional slots are usually left empty, not filled at even odds: a shuffle that puts a
   * hat, glasses, an earring, a beard, blush and a tattoo on every single face produces
   * costumes rather than people, and you have to undo five things to get to one you like.
   */
  private shuffle(): void {
    const parts: Partial<Record<Slot, string>> = {};
    for (const slot of SLOTS) {
      const options = CATALOGUE[slot as keyof typeof CATALOGUE];
      if (!options?.length) continue;
      const optional = !REQUIRED.includes(slot) && slot !== 'ears' && slot !== 'hair';
      if (optional && Math.random() > 0.3) continue;
      parts[slot] = pick(options).id;
    }
    this.face = {
      ...this.face,
      parts,
      palette: {
        ...this.face.palette,
        skin: pick(['#f8d9bd', '#f6c89a', '#e0a878', '#c0824f', '#8d5524', '#5b3a1c']),
        hair: pick(['#14110e', '#2b2118', '#6b4423', '#b07d3a', '#e8c86a', '#c0392f', '#7a2ff7']),
        accent: pick(['#ff2e63', '#00d5c8', '#c6ff3d', '#ff8a3d', '#b79bff', '#ffe94a']),
      },
    };
    this.draw();
  }

  private async save(): Promise<boolean> {
    try {
      const res = await fetch('/api/face', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ character: this.face }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      toast('not saved: the workspace did not answer', 'error');
      return false;
    }
    this.unsaved = false;
    const saved = document.querySelector<HTMLElement>('[data-gs="saved"]');
    if (saved) {
      saved.dataset.state = 'saved';
      saved.textContent = 'saved';
    }
    toast(`${this.face.name || 'the character'} is saved`);
    return true;
  }

  private async remove(): Promise<void> {
    const yes = await confirmCard({
      title: `delete ${this.face.name || 'this character'}?`,
      body:
        'The character leaves the studio. Every board, card and cover it is already on keeps ' +
        'its own copy, so nothing that shows it changes.',
      yes: 'delete',
    });
    if (!yes) return;
    this.unsaved = false;
    await fetch(`/api/face?id=${encodeURIComponent(this.face.id)}`, { method: 'DELETE' });
    window.location.href = '/face';
  }

  /** Put the character on the workspace board, where it becomes an item like any other. */
  private async place(): Promise<void> {
    if (!(await this.save())) return;
    this.unsaved = false;
    const res = await fetch('/api/face/place', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ character: this.face }),
    });
    if (res.ok) window.location.href = '/';
  }
}

export function bootStudio(): StudioApp | undefined {
  const stage = document.querySelector<HTMLElement>('[data-gs="face-stage"]');
  if (!stage) return undefined;
  const raw = document.querySelector<HTMLElement>('[data-gs="face-data"]')?.textContent ?? '';
  const character = raw ? (JSON.parse(raw) as Character) : { id: 'default', parts: {} };
  return new StudioApp(character);
}
