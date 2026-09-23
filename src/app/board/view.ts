/**
 * The camera.
 *
 * Pan and zoom are a transform on the board element and nothing else. Moving
 * it with left/top, or resizing it, repaints the whole board on every pointer
 * move -- a board with forty screenshots on it then moves at about four frames
 * a second. A transform is the one thing the browser will hand to the
 * compositor.
 *
 * Every coordinate in the app is in one of two spaces and they are never mixed:
 * SCREEN is client pixels from the viewport's top-left, BOARD is the
 * document's own units. Two functions convert, and nothing else does the
 * arithmetic inline -- which is the same discipline the page renderer applies
 * to rectangles on an image, and for the same reason.
 *
 * WHAT A FRAME COSTS, measured on a board of 200 items and 2000 strokes in Firefox:
 *
 *   - The transform is written as a plain inline `transform`, never through custom
 *     properties. Custom properties INHERIT, so writing --pan-x on the board invalidated the
 *     computed style of every one of its nine thousand descendants on every wheel event.
 *   - Nothing here reads layout while painting. The viewport's box is cached and refreshed
 *     on resize. The old paint wrote the
 *     transform and then read offsetWidth, which forced a synchronous layout of the whole
 *     board, once per pointer event.
 *   - Writes are batched to one per animation frame. A trackpad delivers several wheel
 *     events per frame and each one used to restyle the board.
 */

export interface Point {
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.08;
/** The furthest out that framing will go. Past this a note is a coloured smudge. */
export const MIN_FIT = 0.2;
export const MAX_ZOOM = 6;

/**
 * Below this zoom a note's fine print is drawn at a few pixels: its toolbar icons are three
 * pixels across and its grain is invisible. The board says so, and the stylesheet stops
 * drawing what nobody can see -- at a fifth of full size, with everything on screen at once,
 * that detail was a measurable share of every frame.
 */
const FAR = 0.4;

/** How far the ruling tile overhangs the viewport, so a translate never shows its edge. */
const OVERHANG = 384;

export class View {
  readonly viewport: HTMLElement;
  readonly board: HTMLElement;
  /** The board's own origin: the board coordinate its top-left corner is at. */
  readonly origin: Point;

  private panX = 0;
  private panY = 0;
  private scale = 1;
  private onChange: (() => void) | undefined;
  private pending = 0;
  private box: DOMRect;
  private readonly rule: { wrap: HTMLElement; tile: HTMLElement } | undefined;
  private readonly base: { fine: number; coarse: number };
  private period = 0;
  private readonly listeners = new Set<() => void>();

  constructor(viewport: HTMLElement, board: HTMLElement) {
    this.viewport = viewport;
    this.board = board;
    const [ox, oy] = (board.dataset.gsOrigin ?? '0,0').split(',').map(Number);
    this.origin = { x: ox ?? 0, y: oy ?? 0 };
    this.box = viewport.getBoundingClientRect();

    const styles = getComputedStyle(board);
    this.base = {
      fine: Number.parseFloat(styles.getPropertyValue('--rule-p')) || 0,
      coarse: Number.parseFloat(styles.getPropertyValue('--rule-p2')) || 0,
    };
    const wrap = viewport.querySelector<HTMLElement>('[data-gs="rule"]');
    if (wrap) {
      const tile = document.createElement('div');
      tile.className = 'gs-rule-tile';
      wrap.append(tile);
      this.rule = { wrap, tile };
      if (!this.base.fine) tile.style.display = 'none';
    }

    const measure = (): void => {
      this.box = viewport.getBoundingClientRect();
      this.period = 0;
      this.schedule();
    };
    window.addEventListener('resize', measure);
    new ResizeObserver(measure).observe(viewport);
  }

  watch(fn: () => void): void {
    this.onChange = fn;
  }

  /** Told after every painted frame in which the camera moved. */
  listen(fn: () => void): void {
    this.listeners.add(fn);
  }

  get zoom(): number {
    return this.scale;
  }

  get pan(): Point {
    return { x: this.panX, y: this.panY };
  }

  /** The viewport's box on screen, as last measured. */
  get screen(): DOMRect {
    return this.box;
  }

  /** Screen pixels from the viewport's top-left, to board units. */
  toBoard(screen: Point): Point {
    return {
      x: (screen.x - this.box.left - this.panX) / this.scale + this.origin.x,
      y: (screen.y - this.box.top - this.panY) / this.scale + this.origin.y,
    };
  }

  /** Board units back to screen pixels. */
  toScreen(board: Point): Point {
    return {
      x: (board.x - this.origin.x) * this.scale + this.panX + this.box.left,
      y: (board.y - this.origin.y) * this.scale + this.panY + this.box.top,
    };
  }

  /** The rectangle of board units currently on screen. */
  visible(): { x: number; y: number; w: number; h: number } {
    const a = this.toBoard({ x: this.box.left, y: this.box.top });
    return { x: a.x, y: a.y, w: this.box.width / this.scale, h: this.box.height / this.scale };
  }

  /** A length in board units, as it appears on screen. */
  scaled(length: number): number {
    return length * this.scale;
  }

  moveBy(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
    this.schedule();
  }

  /**
   * Zoom about a point on screen, so the board unit under the cursor stays
   * under the cursor. Zooming about the origin instead makes the thing you were
   * looking at leave the screen, which feels like the app fighting you.
   */
  zoomTo(next: number, about: Point): void {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (clamped === this.scale) return;
    const sx = about.x - this.box.left;
    const sy = about.y - this.box.top;
    const ratio = clamped / this.scale;
    this.panX = sx - (sx - this.panX) * ratio;
    this.panY = sy - (sy - this.panY) * ratio;
    this.scale = clamped;
    this.schedule();
  }

  zoomBy(factor: number, about?: Point): void {
    const box = this.box;
    this.zoomTo(
      this.scale * factor,
      about ?? { x: box.left + box.width / 2, y: box.top + box.height / 2 },
    );
  }

  reset(): void {
    this.zoomBy(1 / this.scale);
  }

  /** Put this board point in the middle of the screen, at the zoom there is. */
  centre(at: Point): void {
    this.panX = this.box.width / 2 - (at.x - this.origin.x) * this.scale;
    this.panY = this.box.height / 2 - (at.y - this.origin.y) * this.scale;
    this.schedule();
  }

  /** Frame a rectangle of board units, with a margin, without exceeding 1:1. */
  frame(rect: { x: number; y: number; w: number; h: number }, margin?: number): void {
    const box = this.box;
    if (rect.w <= 0 || rect.h <= 0) return;
    // Proportional, not a fixed 80px. On a 390px phone a fixed margin was 40% of the screen,
    // so framing a board came out at 15% and nothing on it could be read.
    const gap = margin ?? Math.min(72, Math.min(box.width, box.height) * 0.06);
    const fit = Math.min((box.width - gap * 2) / rect.w, (box.height - gap * 2) / rect.h);
    // Never magnifies -- filling the screen with one sticky note because it is the only thing
    // on the board is not what "fit" means to anybody -- and never shrinks past the point of
    // legibility either. Below about a fifth a note is a coloured smudge, and an overview
    // nobody can read is worse than one they have to pan.
    this.scale = Math.min(MAX_ZOOM, Math.max(MIN_FIT, Math.min(fit, 1)));
    this.panX = box.width / 2 - (rect.x + rect.w / 2 - this.origin.x) * this.scale;
    this.panY = box.height / 2 - (rect.y + rect.h / 2 - this.origin.y) * this.scale;
    this.paint();
  }

  /** One paint per frame, however many times the camera moved inside it. */
  private schedule(): void {
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      this.paint();
    });
  }

  private paint(): void {
    if (this.pending) {
      cancelAnimationFrame(this.pending);
      this.pending = 0;
    }
    const x = Math.round(this.panX);
    const y = Math.round(this.panY);
    this.board.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${this.scale})`;
    // Toggled, not rewritten, so the board is only restyled when the threshold is crossed.
    this.board.toggleAttribute('data-far', this.scale < FAR);
    this.paintRule(x, y);
    this.onChange?.();
    for (const fn of this.listeners) fn();
  }

  /**
   * Keep the ruling readable at every zoom.
   *
   * The layer is OUTSIDE the scaled board and positioned over exactly where the paper is on
   * screen. Inside it, the background was rasterised in board coordinates and resampled by
   * the transform: at 30% zoom the grid came out as plaid -- lines clumped into groups with
   * gaps, because each tile rounded to a different number of screen pixels and the error
   * accumulated across the sheet.
   *
   * Out here every tile is a whole number of screen pixels and every line is exactly one
   * pixel, at any zoom. The period steps by powers of two as the camera pulls back, so the
   * spacing stays in a band the eye reads as a grid rather than as texture -- and because it
   * only ever doubles, every line drawn is a line the paper itself has.
   *
   * AND IT IS MOVED, NOT REDRAWN. The first version repositioned its background and resized
   * itself on every frame, and that one layer cost more than the whole rest of the board: a
   * twelve-item workspace panned at 19fps and hiding the layer alone took it to 60. Now the
   * tile is a fixed size that overhangs the viewport, it is shifted by a transform modulo
   * the ruling's own period -- which looks identical, because a grid shifted by one period
   * is the same grid. The paper has no edge, so neither does the ruling. It is only
   * redrawn when the period steps.
   */
  private paintRule(x: number, y: number): void {
    const rule = this.rule;
    if (!rule) return;
    const { width: vw, height: vh } = this.box;
    if (!this.base.fine) return;
    // Snap to whole screen pixels. A tile of 16.2px is the plaid all over again, one tile
    // at a time.
    let period = this.base.fine * this.scale;
    while (period < 16) period *= 2;
    while (period > 64) period /= 2;
    period = Math.max(2, Math.round(period));
    const coarse = this.base.coarse ? period * (this.base.coarse / this.base.fine) : 0;

    const tile = rule.tile;
    if (period !== this.period) {
      this.period = period;
      tile.style.width = `${Math.ceil(vw) + OVERHANG * 2}px`;
      tile.style.height = `${Math.ceil(vh) + OVERHANG * 2}px`;
      // Written directly. The paper's own size is declared at the root, where its var() has
      // already been resolved against the paper's period, so overriding --rule-p down here
      // would change nothing.
      tile.style.backgroundSize = coarse
        ? [coarse, coarse, period, period].map((n) => `${n}px ${n}px`).join(', ')
        : `${period}px ${period}px`;
    }
    // The grid repeats every period -- every coarse period, on graph paper -- so a shift by
    // the pan modulo that is indistinguishable from a shift by the whole pan.
    const repeat = coarse || period;
    const mod = (n: number): number => ((n % repeat) + repeat) % repeat;
    tile.style.transform = `translate3d(${mod(x + OVERHANG)}px, ${mod(y + OVERHANG)}px, 0)`;
  }
}
