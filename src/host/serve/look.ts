/**
 * The workspace's look: preferences that are about the workspace, not about any one document.
 *
 * Today that is how round its corners are. It is kept in settings.json, and written into every
 * page the server sends -- and every export it makes -- as `--gs-round`, which the stylesheet's
 * `--round` falls back to when a notebook or board does not carry its own (see draw/doc/head.ts).
 */

import type { Store } from '~/host/store/store.ts';

export interface Look {
  /** 0 square, 1 as designed, up to 3 very round. */
  corners: number;
}

export const DEFAULT_LOOK: Readonly<Look> = Object.freeze({ corners: 1 });

export function readLook(raw: unknown): Look {
  const from = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const c = from.corners;
  return {
    corners:
      typeof c === 'number' && Number.isFinite(c)
        ? Math.min(3, Math.max(0, Math.round(c * 100) / 100))
        : 1,
  };
}

export async function lookOf(store: Store): Promise<Look> {
  return readLook((await store.readSettings()).look);
}

export async function saveLook(store: Store, patch: Partial<Look>): Promise<Look> {
  const settings = await store.readSettings();
  const next = readLook({ ...readLook(settings.look), ...patch });
  await store.writeSettings({ ...settings, look: next });
  return next;
}

/** The page, with the workspace's look written into its head. */
export function withLook(html: string, look: Look): string {
  if (look.corners === 1) return html;
  const style = `<style id="gs-look">:root{--gs-round:${look.corners}}</style>`;
  return html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : style + html;
}
