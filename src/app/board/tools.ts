/**
 * The tools a hand can hold, and what each one draws with.
 */

export type Tool =
  | 'select'
  | 'pan'
  | 'sticky'
  | 'text'
  | 'label'
  | 'image'
  | 'pen'
  | 'marker'
  | 'highlighter'
  | 'eraser';

/** The tools that leave ink behind them. */
export const DRAWING: ReadonlySet<Tool> = new Set<Tool>(['pen', 'marker', 'highlighter']);

/** The tools that put a new thing down where you click. */
export const PLACING: ReadonlySet<Tool> = new Set<Tool>(['sticky', 'text', 'label']);

/** Stroke width in board units, per tool. A highlighter is a nib, not a pen. */
export const WEIGHT: Record<string, number> = { pen: 2.5, marker: 5, highlighter: 26 };

export function weightOf(tool: Tool): number {
  return WEIGHT[tool] ?? 3;
}

/** A highlighter is a band of colour, a filled shape rather than a line. */
export function isFill(tool: Tool): boolean {
  return tool === 'highlighter';
}
