/**
 * What a pointer does on the board: pan, move, draw, erase, place, marquee, and the wheel.
 *
 * One state machine per press. The tool in hand decides what a press means, and the mode it
 * picks holds until the pointer comes up -- so a drag that started as a pan stays a pan even
 * if it crosses a note, and a stroke that crosses a photograph stays a stroke.
 */

import { withGroups } from '~/app/board/arrange.ts';
import type { BoardContext } from '~/app/board/context.ts';
import type { Editor } from '~/app/board/edit.ts';
import { Preview, pathOf } from '~/app/board/ink.ts';
import { DRAWING, isFill, PLACING, type Tool, weightOf } from '~/app/board/tools.ts';
import type { Point } from '~/app/board/view.ts';
import type { BoardItem, InkTool } from '~/draw/doc/board/model.ts';
import { topZ } from '~/draw/doc/board/patch.ts';

type Mode = 'idle' | 'pan' | 'move' | 'draw' | 'marquee' | 'erase' | 'pinch';

export interface GestureHost {
  editor: Editor;
  /** Put a new thing down where the pointer was pressed. */
  create(kind: 'sticky' | 'text' | 'label', at: Point): void;
  /** Open an item's words for editing. */
  edit(id: string): void;
  /** The camera moved; the zoom readout should say so. */
  zoomed(): void;
  /** An item left the board, by the eraser. */
  gone(id: string): void;
  /** Rub out one stroke drawn on a note: the note, and which of its strokes. */
  eraseNoteInk(id: string, index: number): void;
}

export class Gestures {
  private readonly ctx: BoardContext;
  private readonly host: GestureHost;
  private mode: Mode = 'idle';
  private start: Point = { x: 0, y: 0 };
  private last: Point = { x: 0, y: 0 };
  private stroke: Point[] = [];
  private strokeId = '';
  private preview: Preview | undefined;
  private moving: Array<{ id: string; from: [number, number]; to?: [number, number] }> = [];
  private marquee: HTMLElement | undefined;
  /** Every pointer currently down, for two-finger pinch and pan. */
  private readonly touches = new Map<number, Point>();
  private pinch: { distance: number; mid: Point } | undefined;

  constructor(ctx: BoardContext, host: GestureHost) {
    this.ctx = ctx;
    this.host = host;
  }

  bind(): void {
    const viewport = this.ctx.viewport;
    viewport.addEventListener('pointerdown', this.down);
    viewport.addEventListener('pointermove', this.move);
    viewport.addEventListener('pointerup', this.finish);
    viewport.addEventListener('pointercancel', this.finish);
    // Trackpad pinch arrives as a wheel event with ctrlKey set; a plain wheel
    // scrolls the board rather than the page, which has nowhere to go.
    viewport.addEventListener('wheel', this.wheel, { passive: false });
    viewport.addEventListener('dblclick', this.double);
    /*
     * A picture is an object on the board, not a file to drag out of the page.
     *
     * Firefox starts its own native drag the moment a pointer moves over an <img> with the
     * button held, and a native drag CANCELS the pointer stream -- so pressing a screenshot
     * and moving it did nothing at all: the item never moved, no error, every time. Notes
     * were unaffected only because they hold no image. Saying no to the native drag is what
     * lets the board's own drag have the gesture.
     */
    viewport.addEventListener('dragstart', (event) => event.preventDefault());
  }

  /**
   * Two fingers: pinch to zoom about the point between them, move them to pan.
   *
   * Whatever the first finger had started is abandoned -- a stroke begun by the first finger
   * of a pinch is not a stroke anybody meant to draw.
   */
  private startPinch(): void {
    const [a, b] = [...this.touches.values()] as [Point, Point];
    this.preview?.remove();
    this.preview = undefined;
    this.marquee?.remove();
    this.marquee = undefined;
    this.stroke = [];
    this.moving = [];
    this.mode = 'pinch';
    this.pinch = {
      distance: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  private readonly down = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size === 2) {
        this.startPinch();
        return;
      }
      if (this.touches.size > 2) return;
    }
    const tool: Tool = this.ctx.tool;
    if (event.button === 1 || (event.button === 0 && tool === 'pan') || event.altKey) {
      this.mode = 'pan';
    } else if (event.button !== 0) {
      return;
    }
    // Clicking away finishes the edit. Without this the box stayed open while the board
    // was panned, zoomed and drawn on, editing something nobody was looking at any more.
    if (this.host.editor.open && !(event.target as HTMLElement | null)?.closest('.gs-editing')) {
      this.host.editor.close();
    }

    /*
     * A capture that fails must not take the rest of the gesture with it.
     *
     * setPointerCapture throws for a pointer id that is not currently active -- a pointer
     * released between dispatch and handling, or a synthetic event. Unguarded, the throw
     * happened BEFORE the branches below, so the pen drew nothing, the marquee never
     * started and a tool click placed nothing, with a console error as the only sign.
     * Losing the capture only costs the gesture ending if the pointer leaves the viewport.
     */
    try {
      this.ctx.viewport.setPointerCapture(event.pointerId);
    } catch {
      // See above: the gesture continues without capture.
    }
    this.ctx.viewport.dataset.dragging = '1';
    this.start = { x: event.clientX, y: event.clientY };
    this.last = this.start;
    const hit = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-gs="item"]');

    if (this.mode === 'pan') return;

    if (DRAWING.has(tool)) {
      this.mode = 'draw';
      this.stroke = [this.ctx.view.toBoard(this.start)];
      this.strokeId = this.ctx.nextId('ink');
      return;
    }
    if (tool === 'eraser') {
      /*
       * An eraser is dragged across things, not clicked on them one at a time.
       *
       * And it hit-tests the POINT: board ink is `pointer-events: none` so that a stroke
       * never swallows a click meant for the note under it, which also meant the eraser
       * could never once hit a stroke -- the single thing anybody reaches for an eraser
       * to remove. The stylesheet re-enables hits on ink while this tool is held, and the
       * test is done against the pointer rather than the event's target.
       */
      this.mode = 'erase';
      this.eraseAt(this.start);
      return;
    }
    if (PLACING.has(tool)) {
      this.host.create(tool as 'sticky' | 'text' | 'label', this.ctx.view.toBoard(this.start));
      this.ctx.setTool('select');
      this.mode = 'idle';
      return;
    }

    // A note is picked up by its own handle, with its own physics. Letting the board's
    // generic drag take it too means two things move it at once, and it ends up wherever
    // the last writer said.
    if ((event.target as HTMLElement | null)?.closest('.note .handle')) {
      this.mode = 'idle';
      return;
    }

    const selection = this.ctx.selection;
    if (hit?.dataset.gsId && !hit.dataset.gsLocked) {
      if (!event.shiftKey && !selection.has(hit.dataset.gsId)) selection.clear();
      // A group is picked up whole: that is what grouping them was for.
      for (const id of withGroups(this.ctx, [hit.dataset.gsId])) selection.set(id, true);
      const items = this.ctx.items();
      this.moving = selection
        .list()
        .map((id) => ({ id, from: (items.get(id)?.at ?? [0, 0]) as [number, number] }))
        .filter((entry) => entry.from !== undefined);
      this.mode = 'move';
      return;
    }

    if (!event.shiftKey) selection.clear();
    this.mode = 'marquee';
    this.marquee = document.createElement('div');
    this.marquee.className = 'gs-marquee';
    this.ctx.viewport.append(this.marquee);
  };

  private readonly move = (event: PointerEvent): void => {
    if (this.touches.has(event.pointerId)) {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (this.mode === 'pinch' && this.pinch && this.touches.size >= 2) {
      const [a, b] = [...this.touches.values()] as [Point, Point];
      const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const { view } = this.ctx;
      view.moveBy(mid.x - this.pinch.mid.x, mid.y - this.pinch.mid.y);
      view.zoomTo(view.zoom * (distance / this.pinch.distance), mid);
      this.pinch = { distance, mid };
      this.host.zoomed();
      return;
    }
    if (this.mode === 'idle') return;
    const here: Point = { x: event.clientX, y: event.clientY };
    const { view } = this.ctx;
    if (this.mode === 'pan') {
      view.moveBy(here.x - this.last.x, here.y - this.last.y);
    } else if (this.mode === 'move') {
      /*
       * On screen now, in the model when the hand lets go.
       *
       * Every pointer event used to be a patch: forty events in a short drag were forty POSTs,
       * forty writes of the board to disk and forty items re-rendered on the server and sent
       * back. The elements are placed here directly, and the move is committed once.
       */
      const dx = (here.x - this.start.x) / view.zoom;
      const dy = (here.y - this.start.y) / view.zoom;
      for (const entry of this.moving) {
        entry.to = [Math.round(entry.from[0] + dx), Math.round(entry.from[1] + dy)];
        const element = this.ctx.element(entry.id);
        if (element) this.ctx.place(element, entry.to);
      }
    } else if (this.mode === 'erase') {
      this.eraseAt(here);
    } else if (this.mode === 'draw') {
      this.stroke.push(view.toBoard(here));
      this.drawPreview();
    } else if (this.mode === 'marquee' && this.marquee) {
      const box = this.ctx.viewport.getBoundingClientRect();
      const x = Math.min(this.start.x, here.x) - box.left;
      const y = Math.min(this.start.y, here.y) - box.top;
      this.marquee.style.cssText =
        `left:${x}px;top:${y}px;width:${Math.abs(here.x - this.start.x)}px;` +
        `height:${Math.abs(here.y - this.start.y)}px`;
    }
    this.last = here;
  };

  private readonly finish = (event: PointerEvent): void => {
    this.touches.delete(event.pointerId);
    if (this.mode === 'pinch') {
      // The pinch ends when the fingers do; one finger left behind does not start a drag.
      if (this.touches.size === 0) {
        this.mode = 'idle';
        this.pinch = undefined;
        delete this.ctx.viewport.dataset.dragging;
      }
      return;
    }
    delete this.ctx.viewport.dataset.dragging;
    if (this.mode === 'move') {
      const ops = this.moving
        .filter(
          (entry) => entry.to && (entry.to[0] !== entry.from[0] || entry.to[1] !== entry.from[1]),
        )
        .map((entry) => ({ op: 'move' as const, id: entry.id, at: entry.to as [number, number] }));
      if (ops.length > 0) this.ctx.session.run(ops, '');
    }
    if (this.mode === 'draw' && this.stroke.length > 1) this.commitStroke();
    if (this.mode === 'draw') {
      this.preview?.remove();
      this.preview = undefined;
    }
    if (this.mode === 'marquee' && this.marquee) {
      this.ctx.selection.within(this.start, { x: event.clientX, y: event.clientY });
      this.marquee.remove();
      this.marquee = undefined;
    }
    this.mode = 'idle';
    this.stroke = [];
    this.moving = [];
  };

  private readonly wheel = (event: WheelEvent): void => {
    event.preventDefault();
    const at = { x: event.clientX, y: event.clientY };
    const { view } = this.ctx;
    if (event.ctrlKey || event.metaKey) {
      view.zoomTo(view.zoom * (1 - event.deltaY / 400), at);
    } else {
      view.moveBy(-event.deltaX, -event.deltaY);
    }
    this.host.zoomed();
  };

  private readonly double = (event: MouseEvent): void => {
    /*
     * Hit-test the POINT, not the event's target.
     *
     * The viewport captures the pointer on every press, and a captured pointer has its
     * compatibility events -- click and dblclick included -- delivered to the element
     * holding the capture. So `event.target` was the viewport itself on every double
     * click, and double-clicking a note to write in it did nothing whatsoever.
     */
    const under = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const hit = (under ?? (event.target as HTMLElement | null))?.closest<HTMLElement>(
      '[data-gs="item"]',
    );
    if (hit?.dataset.gsId) this.host.edit(hit.dataset.gsId);
  };

  // ---------------------------------------------------------------- ink

  private band(): number | undefined {
    return isFill(this.ctx.tool) ? weightOf(this.ctx.tool) : undefined;
  }

  private drawPreview(): void {
    if (!this.preview) {
      this.preview = new Preview(this.ctx.board, {
        tool: this.ctx.tool,
        fill: isFill(this.ctx.tool),
        colour: this.ctx.ink,
        weight: weightOf(this.ctx.tool),
      });
    }
    const origin = this.ctx.view.origin;
    const local = this.stroke.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
    this.preview.draw(pathOf(local, this.band()));
  }

  private commitStroke(): void {
    const first = this.stroke[0] as Point;
    const local = this.stroke.map((p) => ({ x: p.x - first.x, y: p.y - first.y }));
    const tool = this.ctx.tool;
    const item: BoardItem = {
      id: this.strokeId,
      at: [Math.round(first.x), Math.round(first.y)],
      z: topZ(this.ctx.session.spec) + 1,
      ink: {
        d: pathOf(local, this.band()),
        colour: this.ctx.ink,
        weight: weightOf(tool),
        tool: tool as InkTool,
        ...(isFill(tool) ? { fill: true } : {}),
      },
    };
    this.ctx.session.run([{ op: 'add', item }], '');
  }

  /**
   * Rub out whatever is under this point.
   *
   * Locked items are left alone: a lock is there so that a pass with another tool cannot
   * destroy something, and an eraser is exactly the tool it is protecting against.
   */
  private eraseAt(at: Point): void {
    /*
     * Everything under the point, not only the top of it.
     *
     * elementFromPoint answers with the topmost thing, and a stroke that runs under a note or
     * a photograph was never topmost where it crossed one -- so rubbing along a line erased it
     * nowhere near the things it touched, and not at all where it was drawn over them. The
     * whole stack is searched for the first mark the eraser is allowed to take.
     */
    for (const under of document.elementsFromPoint(at.x, at.y) as HTMLElement[]) {
      // A stroke drawn on a note belongs to the note, and comes off it one stroke at a time.
      if (under.matches('.note-ink .ink-stroke, .note-ink path')) {
        const item = under.closest<HTMLElement>('[data-gs="item"]');
        const id = item?.dataset.gsId;
        if (!id || item?.dataset.gsLocked) continue;
        const strokes = [...(under.parentElement?.querySelectorAll('path') ?? [])];
        this.host.eraseNoteInk(id, strokes.indexOf(under as unknown as SVGPathElement));
        // Gone from the page now, not when the reply lands: the drag is still going, and a
        // stale path would be counted again and take the wrong stroke with it.
        under.remove();
        return;
      }
      /*
       * AN ERASER ERASES INK. IT DOES NOT DELETE YOUR WORK.
       *
       * The first version removed whatever item was under the pointer, and dragging is how an
       * eraser is used -- so one pass across a board at 30% zoom, where the whole board fits
       * on the screen, silently deleted every note, every screenshot and the title. There was
       * no confirmation, and reloading the page threw away the undo stack that could have
       * brought them back.
       *
       * A stroke is a mark on the surface and rubbing it out is what the tool is for. A note
       * or a photograph is an OBJECT lying on the surface: removing one is deliberate, and it
       * has its own delete button and the Delete key, both of which act on one named thing.
       */
      const hit = under.closest<HTMLElement>('[data-gs="item"]');
      const id = hit?.dataset.gsId;
      if (!id || hit?.dataset.gsLocked || !this.ctx.items().get(id)?.ink) continue;
      this.eraseItem(id);
      return;
    }
  }

  private eraseItem(id: string): void {
    this.ctx.session.run([{ op: 'remove', id }], 'erase');
    // Off the page at once, or the rest of the same pass finds it again and asks to remove
    // a stroke that is already gone.
    this.ctx.element(id)?.remove();
    this.ctx.selection.drop(id);
    this.host.gone(id);
  }
}
