/**
 * The few DOM helpers every surface uses.
 *
 * Kept tiny on purpose: the app is vanilla DOM with no framework, and the moment helpers
 * start accumulating here they become one.
 */

/** The element, or a loud failure naming what the page was missing. */
export function must<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`the page has no ${selector}`);
  return found;
}

/**
 * Bind a click to every control with this data-gs name.
 *
 * Every one, not the first: an action can be on the bar and in the menu at once -- on a
 * phone the bar folds into the menu -- and binding only the first left the menu's copy of
 * "add a leaf" as a row that did nothing.
 */
export function onClick(name: string, fn: (event: MouseEvent) => void): void {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-gs="${name}"]`)) {
    el.addEventListener('click', fn);
  }
}

/** Is the keyboard currently in a text field, where letters are letters and not shortcuts? */
export function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable;
}
