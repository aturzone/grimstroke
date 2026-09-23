/**
 * Editing the words on an item, in place.
 *
 * A textarea laid exactly over the text, so the paper, the tilt and the shadow all stay put
 * while the words change. Replacing the item with a form makes it jump, and the jump is what
 * tells you it is not really paper.
 */

import type { BoardContext } from '~/app/board/context.ts';
import { digitOf, isPunct, letterOf } from '~/app/keys.ts';
import {
  clearFormatting,
  cycleHeading,
  insertText,
  makeLink,
  type Sel,
  toggleLinePrefix,
  toggleTaskHere,
  wrapInline,
} from '~/app/note/format.ts';

/**
 * The formatting chords, from the extension, where each one was chosen because Firefox does
 * not claim it for itself. There is no Ctrl+U: markdown has no underline, so the note could
 * never show one, and a key that writes markup the note then shows as literal text is worse
 * than a key that does nothing.
 */
function chord(event: KeyboardEvent): ((sel: Sel) => Sel) | undefined {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return undefined;
  const letter = letterOf(event);
  const digit = digitOf(event);
  if (!event.shiftKey) {
    if (letter === 'b') return (sel) => wrapInline(sel, '**');
    if (letter === 'i') return (sel) => wrapInline(sel, '*');
    if (letter === 'e') return (sel) => wrapInline(sel, '`');
    if (letter === 'k') return makeLink;
    if (event.key === ' ' || event.code === 'Space') return clearFormatting;
    return undefined;
  }
  if (letter === 'x') return (sel) => wrapInline(sel, '~~');
  if (letter === 'd') {
    // ISO, because a date in a note is there to be unambiguous and to sort.
    const t = new Date();
    const iso =
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}` +
      `-${String(t.getDate()).padStart(2, '0')}`;
    return (sel) => insertText(sel, iso);
  }
  if (isPunct(event, '.', 'Period')) return (sel) => toggleLinePrefix(sel, 'quote');
  if (digit === '7') return (sel) => toggleLinePrefix(sel, 'number');
  if (digit === '8') return (sel) => toggleLinePrefix(sel, 'bullet');
  if (digit === '9') return (sel) => toggleLinePrefix(sel, 'task');
  if (digit === '1') return cycleHeading;
  if (event.key === 'Enter') return toggleTaskHere;
  return undefined;
}

export class Editor {
  private readonly ctx: BoardContext;
  private area: HTMLTextAreaElement | undefined;
  private finish: () => void = () => {};
  /** Told when an item starts and stops being edited, so its physics can stand down. */
  private readonly editing: (id: string, on: boolean) => void;

  constructor(ctx: BoardContext, editing: (id: string, on: boolean) => void) {
    this.ctx = ctx;
    this.editing = editing;
  }

  get open(): boolean {
    return this.area !== undefined;
  }

  /** Commit whatever is being typed and close the box. */
  close(): void {
    this.finish();
  }

  edit(id: string): void {
    const element = this.ctx.element(id);
    const item = this.ctx.items().get(id);
    if (!element || !item?.block) return;
    const block = item.block;
    if (!('text' in block)) return;

    /*
     * A note is edited INSIDE its own body, not over the whole sheet.
     *
     * Laying the textarea over the entire item covered the toolbar and started the text
     * thirty pixels above where it actually sits, so the words jumped as soon as you
     * clicked into them. The body is the part that holds the text; that is the part that
     * becomes editable.
     */
    const target =
      element.querySelector<HTMLElement>('.note .body') ??
      element.querySelector<HTMLElement>('.block') ??
      element;
    /*
     * THE EDITOR LIVES INSIDE THE ITEM.
     *
     * Positioned in screen coordinates on the body instead, it was a separate object that
     * merely happened to start in the right place: pan, zoom, a note settling after being
     * raised, or the note being dragged all left the box behind -- a blue rectangle of text
     * stranded on the desk beside the note it belonged to, still editing something that had
     * moved. Parented to the item it simply travels with it, scale and all.
     */
    this.close();
    const area = document.createElement('textarea');
    area.className = 'gs-editing';
    area.value = block.text;
    const styles = getComputedStyle(target);
    area.style.font = styles.font;
    area.style.color = styles.color;
    area.style.padding = styles.padding;
    area.style.lineHeight = styles.lineHeight;
    area.style.textAlign = styles.textAlign;
    // Laid over the body's own box within the item, in the item's coordinates.
    area.style.left = `${target.offsetLeft}px`;
    area.style.top = `${target.offsetTop}px`;
    area.style.width = `${target.offsetWidth}px`;
    area.style.height = `${target.offsetHeight}px`;
    target.closest<HTMLElement>('[data-gs="item"]')?.append(area);

    this.editing(id, true);
    this.area = area;
    area.focus();
    area.select();

    const done = (commit: boolean): void => {
      if (this.area !== area && !area.isConnected) return;
      area.remove();
      if (this.area === area) this.area = undefined;
      this.editing(id, false);
      if (!commit || area.value === block.text) return;
      this.ctx.session.run(
        [{ op: 'update', id, patch: { block: { ...block, text: area.value } } }],
        'edit text',
      );
    };
    this.finish = () => done(true);
    area.addEventListener('blur', () => done(true));
    area.addEventListener('keydown', (event) => {
      event.stopPropagation();
      // Never interfere with an input method composing a character.
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        done(false);
        return;
      }
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
        done(true);
        return;
      }
      const format = chord(event);
      if (!format) return;
      event.preventDefault();
      const next = format({ text: area.value, start: area.selectionStart, end: area.selectionEnd });
      area.value = next.text;
      area.setSelectionRange(next.start, next.end);
    });
  }
}
