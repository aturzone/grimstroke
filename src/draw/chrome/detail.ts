/**
 * One editable line of the profile's details.
 *
 * On its own, and with nothing heavier than escaping behind it, because the profile page builds
 * a fresh row in the browser when a line is added. It sat in the page's module first, which
 * reads font files from disk, and the browser bundle went with it and stopped building.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { escapeHtml } from '~/draw/type/text.ts';

/** One line of the profile's details, editable. Also built by the app when a line is added. */
export function detailRow(labelText: string, value: string): string {
  return (
    '<div class="pf-detail" data-gs="detail">' +
    `<input class="gs-field" data-gs="detail-label" dir="auto" value="${escapeHtml(labelText)}" ` +
    'placeholder="team" maxlength="24" aria-label="what">' +
    `<input class="gs-field" data-gs="detail-value" dir="auto" value="${escapeHtml(value)}" ` +
    'placeholder="platform" maxlength="60" aria-label="says">' +
    `<button type="button" class="gs-btn gs-btn-icon" data-gs="detail-remove" aria-label="remove this line">${icon('close')}</button>` +
    '</div>'
  );
}
