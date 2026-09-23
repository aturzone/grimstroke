/**
 * One editable line of a profile's details.
 *
 * On its own, and with nothing heavier than escaping behind it, because the studio app builds
 * a fresh row in the browser when a line is added. It sat in the studio page's module first,
 * which reads font files from disk, and the browser bundle went with it and stopped building.
 */

import { icon } from '~/draw/chrome/icons.ts';
import { escapeHtml } from '~/draw/type/text.ts';

/** One line of a profile's details, editable. Also built by the app when a line is added. */
export function detailRow(labelText: string, value: string): string {
  return (
    '<div class="fs-detail" data-gs="face-detail">' +
    `<input class="gs-field" data-gs="face-detail-label" dir="auto" value="${escapeHtml(labelText)}" ` +
    'placeholder="team" maxlength="24" aria-label="what">' +
    `<input class="gs-field" data-gs="face-detail-value" dir="auto" value="${escapeHtml(value)}" ` +
    'placeholder="platform" maxlength="60" aria-label="says">' +
    `<button type="button" class="gs-btn gs-btn-icon" data-gs="face-detail-remove" aria-label="remove this line">${icon('close')}</button>` +
    '</div>'
  );
}
