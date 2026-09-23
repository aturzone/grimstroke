/**
 * Every sticky note on the board, as something you can pick up.
 *
 * A note is paper: it is picked up anywhere on the sheet and it behaves like paper while you
 * hold it. Everything else on a board is dragged as a box, which is right -- a photograph does
 * not flutter. This owns the physics loop, the six buttons on each note's own toolbar, and
 * the one settings panel that can be open at a time.
 */

import type { BoardContext } from '~/app/board/context.ts';
import { DRAWING, WEIGHT } from '~/app/board/tools.ts';
import { Loop } from '~/app/motion/spring.ts';
import { LiveNote, type NoteAction } from '~/app/note/live.ts';
import { NoteSettings } from '~/app/note/settings.ts';
import { topZ } from '~/draw/doc/board/patch.ts';
import { PALETTES } from '~/draw/look/palette.ts';
import type { Block } from '~/draw/material/model.ts';
import { DEFAULT_NOTE_STYLE, type NoteStyle } from '~/draw/material/note/model.ts';

export class Notes {
  private readonly ctx: BoardContext;
  /**
   * One requestAnimationFrame loop for every note on the board, and it stops itself.
   *
   * A board sitting still costs nothing: the loop cancels when the last spring settles.
   */
  private readonly loop = new Loop();
  private readonly live = new Map<string, LiveNote>();
  /** The one note currently taking ink on its own sheet, if any. */
  private drawingOn: string | undefined;
  /** The one open settings panel, and the note it belongs to. */
  private settings: NoteSettings | undefined;
  private settingsFor: string | undefined;

  constructor(ctx: BoardContext) {
    this.ctx = ctx;
  }

  get(id: string): LiveNote | undefined {
    return this.live.get(id);
  }

  /** Press one of a note's toolbar buttons, by name: the keyboard's way in. */
  act(id: string, action: NoteAction): void {
    const live = this.live.get(id);
    if (live) this.noteAction(id, action, live);
  }

  /** An item's element is about to be replaced or has gone: let its physics go with it. */
  forget(id: string): void {
    const old = this.live.get(id);
    if (!old) return;
    this.loop.remove(old);
    this.live.delete(id);
  }

  /** A text editor opened or closed over this note. */
  editing(id: string, on: boolean): void {
    const note = this.live.get(id);
    if (note) note.editing = on;
  }

  /**
   * Give every note on the board its physics.
   *
   * A note is paper: it is picked up by its handle and it behaves like paper while you hold
   * it. Everything else on a board is dragged as a box, which is right -- a photograph does
   * not flutter.
   */
  adopt(): void {
    for (const item of this.ctx.board.querySelectorAll<HTMLElement>('[data-gs="item"]')) {
      const id = item.dataset.gsId;
      if (!id || this.live.has(id) || !item.querySelector('.note')) continue;
      const note: LiveNote = new LiveNote(item, {
        moved: (movedId, dx, dy) => this.moved(movedId, dx, dy),
        raise: (raisedId) => this.raise(raisedId),
        canGrab: () => this.ctx.tool === 'select',
        select: (chosen, add) => {
          if (!add && !this.ctx.selection.has(chosen)) this.ctx.selection.clear();
          this.ctx.selection.set(chosen, true);
        },
        // add, not just wake. The loop DROPS a member the moment its springs settle -- that
        // is how an idle board costs nothing -- so a bare wake() after the first settle has
        // an empty set to run and the physics never moves again.
        wake: () => {
          this.loop.add(note);
        },
        resized: (resizedId, w, h) => this.commitResize(resizedId, w, h),
        act: (actId, action, live) => this.noteAction(actId, action, live),
        zoom: () => this.ctx.view.zoom,
        inked: (inkedId, stroke) => this.commitNoteInk(inkedId, stroke),
        // A note takes the same nib the board is holding, so choosing a colour in the tray
        // and then drawing on a note does not quietly draw in a different one.
        nib: () => ({
          colour: this.ctx.ink,
          weight: WEIGHT[this.ctx.tool] ?? WEIGHT.pen ?? 2.5,
          tool: DRAWING.has(this.ctx.tool) ? this.ctx.tool : 'pen',
        }),
      });
      this.live.set(id, note);
      this.loop.add(note);
      // Modes live in the app, not in the markup the server sends back, so a note that was
      // re-rendered while drawing or with its panel open has to be put back into that mode.
      if (this.drawingOn === id) {
        note.sheet?.toggleAttribute('data-drawing', true);
        note.mark('pen', true);
      }
      if (this.settingsFor === id) note.mark('settings', true);
    }
  }

  /** A stroke was drawn on a note's own sheet. */
  private commitNoteInk(
    id: string,
    stroke: { d: string; colour: string; weight: number; tool: string },
  ): void {
    const block = this.ctx.items().get(id)?.block;
    if (block?.kind !== 'note') return;
    const ink = [
      ...(block.ink ?? []),
      {
        d: stroke.d,
        colour: stroke.colour,
        weight: stroke.weight,
        tool: stroke.tool as 'pen' | 'marker' | 'highlighter',
      },
    ];
    this.ctx.session.run(
      [{ op: 'update', id, patch: { block: { ...block, ink } } }],
      'draw on note',
    );
  }

  /** A grip was let go. The size is the model's from here. */
  private commitResize(id: string, w: number, h: number): void {
    this.ctx.session.run([{ op: 'update', id, patch: { size: [w, h] } }], '');
  }

  /**
   * The six buttons on a note's own toolbar.
   *
   * Every one of them is a patch, which is the point: an agent can do all six over the API
   * with the same operations, and the undo stack does not care which did it.
   */
  private noteAction(id: string, action: NoteAction, live: LiveNote): void {
    const item = this.ctx.items().get(id);
    const block = item?.block;
    if (!item || block?.kind !== 'note') return;

    switch (action) {
      case 'delete':
        this.ctx.session.run([{ op: 'remove', id }], 'delete note');
        this.forget(id);
        this.ctx.selection.drop(id);
        return;

      case 'lock': {
        const locked = !item.locked;
        this.ctx.session.run([{ op: 'update', id, patch: { locked } }], locked ? 'lock' : 'unlock');
        return;
      }

      case 'collapse': {
        const collapsed = !block.collapsed;
        this.ctx.session.run(
          [{ op: 'update', id, patch: { block: { ...block, collapsed } } }],
          collapsed ? 'collapse' : 'expand',
        );
        return;
      }

      case 'palette': {
        // Cycles. A picker is the settings panel's job; the toolbar button is for the
        // one-handed "not that colour, the next one" that a pile of notes actually needs.
        const current = block.style?.palette ?? block.palette ?? DEFAULT_NOTE_STYLE.palette;
        const at = PALETTES.findIndex((p) => p.id === current);
        const next = PALETTES[(at + 1) % PALETTES.length];
        if (!next) return;
        this.ctx.session.run(
          [
            {
              op: 'update',
              id,
              // Written onto the style, not the block's own palette field, so a colour
              // chosen here and a colour chosen in the settings panel are the same setting.
              patch: { block: { ...block, style: { ...block.style, palette: next.id } } },
            },
          ],
          `palette ${next.label}`,
        );
        return;
      }

      case 'pen': {
        const on = this.drawingOn !== id;
        this.drawingOn = on ? id : undefined;
        live.sheet?.toggleAttribute('data-drawing', on);
        live.mark('pen', on);
        if (on) this.ctx.setTool('select');
        return;
      }

      case 'settings':
        this.openSettings(id, live);
        return;
    }
  }

  /**
   * The per-note settings panel.
   *
   * One panel at a time, anchored to the note it belongs to. Every control writes a patch, so
   * the note re-renders through the same code that drew it in the first place and there is no
   * second opinion anywhere about what a note with these settings looks like.
   */
  private openSettings(id: string, live: LiveNote): void {
    if (this.settingsFor === id) {
      this.closeSettings();
      return;
    }
    this.closeSettings();

    const read = (): Extract<Block, { kind: 'note' }> | undefined => {
      const block = this.ctx.items().get(id)?.block;
      return block?.kind === 'note' ? block : undefined;
    };
    const write = (patch: Partial<NoteStyle>, clear: readonly (keyof NoteStyle)[] = []): void => {
      const block = read();
      if (!block) return;
      const style: Record<string, unknown> = { ...block.style, ...patch };
      for (const key of clear) delete style[key];
      this.ctx.session.run(
        [{ op: 'update', id, patch: { block: { ...block, style: style as Partial<NoteStyle> } } }],
        'note settings',
      );
    };

    const panel = new NoteSettings({
      overrides: () => read()?.style ?? {},
      name: () => read()?.title ?? '',
      rename: (next) => {
        const block = read();
        if (!block) return;
        const trimmed = next.trim();
        const updated = { ...block };
        if (trimmed) updated.title = trimmed;
        else delete updated.title;
        this.ctx.session.run([{ op: 'update', id, patch: { block: updated } }], 'rename note');
      },
      change: (patch, clear) => write(patch, clear ?? []),
      reset: (key) => write({}, [key]),
      close: () => this.closeSettings(),
    });

    this.settings = panel;
    this.settingsFor = id;
    document.body.append(panel.el);
    panel.placeBy(live.element);
    live.mark('settings', true);
  }

  closeSettings(): void {
    const open = this.settingsFor;
    this.settings?.el.remove();
    this.settings = undefined;
    this.settingsFor = undefined;
    if (open) this.live.get(open)?.mark('settings', false);
  }

  /** A note was dragged and let go. The board owns the position from here. */
  private moved(id: string, dx: number, dy: number): void {
    const item = this.ctx.items().get(id);
    if (!item) return;
    const at: [number, number] = [Math.round(item.at[0] + dx), Math.round(item.at[1] + dy)];
    this.ctx.session.run([{ op: 'move', id, at }], '');
    const element = this.ctx.element(id);
    if (element) this.ctx.place(element, at);
  }

  /** Bring a note to the top of the pile, the way a hand does. */
  private raise(id: string): void {
    const item = this.ctx.items().get(id);
    if (!item) return;
    const top = topZ(this.ctx.session.spec) + 1;
    if ((item.z ?? 0) >= top - 1) return;
    this.ctx.session.run([{ op: 'order', id, z: top }], '');
    const element = this.ctx.element(id);
    if (element) element.style.zIndex = String(top);
  }
}
