/**
 * The first visit: a short walk through what is where, pointing at the real thing each time.
 *
 * Four steps on the board -- the board itself, "/", the notebooks, the settings -- each a small
 * card beside a spotlight on the control it is about. Next, back, skip; Esc skips; the arrow keys
 * step. Remembered in this browser only (it is a convenience, not a setting), and "show the tour
 * again" in the menu brings it back.
 */

import { play } from '~/app/feel.ts';

interface Step {
  target: string;
  title: string;
  body: string;
  /** Where to point instead when the target is folded away, as the places are on a phone. */
  folded?: { target: string; note: string };
}

const IN_MENU = { target: '[data-gs="more"]', note: ' Here it is in the ⋯ menu.' };

const STEPS: Step[] = [
  {
    target: '[data-gs="tray"]',
    title: 'This is your board',
    body: 'An endless sheet of paper. Drop a screenshot on it, press N for a sticky note, P for a pen. Everything saves as you go.',
  },
  {
    target: '[data-gs="shape-open"]',
    title: 'Type anything',
    body: 'Press / and write a plan, a list, a sum or a colour -- “dinner friday 8pm”, “۲۵ دقیقه تمرکز” -- and it becomes a card you can tick, start and change.',
  },
  {
    target: '[data-gs="place-shelf"]',
    title: 'Your notebooks',
    body: 'A bookcase of notebooks, each with pages to write on, a cover to make, and a repository to connect.',
    folded: IN_MENU,
  },
  {
    target: '[data-gs="place-profile"]',
    title: 'Make it yours',
    body: 'Settings: your profile, a pet for the bookcase, corners and faces, sound and motion, connections, backups.',
    folded: IN_MENU,
  },
];

const KEY = 'gs-welcomed';

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
}

function remember(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Not remembered: it will offer itself again, which is harmless.
  }
}

export function startWelcome(force = false): void {
  if ((!force && seen()) || document.querySelector('.gs-welcome')) return;
  const steps = STEPS.filter((s) => document.querySelector(s.target));
  if (!steps.length) return;
  let at = 0;
  const spot = document.createElement('div');
  spot.className = 'gs-welcome-spot';
  const card = document.createElement('div');
  card.className = 'gs-welcome gs-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'a short tour');
  document.body.append(spot, card);

  const end = (): void => {
    remember();
    spot.remove();
    card.remove();
    window.removeEventListener('keydown', keys, true);
    window.removeEventListener('resize', show);
  };
  const keys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      end();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      go(-1);
    }
  };
  const go = (d: number): void => {
    at += d;
    if (at >= steps.length) {
      end();
      return;
    }
    at = Math.max(0, at);
    play('tap');
    show();
  };
  const show = (): void => {
    const step = steps[at] as Step;
    const shown = (sel: string): DOMRect | undefined => {
      const box = document.querySelector<HTMLElement>(sel)?.getBoundingClientRect();
      return box?.width ? box : undefined;
    };
    let r = shown(step.target);
    let body = step.body;
    if (!r && step.folded) {
      r = shown(step.folded.target);
      body += step.folded.note;
    }
    if (!r) {
      go(1);
      return;
    }
    const pad = 8;
    Object.assign(spot.style, {
      left: `${r.left - pad}px`,
      top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`,
    });
    card.innerHTML =
      `<p class="gs-welcome-count">${at + 1} of ${steps.length}</p>` +
      `<h2 class="gs-welcome-title"></h2><p class="gs-welcome-body"></p>` +
      '<div class="gs-welcome-actions">' +
      '<button type="button" class="gs-btn" data-w="skip">skip</button>' +
      (at > 0 ? '<button type="button" class="gs-btn" data-w="back">back</button>' : '') +
      `<button type="button" class="gs-btn gs-btn-primary" data-w="next">${at === steps.length - 1 ? 'start' : 'next'}</button>` +
      '</div>';
    (card.querySelector('.gs-welcome-title') as HTMLElement).textContent = step.title;
    (card.querySelector('.gs-welcome-body') as HTMLElement).textContent = body;
    card.querySelector('[data-w="skip"]')?.addEventListener('click', end);
    card.querySelector('[data-w="back"]')?.addEventListener('click', () => go(-1));
    card.querySelector('[data-w="next"]')?.addEventListener('click', () => go(1));
    // Beside the spotlight, on whichever side has room.
    const w = Math.min(340, window.innerWidth - 24);
    card.style.width = `${w}px`;
    const below = r.bottom + 16 + 180 < window.innerHeight;
    const top = below ? r.bottom + 16 : Math.max(12, r.top - 16 - card.offsetHeight);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
    card.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 200,
        easing: 'cubic-bezier(0.2, 1.2, 0.35, 1)',
      },
    );
    (card.querySelector('[data-w="next"]') as HTMLElement).focus();
  };
  window.addEventListener('keydown', keys, true);
  window.addEventListener('resize', show);
  show();
}
