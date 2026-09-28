/**
 * Which surface this page is.
 *
 * One bundle for all of them, chosen by what the server sent. Splitting the
 * app into one script per surface would mean a second round trip on every
 * navigation to save a few kilobytes, and the whole thing is smaller than one
 * of the fonts.
 */

import { bootBoard } from '~/app/board/app.ts';
import { bootBook } from '~/app/book/app.ts';
import { bootChrome } from '~/app/chrome.ts';
import { smoothLinks } from '~/app/dom.ts';
import { bindFeel } from '~/app/feel.ts';
import { bootPrint } from '~/app/print.ts';
import { bootProfile } from '~/app/profile.ts';
import { bootShelf } from '~/app/shelf/index.ts';
import { bootToday } from '~/app/today.ts';
import { startWelcome } from '~/app/welcome.ts';

/**
 * On a phone, the first opening of the day is the day: the board is a tap away, but a morning
 * starts with what is on. Once a day, only when arriving from outside, and only on the board's
 * own address -- a link to a board or a page goes where it says.
 */
function morning(): boolean {
  if (location.pathname !== '/' || location.search || window.innerWidth > 520) return false;
  if (document.referrer && new URL(document.referrer).origin === location.origin) return false;
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  try {
    if (localStorage.getItem('gs-day-opened') === key) return false;
    localStorage.setItem('gs-day-opened', key);
  } catch {
    return false;
  }
  location.replace('/today');
  return true;
}

async function boot(): Promise<void> {
  if (!navigator.webdriver && morning()) return;
  bootChrome();
  bindFeel();
  document.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-gs="tour-open"]')) {
      if (!document.querySelector('[data-gs="board"]')) {
        window.location.href = '/?tour';
        return;
      }
      startWelcome(true);
    }
  });
  smoothLinks();
  if (bootPrint()) return;
  if (bootToday()) return;
  if (bootShelf()) return;
  const profile = bootProfile();
  if (profile) {
    (window as unknown as { grimstroke: unknown }).grimstroke = profile;
    return;
  }
  const surface = document.querySelector('[data-gs="board"], [data-gs="book"]');
  if (!surface) return;
  const app = surface.getAttribute('data-gs') === 'book' ? await bootBook() : await bootBoard();
  // Handy for an agent driving a browser, and for anyone in a console.
  (window as unknown as { grimstroke: unknown }).grimstroke = app;
  // The first visit to the board is walked through once; ?tour asks for it again.
  if (surface.getAttribute('data-gs') === 'board' && !location.pathname.startsWith('/page')) {
    const asked = new URLSearchParams(location.search).has('tour');
    // A browser driven by a script (a test, an agent) is not a first visit.
    if (asked || !navigator.webdriver) window.setTimeout(() => startWelcome(asked), 700);
  }
}

void boot();
