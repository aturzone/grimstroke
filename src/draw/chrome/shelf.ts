/**
 * The shelf's chrome: the way to a new notebook, and the way into each one.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { button, item } from '~/draw/chrome/parts.ts';
import { helpDialog, searchDialog, topBar } from '~/draw/chrome/top.ts';
import type { Pet } from '~/draw/material/profile/model.ts';

export function shelfChrome(count: number, pet?: Pet): string {
  const petName = pet?.name || (pet?.species === 'dog' ? 'the dog' : 'the cat');
  const feed =
    pet && pet.on !== false
      ? button({
          gs: 'pet-feed',
          label: `put food down for ${petName}`,
          icon: 'plus',
          text: `feed ${petName}`,
        })
      : '';
  return [
    topBar({
      place: 'shelf',
      title: count === 1 ? 'one notebook' : `${count} notebooks`,
      actions:
        feed +
        button({ gs: 'shelf-select', label: 'choose several', icon: 'check', text: 'choose' }) +
        button({
          gs: 'book-new',
          label: 'a new notebook',
          icon: 'plus',
          text: 'new notebook',
          tone: 'gs-btn-primary',
        }),
      compact:
        item({ gs: 'shelf-select', text: 'choose several', icon: 'check' }) +
        item({ gs: 'book-new', text: 'a new notebook', icon: 'plus' }),
    }),
    // A native form in a native dialog: Enter submits and Escape cancels with no script.
    '<dialog class="gs-dialog gs-ask" data-gs="book-new-dialog" aria-label="a new notebook">',
    '<form method="dialog" data-gs="book-new-form">',
    '<header class="gs-dialog-head"><h2>a new notebook</h2></header>',
    '<div class="gs-dialog-body">',
    '<label class="gs-ask-label" for="gs-book-title">what is it for?</label>',
    '<input class="gs-field gs-ask-input" id="gs-book-title" name="title" dir="auto" maxlength="80" ' +
      'placeholder="Field notes" autocomplete="off" required data-gs="book-new-title">',
    '</div>',
    '<div class="gs-dialog-actions">',
    '<button class="gs-btn" value="cancel" formnovalidate>not now</button>',
    `<button class="gs-btn gs-btn-primary" value="make" data-gs="book-new-make">${icon('check')}<span class="gs-btn-text">make it</span></button>`,
    '</div></form></dialog>',
    searchDialog(),
    helpDialog(),
  ].join('\n');
}
