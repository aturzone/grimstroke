/**
 * How working in grimstroke feels: things that move when they arrive and leave, and small sounds
 * when a hand does something.
 *
 * SOUND. Every sound is synthesised on the spot with Web Audio -- filtered noise for paper, short
 * sine and triangle envelopes for taps and chimes -- so there is no audio file to load, nothing to
 * download, and nothing that can fail to arrive. They are quiet on purpose, a little different each
 * time (a paper sound that is the same sample twice is a machine), and throttled so a flurry of
 * changes is one sound, not twenty. Nothing plays until the page has been touched once: browsers
 * forbid it, and a page that makes noise on its own is a page people close.
 *
 * MOTION. Web Animations, never layout: transform and opacity only, so the compositor does it.
 * Everything is skipped when the reader asks for reduced motion, or turns motion down in Settings.
 *
 * The settings come from the server (the workspace's look, `sound` and `motion`), written into the
 * page as `<meta name="gs-feel">`; Settings changes them for this tab at once.
 */

export type SoundName =
  | 'tap'
  | 'pop'
  | 'lift'
  | 'drop'
  | 'whoosh'
  | 'turn'
  | 'tick'
  | 'untick'
  | 'chime'
  | 'purr'
  | 'crunch'
  | 'open'
  | 'close'
  | 'pen'
  | 'paper'
  | 'stick'
  | 'book';

interface Feel {
  sound: boolean;
  volume: number;
  motion: 'full' | 'calm' | 'none';
  quiet?: { from: number; to: number } | undefined;
}

let feel: Feel = { sound: true, volume: 0.5, motion: 'full' };

function readMeta(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="gs-feel"]');
  if (!meta) return;
  try {
    const f = JSON.parse(meta.content) as Partial<Feel>;
    feel = {
      sound: f.sound !== false,
      volume: typeof f.volume === 'number' ? Math.min(1, Math.max(0, f.volume)) : 0.5,
      motion: f.motion === 'calm' || f.motion === 'none' ? f.motion : 'full',
      quiet: f.quiet,
    };
  } catch {
    // An unreadable setting keeps the defaults.
  }
}

if (typeof document !== 'undefined') readMeta();

/** Settings changed in this tab: take effect now, without a reload. */
export function setFeel(next: Partial<Feel>): void {
  feel = { ...feel, ...next };
}

/** Inside the quiet hours, which may run across midnight. */
export function hushed(now: number, quiet = feel.quiet): boolean {
  if (!quiet) return false;
  return quiet.from < quiet.to
    ? now >= quiet.from && now < quiet.to
    : now >= quiet.from || now < quiet.to;
}

/** Full motion: the flourishes -- a tilt, a wobble -- that calm leaves out. */
export function lively(): boolean {
  return moving() && feel.motion === 'full';
}

export function moving(): boolean {
  if (feel.motion === 'none') return false;
  return !(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// ---------------------------------------------------------------- sound

let context: AudioContext | undefined;
let master: GainNode | undefined;
let unlocked = false;
const last = new Map<SoundName, number>();

function audio(): AudioContext | undefined {
  if (!unlocked || !feel.sound || feel.volume <= 0 || hushed(new Date().getHours())) {
    return undefined;
  }
  if (!context) {
    try {
      context = new AudioContext();
      master = context.createGain();
      master.connect(context.destination);
    } catch {
      return undefined;
    }
  }
  if (master) master.gain.value = feel.volume * 0.6;
  if (context.state === 'suspended') void context.resume();
  return context;
}

// The first touch of the page is the permission to make a sound at all.
if (typeof window !== 'undefined') {
  const unlock = (): void => {
    unlocked = true;
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

let noiseBuffer: AudioBuffer | undefined;
function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 0.6);
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  // Pink-ish: a gentle roll-off, which paper sounds like far more than white noise does.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return noiseBuffer;
}

const jitter = (v: number, by: number): number => v * (1 + (Math.random() * 2 - 1) * by);

/** A burst of filtered noise: paper lifted, set down, turned. */
function rustle(
  ctx: AudioContext,
  at: number,
  o: { dur: number; from: number; to: number; q?: number; gain: number; type?: BiquadFilterType },
): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.Q.value = o.q ?? 0.9;
  filter.frequency.setValueAtTime(jitter(o.from, 0.12), at);
  filter.frequency.exponentialRampToValueAtTime(jitter(o.to, 0.12), at + o.dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(o.gain, at + Math.min(0.03, o.dur / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  src
    .connect(filter)
    .connect(env)
    .connect(master as GainNode);
  src.start(at, Math.random() * 0.2, o.dur + 0.05);
}

/** A short tone: a tap, a tick, a chime. */
function tone(
  ctx: AudioContext,
  at: number,
  o: { freq: number; to?: number; dur: number; gain: number; type?: OscillatorType },
): void {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(jitter(o.freq, 0.02), at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + o.dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(o.gain, at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  osc.connect(env).connect(master as GainNode);
  osc.start(at);
  osc.stop(at + o.dur + 0.02);
}

/** Play a sound. Throttled per name, so a burst of changes is one sound. */
export function play(name: SoundName, strength = 1): void {
  const now = performance.now();
  if (now - (last.get(name) ?? 0) < (name === 'pen' ? 90 : 60)) return;
  last.set(name, now);
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  const g = Math.max(0.05, Math.min(1, strength));
  switch (name) {
    case 'tap':
      tone(ctx, t, { freq: 1900, to: 1200, dur: 0.035, gain: 0.12 * g, type: 'triangle' });
      break;
    case 'pop':
      tone(ctx, t, { freq: 520, to: 880, dur: 0.09, gain: 0.22 * g });
      rustle(ctx, t, { dur: 0.06, from: 3000, to: 1800, gain: 0.25 * g });
      break;
    case 'lift':
      rustle(ctx, t, { dur: 0.16, from: 1400, to: 3400, gain: 0.35 * g });
      break;
    case 'drop':
      rustle(ctx, t, { dur: 0.12, from: 900, to: 300, gain: 0.5 * g, type: 'lowpass', q: 0.7 });
      tone(ctx, t, { freq: 140, to: 70, dur: 0.1, gain: 0.25 * g });
      break;
    case 'whoosh':
      rustle(ctx, t, { dur: 0.26, from: 2600, to: 500, gain: 0.3 * g, q: 0.6 });
      break;
    case 'turn':
      rustle(ctx, t, { dur: 0.34, from: 700, to: 3800, gain: 0.32 * g, q: 0.5 });
      rustle(ctx, t + 0.28, { dur: 0.16, from: 1800, to: 600, gain: 0.3 * g, type: 'lowpass' });
      break;
    case 'tick':
      tone(ctx, t, { freq: 1320, dur: 0.06, gain: 0.16 * g, type: 'triangle' });
      tone(ctx, t + 0.045, { freq: 1760, dur: 0.08, gain: 0.12 * g, type: 'triangle' });
      break;
    case 'untick':
      tone(ctx, t, { freq: 1100, to: 800, dur: 0.07, gain: 0.12 * g, type: 'triangle' });
      break;
    case 'chime':
      for (const [i, f] of [880, 1318.5, 1760].entries()) {
        tone(ctx, t + i * 0.12, { freq: f, dur: 0.9, gain: 0.16 * g });
      }
      break;
    case 'purr': {
      // A cat's purr: low noise, pulsing at 25 Hz.
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const env = ctx.createGain();
      env.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = jitter(25, 0.1);
      const depth = ctx.createGain();
      depth.gain.value = 0.35 * g;
      lfo.connect(depth).connect(env.gain);
      const fade = ctx.createGain();
      fade.gain.setValueAtTime(0.0001, t);
      fade.gain.exponentialRampToValueAtTime(1, t + 0.15);
      fade.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      src
        .connect(lp)
        .connect(env)
        .connect(fade)
        .connect(master as GainNode);
      src.start(t, 0, 1);
      lfo.start(t);
      lfo.stop(t + 1);
      break;
    }
    case 'crunch':
      for (let i = 0; i < 3; i++) {
        rustle(ctx, t + i * 0.07, { dur: 0.05, from: 2400, to: 1200, gain: 0.3 * g, q: 2 });
      }
      break;
    case 'open':
      tone(ctx, t, { freq: 660, to: 990, dur: 0.08, gain: 0.08 * g });
      break;
    case 'close':
      tone(ctx, t, { freq: 880, to: 600, dur: 0.07, gain: 0.07 * g });
      break;
    case 'pen':
      rustle(ctx, t, { dur: 0.08, from: 5200, to: 4200, gain: 0.08 * g, q: 3 });
      break;
    case 'paper':
      // A sticky note peeled off the pad and pressed down.
      rustle(ctx, t, { dur: 0.09, from: 2600, to: 4200, gain: 0.22 * g, q: 1.4 });
      rustle(ctx, t + 0.08, { dur: 0.07, from: 1200, to: 500, gain: 0.25 * g, type: 'lowpass' });
      break;
    case 'stick':
      // A sticker: the tack of it coming off the sheet, and the press.
      rustle(ctx, t, { dur: 0.05, from: 6000, to: 3000, gain: 0.16 * g, q: 4 });
      tone(ctx, t + 0.05, { freq: 300, to: 180, dur: 0.06, gain: 0.18 * g, type: 'triangle' });
      break;
    case 'book':
      // A notebook opened: the cover's soft thump, and pages settling.
      tone(ctx, t, { freq: 110, to: 60, dur: 0.18, gain: 0.3 * g });
      rustle(ctx, t + 0.04, { dur: 0.3, from: 900, to: 2600, gain: 0.22 * g, q: 0.6 });
      break;
  }
}

// ---------------------------------------------------------------- motion

/** A springy ease: overshoots a little and settles, like a thing put down. */
export const SETTLE = 'cubic-bezier(0.2, 1.3, 0.35, 1)';
export const OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** Something arrives: it drops onto the paper from a little above, and settles. */
let origin: { rect: DOMRect; at: number } | undefined;

/** The next thing to arrive comes from here -- the / island's preview, say -- if it is soon. */
export function comingFrom(rect: DOMRect): void {
  origin = { rect, at: performance.now() };
}

export function appear(el: Element, delay = 0): void {
  if (!moving()) return;
  const calm = feel.motion === 'calm';
  if (origin && !calm && performance.now() - origin.at < 1500) {
    const from = origin.rect;
    origin = undefined;
    const to = el.getBoundingClientRect();
    if (to.width && to.height) {
      const s = Math.max(0.3, Math.min(3, from.width / to.width));
      el.animate(
        [
          {
            transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${s})`,
            transformOrigin: '0 0',
            opacity: 0.85,
          },
          { transform: 'none', transformOrigin: '0 0', opacity: 1 },
        ],
        { duration: 420, easing: SETTLE, composite: 'add' },
      );
      return;
    }
  }
  el.animate(
    calm
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          { opacity: 0, transform: 'translateY(-10px) scale(0.94)', filter: 'blur(2px)' },
          { opacity: 1, transform: 'none', filter: 'none' },
        ],
    { duration: calm ? 160 : 320, delay, easing: SETTLE, composite: 'add' },
  );
}

/** Something leaves: it lifts off and fades, then goes. */
export function vanish(el: Element, then: () => void): void {
  if (!moving()) {
    then();
    return;
  }
  (el as HTMLElement).style.pointerEvents = 'none';
  const a = el.animate(
    lively()
      ? [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(-6px) scale(0.92) rotate(-2deg)' },
        ]
      : [{ opacity: 1 }, { opacity: 0 }],
    { duration: 200, easing: OUT, composite: 'add' },
  );
  a.onfinish = then;
  a.oncancel = then;
}

/** Set down: a small squash, as paper lands. */
export function land(el: Element): void {
  if (!moving() || feel.motion === 'calm') return;
  el.animate(
    [
      { transform: 'scale(1.025)' },
      { transform: 'scale(0.992)', offset: 0.55 },
      { transform: 'none' },
    ],
    { duration: 260, easing: OUT, composite: 'add' },
  );
}

/** A nudge that says "this changed": a little bump. */
export function bump(el: Element): void {
  if (!moving()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'none' }], {
    duration: 220,
    easing: OUT,
    composite: 'add',
  });
}

// ---------------------------------------------------------------- the chrome

/**
 * Once per page: the motion setting where CSS can see it, and the interface's own small sounds --
 * a menu opening and closing, a tool taken up, a dialog shown.
 */
export function bindFeel(): void {
  document.documentElement.dataset.motion = moving() ? feel.motion : 'none';
  bindHighlights();
  document.addEventListener(
    'toggle',
    (event) => {
      const el = event.target as HTMLElement;
      // A dialog -- search, the shortcuts, a question -- opens and closes like a menu does.
      if (el instanceof HTMLDialogElement) {
        play(el.open ? 'open' : 'close', 0.8);
        return;
      }
      if (
        !(el instanceof HTMLDetailsElement) ||
        (!el.classList.contains('gs-menu') && !el.classList.contains('gs-sheet'))
      )
        return;
      play(el.open ? 'open' : 'close');
    },
    true,
  );
  document.addEventListener('click', (event) => {
    const b = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-gs="tool"], .gs-chip-btn, .gs-swatch',
    );
    if (b) play('tap', 0.7);
  });
}

// ---------------------------------------------------------------- from one surface to the next

/**
 * Leaving for another surface (app/dom.ts's go() does the fade): a place in the top bar takes
 * its highlight over to the one pressed before the next surface comes up, with a paper sound.
 */
export function leavingFor(a: HTMLAnchorElement | null): number {
  if (!moving()) return 0;
  play('paper', 0.45);
  const current = a?.matches('.gs-place')
    ? a.parentElement?.querySelector('[aria-current="page"]')
    : null;
  if (!a || !current || current === a || feel.motion === 'calm') return 0;
  slideHighlight(current, a, current, 200);
  return 50;
}

// ---------------------------------------------------------------- things moved

/**
 * A thing now somewhere else slides there from where it was (a FLIP: measure, move, then play
 * the difference back). For moves the hand did not make -- undo, redo, a tidy, an agent -- which
 * otherwise jump. `translate` is its own property, so a turned item keeps its turn.
 */
export function slideFrom(el: HTMLElement, dx: number, dy: number): void {
  if (!moving() || (Math.abs(dx) < 1 && Math.abs(dy) < 1)) return;
  if (Math.hypot(dx, dy) > 4000) return;
  el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
    duration: feel.motion === 'calm' ? 160 : 320,
    easing: SETTLE,
    composite: 'add',
  });
}

/**
 * A choice made slides its highlight across: from the button that was chosen to the one that is
 * now. A ghost the shape and colour of the new highlight travels from the old one's box to the
 * new one's, and is gone when it lands.
 */
function slideHighlight(from: Element, to: Element, look: Element = to, duration = 260): void {
  if (!moving() || feel.motion === 'calm') return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  if (!a.width || !b.width || Math.hypot(a.left - b.left, a.top - b.top) > 900) return;
  const cs = getComputedStyle(look);
  const bg = cs.backgroundColor;
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return;
  const ghost = document.createElement('div');
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${b.left}px`,
    top: `${b.top}px`,
    width: `${b.width}px`,
    height: `${b.height}px`,
    background: bg,
    borderRadius: cs.borderRadius,
    pointerEvents: 'none',
    zIndex: '90',
    transformOrigin: '0 0',
    mixBlendMode: 'normal',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.append(ghost);
  const sx = a.width / b.width;
  const sy = a.height / b.height;
  const anim = ghost.animate(
    [
      {
        transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${sx}, ${sy})`,
        opacity: 0.9,
      },
      { transform: 'none', opacity: 0.9, offset: 0.85 },
      { transform: 'none', opacity: 0 },
    ],
    { duration, easing: SETTLE },
  );
  anim.onfinish = () => ghost.remove();
  anim.oncancel = () => ghost.remove();
}

const GROUPS =
  '.gs-tray-tools, .st-nav, .gs-chip-row, .gs-drawer-tabs, .gs-places, .sc-row, .gs-decorate-swatches';

/** Remember which sibling was chosen before a press, and slide from it after. */
export function bindHighlights(): void {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const b = (event.target as HTMLElement).closest<HTMLElement>('button, a');
      const group = b?.closest(GROUPS);
      if (!b || !group) return;
      const before = group.querySelector('[aria-pressed="true"], [aria-current="page"]');
      if (!before || before === b) return;
      const check = (): void => {
        if (
          b.getAttribute('aria-pressed') === 'true' ||
          b.getAttribute('aria-current') === 'page'
        ) {
          slideHighlight(before, b);
        }
      };
      // After the click has done its work, whenever that is.
      b.addEventListener('click', () => requestAnimationFrame(check), { once: true });
    },
    true,
  );
}
