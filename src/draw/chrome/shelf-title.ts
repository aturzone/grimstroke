/**
 * The shelf's title, on its own so the app can say it without carrying the rest of the chrome.
 */

/** What is on the bookcase and what is put away, in the title: the app says it the same way. */
export function shelfTitle(count: number, archived: number): string {
  if (count === 0) return 'no notebooks';
  if (archived === 0) return count === 1 ? 'one notebook' : `${count} notebooks`;
  if (archived >= count) return count === 1 ? 'one notebook, archived' : `all ${count} archived`;
  return `${count - archived} in use · ${archived} archived`;
}
