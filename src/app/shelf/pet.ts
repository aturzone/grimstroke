/**
 * The pet who lives on the bookcase: a cat or a dog, in the coat chosen on the profile.
 *
 * It walks the planks and sometimes runs; sits, blinking, its tail moving; washes its face and
 * licks a leg clean (a cat) or has a scratch and a lick (a dog); yawns and curls up asleep -- on
 * a book lying flat if there is one -- and stretches when it wakes; leaps between shelves. Stroke
 * it with the pointer and it stops, leans in and is happy (hearts); put a bowl down and it goes
 * to eat. While a book is being carried it sits up and watches.
 *
 * Cheap on purpose. Every frame of the pet is drawn once into one sprite sheet; after that a
 * frame is a background-position. When nothing is moving across the shelf it does not run a
 * frame loop at all -- it wakes when the next frame is due -- and it stops when the page is
 * hidden or the bookcase is out of view. Under reduced motion it is asleep.
 *
 * WHOLE PIXELS. The bookcase is zoomed to fit the window (--case-scale, 0.56 to 1), and a pet
 * drawn inside it had its art pixels land on 1.1 or 1.7 screen pixels -- uneven, soft, some
 * pixels wider than others, which is most of why the old one looked wrong. So the pet is not in
 * the zoomed room: it stands in the room's un-zoomed parent, placed from room coordinates, at a
 * whole number of device pixels per art pixel chosen from the zoom (three at full size), and its
 * position is rounded to device pixels. Every art pixel is then a crisp, equal square.
 */

import {
  COATS,
  type Coat,
  colourOf,
  PET_FRAMES,
  PET_GROUND,
  PET_H,
  PET_W,
  type PetPose,
  POSES,
  petFrame,
  type Species,
} from '~/draw/material/pet/art.ts';
import type { Pet } from '~/draw/material/profile/model.ts';

/** Screen pixels per art pixel at full size; the zoom scales it, rounded to whole pixels. */
const PX = 3;

interface Ledge {
  y: number;
  left: number;
  right: number;
  beds: Array<{ x: number; w: number; top: number }>;
}

type Act =
  | { kind: 'go'; to: number; pose: 'walk' | 'run' }
  | { kind: 'hold'; pose: PetPose; ms: number; until?: number }
  | { kind: 'jump'; to: [number, number]; ledge: number; from?: [number, number]; t0?: number };

/** The sprite sheet for a pet and coat: one row per pose, one column per frame. Made once. */
const sheets = new Map<string, string>();
function sheet(species: Species, coat: Coat): string {
  const key = `${species}:${coat.id}`;
  const made = sheets.get(key);
  if (made) return made;
  const cols = Math.max(...POSES.map((p) => PET_FRAMES[p].count));
  const canvas = document.createElement('canvas');
  canvas.width = cols * PET_W;
  canvas.height = POSES.length * PET_H;
  const c = canvas.getContext('2d');
  if (!c) return '';
  POSES.forEach((pose, row) => {
    for (let n = 0; n < PET_FRAMES[pose].count; n++) {
      const g = petFrame(species, coat, pose, n);
      for (let y = 0; y < PET_H; y++) {
        for (let x = 0; x < PET_W; x++) {
          const colour = colourOf(coat, g[y]?.[x] ?? '.');
          if (!colour) continue;
          c.fillStyle = colour;
          c.fillRect(n * PET_W + x, row * PET_H + y, 1, 1);
        }
      }
    }
  });
  const uri = canvas.toDataURL('image/png');
  sheets.set(key, uri);
  return uri;
}

export class ShelfPet {
  private el: HTMLElement | undefined;
  private bowl: HTMLElement | undefined;
  private room: HTMLElement | undefined;
  private config: Pet = { species: 'cat', coat: 'ginger', on: true };
  private coat: Coat = COATS[0] as Coat;
  private ledges: Ledge[] = [];
  private at = { x: 80, y: 0, ledge: 0 };
  private facing = 1;
  private pose: PetPose = 'sit';
  private since = 0;
  private queue: Act[] = [];
  private act: Act | undefined;
  private timer = 0;
  private raf = 0;
  private last = 0;
  private visible = true;
  private watching: number | undefined;
  private petting = { strokes: 0, lastX: 0, lastDir: 0, until: 0 };
  private food: { x: number; ledge: number } | undefined;
  /** Which way to face when it reaches the bowl. */
  private faceBowl = 0;
  private drawn = '';
  private seen: IntersectionObserver | undefined;
  /** The room's zoom, CSS pixels per art pixel, and where the room's corner is in the layer. */
  private zoom = 1;
  private px = PX;
  private origin = { left: 0, top: 0 };

  constructor() {
    // Listening, never catching: a press or a stroke over the pet still reaches what is under it.
    document.addEventListener('pointerdown', (event) => this.poked(event), true);
    document.addEventListener('pointermove', (event) => this.stroked(event), { passive: true });
    document.addEventListener('visibilitychange', () => this.wake());
  }

  /** The pet's name, for the chrome ("feed Biscuit"). */
  get name(): string {
    return this.config.name || (this.config.species === 'dog' ? 'the dog' : 'the cat');
  }

  /** What it is doing, for a console or an agent driving a browser. */
  get state(): { species: string; coat: string; name: string; pose: PetPose; eating: boolean } {
    return {
      species: this.config.species,
      coat: this.coat.id,
      name: this.name,
      pose: this.pose,
      eating: this.food !== undefined,
    };
  }

  get out(): boolean {
    return this.config.on !== false && Boolean(this.el);
  }

  start(room: HTMLElement | null): void {
    if (!room) return;
    try {
      this.config = { ...this.config, ...(JSON.parse(room.dataset.pet ?? '{}') as Partial<Pet>) };
    } catch {
      // A missing or broken setting: the default pet.
    }
    this.el?.remove();
    this.bowl?.remove();
    this.el = undefined;
    this.stop();
    if (this.config.on === false) return;
    this.coat =
      COATS.find((c) => c.id === this.config.coat && c.species === this.config.species) ??
      (COATS.find((c) => c.species === this.config.species) as Coat);
    const el = document.createElement('div');
    el.className = 'shelf-pet';
    el.setAttribute('aria-hidden', 'true');
    el.style.backgroundImage = `url(${sheet(this.config.species, this.coat)})`;
    // Beside the room, not in it: the room is zoomed, and the pet must not be.
    (room.parentElement ?? room).append(el);
    this.el = el;
    this.room = room;
    this.measure();
    // One watcher for whether the bookcase is in view; the last room's is let go.
    this.seen?.disconnect();
    this.seen = new IntersectionObserver((seen) => {
      this.visible = seen.some((e) => e.isIntersecting);
      this.wake();
    });
    this.seen.observe(room);
    const home = this.ledges[Math.min(this.at.ledge, this.ledges.length - 1)] ?? this.ledges[0];
    if (!home) return;
    this.at = {
      x: Math.min(Math.max(this.at.x, home.left), home.right),
      y: home.y,
      ledge: this.ledges.indexOf(home),
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.set('sleep');
      this.bed();
      this.paint(performance.now());
      return;
    }
    this.queue = [];
    this.act = undefined;
    this.wake();
  }

  /** The window or the bookcase changed size: the pet's scale and its shelves with it. */
  refit(): void {
    if (!this.el) return;
    this.measure();
    this.drawn = '';
    this.paint(performance.now());
  }

  /** How wide the pet is, in the room's own pixels. */
  private get span(): number {
    return (PET_W * this.px) / this.zoom;
  }

  /**
   * The scale: whole device pixels per art pixel, as near the room's zoom as whole numbers go --
   * three at full size, two on a phone -- and where the room's corner is in the pet's layer.
   */
  private fitScale(): void {
    const room = this.room;
    const el = this.el;
    if (!room || !el) return;
    this.zoom = Number(room.style.getPropertyValue('--case-scale')) || 1;
    const dpr = window.devicePixelRatio || 1;
    // Rounded a little up: a pet a size too big beside the books reads better than one too small.
    const device = Math.max(1, Math.round(PX * this.zoom * dpr + 0.25));
    this.px = device / dpr;
    const cols = Math.max(...POSES.map((p) => PET_FRAMES[p].count));
    el.style.width = `${PET_W * this.px}px`;
    el.style.height = `${PET_H * this.px}px`;
    el.style.backgroundSize = `${cols * PET_W * this.px}px ${POSES.length * PET_H * this.px}px`;
    const layer = el.parentElement;
    if (!layer) return;
    const r = room.getBoundingClientRect();
    const l = layer.getBoundingClientRect();
    this.origin = {
      left: r.left - l.left + layer.scrollLeft - layer.clientLeft,
      top: r.top - l.top + layer.scrollTop - layer.clientTop,
    };
  }

  private measure(): void {
    const room = this.room;
    if (!room) return;
    this.fitScale();
    const scale = this.zoom;
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
          left: (r.left - box.left) / scale + 8,
          right: (r.right - box.left) / scale - this.span - 8,
          beds,
        };
      },
    );
  }

  private get ledge(): Ledge | undefined {
    return this.ledges[this.at.ledge];
  }

  private set(pose: PetPose): void {
    if (pose !== this.pose) this.since = performance.now();
    this.pose = pose;
  }

  private bed(): void {
    // Measured now, not when the room arrived: a redrawn room slides its books from where they
    // were, and a bed measured mid-slide put the pet asleep in mid-air off the side of the case.
    this.measure();
    const bed = this.ledge?.beds[0];
    if (!bed) return;
    this.at.x = Math.round(bed.x + bed.w / 2 - this.span / 2);
    this.at.y = bed.top + 2;
  }

  // ---------------------------------------------------------------- deciding

  private hold(pose: PetPose, ms: number): Act {
    return { kind: 'hold', pose, ms };
  }

  /** A short routine, chosen the way a pet chooses: mostly at random, with habits. */
  private plan(): Act[] {
    const ledge = this.ledge;
    if (!ledge) return [this.hold('sit', 3000)];
    const dog = this.config.species === 'dog';
    const r = Math.random();
    const somewhere = (): number =>
      Math.round(ledge.left + Math.random() * (ledge.right - ledge.left));
    if (r < 0.28)
      return [
        { kind: 'go', to: somewhere(), pose: 'walk' },
        this.hold('sit', 1800 + Math.random() * 2400),
      ];
    if (r < 0.36)
      return [{ kind: 'go', to: somewhere(), pose: 'run' }, this.hold(dog ? 'happy' : 'sit', 1400)];
    if (r < 0.5) return [this.hold('sit', 2500 + Math.random() * 3000)];
    if (r < 0.6) return [this.hold('wash', dog ? 1600 : 3200), this.hold('sit', 800)];
    if (r < 0.68) return [this.hold('lick', 3200), this.hold('sit', 700)];
    if (r < 0.74) return [this.hold('loaf', 5000 + Math.random() * 5000), this.hold('sit', 600)];
    if (r < 0.82 && this.ledges.length > 1) {
      const next = Math.max(
        0,
        Math.min(this.ledges.length - 1, this.at.ledge + (Math.random() < 0.5 ? -1 : 1)),
      );
      const target = this.ledges[next];
      if (!target || next === this.at.ledge) return [this.hold('sit', 1500)];
      const x = Math.round(
        Math.min(target.right, Math.max(target.left, this.at.x + (Math.random() - 0.5) * 200)),
      );
      return [
        this.hold('crouch', 350),
        { kind: 'jump', to: [x, target.y], ledge: next },
        this.hold('land', 220),
        this.hold('sit', 900),
      ];
    }
    return [
      this.hold('yawn', 1000),
      this.hold('sleep', 12000 + Math.random() * 16000),
      this.hold('stretch', 900),
      this.hold('sit', 600),
    ];
  }

  private begin(act: Act, now: number): void {
    if (act.kind === 'hold') {
      act.until = now + act.ms;
      if (act.pose === 'eat' && this.faceBowl) this.facing = this.faceBowl;
      if (act.pose === 'sleep' || act.pose === 'loaf') this.bed();
      else if (this.ledge) this.at.y = this.ledge.y;
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

  // ---------------------------------------------------------------- running, cheaply

  private stop(): void {
    window.clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
    this.timer = 0;
    this.raf = 0;
  }

  /** Something may have changed: take the next step now. */
  private wake(): void {
    this.stop();
    if (!this.el || document.hidden || !this.visible) return;
    this.last = performance.now();
    this.tick(this.last);
  }

  private moving(): boolean {
    return this.act?.kind === 'go' || this.act?.kind === 'jump';
  }

  private tick(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.step(now, dt);
    this.paint(now);
    if (document.hidden || !this.visible) return;
    if (this.moving()) {
      this.raf = requestAnimationFrame((t) => this.tick(t));
      return;
    }
    // Standing still: wake when the next frame is due, or the current act ends, whichever first.
    const spec = PET_FRAMES[this.pose];
    const frameIn = spec.count > 1 ? 1000 / spec.fps : 1e9;
    const actIn = this.act?.kind === 'hold' ? Math.max(0, (this.act.until ?? now) - now) : 0;
    const wait = Math.max(16, Math.min(frameIn, actIn || frameIn, 1000));
    this.timer = window.setTimeout(() => this.tick(performance.now()), wait);
  }

  private step(now: number, dt: number): void {
    if (this.watching !== undefined && this.act?.kind !== 'jump') {
      this.facing = this.watching >= this.at.x + this.span / 2 ? 1 : -1;
      this.set('look');
      return;
    }
    if (now < this.petting.until) {
      this.set('happy');
      return;
    }
    if (!this.act) {
      if (!this.queue.length) this.queue = this.plan();
      const next = this.queue.shift();
      if (next) this.begin(next, now);
    }
    const act = this.act;
    if (act?.kind === 'go') {
      const speed = act.pose === 'run' ? 90 : 36;
      const d = act.to - this.at.x;
      if (Math.abs(d) <= speed * dt) {
        this.at.x = act.to;
        this.act = undefined;
      } else this.at.x += Math.sign(d) * speed * dt;
    } else if (act?.kind === 'jump' && act.from && act.t0 !== undefined) {
      const t = Math.min(1, (now - act.t0) / 600);
      this.at.x = act.from[0] + (act.to[0] - act.from[0]) * t;
      this.at.y =
        act.from[1] +
        (act.to[1] - act.from[1]) * t -
        Math.sin(Math.PI * t) * (Math.max(0, act.from[1] - act.to[1]) * 0.3 + 50);
      if (t >= 1) {
        this.at.ledge = act.ledge;
        this.at.y = act.to[1];
        this.act = undefined;
      }
    } else if (act?.kind === 'hold') {
      if (act.pose === 'sit') {
        const age = now - this.since;
        if (this.pose === 'sit' && age > 1200 && Math.random() < 0.25)
          this.set(Math.random() < 0.6 ? 'blink' : 'flick');
        else if (
          (this.pose === 'blink' || this.pose === 'flick') &&
          age > (1000 * PET_FRAMES[this.pose].count) / PET_FRAMES[this.pose].fps
        )
          this.set('sit');
      }
      if (now >= (act.until ?? 0)) {
        this.act = undefined;
        if (act.pose === 'eat') this.finishMeal();
      }
    }
  }

  private paint(now: number): void {
    const el = this.el;
    if (!el) return;
    const spec = PET_FRAMES[this.pose];
    const elapsed = ((now - this.since) / 1000) * spec.fps;
    const once =
      this.pose === 'stretch' ||
      this.pose === 'yawn' ||
      this.pose === 'crouch' ||
      this.pose === 'land';
    const n = once
      ? Math.min(spec.count - 1, Math.floor(elapsed))
      : Math.floor(elapsed) % spec.count;
    const row = POSES.indexOf(this.pose);
    // Room coordinates to the layer's, rounded to device pixels so no art pixel is split.
    const dpr = window.devicePixelRatio || 1;
    const snap = (v: number): number => Math.round(v * dpr) / dpr;
    const x = snap(this.origin.left + this.at.x * this.zoom);
    const y = snap(this.origin.top + this.at.y * this.zoom - PET_GROUND * this.px);
    const next = `${n}:${row}:${x}:${y}:${this.facing}:${this.px}`;
    // Nothing is written to the page unless something about the picture changed.
    if (next === this.drawn) return;
    this.drawn = next;
    el.style.backgroundPosition = `${-n * PET_W * this.px}px ${-row * PET_H * this.px}px`;
    el.style.transform = `translate(${x}px, ${y}px) scaleX(${this.facing})`;
  }

  // ---------------------------------------------------------------- being touched

  private near(clientX: number, clientY: number, pad = 10): boolean {
    const r = this.el?.getBoundingClientRect();
    return Boolean(
      r &&
        clientX > r.left - pad &&
        clientX < r.right + pad &&
        clientY > r.top - pad &&
        clientY < r.bottom + pad,
    );
  }

  /** Pressed on: it looks up, then trots off. */
  private poked(event: PointerEvent): void {
    if (!this.el || this.act?.kind === 'jump' || !this.near(event.clientX, event.clientY)) return;
    const ledge = this.ledge;
    if (!ledge || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A pet being stroked is not startled by the press that began the stroke.
    if (performance.now() < this.petting.until) return;
    const away =
      this.at.x > (ledge.left + ledge.right) / 2
        ? ledge.left + Math.random() * 120
        : ledge.right - Math.random() * 120;
    this.act = undefined;
    this.queue = [
      this.hold('look', 600),
      { kind: 'go', to: Math.round(away), pose: 'run' },
      this.hold('sit', 1600),
    ];
    this.wake();
  }

  /**
   * Stroked: the pointer moving back and forth over it. A few strokes and it stops whatever it
   * was doing, leans in, and is happy for as long as the stroking goes on.
   */
  private stroked(event: PointerEvent): void {
    if (!this.el || event.buttons || !this.near(event.clientX, event.clientY, 0)) return;
    const p = this.petting;
    const dir = Math.sign(event.clientX - p.lastX);
    if (dir && dir !== p.lastDir) {
      p.strokes += 1;
      p.lastDir = dir;
    }
    p.lastX = event.clientX;
    if (p.strokes >= 3) {
      const was = performance.now() < p.until;
      p.until = performance.now() + 1400;
      if (!was) {
        this.act = undefined;
        this.queue = [];
        if (this.ledge && this.pose !== 'sleep') this.at.y = this.ledge.y;
        this.wake();
      }
    }
    window.clearTimeout(this.strokeReset);
    this.strokeReset = window.setTimeout(() => {
      p.strokes = 0;
    }, 700);
  }

  private strokeReset = 0;

  /** A book is being carried at this point (or no longer). */
  follow(clientX?: number): void {
    if (clientX === undefined || !this.room) {
      this.watching = undefined;
      this.wake();
      return;
    }
    const scale = Number(this.room.style.getPropertyValue('--case-scale')) || 1;
    const was = this.watching;
    this.watching = (clientX - this.room.getBoundingClientRect().left) / scale;
    if (was === undefined) this.wake();
  }

  // ---------------------------------------------------------------- food

  /**
   * A bowl put down at this point on the bookcase: the pet goes to it (running if hungry) and
   * eats, and the bowl is taken away when it has finished.
   */
  feed(clientX: number, clientY: number): boolean {
    const room = this.room;
    if (!room || !this.el) return false;
    this.measure();
    const scale = Number(room.style.getPropertyValue('--case-scale')) || 1;
    const box = room.getBoundingClientRect();
    const x = (clientX - box.left) / scale;
    const y = (clientY - box.top) / scale;
    // The shelf whose plank is just below where it was put down.
    let ledge = -1;
    let best = Number.POSITIVE_INFINITY;
    this.ledges.forEach((l, i) => {
      const d = l.y - y;
      if (d > -40 && d < best && x > l.left - 40 && x < l.right + this.span + 40) {
        best = d;
        ledge = i;
      }
    });
    const target = this.ledges[ledge];
    if (!target) return false;
    const bx = Math.min(target.right + this.span - 30, Math.max(target.left, x - 18));
    this.bowl?.remove();
    const bowl = document.createElement('div');
    bowl.className = 'shelf-bowl';
    bowl.setAttribute('aria-hidden', 'true');
    bowl.style.transform = `translate(${Math.round(bx)}px, ${Math.round(target.y - 16)}px)`;
    room.append(bowl);
    this.bowl = bowl;
    this.food = { x: bx, ledge };
    // Walk to the bowl, from the side it is on, and eat; across shelves, jump first.
    const stand = Math.round(bx - this.span * 0.72);
    const standRight = Math.round(bx - this.span * 0.1);
    const side = this.at.x < bx ? stand : standRight;
    const plan: Act[] = [];
    if (ledge !== this.at.ledge)
      plan.push(
        this.hold('crouch', 300),
        { kind: 'jump', to: [side, target.y], ledge },
        this.hold('land', 200),
      );
    else plan.push({ kind: 'go', to: side, pose: 'run' });
    plan.push(
      { kind: 'hold', pose: 'eat', ms: 5200 },
      this.hold('wash', 2400),
      this.hold('sit', 1000),
    );
    this.act = undefined;
    this.queue = plan;
    this.petting.until = 0;
    // Facing the bowl when it gets there.
    this.faceBowl = side === stand ? 1 : -1;
    this.wake();
    return true;
  }

  private finishMeal(): void {
    const bowl = this.bowl;
    this.bowl = undefined;
    this.food = undefined;
    this.faceBowl = 0;
    if (!bowl) return;
    bowl.classList.add('is-empty');
    window.setTimeout(() => bowl.remove(), 2500);
  }
}
