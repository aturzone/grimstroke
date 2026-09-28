/**
 * The workspace's look, section by section: preferences about the workspace, not about any one
 * document.
 *
 * Each part of grimstroke has its own: the board, the notebooks (a notebook's spread, its pages,
 * its print view, and the controls around the bookcase), and the settings. For each, how round its
 * corners are, and which faces its interface and its text are set in. The bookcase and the books
 * themselves are objects with their own look and are never touched by this.
 *
 * Kept in settings.json and written into every page the server sends -- and every export -- as
 * CSS variables: `--gs-round`, which a document's own `--round` falls back to (draw/doc/head.ts),
 * and the font variables, for a document that does not name its own faces.
 */

import { customPalette, PALETTES } from '~/draw/look/palette.ts';
import type { Store } from '~/host/store/store.ts';

export const SECTIONS = ['board', 'notebook', 'settings'] as const;
export type Section = (typeof SECTIONS)[number];

/** The faces a section can be set in: every bundled face, and the system's own. */
export const FONT_CHOICES: Readonly<Record<string, string>> = {
  'JetBrains Mono': "'JetBrains Mono', Estedad, ui-monospace, monospace",
  Estedad: 'Estedad, system-ui, sans-serif',
  Caveat: 'Caveat, Estedad, cursive',
  'Caveat Brush': "'Caveat Brush', Estedad, cursive",
  'system sans': "system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Arial, Estedad, sans-serif",
  'system serif': "Georgia, 'Times New Roman', Estedad, serif",
};

export interface SectionLook {
  /** 0 square, 1 as designed, up to 3 very round. */
  corners: number;
  /** The face the controls around it are set in. */
  ui?: string;
  /** The face its words are set in, where a document does not name its own. */
  text?: string;
}

/** How working feels, everywhere: sounds when a hand does something, and how much things move. */
export interface Feel {
  sound: boolean;
  /** 0 to 1. */
  volume: number;
  /** full: things arrive, settle and leave; calm: fades only; none: nothing moves. */
  motion: 'full' | 'calm' | 'none';
  /**
   * Hours of the day, on this computer's clock, when no sound is made: from the start of `from`
   * to the start of `to`, across midnight when `to` is the smaller. Absent: never quiet.
   */
  quiet?: { from: number; to: number };
}

export const DEFAULT_FEEL: Readonly<Feel> = Object.freeze({
  sound: true,
  volume: 0.5,
  motion: 'full',
});

/** A palette's colours as the owner set them: the same id, their own paper, ink and accent. */
export type OwnColours = { paper: string; ink: string; accent: string };

export type Look = Record<Section, SectionLook> & {
  feel: Feel;
  /** Light or dark: the palette for everything that does not name its own. */
  theme: 'light' | 'dark';
  /** The owner's colours for any palette, by id. */
  palettes: Record<string, OwnColours>;
};

/** The palette each theme stands for (draw/look/palette.ts). */
export const THEME_PALETTE = { light: 'studio', dark: 'night' } as const;

export const DEFAULT_LOOK: Readonly<Look> = Object.freeze({
  board: { corners: 1 },
  notebook: { corners: 1 },
  settings: { corners: 1 },
  feel: DEFAULT_FEEL,
  theme: 'light',
  palettes: {},
});

const HEX = /^#[0-9a-f]{6}$/i;

function readPalettes(
  raw: unknown,
  fallback: Record<string, OwnColours> = {},
): Record<string, OwnColours> {
  if (raw === undefined) return { ...fallback };
  const from = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, OwnColours> = { ...fallback };
  for (const [id, value] of Object.entries(from)) {
    if (!PALETTES.some((p) => p.id === id)) continue;
    // null gives a palette its own colours back.
    if (value === null) {
      delete out[id];
      continue;
    }
    const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const base = PALETTES.find((p) => p.id === id) as (typeof PALETTES)[number];
    const colours = {
      paper: typeof v.paper === 'string' && HEX.test(v.paper) ? v.paper.toLowerCase() : base.paper,
      ink: typeof v.ink === 'string' && HEX.test(v.ink) ? v.ink.toLowerCase() : base.ink,
      accent:
        typeof v.accent === 'string' && HEX.test(v.accent) ? v.accent.toLowerCase() : base.accent,
    };
    out[id] = colours;
  }
  return out;
}

function readFeel(raw: unknown, fallback: Feel = DEFAULT_FEEL): Feel {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    sound: typeof f.sound === 'boolean' ? f.sound : fallback.sound,
    volume:
      typeof f.volume === 'number' && Number.isFinite(f.volume)
        ? Math.min(1, Math.max(0, Math.round(f.volume * 100) / 100))
        : fallback.volume,
    motion:
      f.motion === 'full' || f.motion === 'calm' || f.motion === 'none'
        ? f.motion
        : fallback.motion,
    ...quietOf(f.quiet, fallback.quiet),
  };
}

function hour(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
    ? value
    : undefined;
}

/** Quiet hours as sent: an object of two whole hours, or null to turn them off. */
function quietOf(raw: unknown, fallback: Feel['quiet']): Pick<Feel, 'quiet'> {
  if (raw === null) return {};
  if (raw === undefined) return fallback ? { quiet: fallback } : {};
  const q = (typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const from = hour(q.from);
  const to = hour(q.to);
  if (from === undefined || to === undefined || from === to)
    return fallback ? { quiet: fallback } : {};
  return { quiet: { from, to } };
}

function corners(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(3, Math.max(0, Math.round(value * 100) / 100))
    : fallback;
}

function face(value: unknown): string | undefined {
  return typeof value === 'string' && value in FONT_CHOICES ? value : undefined;
}

function readSection(raw: unknown, fallback: SectionLook): SectionLook {
  const from = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const ui = face(from.ui) ?? fallback.ui;
  const text = face(from.text) ?? fallback.text;
  return {
    corners: corners(from.corners, fallback.corners),
    ...(ui ? { ui } : {}),
    ...(text ? { text } : {}),
  };
}

/**
 * A look as stored or as sent. An old single `{ corners }` -- or a `corners` number sent to set
 * every section at once -- applies to all three.
 */
export function readLook(raw: unknown): Look {
  const from = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const all = typeof from.corners === 'number' ? corners(from.corners, 1) : undefined;
  const out = {} as Look;
  for (const s of SECTIONS) {
    const base: SectionLook = { corners: all ?? 1 };
    out[s] = readSection(from[s], base);
  }
  out.feel = readFeel(from.feel);
  out.theme = from.theme === 'dark' ? 'dark' : 'light';
  out.palettes = readPalettes(from.palettes);
  return out;
}

export async function lookOf(store: Store): Promise<Look> {
  return readLook((await store.readSettings()).look);
}

/**
 * Change part of the look: `{ corners: 2 }` sets every section, `{ board: { corners: 0 } }` one,
 * `{ notebook: { text: 'Estedad' } }` a face. A face set to null goes back to the default.
 */
export async function saveLook(store: Store, patch: Record<string, unknown>): Promise<Look> {
  const settings = await store.readSettings();
  const current = readLook(settings.look);
  const next = {} as Look;
  for (const s of SECTIONS) {
    const p = (patch[s] && typeof patch[s] === 'object' ? patch[s] : {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...current[s], ...p };
    if (typeof patch.corners === 'number') merged.corners = patch.corners;
    for (const k of ['ui', 'text']) if (p[k] === null) delete merged[k];
    next[s] = readSection(merged, { corners: current[s].corners });
  }
  next.feel = readFeel(patch.feel, current.feel);
  next.theme = patch.theme === 'dark' || patch.theme === 'light' ? patch.theme : current.theme;
  next.palettes = readPalettes(patch.palettes, current.palettes);
  // Colours nobody could read are turned away, with the reason, rather than saved.
  for (const [id, colours] of Object.entries(next.palettes)) {
    customPalette({ ...colours, id });
  }
  await store.writeSettings({ ...settings, look: next });
  return next;
}

/** Which section a page of the server belongs to. */
export function sectionOf(path: string): Section {
  if (path === '/' || path.startsWith('/board')) return 'board';
  if (path === '/profile' || path === '/settings' || path === '/face') return 'settings';
  return 'notebook';
}

/**
 * The page, with its section's look written into its head. `ownFonts` says the document names its
 * own faces, which a section's text face then leaves alone.
 */
export function withLook(html: string, look: Look, section: Section, ownFonts = false): string {
  const l = look[section];
  // How it feels travels with every page, for the app to read before it makes a sound.
  // The page is an app a phone can keep on its home screen, and be reminded by.
  const meta =
    `<meta name="gs-feel" content="${JSON.stringify(look.feel).replace(/"/g, '&quot;')}">` +
    '<link rel="manifest" href="/manifest.webmanifest">' +
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">' +
    '<meta name="apple-mobile-web-app-capable" content="yes">' +
    '<meta name="apple-mobile-web-app-title" content="grimstroke">' +
    '<meta name="theme-color" content="#1f3fd0">';
  const vars: string[] = [];
  if (l.corners !== 1) vars.push(`--gs-round:${l.corners}`);
  if (l.ui) vars.push(`--ui-font:${FONT_CHOICES[l.ui]}`);
  if (l.text && !ownFonts) vars.push(`--body-font:${FONT_CHOICES[l.text]}`);
  const style = vars.length ? `<style id="gs-look">:root{${vars.join(';')}}</style>` : '';
  const withHead = html.includes('</head>')
    ? html.replace('</head>', `${meta}${style}</head>`)
    : meta + style + html;
  // Said on the root before anything paints, so "nothing moves" holds for the arrival too, not
  // only once the script has read the setting.
  return look.feel.motion === 'full'
    ? withHead
    : withHead.replace(/<html(?=[\s>])/, `<html data-motion="${look.feel.motion}"`);
}
