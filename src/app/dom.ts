/**
 * The few DOM helpers every surface uses.
 *
 * Kept tiny on purpose: the app is vanilla DOM with no framework, and the moment helpers
 * start accumulating here they become one.
 */

import { leavingFor, moving } from '~/app/feel.ts';

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

/**
 * Go to another surface without a flash.
 *
 * The top bar is the same on every surface and stays exactly where it is; what is under it fades
 * out here and fades in on the other side (see the arrive rule in the chrome's stylesheet), so a
 * move from the board to the shelf reads as one place changing, not a page being thrown away
 * and a blank one put up.
 */
export function go(href: string, from: HTMLAnchorElement | null = null): void {
  if (!moving()) {
    window.location.href = href;
    return;
  }
  const longer = leavingFor(from);
  document.documentElement.toggleAttribute('data-gs-leaving', true);
  window.setTimeout(() => {
    window.location.href = href;
  }, 150 + longer);
}

/**
 * Every link to another surface goes through go(). Only plain left clicks on same-origin pages:
 * a new tab, a download, the API and anything with a target are left to the browser.
 */
export function smoothLinks(): void {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const a = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    go(url.href, a);
  });
  // Back from the history cache: the page comes back as it was left, faded. Undo that.
  window.addEventListener('pageshow', () => {
    document.documentElement.removeAttribute('data-gs-leaving');
    unloading = false;
  });
  // A request still out when the page is left is cut off, and its failure is not news: every
  // surface would otherwise report "NetworkError" on the way out. Only then -- a failure while
  // the page is in use still surfaces. (pagehide, not beforeunload, which costs the history cache.)
  // The arrival fade is for arriving; after it, what is added comes in its own way.
  window.setTimeout(() => document.documentElement.toggleAttribute('data-gs-arrived', true), 400);
  window.addEventListener('pagehide', () => {
    unloading = true;
  });
  window.addEventListener('unhandledrejection', (event) => {
    const leaving = unloading || document.documentElement.hasAttribute('data-gs-leaving');
    if (leaving && event.reason instanceof TypeError) event.preventDefault();
  });
}

let unloading = false;
