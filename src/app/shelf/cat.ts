/**
 * The shelf cat.
 *
 * A small ginger cat that lives on the bookcase: it walks along a shelf, sits, washes, falls
 * asleep -- on a book lying flat, if there is one -- and jumps from one shelf to the next. It
 * never takes a press meant for a book, and under reduced motion it is simply asleep.
 *
 * Drawn here, not fetched: each pose is a few shapes -- an ellipse of a body, a round head, two
 * ears, legs, a tail -- cut into pixels on a small grid and outlined automatically, which is
 * what makes it pixel art rather than a blurred vector. No sprite sheet, no licence to track.
 */

const W = 30;
const H = 20;
const PX = 3;

const COLOURS: Record<string, string> = {
  o: '#2a1a10',
  b: '#e08a3c',
  s: '#b45f22',
  w: '#f6e3c4',
  e: '#1b120c',
  p: '#e8899a',
  z: '#fbf9f4',
};

type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
}

function put(g: Grid, x: number, y: number, c: string): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  const row = g[yi];
  if (row && xi >= 0 && xi < W) row[xi] = c;
}

function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(g, x, y, c);
    }
  }
}

function line(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string, thick = 1): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
  for (let i = 0; i <= n; i += 1) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    for (let t = 0; t < thick; t += 1) put(g, x + t * 0.6, y, c);
  }
}

function tri(g: Grid, pts: readonly [number, number][], c: string): void {
  const [a, b, d] = pts as [[number, number], [number, number], [number, number]];
  const area = (p: [number, number], q: [number, number], r: [number, number]): number =>
    (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p: [number, number] = [x, y];
      const s1 = area(a, b, p);
      const s2 = area(b, d, p);
      const s3 = area(d, a, p);
      if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) put(g, x, y, c);
    }
  }
}

/** Every empty pixel touching a filled one becomes outline: the hard edge pixel art has. */
function outline(g: Grid): Grid {
  const out = g.map((row) => [...row]);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (g[y]?.[x] !== '.') continue;
      const near = [g[y - 1]?.[x], g[y + 1]?.[x], g[y]?.[x - 1], g[y]?.[x + 1]];
      if (near.some((c) => c && c !== '.' && c !== 'o' && c !== 'z')) {
        const row = out[y];
        if (row) row[x] = 'o';
      }
    }
  }
  return out;
}

function stripes(g: Grid, x0: number, x1: number, y0: number, y1: number): void {
  for (let x = x0; x <= x1; x += 3) {
    for (let y = y0; y <= y1; y += 1) if (g[y]?.[x] === 'b') put(g, x, y, 's');
  }
}

function head(g: Grid, cx: number, cy: number, asleep = false): void {
  tri(
    g,
    [
      [cx - 4, cy - 1],
      [cx - 3.5, cy - 6],
      [cx - 0.5, cy - 3],
    ],
    'b',
  );
  tri(
    g,
    [
      [cx + 4, cy - 1],
      [cx + 3.5, cy - 6],
      [cx + 0.5, cy - 3],
    ],
    'b',
  );
  put(g, cx - 3, cy - 4, 'p');
  put(g, cx + 3, cy - 4, 'p');
  ellipse(g, cx, cy, 4.3, 3.8, 'b');
  ellipse(g, cx + 0.5, cy + 1.6, 2.4, 1.5, 'w');
  if (asleep) {
    line(g, cx - 2.5, cy - 0.3, cx - 1, cy - 0.3, 'e');
    line(g, cx + 1.5, cy - 0.3, cx + 3, cy - 0.3, 'e');
  } else {
    put(g, cx - 1.5, cy - 0.6, 'e');
    put(g, cx + 2.2, cy - 0.6, 'e');
  }
  put(g, cx + 0.5, cy + 1, 'p');
}

type Pose = 'walk' | 'sit' | 'wash' | 'sleep' | 'jump';

/** One frame of one pose, as rows of colour letters. */
function frame(pose: Pose, n: number): Grid {
  const g = blank();
  if (pose === 'walk' || pose === 'jump') {
    const k = pose === 'jump' ? 0 : n % 4;
    const swing = [-2, 0, 2, 0][k] ?? 0;
    const sway = [0, 1, 0, -1][k] ?? 0;
    const stretch = pose === 'jump' ? 1.5 : 0;
    // Tail, then legs behind the body, then the body, then legs in front, then the head.
    line(g, 6, 10, 3 + sway, 6, 'b', 2);
    line(g, 3 + sway, 6, 4 + sway, 2, 'b', 2);
    line(g, 9 - swing, 13, 8 - swing * 1.4 - stretch, 18, 'b', 2);
    line(g, 19 + swing, 13, 20 + swing * 1.4 + stretch, 18, 'b', 2);
    ellipse(g, 14, 11, 8.5 + stretch, 3.9, 'b');
    stripes(g, 8, 20, 7, 10);
    ellipse(g, 15, 13.4, 5, 1.2, 'w');
    line(g, 11 + swing, 13, 12 + swing * 1.4 - stretch, 18, 'b', 2);
    line(g, 17 - swing, 13, 18 - swing * 1.4 + stretch, 18, 'b', 2);
    head(g, 23.5, 7 + (k === 1 || k === 3 ? 0.4 : 0));
  } else if (pose === 'sit' || pose === 'wash') {
    const flick = n % 2;
    line(g, 10, 17, 4, 17, 'b', 2);
    line(g, 4, 17, 3, 14 - flick, 'b', 2);
    ellipse(g, 13.5, 12.5, 5.5, 5.8, 'b');
    stripes(g, 9, 17, 8, 15);
    ellipse(g, 15, 13, 2.6, 4, 'w');
    line(g, 15, 14, 15, 18, 'b', 2);
    if (pose === 'wash') {
      line(g, 18, 14, 19, 8 - flick, 'b', 2);
      head(g, 17.5, 6.2 + flick * 0.5, true);
    } else {
      line(g, 18, 14, 18, 18, 'b', 2);
      head(g, 17.5, 5.6);
    }
  } else {
    const breathe = n % 2 === 0 ? 0 : 0.5;
    line(g, 7, 17, 17, 18.5, 'b', 2);
    ellipse(g, 14, 15, 9, 3.6 + breathe, 'b');
    stripes(g, 7, 19, 12, 16);
    head(g, 21.5, 14.2, true);
    if (n % 4 < 2) put(g, 25, 8 - (n % 2), 'z');
  }
  return outline(g);
}

/** A frame as a data URI, drawn once. */
function toUri(g: Grid): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  if (!c) return '';
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const colour = COLOURS[g[y]?.[x] ?? '.'];
      if (!colour) continue;
      c.fillStyle = colour;
      c.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL('image/png');
}

interface Ledge {
  /** The top of the plank, in the room's own pixels. */
  y: number;
  left: number;
  right: number;
  /** Books lying flat on it: somewhere to sleep, at their own height. */
  beds: Array<{ x: number; w: number; top: number }>;
}

export class ShelfCat {
  private el: HTMLElement | undefined;
  private frames = new Map<string, string>();
  private ledges: Ledge[] = [];
  private at = { x: 60, y: 0, ledge: 0 };
  private facing = 1;
  private pose: Pose = 'sit';
  private tick = 0;
  private plan: {
    until: number;
    to?: number;
    jump?: { from: [number, number]; to: [number, number]; ledge: number; t0: number };
  } = { until: 0 };
  private raf = 0;
  private last = 0;

  start(room: HTMLElement | null): void {
    if (!room) return;
    this.el?.remove();
    cancelAnimationFrame(this.raf);
    const el = document.createElement('div');
    el.className = 'shelf-cat';
    el.setAttribute('aria-hidden', 'true');
    el.style.width = `${W * PX}px`;
    el.style.height = `${H * PX}px`;
    room.append(el);
    this.el = el;
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
      this.pose = 'sleep';
      this.sleepOnBed();
      this.draw();
      return;
    }
    this.last = performance.now();
    this.decide(this.last);
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
          y: (r.top - box.top) / scale - 8,
          left: (r.left - box.left) / scale + 12,
          right: (r.right - box.left) / scale - W * PX - 12,
          beds,
        };
      },
    );
  }

  private sleepOnBed(): boolean {
    const ledge = this.ledges[this.at.ledge];
    const bed = ledge?.beds[0];
    if (!ledge || !bed) return false;
    this.at.x = bed.x + bed.w / 2 - (W * PX) / 2;
    this.at.y = bed.top + 2;
    return true;
  }

  /** What next: walk somewhere, sit, wash, sleep, or jump to another shelf. */
  private decide(now: number): void {
    const ledge = this.ledges[this.at.ledge];
    if (!ledge) return;
    this.at.y = ledge.y;
    const roll = Math.random();
    if (roll < 0.42) {
      this.pose = 'walk';
      const to = ledge.left + Math.random() * (ledge.right - ledge.left);
      this.facing = to > this.at.x ? 1 : -1;
      this.plan = { until: Number.POSITIVE_INFINITY, to };
    } else if (roll < 0.6) {
      this.pose = 'sit';
      this.plan = { until: now + 2500 + Math.random() * 3000 };
    } else if (roll < 0.72) {
      this.pose = 'wash';
      this.plan = { until: now + 2400 };
    } else if (roll < 0.86 && this.ledges.length > 1) {
      const next = this.at.ledge + (Math.random() < 0.5 ? -1 : 1);
      const ledgeTo = this.ledges[Math.max(0, Math.min(this.ledges.length - 1, next))];
      if (!ledgeTo || ledgeTo === ledge) {
        this.pose = 'sit';
        this.plan = { until: now + 2000 };
        return;
      }
      const x = Math.min(
        ledgeTo.right,
        Math.max(ledgeTo.left, this.at.x + (Math.random() - 0.5) * 160),
      );
      this.facing = x >= this.at.x ? 1 : -1;
      this.pose = 'jump';
      this.plan = {
        until: Number.POSITIVE_INFINITY,
        jump: {
          from: [this.at.x, this.at.y],
          to: [x, ledgeTo.y],
          ledge: this.ledges.indexOf(ledgeTo),
          t0: now,
        },
      };
    } else {
      this.pose = 'sleep';
      this.sleepOnBed();
      this.plan = { until: now + 9000 + Math.random() * 9000 };
    }
  }

  private step(now: number, dt: number): void {
    const plan = this.plan;
    if (plan.jump) {
      const t = Math.min(1, (now - plan.jump.t0) / 700);
      const [x0, y0] = plan.jump.from;
      const [x1, y1] = plan.jump.to;
      this.at.x = x0 + (x1 - x0) * t;
      // An arc: up and over, higher when it is going up a shelf.
      this.at.y = y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * (Math.max(0, y0 - y1) * 0.35 + 60);
      if (t >= 1) {
        this.at.ledge = plan.jump.ledge;
        this.pose = 'sit';
        this.plan = { until: now + 1200 };
      }
    } else if (plan.to !== undefined) {
      const d = plan.to - this.at.x;
      const v = 42 * dt;
      if (Math.abs(d) <= v) {
        this.at.x = plan.to;
        this.decide(now);
      } else this.at.x += Math.sign(d) * v;
    } else if (now >= plan.until) {
      this.decide(now);
    }
    this.tick += dt;
    this.draw();
  }

  private image(pose: Pose, n: number): string {
    const key = `${pose}:${n}`;
    let uri = this.frames.get(key);
    if (!uri) {
      uri = toUri(frame(pose, n));
      this.frames.set(key, uri);
    }
    return uri;
  }

  private draw(): void {
    const el = this.el;
    if (!el) return;
    const rate = this.pose === 'walk' ? 7 : this.pose === 'sleep' ? 0.8 : 2.4;
    const count = this.pose === 'walk' || this.pose === 'sleep' ? 4 : 2;
    const n = Math.floor(this.tick * rate) % count;
    el.style.backgroundImage = `url(${this.image(this.pose, n)})`;
    el.style.transform = `translate(${Math.round(this.at.x)}px, ${Math.round(this.at.y - H * PX)}px) scaleX(${this.facing})`;
  }
}
