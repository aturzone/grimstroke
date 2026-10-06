/**
 * The names the documents use for how they are to be drawn -- a page's paper, its template, a
 * picture's frame, a palette, a direction -- as names and nothing else. What each looks like is
 * a face's. The core keeps them so a document can be checked and an agent told what there is.
 */

export type Direction = 'ltr' | 'rtl';

export type PaperKind = 'blank' | 'ruled' | 'squared' | 'graph' | 'dotted';
export const PAPERS: readonly PaperKind[] = ['blank', 'ruled', 'squared', 'graph', 'dotted'];

export type PageTemplate = 'cornell' | 'kanban';
export const TEMPLATES: readonly PageTemplate[] = ['cornell', 'kanban'];

/**
 * A tracker's column: what it is called, and which issues belong in it -- open or closed, and
 * carrying these labels -- with an optional limit on how many may be in it at once.
 */
export interface TrackerColumn {
  title: string;
  state: 'open' | 'closed';
  labels?: string[];
  /** Work in progress allowed; more than this and the column says so. */
  limit?: number;
}

/** The three columns a tracker starts with. */
export const DEFAULT_COLUMNS: readonly TrackerColumn[] = [
  { title: 'to do', state: 'open' },
  { title: 'doing', state: 'open', labels: ['doing'], limit: 3 },
  { title: 'done', state: 'closed' },
];

export type FrameKind = 'none' | 'keyline' | 'polaroid' | 'taped' | 'torn' | 'pinned';
export const FRAMES: readonly FrameKind[] = [
  'none',
  'keyline',
  'polaroid',
  'taped',
  'torn',
  'pinned',
];

/** The palettes a document may name, and whether each is dark; their colours are a face's. */
export const PALETTE_IDS: Readonly<Record<string, { dark: boolean }>> = {
  studio: { dark: false },
  night: { dark: true },
  postit: { dark: false },
  'riso-pink': { dark: false },
  acid: { dark: false },
  cyan: { dark: false },
  traffic: { dark: false },
  violet: { dark: false },
  newsprint: { dark: false },
  carbon: { dark: true },
};

/** Quiet hours: two whole hours of the day, from and to, which may run across midnight. */
export interface Quiet {
  from: number;
  to: number;
}

/** Whether this hour of the day is inside the quiet hours. One rule, for the server and a page. */
export function hushed(hour: number, quiet: Quiet | null | undefined): boolean {
  if (!quiet) return false;
  return quiet.from < quiet.to
    ? hour >= quiet.from && hour < quiet.to
    : hour >= quiet.from || hour < quiet.to;
}
