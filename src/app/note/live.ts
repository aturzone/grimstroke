/**
 * A note you can pick up.
 *
 * The paper feel, brought over from chevaletNote: the sheet tilts away from the direction you
 * are moving it, spins about the corner you grabbed, shears a little, curls at the far corner,
 * and lags behind the pointer before settling. All of it is analytic damped springs, and only
 * `transform` and `opacity` change per frame, so it stays on the compositor.
 *
 * Where it differs from the extension, and why: there a note owns its own position, driven by
 * two springs. Here the board owns the position -- an item is at `at`, and that is the thing
 * an agent patches. So the springs drive an OFFSET from wherever the board put it, and on
 * release the offset is folded into the model and rebased to zero without the sheet moving on
 * screen. One position, one owner, and the paper still lags.
 */

import { leverFrom, TUNING as POSE, poseFromVelocity, smoothing } from '~/app/motion/pose.ts';
import { type Animatable, type Spring, snap, spring, step } from '~/app/motion/spring.ts';
import { smooth as smoothPath } from '~/draw/look/hand.ts';
import { CURL_LEVELS, curlPath, tapeStrip, tornRectPath } from '~/draw/look/paper.ts';
import {
  NOTE_HEIGHT,
  NOTE_MAX_HEIGHT,
  NOTE_MAX_WIDTH,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
  NOTE_WIDTH,
} from '~/draw/material/note/model.ts';

const TUNING = {
  pos: { w: 34, z: 1.0 },
  lift: { w: 28, z: 1.0 },
  rz: { w: 16, z: 0.58 },
  tilt: { w: 18, z: 0.55 },
  skew: { w: 20, z: 0.62 },
  curl: { w: 14, z: 0.7 },
} as const;

/** The six things a note's own toolbar can do. Same six as the extension, in the same order. */
export type NoteAction = 'pen' | 'settings' | 'palette' | 'lock' | 'collapse' | 'delete';

export interface NoteHost {
  /** The drag finished here, in board units relative to where it started. */
  moved(id: string, dx: number, dy: number): void;
  /** Bring this one to the top of the pile. */
  raise(id: string): void;
  /**
   * May the note take this press at all? Only with the pointer in hand: with a pen, the
   * sticky tool or the pan tool held, a press on a note belongs to that tool.
   */
  canGrab(): boolean;
  /** Picked up, so chosen: with Shift, added to what is already chosen. */
  select(id: string, add: boolean): void;
  wake(): void;
  /** A grip was let go. Width and height in board units. */
  resized(id: string, w: number, h: number): void;
  /** A toolbar button was pressed. */
  act(id: string, action: NoteAction, note: LiveNote): void;
  /** The camera's scale, so a grip drag in screen pixels becomes board units. */
  zoom(): number;
  /** A stroke was drawn on the sheet, in the note's own coordinates. */
  inked(id: string, stroke: { d: string; colour: string; weight: number; tool: string }): void;
  /** What the tray currently has selected, for a stroke drawn on a note. */
  nib(): { colour: string; weight: number; tool: string };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * One note on the board, with its physics.
 *
 * `item` is the positioned box the board owns; `note` is the paper inside it. The springs
 * write to both: the offset goes on the item, the pose goes on the sheet.
 */
export class LiveNote implements Animatable {
  readonly id: string;
  private readonly item: HTMLElement;
  private readonly note: HTMLElement | null;
  private readonly card: HTMLElement;
  private readonly face: HTMLElement;
  private readonly shadow: SVGElement | null;
  private readonly curlPaths: SVGPathElement[];

  /* The art the app re-cuts while a grip is dragged. */
  private readonly paperSvg: SVGSVGElement | null;
  private readonly paperPaths: SVGPathElement[];
  private readonly tapeGroup: SVGGElement | null;
  private readonly curlSvg: SVGSVGElement | null;
  private readonly inkSvg: SVGSVGElement | null;
  private readonly shadowPath: SVGPathElement | null;

  /** The sheet's size in board units. The paper is cut to it, so it is tracked, not measured. */
  private w: number;
  private h: number;

  private readonly px: Spring;
  private readonly py: Spring;
  private readonly lz: Spring;
  private readonly rz: Spring;
  private readonly rx: Spring;
  private readonly ry: Spring;
  private readonly sk: Spring;
  private readonly curl: Spring;

  private grabbed = false;
  /** True while a textarea is open over this note's body. */
  editing = false;
  private pointerId: number | null = null;
  private grabX = 0;
  private grabY = 0;
  private lever = 0;
  private vx = 0;
  private vy = 0;
  private lastT = 0;
  private promoted = false;
  private readonly host: NoteHost;

  constructor(item: HTMLElement, host: NoteHost) {
    this.item = item;
    this.host = host;
    this.id = item.dataset.gsId ?? '';
    const note = item.querySelector<HTMLElement>('.note');
    this.note = note;
    this.card = note?.querySelector<HTMLElement>('.card') ?? item;
    this.face = note?.querySelector<HTMLElement>('.face') ?? item;
    this.shadow = note?.querySelector<SVGElement>('.shadow') ?? null;
    this.curlPaths = [...(note?.querySelectorAll<SVGPathElement>('.curl-level') ?? [])];

    this.paperSvg = note?.querySelector<SVGSVGElement>('.paper') ?? null;
    this.paperPaths = [
      ...(note?.querySelectorAll<SVGPathElement>('.paper-fill, .paper-halftone') ?? []),
    ];
    this.tapeGroup = note?.querySelector<SVGGElement>('.cn-tape') ?? null;
    this.curlSvg = note?.querySelector<SVGSVGElement>('.curl') ?? null;
    this.inkSvg = note?.querySelector<SVGSVGElement>('.note-ink') ?? null;
    this.shadowPath = note?.querySelector<SVGPathElement>('.shadow path') ?? null;
    // The size is read off the face's inline style, which is where the renderer wrote it.
    this.w = Number.parseFloat(this.face.style.width) || NOTE_WIDTH;
    this.h = Number.parseFloat(this.face.style.height) || NOTE_HEIGHT;

    const eps = 0.05;
    this.px = spring(TUNING.pos.w, TUNING.pos.z, eps, 0);
    this.py = spring(TUNING.pos.w, TUNING.pos.z, eps, 0);
    this.lz = spring(TUNING.lift.w, TUNING.lift.z, 0.002, 0);
    this.rz = spring(TUNING.rz.w, TUNING.rz.z, 0.01, 0);
    this.rx = spring(TUNING.tilt.w, TUNING.tilt.z, 0.01, 0);
    this.ry = spring(TUNING.tilt.w, TUNING.tilt.z, 0.01, 0);
    this.sk = spring(TUNING.skew.w, TUNING.skew.z, 0.01, 0);
    this.curl = spring(TUNING.curl.w, TUNING.curl.z, 0.002, 0);

    /*
     * A NOTE IS PICKED UP ANYWHERE ON THE SHEET, not only by the strip at its top.
     *
     * In the extension a note floats over somebody else's web page and the header is the one
     * part that is unambiguously the note's, so that is what it is dragged by. On a board
     * every object is grabbed where you see it -- and a 30px handle is 24px at 80% zoom and
     * 9px at 30%, which is why a board full of notes felt like it could not be worked with
     * at all.
     *
     * The handle is still the handle: it keeps the grab cursor, and it is what a double
     * click on the body has to get past. The rest of the sheet simply also works.
     */
    const handle = note?.querySelector<HTMLElement>('.handle') ?? item;
    handle.addEventListener('pointerdown', this.onGrab);
    this.face.addEventListener('pointerdown', this.onGrab);
    note
      ?.querySelector('.grips')
      ?.addEventListener('pointerdown', this.onGripDown as EventListener);
    this.face.addEventListener('pointerdown', this.onInkDown as EventListener);
    // Delegated, so the buttons survive the note being re-rendered inside the same item.
    note?.querySelector('.actions')?.addEventListener('click', this.onAction as EventListener);
    // A collapsed note is a tab, and a tab is pressed to open it again. Without this the
    // only way back was the toolbar button that collapsing had just hidden.
    handle.addEventListener('dblclick', this.onHandleDouble as EventListener);
  }

  // ---------------------------------------------------------------- chrome

  private readonly onAction = (e: MouseEvent): void => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-gs^="note-"]');
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();
    this.host.act(this.id, button.dataset.gs?.slice(5) as NoteAction, this);
  };

  private readonly onHandleDouble = (e: MouseEvent): void => {
    if (!this.note?.hasAttribute('data-collapsed')) return;
    e.preventDefault();
    e.stopPropagation();
    this.host.act(this.id, 'collapse', this);
  };

  /** Mark a toolbar button as on, for the modes that have one. */
  mark(action: NoteAction, on: boolean): void {
    this.note?.querySelector(`.act-${action}`)?.classList.toggle('is-on', on);
  }

  get element(): HTMLElement {
    return this.item;
  }

  get sheet(): HTMLElement | null {
    return this.note;
  }

  get size(): [number, number] {
    return [this.w, this.h];
  }

  // ---------------------------------------------------------------- resize

  /**
   * A grip.
   *
   * The sheet is resized LIVE and the paper is re-cut at every step, because a torn edge that
   * only catches up when you let go means you are dragging a rectangle and being shown a note
   * afterwards. The tear is seeded by the note's id, so re-cutting it at a new size gives the
   * same edge stretched along, not a different sheet every frame.
   */
  private readonly onGripDown = (e: PointerEvent): void => {
    const grip = (e.target as HTMLElement).closest<HTMLElement>('.grip');
    if (!grip || e.button !== 0 || this.item.dataset.gsLocked) return;
    e.preventDefault();
    e.stopPropagation();

    const dir = grip.dataset.grip ?? 'se';
    const startX = e.clientX;
    const startY = e.clientY;
    const w0 = this.w;
    const h0 = this.h;
    const zoom = this.host.zoom() || 1;
    this.note?.classList.add('is-resizing');
    try {
      grip.setPointerCapture(e.pointerId);
    } catch {
      // Losing the capture only means the resize ends when the pointer leaves the grip.
    }

    const move = (ev: PointerEvent): void => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      const w = dir === 's' ? w0 : clamp(w0 + dx, NOTE_MIN_WIDTH, NOTE_MAX_WIDTH);
      const h = dir === 'e' ? h0 : clamp(h0 + dy, NOTE_MIN_HEIGHT, NOTE_MAX_HEIGHT);
      this.resize(Math.round(w), Math.round(h));
    };
    const up = (): void => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      this.note?.classList.remove('is-resizing');
      if (this.w !== w0 || this.h !== h0) this.host.resized(this.id, this.w, this.h);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };

  // ---------------------------------------------------------------- ink

  /**
   * Drawing on the sheet.
   *
   * In the note's own coordinates, so the stroke belongs to the note: it moves with it, it is
   * re-themed with it, and it goes when it goes. Board ink is a different object lying on the
   * plane -- a line drawn ACROSS two notes belongs to neither.
   */
  private readonly onInkDown = (e: PointerEvent): void => {
    if (!this.note?.hasAttribute('data-drawing') || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.act, .grip')) return;
    e.preventDefault();
    e.stopPropagation();

    const svg = this.inkSvg;
    if (!svg) return;
    const nib = this.host.nib();
    const points: Array<{ x: number; y: number }> = [this.toSheet(e)];
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', `ink-stroke tool-${nib.tool}`);
    path.setAttribute('style', `--stroke:${nib.colour};--stroke-weight:${nib.weight}px`);
    svg.append(path);

    try {
      this.face.setPointerCapture(e.pointerId);
    } catch {
      // Without capture the stroke ends when the pointer leaves the sheet, which is fine.
    }

    const move = (ev: PointerEvent): void => {
      const at = this.toSheet(ev);
      const last = points[points.length - 1];
      // A point per pixel is a path nobody can store; two units apart is under a nib width.
      if (last && Math.hypot(at.x - last.x, at.y - last.y) < 2) return;
      points.push(at);
      path.setAttribute('d', smoothPath(points));
    };
    const up = (): void => {
      this.face.removeEventListener('pointermove', move);
      this.face.removeEventListener('pointerup', up);
      this.face.removeEventListener('pointercancel', up);
      const d = smoothPath(points);
      // The server's re-render brings the stroke back as part of the note, so the preview
      // element is removed rather than left behind as a second copy of the same line.
      path.remove();
      if (points.length > 1 && d) {
        this.host.inked(this.id, { d, colour: nib.colour, weight: nib.weight, tool: nib.tool });
      }
    };
    this.face.addEventListener('pointermove', move);
    this.face.addEventListener('pointerup', up);
    this.face.addEventListener('pointercancel', up);
  };

  /** A pointer, in the sheet's own units. */
  private toSheet(e: PointerEvent): { x: number; y: number } {
    const box = this.face.getBoundingClientRect();
    // From the face's own box rather than the camera, so it stays right whatever the note is
    // nested in -- the width it occupies on screen divided by the width it thinks it is.
    const kx = box.width / this.w || 1;
    const ky = box.height / this.h || 1;
    return { x: (e.clientX - box.left) / kx, y: (e.clientY - box.top) / ky };
  }

  /** Set the sheet's size and re-cut every piece of art that depends on it. */
  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.item.style.width = `${w}px`;
    this.item.style.height = `${h}px`;
    this.face.style.width = `${w}px`;
    this.face.style.height = `${h}px`;
    this.repaper();
  }

  /**
   * Re-cut the paper at the current size.
   *
   * The same pure functions the server rendered it with, called with the same seed -- so the
   * sheet the app draws mid-drag and the sheet the server sends back afterwards are the same
   * bytes, and letting go produces no flicker.
   */
  private repaper(): void {
    const note = this.note;
    if (!note) return;
    const seed = note.dataset.id ?? this.id;
    const box = `0 0 ${this.w} ${this.h}`;
    const amplitude = Number(note.dataset.torn ?? 2.4);
    const torn = tornRectPath(this.w, this.h, seed, { amplitude });

    for (const path of this.paperPaths) path.setAttribute('d', torn);
    this.shadowPath?.setAttribute('d', torn);
    this.paperSvg?.setAttribute('viewBox', box);
    this.shadow?.setAttribute('viewBox', box);
    this.curlSvg?.setAttribute('viewBox', box);
    // Ink is in the note's own units, so the box grows and the strokes stay where they were
    // drawn. Scaling it instead would stretch a drawing every time the sheet was resized.
    this.inkSvg?.setAttribute('viewBox', box);

    const mode = note.dataset.tape ?? 'one';
    const corners: Array<0 | 1 | 2 | 3> = mode === 'none' ? [] : mode === 'one' ? [0] : [0, 2];
    if (this.tapeGroup) {
      const strips = [...this.tapeGroup.querySelectorAll<SVGPathElement>('.tape-strip')];
      corners.forEach((corner, i) => {
        const strip = tapeStrip(this.w, this.h, corner, seed);
        const path = strips[i];
        if (!path) return;
        path.setAttribute('d', strip.d);
        path.setAttribute('transform', strip.transform);
      });
    }

    for (const [i, path] of this.curlPaths.entries()) {
      path.setAttribute('d', curlPath(this.w, this.h, i / (CURL_LEVELS - 1)));
    }
  }

  private get quiet(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private readonly onGrab = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    /*
     * The toolbar is checked BEFORE the lock, because the lock button is on the toolbar.
     *
     * Checked the other way round, a locked note swallowed the press on its own controls:
     * you could lock a note and then had no way to unlock it, rename it, recolour it or
     * delete it ever again. Locking pins a note to the board; it does not take its buttons
     * away.
     */
    // The sheet carries controls and text as well as paper. A press on any of them is not
    // a press on the note.
    const on = e.target as HTMLElement;
    if (on.closest('.grip') || this.note?.hasAttribute('data-drawing')) return;
    if (e.currentTarget === this.face && on.closest('.body') && this.editing) return;
    // A checkbox in a checklist, and a link, are pressed, not picked up. The same capture
    // trap as the toolbar: stop the event here or the click is retargeted to the viewport.
    if (on.closest('.md-check, .body a')) {
      e.stopPropagation();
      return;
    }
    if (on.closest('.act')) {
      /*
       * A toolbar button. Let it have its click -- but stop the event here anyway.
       *
       * The board captures the pointer to the viewport on every pointerdown, and a captured
       * pointer is retargeted: the click is delivered to the viewport instead of the button
       * that was pressed, so every one of these six buttons did nothing at all and did it
       * silently. Not preventDefault, though; that would suppress the click as well.
       */
      e.stopPropagation();
      return;
    }
    // The buttons above work whatever is in hand; the sheet itself is only picked up with the
    // pointer. With a pen, a sticky or the pan tool held, the press belongs to that tool.
    if (this.item.dataset.gsLocked || !this.host.canGrab()) return;
    e.preventDefault();
    e.stopPropagation();

    const box = this.item.getBoundingClientRect();
    this.grabbed = true;
    this.pointerId = e.pointerId;
    this.grabX = e.clientX;
    this.grabY = e.clientY;
    // Where on the sheet it was grabbed. This is what makes yanking a corner SWING the note
    // rather than slide it.
    this.lever = leverFrom(e.clientX - box.left, box.width);
    this.lastT = performance.now();
    this.vx = 0;
    this.vy = 0;
    this.lz.t = 1;
    this.item.classList.add('is-dragging');
    this.promote(true);
    /*
     * Picking a note up chooses it.
     *
     * The note takes the press for its own physics and stops it there, so the board's own
     * selection never heard about it: a note could be dragged, but not deleted with the Delete
     * key, not given to the selection bar and not answer its own shortcut keys, unless it had
     * been caught in a marquee first.
     */
    this.host.select(this.id, e.shiftKey);
    this.host.raise(this.id);

    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // A capture that fails just means the drag ends if the pointer leaves the handle.
    }
    target.addEventListener('pointermove', this.onMove);
    target.addEventListener('pointerup', this.onRelease);
    target.addEventListener('pointercancel', this.onRelease);
    this.host.wake();
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (!this.grabbed || e.pointerId !== this.pointerId) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - this.lastT) / 1000);
    this.lastT = now;

    const dx = e.clientX - this.grabX;
    const dy = e.clientY - this.grabY;
    this.px.t = dx;
    this.py.t = dy;

    // Smoothed pointer velocity, frame-rate independent.
    const a = smoothing(dt, POSE.tau);
    this.vx += (e.movementX / dt - this.vx) * a;
    this.vy += (e.movementY / dt - this.vy) * a;
    this.host.wake();
  };

  private readonly onRelease = (e: PointerEvent): void => {
    if (!this.grabbed) return;
    this.grabbed = false;
    this.pointerId = null;
    this.lz.t = 0;
    this.item.classList.remove('is-dragging');
    const target = e.currentTarget as HTMLElement;
    target.removeEventListener('pointermove', this.onMove);
    target.removeEventListener('pointerup', this.onRelease);
    target.removeEventListener('pointercancel', this.onRelease);

    // Fold the offset into the model and rebase the springs by the same amount, so the board
    // now owns the position and the sheet does not move on screen while that happens.
    const dx = this.px.t;
    const dy = this.py.t;
    if (dx !== 0 || dy !== 0) {
      this.host.moved(this.id, dx, dy);
      this.px.x -= dx;
      this.py.x -= dy;
      this.px.t = 0;
      this.py.t = 0;
    }
    this.host.wake();
  };

  /** The board moved this item without a drag: jump, do not spring across the room. */
  rebase(): void {
    snap(this.px, 0);
    snap(this.py, 0);
    this.write();
  }

  step(dt: number): boolean {
    if (!this.quiet) {
      const pose = poseFromVelocity(this.vx, this.vy, this.lever, this.grabbed);
      this.rx.t = pose.rx;
      this.ry.t = pose.ry;
      this.rz.t = pose.rz;
      this.sk.t = pose.sk;
      this.curl.t = pose.curl;
      // Velocity decays on its own once the pointer stops moving.
      const decay = Math.exp(-dt / POSE.tau);
      this.vx *= decay;
      this.vy *= decay;
    }

    let live = false;
    for (const s of [this.px, this.py, this.lz, this.rz, this.rx, this.ry, this.sk, this.curl]) {
      if (step(s, dt)) live = true;
    }
    this.write();

    // Last-resort guard: a grab still open two seconds after the last pointer event is a
    // pointer we lost, not a slow user. Without this the loop can be held running forever.
    if (this.grabbed && performance.now() - this.lastT > 2000) {
      this.grabbed = false;
      this.pointerId = null;
      this.lz.t = 0;
      this.item.classList.remove('is-dragging');
    }
    return live || this.grabbed;
  }

  settle(): void {
    this.promote(false);
    this.write();
    this.rest();
  }

  /**
   * A sheet lying flat carries no transforms at all.
   *
   * At rest every spring is at zero, and the transforms written for them are identities --
   * but an identity transform is still a transform: it makes the element a stacking context
   * and a separately composited plane. On a board of notes that is real frame time spent on
   * moving nothing, so a settled note is given its plain markup back.
   */
  private rest(): void {
    if (this.grabbed) return;
    for (const s of [this.px, this.py, this.lz, this.rz, this.rx, this.ry, this.sk, this.curl]) {
      if (s.x !== 0) return;
    }
    this.item.style.transform = '';
    this.card.style.transform = '';
    this.face.style.transform = '';
    if (this.shadow) {
      this.shadow.style.transform = '';
      this.shadow.style.opacity = '';
    }
  }

  private promote(on: boolean): void {
    if (on === this.promoted) return;
    this.promoted = on;
    // Firefox has a will-change budget; permanently promoting every note silently disables
    // promotion for all of them. So it goes on for the drag and comes straight back off.
    this.item.style.willChange = on ? 'transform' : '';
    this.face.style.willChange = on ? 'transform' : '';
    this.item.classList.toggle('note-lifted', on);
  }

  private write(): void {
    const lift = this.lz.x;
    this.item.style.transform =
      `translate3d(${this.px.x.toFixed(2)}px, ${this.py.x.toFixed(2)}px, 0) ` +
      `rotate(${(Number(this.item.dataset.gsRotation ?? 0)).toFixed(2)}deg)`;
    this.card.style.transform =
      `rotateX(${this.rx.x.toFixed(2)}deg) rotateY(${this.ry.x.toFixed(2)}deg) ` +
      `translateZ(${(lift * 26).toFixed(2)}px)`;
    this.face.style.transform =
      `rotate(${this.rz.x.toFixed(2)}deg) skewX(${this.sk.x.toFixed(2)}deg) ` +
      `scale(${(1 + lift * 0.035).toFixed(4)})`;
    if (this.shadow) {
      this.shadow.style.transform =
        `translate3d(${(4 + lift * 10).toFixed(2)}px, ${(5 + lift * 14).toFixed(2)}px, 0) ` +
        `scale(${(1 + lift * 0.06).toFixed(4)})`;
      this.shadow.style.opacity = (0.18 + lift * 0.18).toFixed(3);
    }

    // Cross-fade between the two nearest pre-baked curl paths. Opacity only: morphing a path
    // per frame is a main-thread repaint, and five static ones cost nothing.
    const t = this.curl.x * (CURL_LEVELS - 1);
    const i = Math.min(CURL_LEVELS - 2, Math.floor(t));
    const f = t - i;
    for (const [k, path] of this.curlPaths.entries()) {
      path.style.opacity = k === i ? String(1 - f) : k === i + 1 ? String(f) : '0';
    }
  }
}
