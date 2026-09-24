/**
 * The board, as something you can use.
 *
 * Vanilla DOM. No framework, no runtime dependency, nothing to install: the
 * whole product is a URL, and that only stays true if the page it serves needs
 * nothing from anywhere else.
 *
 * The rule that shapes all of it: THE APP DOES NOT RENDER. Every item on screen
 * was drawn by the same renderer that draws an export, and when an item changes
 * the server sends back the new markup for it. So what you are looking at and
 * what you would get out of it cannot drift apart, because they are the same
 * HTML produced by the same code.
 *
 * This file wires the parts together; each part lives beside it. gestures.ts is what a
 * pointer does, notes.ts is the paper physics, select.ts is the selection, edit.ts the
 * in-place editor, export.ts the three ways out, files.ts the ways in.
 */

import * as arrange from '~/app/board/arrange.ts';
import type { BoardContext } from '~/app/board/context.ts';
import { Editor } from '~/app/board/edit.ts';
import { Exporter } from '~/app/board/export.ts';
import { Files } from '~/app/board/files.ts';
import { Gestures } from '~/app/board/gestures.ts';
import { Handles } from '~/app/board/handles.ts';
import { Notes } from '~/app/board/notes.ts';
import { Selection } from '~/app/board/select.ts';
import { DRAWING, type Tool } from '~/app/board/tools.ts';
import { type Point, View } from '~/app/board/view.ts';
import { toast } from '~/app/chrome.ts';
import { must, onClick, typing } from '~/app/dom.ts';
import { letterOf } from '~/app/keys.ts';
import { type PatchReply, Session } from '~/app/net.ts';
import type { BoardItem, BoardSpec } from '~/draw/doc/board/model.ts';
import type { Op } from '~/draw/doc/board/patch.ts';
import { apply, invert, topZ } from '~/draw/doc/board/patch.ts';
import { toggleTaskInSource } from '~/draw/material/note/markdown.ts';
import {
  NOTE_HEIGHT,
  NOTE_MAX_HEIGHT,
  NOTE_MAX_WIDTH,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
  NOTE_WIDTH,
} from '~/draw/material/note/model.ts';

export class BoardApp implements BoardContext {
  readonly view: View;
  readonly viewport: HTMLElement;
  readonly board: HTMLElement;
  readonly session: Session<BoardSpec, Op>;
  readonly selection: Selection;
  tool: Tool = 'select';
  ink = '#1f3fd0';
  private counter = 0;
  private readonly notes: Notes;
  private readonly editor: Editor;
  private readonly exporter: Exporter;
  private readonly files: Files;
  private readonly handles: Handles;

  constructor(spec: BoardSpec) {
    this.viewport = must<HTMLElement>('[data-gs="viewport"]');
    this.board = must<HTMLElement>('[data-gs="board"]');
    this.view = new View(this.viewport, this.board);
    this.selection = new Selection(this.board, (id) => this.element(id));
    this.session = new Session<BoardSpec, Op>({
      kind: 'board',
      spec,
      apply,
      invert,
      onPatch: (reply) => this.absorb(reply),
      onStatus: (state) => this.status(state),
    });
    this.counter = spec.items.length;

    this.notes = new Notes(this);
    this.editor = new Editor(this, (id, on) => this.notes.editing(id, on));
    this.exporter = new Exporter(
      this,
      (text) => this.status(text === '' ? 'saved' : 'saving', text),
      (message) => toast(message, 'error'),
    );

    this.handles = new Handles(this);
    this.selection.watch(() => this.handles.update());
    this.notes.adopt();
    this.bindTools();
    this.bindSelection();
    this.bindTasks();
    new Gestures(this, {
      editor: this.editor,
      create: (kind, at) => this.create(kind, at),
      edit: (id) => this.editor.edit(id),
      zoomed: () => this.showZoom(),
      gone: (id) => this.notes.forget(id),
      eraseNoteInk: (id, index) => this.notes.eraseInk(id, index),
    }).bind();
    // A press anywhere but the note being drawn on puts that note's pen down.
    this.viewport.addEventListener(
      'pointerdown',
      (event) => {
        const id = this.notes.drawing;
        const on = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-gs="item"]');
        if (id && on?.dataset.gsId !== id) this.notes.stopDrawing();
        // A press on the bare board puts the settings panel away too.
        if (!on) this.notes.closeSettings();
      },
      { capture: true },
    );
    this.bindKeys();
    this.files = new Files(this, (message) => toast(message, 'error'));
    this.files.bind();
    this.bindBar();
    this.session.listen();
    this.setTool('select');
    this.fitAll();
    this.showEmpty();
    this.focusFromAddress();
  }

  /**
   * Arriving from a search result: frame the thing that was found, and say which it is.
   *
   * The address carries the item, not a position, so a link still lands on the right note
   * after it has been moved.
   */
  private focusFromAddress(): void {
    const id = new URLSearchParams(window.location.search).get('focus');
    if (!id) return;
    const bounds = this.exporter.contentBounds([id]);
    if (!bounds) return;
    this.view.frame(bounds, 96);
    this.selection.set(id, true);
    this.element(id)?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }],
      { duration: 520, iterations: 2, easing: 'ease-in-out', composite: 'add' },
    );
  }

  /** The hint on an empty sheet, shown only while there is nothing else on it. */
  private showEmpty(): void {
    const hint = document.querySelector<HTMLElement>('[data-gs="empty"]');
    // The hint is a slip taped to the middle of an empty board. On an empty page, the page
    // itself says it: a blank sheet needs no note telling you it is blank.
    if (hint) hint.hidden = this.session.spec.items.length > 0 || 'gsSheet' in this.board.dataset;
  }

  // ---------------------------------------------------------------- context

  items(): Map<string, BoardItem> {
    return new Map(this.session.spec.items.map((item) => [item.id, item]));
  }

  element(id: string): HTMLElement | null {
    return this.board.querySelector<HTMLElement>(`[data-gs-id="${CSS.escape(id)}"]`);
  }

  place(element: HTMLElement | SVGElement, at: [number, number]): void {
    const x = at[0] - this.view.origin.x;
    const y = at[1] - this.view.origin.y;
    // A stroke inside a shared svg is a group, and a group is placed by a transform.
    if (element instanceof SVGGElement) {
      element.dataset.gsAt = `${x},${y}`;
      element.style.transform = `translate(${x}px, ${y}px) rotate(var(--tilt, 0deg))`;
      return;
    }
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  }

  nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}-${Math.random().toString(36).slice(2, 7)}`;
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    this.viewport.dataset.tool = tool;
    // On a phone the inks only come up while something that draws is in hand.
    document.querySelector('[data-gs="tray"]')?.toggleAttribute('data-inking', DRAWING.has(tool));
    for (const button of document.querySelectorAll<HTMLElement>('[data-gs="tool"]')) {
      button.setAttribute('aria-pressed', String(button.dataset.gsTool === tool));
    }
    // Every tool put down the note's pen except the one it most looked like it should: Select.
    this.notes.stopDrawing();
    if (tool !== 'select') {
      this.selection.clear();
      this.notes.closeSettings();
    }
  }

  // ---------------------------------------------------------------- tools

  private bindTools(): void {
    for (const button of document.querySelectorAll<HTMLElement>('[data-gs="tool"]')) {
      button.addEventListener('click', () => {
        const tool = button.dataset.gsTool as Tool;
        if (tool === 'image') {
          must<HTMLInputElement>('[data-gs="file"]').click();
          return;
        }
        this.setTool(tool);
      });
    }
    for (const swatch of document.querySelectorAll<HTMLElement>('[data-gs="ink"]')) {
      swatch.addEventListener('click', () => {
        this.ink = swatch.dataset.gsInk ?? this.ink;
        for (const other of document.querySelectorAll<HTMLElement>('[data-gs="ink"]')) {
          other.setAttribute('aria-pressed', String(other === swatch));
        }
      });
    }
  }

  // ---------------------------------------------------------------- items

  private create(kind: 'sticky' | 'text' | 'label', at: Point): void {
    const id = this.nextId(kind);
    const z = topZ(this.session.spec) + 1;
    const block: BoardItem['block'] =
      kind === 'sticky'
        ? { kind: 'note', text: 'New note' }
        : kind === 'label'
          ? { kind: 'label', text: 'label' }
          : { kind: 'text', text: 'Text', hand: true, colour: this.ink };
    const item: BoardItem = {
      id,
      at: [Math.round(at.x), Math.round(at.y)],
      z,
      block,
      // A note is CUT to a size, not flowed to fit its text, so it is given one here and the
      // item's box is that same number. A 260px box around a 240px sheet is what the
      // selection outline was drawing before.
      ...(kind === 'sticky' ? { size: [NOTE_WIDTH, NOTE_HEIGHT] as [number, number] } : {}),
    };
    /*
     * Straight into editing: a note you have to click twice to write in is a note you stop
     * making.
     *
     * When it ARRIVES, not after a guess at how long that takes. It was a 60ms timer, and a
     * reply slower than that found no element to edit and opened nothing -- so the words typed
     * next went to the keyboard shortcuts instead, and "fresh" typed into a new note picked
     * the pan tool on its final h.
     */
    this.editNext = id;
    this.session.run([{ op: 'add', item }], '');
  }

  /** A just-made item to open for writing the moment its markup is on the page. */
  private editNext: string | undefined;

  // ---------------------------------------------------------------- updates

  private absorb(reply: PatchReply): void {
    for (const id of reply.removed) {
      this.element(id)?.remove();
      this.selection.drop(id);
    }
    // Moved or reordered, nothing more: the element already on screen is the right one, it
    // only has to be put where the model now says. Never under a hand, which knows better.
    for (const place of reply.placed ?? []) {
      const element = this.element(place.id);
      if (!element || element.classList.contains('is-dragging')) continue;
      this.place(element, place.at);
      element.style.zIndex = String(place.z);
    }
    for (const change of reply.changed) {
      if (!change.html) continue;
      const existing = this.element(change.id);
      /*
       * Never swap an element out from under a hand.
       *
       * Picking a note up raises it, raising it is a patch, and the patch comes back with
       * fresh markup for that item -- so the element being dragged was replaced mid-grab,
       * taking its pointer listeners and its `is-dragging` class with it. The note simply
       * stopped moving, with no error anywhere.
       *
       * The same replacement is also wasteful for a move: the position is already applied
       * locally, so identical markup means there is nothing to do.
       */
      if (existing?.classList.contains('is-dragging')) continue;
      if (existing && existing.outerHTML === change.html) continue;
      // A changed stroke arrives as its own svg. One that lived in a shared run leaves it,
      // and the fresh one goes on the board -- not inside the run, where an svg in an svg is
      // placed by rules it does not follow.
      const inRun = existing?.closest('.ink-run') !== null && existing !== null;
      if (inRun) existing?.remove();
      const holder = document.createElement('div');
      // The markup came from our own renderer on our own server; it is not
      // untrusted input, and there is no other way to put a rendered item on
      // the page without re-implementing the renderer in the browser.
      holder.innerHTML = change.html;
      const fresh = holder.firstElementChild as HTMLElement | null;
      if (!fresh) continue;
      if (this.selection.has(change.id)) fresh.dataset.selected = '1';
      if (existing && !inRun) {
        this.notes.forget(change.id);
        existing.replaceWith(fresh);
      } else {
        this.board.append(fresh);
      }
    }
    // Anything that just arrived is paper too.
    this.notes.adopt();
    if (this.editNext && this.element(this.editNext)) {
      const id = this.editNext;
      this.editNext = undefined;
      this.editor.edit(id);
    }
    this.showEmpty();
    this.handles.update();
  }

  // ---------------------------------------------------------------- selection

  /** Run some arranging, and keep the selection on what was arranged. */
  private arrangeWith(ops: Op[], label = ''): void {
    if (ops.length > 0) this.session.run(ops, label);
  }

  private bindSelection(): void {
    const ids = (): string[] => this.selection.list();
    const edges: Array<[string, arrange.Edge]> = [
      ['align-left', 'left'],
      ['align-centre', 'centre'],
      ['align-right', 'right'],
      ['align-top', 'top'],
      ['align-middle', 'middle'],
      ['align-bottom', 'bottom'],
    ];
    for (const [gs, edge] of edges)
      onClick(gs, () => this.arrangeWith(arrange.align(this, ids(), edge)));
    onClick('spread-x', () => this.arrangeWith(arrange.spread(this, ids(), 'x')));
    onClick('spread-y', () => this.arrangeWith(arrange.spread(this, ids(), 'y')));
    onClick('group', () => this.groupSelection());
    onClick('ungroup', () => this.arrangeWith(arrange.ungroup(this, ids())));
    onClick('front', () => this.arrangeWith(arrange.reorder(this, ids(), 'front')));
    onClick('send', () => this.arrangeWith(arrange.reorder(this, ids(), 'back')));
    onClick('duplicate', () => this.duplicateSelection());
    onClick('lock-selection', () => this.arrangeWith(arrange.toggleLock(this, ids())));
    onClick('delete-selection', () => this.removeSelection());
  }

  private groupSelection(): void {
    this.arrangeWith(arrange.group(this, this.selection.list()));
    toast('grouped: they move together now');
  }

  private duplicateSelection(): void {
    const { ops, made } = arrange.duplicate(this, this.selection.list());
    if (ops.length === 0) return;
    this.session.run(ops, '');
    // The copies arrive in the reply; select them once they are on the page.
    window.setTimeout(() => {
      this.selection.clear();
      for (const id of made) this.selection.set(id, true);
    }, 120);
  }

  private removeSelection(): void {
    const ops: Op[] = this.selection.list().map((id) => ({ op: 'remove', id }));
    if (ops.length === 0) return;
    this.selection.clear();
    this.session.run(ops, '');
    // The undo is ON the message, not only on a key: removing is one keystroke, and a board
    // that lost three screenshots to a stray Backspace should be one click from having them.
    toast(ops.length === 1 ? 'removed' : `${ops.length} things removed`, 'info', {
      label: 'undo',
      run: () => this.session.undo(),
    });
  }

  /**
   * Ticking a checklist in a note.
   *
   * The source is edited, not the box: the note is a pure rendering of its markdown, so the
   * tick is a new text and the server draws the note again. The same edit an agent would
   * post.
   */
  private bindTasks(): void {
    this.board.addEventListener('change', (event) => {
      const box = (event.target as HTMLElement).closest<HTMLInputElement>('[data-gs="note-task"]');
      const id = box?.closest<HTMLElement>('[data-gs="item"]')?.dataset.gsId;
      if (!box || !id) return;
      const block = this.items().get(id)?.block;
      if (block?.kind !== 'note') return;
      const text = toggleTaskInSource(block.text, Number(box.dataset.gsIndex ?? 0), box.checked);
      this.session.run([{ op: 'update', id, patch: { block: { ...block, text } } }], 'tick');
    });
  }

  // ---------------------------------------------------------------- chrome

  private bindBar(): void {
    onClick('undo', () => this.session.undo());
    onClick('redo', () => this.session.redo());
    onClick('zoom-in', () => {
      this.view.zoomBy(1.25);
      this.showZoom();
    });
    onClick('zoom-out', () => {
      this.view.zoomBy(0.8);
      this.showZoom();
    });
    onClick('zoom', () => {
      this.view.reset();
      this.showZoom();
    });
    onClick('fit', () => this.fitAll());
    onClick('pdf', () => this.exporter.savePdf());
    onClick('png', () => void this.exporter.savePng());
    onClick('svg', () => void this.exporter.saveSvg());
    // The server already writes the file and names it; the button only has to ask for it.
    onClick('backup', () => {
      window.location.href = '/api/archive';
      toast('the backup is on its way to your downloads');
    });
    onClick('restore', () => must<HTMLInputElement>('[data-gs="restore-file"]').click());
    const restore = document.querySelector<HTMLInputElement>('[data-gs="restore-file"]');
    restore?.addEventListener('change', () => {
      const file = restore.files?.[0];
      if (file) void this.files.take(file, undefined);
      restore.value = '';
    });
    /*
     * The palette and the paper are the board's own, and the page's stylesheet was built for
     * them, so choosing another is a patch and then a fresh page -- the one change here that
     * cannot be made by swapping an item's markup.
     */
    const reloadWith = (patch: Partial<BoardSpec>): void => {
      this.session.run([{ op: 'board', patch }], '');
      window.setTimeout(() => window.location.reload(), 160);
    };
    for (const swatch of document.querySelectorAll<HTMLElement>('[data-gs="palette-choice"]')) {
      swatch.addEventListener('click', () =>
        reloadWith({ palette: swatch.dataset.gsPalette ?? 'studio' }),
      );
    }
    for (const chip of document.querySelectorAll<HTMLElement>('[data-gs="paper-choice"]')) {
      chip.addEventListener('click', () =>
        reloadWith({ paper: (chip.dataset.gsPaper ?? 'squared') as BoardSpec['paper'] & string }),
      );
    }
    this.view.watch(() => this.showZoom());
  }

  private showZoom(): void {
    const label = document.querySelector<HTMLElement>('[data-gs="zoom"]');
    if (label) label.textContent = `${Math.round(this.view.zoom * 100)}%`;
  }

  private status(state: 'saved' | 'saving' | 'offline', text: string = state): void {
    const element = document.querySelector<HTMLElement>('[data-gs="saved"]');
    if (!element) return;
    element.dataset.state = state;
    // Offline says what it is holding, so nobody closes the tab thinking it is all saved.
    element.textContent = state === 'offline' ? `offline · ${this.session.unsent} waiting` : text;
    const undo = document.querySelector<HTMLButtonElement>('[data-gs="undo"]');
    const redo = document.querySelector<HTMLButtonElement>('[data-gs="redo"]');
    if (undo) undo.disabled = !this.session.canUndo;
    if (redo) redo.disabled = !this.session.canRedo;
  }

  /** Frame everything on the board. Named fitAll because a bare `fit` reads as
   * a focused test to the linter, which is a fair thing for it to think. */
  private fitAll(): void {
    // A page has an edge, and "everything" on it is the whole sheet.
    const sheet = this.board.dataset.gsSheet?.split(',').map(Number);
    if (sheet && sheet.length === 2) {
      // Clear of the bar above and the tray below, which would otherwise cover its edges.
      // On a phone the width is what runs out, so the margin shrinks with it.
      const margin = Math.min(104, window.innerWidth * 0.06);
      this.view.frame({ x: 0, y: 0, w: sheet[0] ?? 560, h: sheet[1] ?? 790 }, margin);
      this.showZoom();
      return;
    }
    const bounds = this.exporter.contentBounds();
    this.view.frame(bounds ?? { x: 0, y: 0, w: 1200, h: 800 });
    this.showZoom();
  }

  // ---------------------------------------------------------------- notes

  /** The one note selected, if exactly one thing is selected and it is a note. */
  private onlyNote(): string | undefined {
    const ids = this.selection.list();
    if (ids.length !== 1) return undefined;
    const id = ids[0] as string;
    return this.items().get(id)?.block?.kind === 'note' ? id : undefined;
  }

  private resizeNote(id: string, dw: number, dh: number): void {
    const item = this.items().get(id);
    if (!item || item.locked) return;
    const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
    const w = clamp((item.size?.[0] ?? NOTE_WIDTH) + dw, NOTE_MIN_WIDTH, NOTE_MAX_WIDTH);
    const h = clamp((item.size?.[1] ?? NOTE_HEIGHT) + dh, NOTE_MIN_HEIGHT, NOTE_MAX_HEIGHT);
    this.session.run([{ op: 'update', id, patch: { size: [w, h] } }], `resize:${id}`);
  }

  /**
   * A selected note's own keys, from the extension: Enter to write, D to draw on it, C for the
   * next colour, S for its settings, L to lock it, M to fold it away.
   *
   * They win over the tool keys only while exactly one note is selected, which is exactly when
   * a person pressing L means that note and not the label tool. Matched by position too, so
   * they work on a Persian keyboard.
   */
  private noteKey(event: KeyboardEvent, letter: string | null): boolean {
    const id = this.onlyNote();
    if (!id || event.altKey) return false;
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      this.editor.edit(id);
      return true;
    }
    const actions: Record<string, 'pen' | 'palette' | 'settings' | 'lock' | 'collapse'> = {
      d: 'pen',
      c: 'palette',
      s: 'settings',
      l: 'lock',
      m: 'collapse',
    };
    const action = letter ? actions[letter] : undefined;
    if (!action) return false;
    event.preventDefault();
    this.notes.act(id, action);
    return true;
  }

  // ---------------------------------------------------------------- keys

  private bindKeys(): void {
    const keys = new Map<string, Tool>();
    for (const button of document.querySelectorAll<HTMLElement>('[data-gs="tool"]')) {
      const key = button.dataset.gsKey;
      const tool = button.dataset.gsTool as Tool | undefined;
      if (key && tool) keys.set(key, tool);
    }
    window.addEventListener('keydown', (event) => {
      if (typing(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && letterOf(event) === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.session.redo();
        else this.session.undo();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (this.selection.size > 0) {
          event.preventDefault();
          this.removeSelection();
        }
        return;
      }
      if (event.key === 'Escape') {
        // Escape closes whatever is open, the way it does everywhere else: the settings panel
        // only closed when focus happened to be inside it, and stayed open over the board.
        this.notes.closeSettings();
        this.notes.stopDrawing();
        this.selection.clear();
        this.setTool('select');
        return;
      }
      // [ and ] turn the selection fifteen degrees; with Alt, one. By the key's place, not its
      // letter, so a Persian layout turns things too.
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        (event.code === 'BracketLeft' || event.code === 'BracketRight')
      ) {
        if (this.selection.size > 0) {
          event.preventDefault();
          const step = event.altKey ? 1 : 15;
          this.handles.turnBy(event.code === 'BracketLeft' ? -step : step);
        }
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      const letter = letterOf(event);
      if (mod && !event.altKey) {
        const chord: Record<string, () => void> = {
          a: () => {
            for (const item of this.session.spec.items) this.selection.set(item.id, true);
          },
          d: () => this.duplicateSelection(),
          g: () =>
            event.shiftKey
              ? this.arrangeWith(arrange.ungroup(this, this.selection.list()))
              : this.groupSelection(),
        };
        const act = letter ? chord[letter] : undefined;
        if (act) {
          event.preventDefault();
          act();
        }
        return;
      }
      if (event.key.startsWith('Arrow') && this.selection.size > 0) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        const only = this.onlyNote();
        if (event.altKey && only) {
          this.resizeNote(only, dx * 10, dy * 10);
          return;
        }
        this.arrangeWith(arrange.nudge(this, this.selection.list(), dx, dy), 'nudge');
        return;
      }
      if (this.noteKey(event, letter)) return;
      if (event.altKey) return;
      if (event.key === '0') {
        this.fitAll();
        return;
      }
      if (event.key === '1') {
        this.view.reset();
        return;
      }
      // By position when the layout gives no Latin letter, so V is still select on a Persian
      // keyboard. Matched on the character alone, every tool key did nothing there.
      const tool = letter ? keys.get(letter) : undefined;
      if (tool) {
        event.preventDefault();
        this.setTool(tool);
      }
    });
  }
}

export async function bootBoard(): Promise<BoardApp> {
  const board = must<HTMLElement>('[data-gs="board"]');
  const id = board.dataset.gsId ?? 'workspace';
  const res = await fetch(`/api/state?kind=board&id=${encodeURIComponent(id)}`);
  const { spec } = (await res.json()) as { spec: BoardSpec };
  return new BoardApp(spec);
}
