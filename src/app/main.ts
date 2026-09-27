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

async function boot(): Promise<void> {
  bootChrome();
  bindFeel();
  smoothLinks();
  if (bootPrint()) return;
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
}

void boot();
