/**
 * What a notebook is, as data.
 *
 * A page is a list of blocks. An agent can build one with the fluent API, or
 * hand over this object as JSON and never touch the library -- which matters,
 * because "any agent, anywhere" includes ones that only know how to write a file
 * and run a command.
 */

export type Direction = 'ltr' | 'rtl';

/**
 * Where a rectangle's numbers live.
 *
 *   src  pixels of the source image itself -- what you read off a screenshot
 *   pct  percent of the image, 0-100 -- scale-free, and what the CSS consumes
 *   css  CSS pixels from a browser boundingBox, divided by the image's dpr
 *
 * The prefix is mandatory. A bare tuple is refused, because coordinates that
 * silently mean a different space land the box on nothing while looking exactly
 * as confident as a box on the right element.
 */
export type Space = 'src' | 'pct' | 'css';
export type RectRef = string;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MarkKind = 'box' | 'redact' | 'callout';
export type RedactStyle = 'bar' | 'halftone' | 'hatch';

export interface Mark {
  rect: RectRef;
  kind?: MarkKind;
  /** A small numbered badge on the corner, for steps. */
  badge?: string;
  /** Callout text, placed beside the image. */
  note?: string;
  /** Only for kind 'redact'. */
  style?: RedactStyle;
}

export interface ImageSource {
  /** A path on disk, or a data: URI. */
  src: string;
  caption?: string;
  marks?: Mark[];
  /** Device pixel ratio of the source, needed only for css: rectangles. */
  dpr?: number;
}

export interface ZoomSpec {
  rect: RectRef;
  factor?: number;
}

export type Block =
  | { kind: 'heading'; text: string; level?: 1 | 2 }
  | { kind: 'text'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'table'; rows: string[][]; head?: boolean }
  | { kind: 'code'; text: string; label?: string }
  | { kind: 'quote'; text: string; cite?: string }
  | { kind: 'image'; image: ImageSource; zoom?: ZoomSpec }
  | { kind: 'compare'; images: ImageSource[]; syncMarks?: boolean }
  | { kind: 'note'; text: string; title?: string; palette?: string }
  | { kind: 'divider' }
  | { kind: 'spacer'; size?: number };

export interface Chip {
  /** Short, loud, and the thing a reader triages by. */
  text: string;
  /** Overrides the page accent for this chip only. */
  colour?: string;
}

export interface PageSpec {
  /**
   * Stable across exports. It seeds every generative mark, so a page always
   * looks like itself.
   */
  id: string;
  title?: string;
  /** Small chips in the header band, around the title. */
  chips?: Chip[];
  /**
   * A breadcrumb under the title, as segments. Joined by the renderer so the
   * separator can mirror.
   */
  trail?: string[];
  blocks: Block[];
  palette?: string;
  direction?: Direction;
  /** Font stack by role. Faces must be vendored or registered. */
  fonts?: { body?: string; mono?: string };
  width?: number;
  /**
   * Caps a tall image so a phone screenshot does not produce an unreadable
   * page. Scales uniformly, so percentage marks still land on the same feature.
   */
  imageMaxHeight?: number;
  /** Digits in prose, never in code. arabext is Persian. */
  digits?: 'latn' | 'arab' | 'arabext';
  /** Uppercasing is meaningless in scripts without case. */
  uppercaseLabels?: boolean;
}

export interface NotebookSpec {
  title?: string;
  pages: PageSpec[];
  palette?: string;
  direction?: Direction;
}

/** What a renderer produces, before anything has touched a browser. */
export interface RenderedPage {
  id: string;
  html: string;
  /**
   * Served path -> absolute source path. The exporter serves exactly these and
   * nothing else.
   */
  assets: Record<string, string>;
  width: number;
  /** The element to capture. */
  selector: string;
  warnings: string[];
}
