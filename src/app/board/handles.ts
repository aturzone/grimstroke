/**
 * The frame round a selection, its grips, and the bar of what can be done to it.
 *
 * Chrome, drawn in screen space over the board -- so the grips are the same size at every
 * zoom, which is the only size a grip can be: a handle that shrinks to four pixels when the
 * camera pulls back is a handle nobody can take hold of.
 *
 * Resizing and turning are previewed on the element itself while the hand holds the grip and
 * committed once, as `update` operations, when it lets go. A sticky note keeps its own grips
 * -- it is cut to a size, and it has them already -- and is only offered the turn here.
 */

import { boxes, union } from '~/app/board/arrange.ts';
import type { BoardContext } from '~/app/board/context.ts';
import type { BoardItem } from '~/draw/doc/board/model.ts';
import type { Op } from '~/draw/doc/board/patch.ts';

type Grip = 'nw' | 'ne' | 'se' | 'sw' | 'e' | 'w' | 'turn';

const GRIPS: readonly Grip[] = ['nw', 'ne', 'se', 'sw', 'e', 'w', 'turn'];
/** Narrower than this and a picture or a paragraph stops being one. */
const MIN_WIDTH = 48;

/** Scale every coordinate of a path about a point. Enough for the paths this app draws. */
export function scalePath(d: string, k: number, ox: number, oy: number): string {
  let axis = 0;
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (n) => {
    const v = Number(n);
    const origin = axis++ % 2 === 0 ? ox : oy;
    return String(Math.round((origin + (v - origin) * k) * 100) / 100);
  });
}

export class Handles {
  private readonly ctx: BoardContext;
  private readonly frame: HTMLElement;
  private readonly bar: HTMLElement | null;
  private busy = false;
  private pending = 0;

  constructor(ctx: BoardContext) {
    this.ctx = ctx;
    this.frame = document.createElement('div');
    this.frame.className = 'gs-handles';
    this.frame.dataset.gs = 'handles';
    this.frame.hidden = true;
    for (const grip of GRIPS) {
      const node = document.createElement('div');
      node.className = `gs-grip gs-grip-${grip}`;
      node.dataset.grip = grip;
      node.setAttribute('aria-hidden', 'true');
      node.addEventListener('pointerdown', (event) => this.grab(event, grip));
      this.frame.append(node);
    }
    ctx.viewport.append(this.frame);
    this.bar = document.querySelector<HTMLElement>('[data-gs="selbar"]');
    ctx.view.listen(() => this.update());
    window.addEventListener('resize', () => this.update());
    // A press marks the board as dragging and the frame stands aside for it; the release is
    // when it comes back. Without this a plain click selected something and showed no frame
    // and no bar at all, because the only redraw had happened mid-press.
    ctx.viewport.addEventListener('pointerup', () => this.update());
    ctx.viewport.addEventListener('pointercancel', () => this.update());
  }

  /** Redraw on the next frame; many things can ask in one. */
  update(): void {
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      this.draw();
    });
  }

  private selected(): BoardItem[] {
    const items = this.ctx.items();
    return this.ctx.selection
      .list()
      .map((id) => items.get(id))
      .filter((item): item is BoardItem => item !== undefined);
  }

  private draw(): void {
    const chosen = this.selected();
    const dragging = this.ctx.viewport.dataset.dragging !== undefined && !this.busy;
    if (chosen.length === 0 || dragging) {
      this.frame.hidden = true;
      if (this.bar) this.bar.hidden = true;
      return;
    }
    const screen = this.screenBox(chosen.map((i) => i.id));
    if (!screen) return;
    const view = this.ctx.view.screen;
    const one = chosen.length === 1 ? chosen[0] : undefined;
    const note = one?.block?.kind === 'note';
    const locked = chosen.some((i) => i.locked);

    const f = this.frame;
    f.hidden = false;
    f.style.transform = `translate(${Math.round(screen.left - view.left)}px, ${Math.round(screen.top - view.top)}px)`;
    f.style.width = `${Math.round(screen.width)}px`;
    f.style.height = `${Math.round(screen.height)}px`;
    // The frame is only a frame for a note -- its torn edge is its selection -- and for a
    // selection of several, where there is nothing to resize as one.
    f.toggleAttribute('data-many', chosen.length > 1);
    f.toggleAttribute('data-note', note);
    f.toggleAttribute('data-locked', locked);
    f.toggleAttribute('data-ink', Boolean(one?.ink));

    const bar = this.bar;
    if (!bar) return;
    bar.hidden = false;
    bar.dataset.count = String(chosen.length);
    bar.toggleAttribute(
      'data-grouped',
      chosen.some((i) => i.group),
    );
    const lock = bar.querySelector<HTMLElement>('[data-gs="lock-selection"]');
    lock?.setAttribute('aria-pressed', String(locked && chosen.every((i) => i.locked)));
    // Above the selection, clear of the rotate grip; below it if there is no room above; and
    // never off the screen either way.
    const bw = bar.offsetWidth;
    const bh = bar.offsetHeight;
    let top = screen.top - bh - 44;
    if (top < view.top + 70) top = screen.bottom + 16;
    if (top + bh > view.bottom - 90) top = Math.max(view.top + 70, screen.top + 8);
    const left = Math.min(
      Math.max(screen.left + screen.width / 2 - bw / 2, view.left + 8),
      view.right - bw - 8,
    );
    bar.style.left = `${Math.round(left)}px`;
    bar.style.top = `${Math.round(top)}px`;
  }

  private screenBox(ids: readonly string[]): DOMRect | undefined {
    const list = boxes(this.ctx, ids);
    const all = union(list);
    if (!all) return undefined;
    const a = this.ctx.view.toScreen({ x: all.x, y: all.y });
    const b = this.ctx.view.toScreen({ x: all.x + all.w, y: all.y + all.h });
    return new DOMRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }

  // ---------------------------------------------------------------- grips

  private grab(event: PointerEvent, grip: Grip): void {
    const chosen = this.selected();
    const item = chosen[0];
    if (chosen.length !== 1 || !item || item.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const element = this.ctx.element(item.id);
    const box = boxes(this.ctx, [item.id])[0];
    if (!element || !box) return;
    const target = event.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // Without capture the gesture ends if the pointer leaves the grip.
    }
    this.busy = true;
    this.frame.dataset.active = grip;
    const zoom = this.ctx.view.zoom;
    const start = { x: event.clientX, y: event.clientY };
    const w0 = item.size?.[0] ?? box.w;
    const r0 = item.rotation ?? 0;
    const centre = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const c = this.ctx.view.toScreen(centre);
    const a0 = Math.atan2(event.clientY - c.y, event.clientX - c.x);
    let result: Op | undefined;

    const move = (ev: PointerEvent): void => {
      if (grip === 'turn') {
        const a = Math.atan2(ev.clientY - c.y, ev.clientX - c.x);
        let r = r0 + ((a - a0) * 180) / Math.PI;
        // Shift snaps to fifteen degrees; near straight snaps to straight anyway, because a
        // thing meant to be square and turned by half a degree just looks crooked.
        r = ((((r + 180) % 360) + 360) % 360) - 180;
        r = ev.shiftKey ? Math.round(r / 15) * 15 : Math.abs(r) < 2 ? 0 : Math.round(r * 10) / 10;
        element.dataset.gsRotation = String(r);
        element.style.setProperty('--tilt', `${r}deg`);
        result = { op: 'update', id: item.id, patch: { rotation: r === 0 ? null : r } };
      } else {
        const dx = (ev.clientX - start.x) / zoom;
        const west = grip === 'w' || grip === 'nw' || grip === 'sw';
        const w = Math.max(MIN_WIDTH, Math.round(west ? w0 - dx : w0 + dx));
        if (item.ink) {
          // Ink has no width to set: it is scaled, about its own top-left corner.
          const k = w / box.w;
          const ox = box.x - item.at[0];
          const oy = box.y - item.at[1];
          if (element instanceof SVGGElement) {
            // A stroke in a shared svg is already placed by its transform; scale on top of it.
            const [x, y] = (element.dataset.gsAt ?? '0,0').split(',').map(Number);
            element.style.transform =
              `translate(${(x ?? 0) + ox}px, ${(y ?? 0) + oy}px) scale(${k}) ` +
              `translate(${-ox}px, ${-oy}px) rotate(var(--tilt, 0deg))`;
          } else {
            element.style.transformOrigin = `${ox}px ${oy}px`;
            element.style.transform = `scale(${k})`;
          }
          result = {
            op: 'update',
            id: item.id,
            patch: { ink: { ...item.ink, d: scalePath(item.ink.d, k, ox, oy) } },
          };
        } else {
          element.style.width = `${w}px`;
          element.style.maxWidth = 'none';
          const at: [number, number] = west
            ? [Math.round(item.at[0] + (w0 - w)), item.at[1]]
            : item.at;
          if (west) this.ctx.place(element, at);
          const size: [number, number?] = item.size?.[1] === undefined ? [w] : [w, item.size[1]];
          result = { op: 'update', id: item.id, patch: west ? { size, at } : { size } };
        }
      }
      this.draw();
    };
    const up = (): void => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      this.busy = false;
      delete this.frame.dataset.active;
      if (item.ink) {
        element.style.transform = '';
        element.style.transformOrigin = '';
      }
      if (result) this.ctx.session.run([result], grip === 'turn' ? 'turn' : 'resize');
      this.update();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }
}
