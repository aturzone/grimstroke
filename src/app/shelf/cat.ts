/**
 * The shelf cat, alive.
 *
 * A ginger tabby that lives on the bookcase. It walks the planks and sometimes trots; sits,
 * blinking, with its tail flicking; washes; yawns and curls up asleep -- on a book lying flat,
 * if there is one -- and stretches when it wakes; crouches, leaps and lands between shelves.
 * Pressed near, it looks up and then trots off; while a book is being carried it watches it.
 *
 * It never takes a press meant for a book (it listens, it does not catch), and under reduced
 * motion it is simply asleep. The drawing is in cat-art.ts; this is only what it does.
 */

import {
  CAT_COLOURS,
  CAT_FRAMES,
  CAT_GROUND,
  CAT_H,
  CAT_W,
  type CatPose,
  catFrame,
} from '~/app/shelf/cat-art.ts';

/** Room pixels per grid pixel. */
const PX = 2;

interface Ledge {
  /** The top of the plank, in the room's own pixels. */
  y: number;
  left: number;
  right: number;
  /** Books lying flat on it: somewhere to sleep, at their own height. */
  beds: Array<{ x: number; w: number; top: number }>;
}

/** One thing the cat is doing, and when it is done. */
type Act =
  | { kind: 'go'; to: number; pose: 'walk' | 'trot' }
  | { kind: 'hold'; pose: CatPose; until: number; then?: Act[] }
  | { kind: 'jump'; from: [number, number]; to: [number, number]; ledge: number; t0: number };

function toUri(pose: CatPose, n: number): string {
  const g = catFrame(pose, n);
  const canvas = document.createElement('canvas');
  canvas.width = CAT_W;
  canvas.height = CAT_H;
  const c = canvas.getContext('2d');
  if (!c) return '';
  for (let y = 0; y < CAT_H; y++) {
    for (let x = 0; x < CAT_W; x++) {
      const colour = CAT_COLOURS[g[y]?.[x] ?? '.'];
      if (!colour) continue;
      c.fillStyle = colour;
      c.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL('image/png');
}

export class ShelfCat {
  private el: HTMLElement | undefined;
  private room: HTMLElement | undefined;
  private readonly frames = new Map<string, string>();
  private ledges: Ledge[] = [];
  private at = { x: 60, y: 0, ledge: 0 };
  private facing = 1;
  private pose: CatPose = 'sit';
  /** When the current pose began, so its frames play from the first. */
  private since = 0;
  private queue: Act[] = [];
  private act: Act | undefined;
  private raf = 0;
  private last = 0;
  private watching: { x: number } | undefined;

  constructor() {
    // Listening, never catching: a press on a book under the cat is still the book's.
    document.addEventListener('pointerdown', (event) => this.poked(event), true);
  }

  start(room: HTMLElement | null): void {
    if (!room) return;
    this.el?.remove();
    cancelAnimationFrame(this.raf);
    const el = document.createElement('div');
    el.className = 'shelf-cat';
    el.setAttribute('aria-hidden', 'true');
    el.style.width = `${CAT_W * PX}px`;
    el.style.height = `${CAT_H * PX}px`;
    room.append(el);
    this.el = el;
    this.room = room;
    this.measure(room);
    if (!this.ledges.length) return;
    const home = this.ledges[Math.min(this.at.ledge, this.ledges.length - 1)] ?? this.ledges[0];
    if (!home) return;
    this.at = {
      x: Math.min(Math.max(this.at.x, home.left), home.right),
      y: home.y,
      ledge: this.ledges.indexOf(home),
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.bed();
      this.set('sleep');
      this.draw(performance.now());
      return;
    }
    this.last = performance.now();
    this.queue = [];
    this.act = undefined;
    const loop = (now: number): void => {
      this.raf = requestAnimationFrame(loop);
      if (document.hidden) {
        this.last = now;
        return;
      }
      this.step(now, Math.min(0.1, (now - this.last) / 1000));
      this.last = now;
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Where the planks are, and what lies flat on them, in the room's own pixels. */
  private measure(room: HTMLElement): void {
    const scale = Number(room.style.getPropertyValue('--case-scale')) || 1;
    const box = room.getBoundingClientRect();
    this.ledges = [...room.querySelectorAll<HTMLElement>('[data-shelf="use"] .case-plank')].map(
      (plank) => {
        const r = plank.getBoundingClientRect();
        const shelf = plank.closest<HTMLElement>('[data-gs="shelf"]');
        const beds = [...(shelf?.querySelectorAll<HTMLElement>('.spine[data-flat]') ?? [])].map(
          (s) => {
            const b = s.getBoundingClientRect();
            return {
              x: (b.left - box.left) / scale,
              w: b.width / scale,
              top: (b.top - box.top) / scale,
            };
          },
        );
        return {
          y: (r.top - box.top) / scale - 6,
          left: (r.left - box.left) / scale + 10,
          right: (r.right - box.left) / scale - CAT_W * PX - 10,
          beds,
        };
      },
    );
  }

  private get ledge(): Ledge | undefined {
    return this.ledges[this.at.ledge];
  }

  private set(pose: CatPose): void {
    if (pose !== this.pose) this.since = performance.now();
    this.pose = pose;
  }

  /** To the book lying flat on this shelf, if there is one: the best bed on a bookcase. */
  private bed(): boolean {
    const bed = this.ledge?.beds[0];
    if (!bed) return false;
    this.at.x = Math.round(bed.x + bed.w / 2 - (CAT_W * PX) / 2);
    this.at.y = bed.top + 2;
    return true;
  }

  private hold(pose: CatPose, ms: number, then?: Act[]): Act {
    return { kind: 'hold', pose, until: 0 + ms, ...(then ? { then } : {}) };
  }

  /** What next: a short routine, chosen the way a cat chooses -- mostly at random. */
  private plan(): Act[] {
    const ledge = this.ledge;
    if (!ledge) return [this.hold('sit', 2000)];
    const r = Math.random();
    const somewhere = (): number =>
      Math.round(ledge.left + Math.random() * (ledge.right - ledge.left));
    if (r < 0.34)
      return [
        { kind: 'go', to: somewhere(), pose: 'walk' },
        this.hold('sit', 1500 + Math.random() * 2500),
      ];
    if (r < 0.44) return [{ kind: 'go', to: somewhere(), pose: 'trot' }, this.hold('sit', 1200)];
    if (r < 0.6) return [this.hold('sit', 1800 + Math.random() * 2400)];
    if (r < 0.7) return [this.hold('groom', 3000), this.hold('sit', 800)];
    if (r < 0.8 && this.ledges.length > 1) {
      const next = Math.max(
        0,
        Math.min(this.ledges.length - 1, this.at.ledge + (Math.random() < 0.5 ? -1 : 1)),
      );
      const target = this.ledges[next];
      if (!target || next === this.at.ledge) return [this.hold('sit', 1500)];
      const x = Math.round(
        Math.min(target.right, Math.max(target.left, this.at.x + (Math.random() - 0.5) * 220)),
      );
      return [
        this.hold('crouch', 380),
        { kind: 'jump', from: [this.at.x, this.at.y], to: [x, target.y], ledge: next, t0: 0 },
        this.hold('land', 240),
        this.hold('sit', 900),
      ];
    }
    // Sleepy: a yawn, curl up (on a flat book if there is one), sleep, wake, stretch.
    return [
      this.hold('yawn', 900),
      this.hold('sleep', 9000 + Math.random() * 12000),
      this.hold('stretch', 1100),
      this.hold('sit', 700),
    ];
  }

  private begin(act: Act, now: number): void {
    if (act.kind === 'hold') {
      act.until = now + act.until;
      if (act.pose === 'sleep') this.bed();
      else if (this.ledge) this.at.y = this.ledge.y;
      // Now and then, while sitting, a blink or a flick of the tail.
      this.set(act.pose);
    } else if (act.kind === 'go') {
      if (this.ledge) this.at.y = this.ledge.y;
      this.facing = act.to >= this.at.x ? 1 : -1;
      this.set(act.pose);
    } else {
      act.t0 = now;
      act.from = [this.at.x, this.at.y];
      this.facing = act.to[0] >= this.at.x ? 1 : -1;
      this.set('leap');
    }
    this.act = act;
  }

  private step(now: number, dt: number): void {
    if (this.watching && this.act?.kind !== 'jump') {
      // A book is being carried: sit up and watch it.
      this.facing = this.watching.x >= this.at.x + (CAT_W * PX) / 2 ? 1 : -1;
      this.set('look');
      this.draw(now);
      return;
    }
    if (!this.act) {
      if (!this.queue.length) this.queue = this.plan();
      const next = this.queue.shift();
      if (next) this.begin(next, now);
    }
    const act = this.act;
    if (act?.kind === 'go') {
      const speed = act.pose === 'trot' ? 78 : 34;
      const d = act.to - this.at.x;
      if (Math.abs(d) <= speed * dt) {
        this.at.x = act.to;
        this.act = undefined;
      } else this.at.x += Math.sign(d) * speed * dt;
    } else if (act?.kind === 'jump') {
      const t = Math.min(1, (now - act.t0) / 620);
      this.at.x = act.from[0] + (act.to[0] - act.from[0]) * t;
      this.at.y =
        act.from[1] +
        (act.to[1] - act.from[1]) * t -
        Math.sin(Math.PI * t) * (Math.max(0, act.from[1] - act.to[1]) * 0.3 + 54);
      if (t >= 1) {
        this.at.ledge = act.ledge;
        this.at.y = act.to[1];
        this.act = undefined;
      }
    } else if (act?.kind === 'hold') {
      if (act.pose === 'sit') {
        // A blink every few seconds; a tail flick less often.
        const age = now - this.since;
        if (this.pose === 'sit' && age > 900 && Math.random() < dt * 0.5)
          this.set(Math.random() < 0.65 ? 'blink' : 'flick');
        else if (
          (this.pose === 'blink' || this.pose === 'flick') &&
          age > (1000 * CAT_FRAMES[this.pose].count) / CAT_FRAMES[this.pose].fps
        )
          this.set('sit');
      }
      if (now >= act.until) this.act = undefined;
    }
    this.draw(now);
  }

  /** Pressed on or near the cat: it looks up at you, then trots off somewhere else. */
  private poked(event: PointerEvent): void {
    const el = this.el;
    const ledge = this.ledge;
    if (!el || !ledge || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const near =
      event.clientX > r.left - 12 &&
      event.clientX < r.right + 12 &&
      event.clientY > r.top - 12 &&
      event.clientY < r.bottom + 12;
    if (!near || this.act?.kind === 'jump') return;
    const away =
      this.at.x > (ledge.left + ledge.right) / 2
        ? ledge.left + Math.random() * 120
        : ledge.right - Math.random() * 120;
    this.act = undefined;
    this.queue = [
      this.hold('look', 650),
      { kind: 'go', to: Math.round(away), pose: 'trot' },
      this.hold('sit', 1600),
    ];
  }

  /** A book is being carried at this point on the screen (or no longer, with nothing). */
  follow(clientX?: number): void {
    if (clientX === undefined || !this.room) {
      this.watching = undefined;
      return;
    }
    const scale = Number(this.room.style.getPropertyValue('--case-scale')) || 1;
    this.watching = { x: (clientX - this.room.getBoundingClientRect().left) / scale };
  }

  private image(pose: CatPose, n: number): string {
    const key = `${pose}:${n}`;
    let uri = this.frames.get(key);
    if (!uri) {
      uri = toUri(pose, n);
      this.frames.set(key, uri);
    }
    return uri;
  }

  private draw(now: number): void {
    const el = this.el;
    if (!el) return;
    const spec = CAT_FRAMES[this.pose];
    const n = Math.floor(((now - this.since) / 1000) * spec.fps) % spec.count;
    // Held on its last frame rather than looping: a stretch or a yawn happens once.
    const once =
      this.pose === 'stretch' ||
      this.pose === 'yawn' ||
      this.pose === 'crouch' ||
      this.pose === 'land' ||
      this.pose === 'look';
    const frame = once
      ? Math.min(spec.count - 1, Math.floor(((now - this.since) / 1000) * spec.fps))
      : n;
    el.style.backgroundImage = `url(${this.image(this.pose, frame)})`;
    const x = Math.round(this.at.x);
    const y = Math.round(this.at.y - CAT_GROUND * PX);
    el.style.transform = `translate(${x}px, ${y}px) scaleX(${this.facing})`;
  }
}
