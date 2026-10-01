/**
 * Saying something, briefly, on a slip at the edge of the page: the one piece of chrome the /
 * box needs, kept apart so a page with nothing else -- the core's own -- has it too. Built with
 * textContent, never innerHTML: what a toast says can be somebody else's words.
 */

export interface Toast {
  /** Change what it says, and how it says it. */
  say(text: string, tone?: Tone): void;
  close(): void;
}

type Tone = 'info' | 'error' | 'busy';

function tray(): HTMLElement {
  let holder = document.querySelector<HTMLElement>('.gs-toasts');
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'gs-toasts';
    holder.setAttribute('role', 'status');
    holder.setAttribute('aria-live', 'polite');
    document.body.append(holder);
  }
  return holder;
}

/**
 * Say something, briefly.
 *
 * An error stays until it is dismissed: it is the one message somebody might need to read
 * twice, and a failure that vanishes on a timer is a failure that was never reported. Anything
 * else leaves on its own after a few seconds, and a busy message stays until it is told.
 */
export function toast(
  text: string,
  tone: Tone = 'info',
  /** One thing to do about it, on the slip itself -- undo, above all. */
  action?: { label: string; run: () => void },
): Toast {
  const slip = document.createElement('div');
  slip.className = 'gs-toast gs-card';
  const words = document.createElement('span');
  words.className = 'gs-toast-text';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'gs-btn gs-btn-icon';
  close.setAttribute('aria-label', 'dismiss');
  close.textContent = '×';
  slip.append(words);
  if (action) {
    const act = document.createElement('button');
    act.type = 'button';
    act.className = 'gs-btn gs-toast-act';
    act.textContent = action.label;
    act.addEventListener('click', () => {
      action.run();
      leave();
    });
    slip.append(act);
  }
  slip.append(close);
  tray().append(slip);

  let timer = 0;
  const leave = (): void => {
    window.clearTimeout(timer);
    slip.dataset.leaving = '1';
    window.setTimeout(() => slip.remove(), 180);
  };
  const say = (next: string, nextTone: Tone = tone): void => {
    words.textContent = next;
    slip.dataset.tone = nextTone;
    window.clearTimeout(timer);
    // Long enough to reach the button when there is one to reach.
    if (nextTone === 'info') timer = window.setTimeout(leave, action ? 9000 : 3600);
  };
  close.addEventListener('click', leave);
  say(text, tone);
  return { say, close: leave };
}
