/**
 * The notebook, as something you can use.
 *
 * Two things a board does not need and a notebook lives or dies by.
 *
 * THE FLIP. A notebook you click "next" on is a slideshow. The page has to turn
 * -- and it has to turn as paper does, which means one leaf rotating about the
 * binding with the next one revealed behind it, not a crossfade and not a
 * slide. It is also the first thing to switch off when someone has asked for
 * less motion, because a page turn is exactly what that setting is about.
 *
 * GETTING SOMEWHERE. Forty leaves means thirty-nine flips, so there is a jump,
 * and the jump riffles: a few fast turns and then an arrival. Animating all
 * thirty-nine is slower than the person wants, and animating none of them
 * loses the one thing that tells them the notebook has a shape.
 *
 * The cover has its own editor, in cover.ts beside this.
 */

import { CoverEditor } from '~/app/book/cover.ts';
import { RepoSetup } from '~/app/book/repo.ts';
import { bookShapes } from '~/app/book/shapes.ts';
import { toast } from '~/app/chrome.ts';
import { go, must, onClick, typing } from '~/app/dom.ts';
import { appear, play, vanish } from '~/app/feel.ts';
import { letterOf } from '~/app/keys.ts';
import { Session } from '~/app/net.ts';
import type { BookSpec, Leaf } from '~/draw/doc/book/model.ts';
import { boundLeaves } from '~/draw/doc/book/model.ts';
import type { BookOp } from '~/draw/doc/book/patch.ts';
import { apply, invert } from '~/draw/doc/book/patch.ts';

/** How long one leaf takes to turn. Slower than this reads as a stuck page. */
const FLIP_MS = 640;
/** Turns actually animated when jumping a long way. */
const RIFFLE = 4;
const RIFFLE_MS = 130;
/** Below this width the book is read one leaf at a time. */
const ONE_LEAF = '(max-width: 760px)';
/** What the top of the screen and the turner at the bottom take, in px. */
const TOP = 76;
const BOTTOM = 84;

export class BookApp {
  readonly session: Session<BookSpec, BookOp>;
  private readonly book: HTMLElement;
  private leaf = 0;
  /** In one-leaf reading, which of the two leaves of the spread is showing. */
  private side: 'verso' | 'recto' = 'verso';
  private flipping = false;
  private readonly cache = new Map<number, string>();
  private readonly cover: CoverEditor;

  constructor(spec: BookSpec) {
    this.book = must<HTMLElement>('[data-gs="book"]');
    this.leaf = Number(this.book.dataset.gsLeaf ?? 0);
    this.session = new Session<BookSpec, BookOp>({
      kind: 'book',
      spec,
      apply,
      invert,
      onPatch: () => this.refresh(),
      onStatus: (state) => this.status(state),
    });
    this.cover = new CoverEditor(this.session, (message) => toast(message, 'error'));
    this.session.listen();
    this.bind();
    this.fitToScreen();
    this.showPlace();
    void this.warm();
    this.bindShapes();
  }

  // ---------------------------------------------------------------- "/" on the spread

  /** Type anything on the spread and it becomes a card on the page in view (book/shapes.ts). */
  private bindShapes(): void {
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'ss-open';
    open.dataset.gs = 'shape-open';
    open.setAttribute('aria-keyshortcuts', '/');
    open.title = 'type anything: it becomes a card on this page';
    open.innerHTML =
      '<svg class="ss-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6 A2.5 2.5 0 0 1 6 3.5 H18 A2.5 2.5 0 0 1 20.5 6 V18 A2.5 2.5 0 0 1 18 20.5 H6 A2.5 2.5 0 0 1 3.5 18 Z M14 7.5 L10 16.5"/></svg>' +
      '<span>type anything</span><kbd class="gs-kbd">/</kbd>';
    document.body.append(open);
    bookShapes({
      session: this.session,
      element: this.book,
      leafInView: () => {
        const leaves = this.leaves;
        const index = this.single
          ? this.leaf + (this.side === 'recto' ? 1 : 0)
          : leaves[this.leaf + 1]
            ? this.leaf + 1
            : this.leaf;
        return leaves[Math.max(0, Math.min(index, leaves.length - 1))]?.id;
      },
      isOpen: () => !this.book.querySelector('[data-gs="closed"]'),
      turnTo: (page) => {
        const index = page - 1;
        const shown = this.single
          ? [this.leaf + (this.side === 'recto' ? 1 : 0)]
          : [this.leaf, this.leaf + 1];
        if (!shown.includes(index)) void this.goto(index);
      },
    }).bind();
  }

  private get single(): boolean {
    return window.matchMedia(ONE_LEAF).matches;
  }

  /**
   * Hold the book at arm's length on a small screen.
   *
   * A spread is a PHYSICAL SIZE: two leaves and their boards measure 1200px across, and
   * re-laying it out narrower would stop it being a spread -- a book whose two pages are
   * different widths at different screen sizes is not a book. So it is scaled instead, to fit
   * the room between the bar at the top and the turner at the bottom: scaled to the width
   * alone, its top edge sat under the bar and its folio under the turner.
   *
   * On a phone even that is two postage stamps, so it is read a leaf at a time instead --
   * which is what anybody does with a notebook held in one hand.
   *
   * The scale cannot be done in CSS: it is a length divided by a length, which calc()
   * refuses. Measured here, where both numbers are just numbers.
   */
  private fitToScreen(): void {
    const apply = (): void => {
      const single = this.single;
      this.book.toggleAttribute('data-single', single);
      this.book.dataset.side = this.side;
      this.book.style.setProperty('--book-scale', '1');
      const width = this.book.offsetWidth;
      const height = this.book.offsetHeight;
      if (!width || !height) return;
      const scale = Math.min(
        1,
        (window.innerWidth - 16) / width,
        Math.max(0.4, (window.innerHeight - TOP - BOTTOM) / height),
      );
      this.book.style.setProperty('--book-scale', scale.toFixed(4));
      // A transform does not change layout, so the unscaled box would leave a screen of
      // empty desk under a shrunken book. The margin takes back exactly what it saved.
      this.book.style.marginBlockEnd = `${Math.round((scale - 1) * height)}px`;
      this.showPlace();
    };
    apply();
    window.addEventListener('resize', apply);
  }

  private get leaves(): Leaf[] {
    return boundLeaves(this.session.spec);
  }

  private get quiet(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------------------------------------------------------------- flipping

  /**
   * Turn one leaf.
   *
   * The leaf being turned is a copy laid over the spread, rotated about the
   * binding, with the page it reveals printed on its back. Underneath, the
   * spread is set to where it will be when the turn finishes -- so the moment
   * the copy is removed nothing moves, which is what makes the turn feel like
   * paper rather than like a transition.
   */
  /**
   * Open the cover, if the notebook is shut. True if it was: that press was the opening, and
   * it does not also turn a page.
   */
  open(): boolean {
    const shut = this.book.querySelector<HTMLElement>('[data-gs="closed"]');
    if (!shut || shut.classList.contains('is-opening')) return false;
    /*
     * In stages, so nothing is seen before its time: the page under the cover as it lifts;
     * the left-hand page only once the cover has passed upright and is over it; then the
     * inside of the board gives way to that page and the cover is gone.
     */
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.book.removeAttribute('data-closed');
    this.book.toggleAttribute('data-opening', true);
    play('book');
    this.book.toggleAttribute('data-lifting', true);
    // One frame with the spread laid out beneath, then the swing.
    requestAnimationFrame(() => shut.classList.add('is-opening'));
    const upright = reduced ? 0 : 470;
    const landed = reduced ? 240 : 900;
    window.setTimeout(() => this.book.toggleAttribute('data-lifting', false), upright);
    window.setTimeout(() => shut.classList.add('is-landed'), landed);
    window.setTimeout(() => {
      shut.remove();
      this.book.toggleAttribute('data-opening', false);
    }, landed + 280);
    return true;
  }

  async flip(direction: 1 | -1): Promise<void> {
    if (direction === 1 && this.open()) return;
    if (this.flipping) return;
    if (this.single) {
      await this.step(direction);
      return;
    }
    const next = this.leaf + direction * 2;
    if (next < 0 || next >= this.leaves.length) return;
    if (this.quiet) {
      await this.goto(next);
      return;
    }
    this.flipping = true;
    /*
     * The leaf that lifts. Forward, it is the right-hand page: its front is the page there now
     * and its back the one it lands as. Back, it is the left-hand page: it starts face-down on
     * the left showing the page there now (its back), and lands on the right as the page before
     * it (its front). Back used to lift L-2 over L-1 -- a page from the spread being turned TO --
     * so the page in the air was never the one that had been lifted.
     */
    const front = direction === 1 ? this.leaf + 1 : this.leaf - 1;
    const back = direction === 1 ? this.leaf + 2 : this.leaf;
    const [frontHtml, backHtml] = await Promise.all([this.leafHtml(front), this.leafHtml(back)]);

    const flipper = document.createElement('div');
    flipper.className = `flipper turn-${direction === 1 ? 'forward' : 'back'}`;
    flipper.setAttribute('aria-hidden', 'true');
    // Measured off the spread, not taken from the nominal leaf height. A leaf
    // is as tall as its text made it, so a flipper sized from the constant was
    // visibly shorter than the page it was supposed to be lifting.
    const spreadBox = this.book.querySelector<HTMLElement>('.book-spread');
    if (spreadBox) {
      flipper.style.top = `${spreadBox.offsetTop}px`;
      flipper.style.height = `${spreadBox.offsetHeight}px`;
      flipper.style.width = `${Math.round(spreadBox.offsetWidth / 2)}px`;
    }
    // Both faces are leaves our own server rendered: see leafHtml.
    flipper.innerHTML =
      `<div class="flip-face face-front">${frontHtml}</div>` +
      `<div class="flip-face face-back">${backHtml}</div>` +
      '<div class="flip-shade"></div>';
    /*
     * Underneath, while the leaf is in the air: on the side it has not reached yet, the page
     * that is there now; on the side it has left, the page it uncovers. The page it will land
     * on is on its back, not underneath -- underneath, it showed through the whole turn.
     */
    const spread = this.book.querySelector<HTMLElement>('.book-spread');
    const [oldSide, newSide] = await Promise.all(
      direction === 1
        ? [this.leafHtml(this.leaf), this.leafHtml(next + 1)]
        : [this.leafHtml(next), this.leafHtml(this.leaf + 1)],
    );
    this.book.append(flipper);
    // Our own server's leaves, as in paint().
    if (spread) spread.innerHTML = direction === 1 ? oldSide + newSide : oldSide + newSide;
    this.book.toggleAttribute(direction === 1 ? 'data-turning' : 'data-turning-back', true);
    /*
     * The turn, driven with an explicit midpoint where the leaf stands on its edge. Each face
     * is shown only on its own half of the turn -- the front until the leaf is upright, the back
     * after -- rather than trusting backface-visibility, which Firefox does not honour for
     * everything on a page (a note, a turned item), so the front's words showed through the
     * back, mirrored.
     */
    const rtl = document.documentElement.dir === 'rtl';
    const sign = (direction === 1 ? -1 : 1) * (rtl ? -1 : 1);
    const from = direction === 1 ? 0 : -sign * 180;
    const to = direction === 1 ? sign * 180 : 0;
    const mid = (from + to) / 2;
    const turn = (deg: number): string => `perspective(2600px) rotateY(${deg}deg)`;
    const timing = { duration: FLIP_MS, fill: 'forwards' as const };
    flipper.dataset.turning = '1';
    play('turn');
    const swing = flipper.animate(
      [
        { transform: turn(from), easing: 'cubic-bezier(0.45, 0.05, 0.7, 0.6)' },
        { transform: turn(mid), offset: 0.5, easing: 'cubic-bezier(0.3, 0.4, 0.25, 1)' },
        { transform: turn(to) },
      ],
      timing,
    );
    const halves = (first: boolean): Keyframe[] => [
      { opacity: first ? 1 : 0 },
      { opacity: first ? 1 : 0, offset: 0.5 },
      { opacity: first ? 0 : 1, offset: 0.5 },
      { opacity: first ? 0 : 1 },
    ];
    // The face seen first is the one facing up at the start: the front going forward, the back
    // coming back (the leaf starts turned over on the left).
    flipper.querySelector('.face-front')?.animate(halves(direction === 1), timing);
    flipper.querySelector('.face-back')?.animate(halves(direction !== 1), timing);
    await swing.finished.catch(() => undefined);
    // Landed: the spread is the one turned to, and the copy goes in the same frame.
    await this.paint(next);
    flipper.remove();
    this.book.removeAttribute('data-turning');
    this.book.removeAttribute('data-turning-back');
    this.flipping = false;
  }

  /**
   * One leaf onwards or back, when the book is read a leaf at a time.
   *
   * The spread underneath is the same two leaves; only which of them is showing changes, and
   * crossing into the next spread is a repaint. A quick slide says which way the page went.
   */
  private async step(direction: 1 | -1): Promise<void> {
    const at = this.leaf + (this.side === 'recto' ? 1 : 0) + direction;
    if (at < 0 || at >= this.leaves.length) return;
    const spread = at - (at % 2);
    if (spread !== this.leaf) await this.paint(spread);
    this.side = at % 2 === 0 ? 'verso' : 'recto';
    this.book.dataset.side = this.side;
    this.showPlace();
    if (!this.quiet) {
      this.book.querySelector('.book-spread')?.animate(
        [
          { transform: `translateX(${direction * 18}px)`, opacity: 0.4 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    }
  }

  /** Go to a leaf, riffling if it is far away. */
  async goto(index: number): Promise<void> {
    this.open();
    const wanted = Math.max(0, Math.min(index, this.leaves.length - 1));
    const target = wanted - (wanted % 2);
    this.side = wanted % 2 === 0 ? 'verso' : 'recto';
    this.book.dataset.side = this.side;
    const distance = Math.abs(target - this.leaf) / 2;
    if (this.quiet || distance <= 1 || this.single) {
      await this.paint(target);
      return;
    }
    const direction: 1 | -1 = target > this.leaf ? 1 : -1;
    this.flipping = true;
    for (let i = 0; i < Math.min(RIFFLE, distance); i += 1) {
      await this.paint(this.leaf + direction * 2);
      await new Promise((done) => window.setTimeout(done, RIFFLE_MS));
    }
    this.flipping = false;
    await this.paint(target);
  }

  /** Put the given spread on the page, without any animation. */
  private async paint(index: number): Promise<void> {
    const at = Math.max(0, Math.min(index, this.leaves.length - 1));
    const spread = this.book.querySelector<HTMLElement>('.book-spread');
    if (!spread) return;
    const [left, right] = await Promise.all([this.leafHtml(at), this.leafHtml(at + 1)]);
    // Leaves our own server rendered: see leafHtml.
    spread.innerHTML = left + right;
    this.leaf = at;
    this.book.dataset.gsLeaf = String(at);
    this.showPlace();
    void this.warm();
  }

  /**
   * The rendered HTML of one leaf, from the server.
   *
   * Fetched rather than built. The app does not render: a leaf drawn in the
   * browser would be a second renderer, and a second renderer is a second thing
   * that can disagree with the first about what a sticky note looks like.
   */
  private async leafHtml(index: number): Promise<string> {
    if (index < 0 || index >= this.leaves.length) {
      return '<div class="leaf leaf-absent" aria-hidden="true"></div>';
    }
    const cached = this.cache.get(index);
    if (cached !== undefined) return cached;
    const res = await fetch(
      `/api/leaf?id=${encodeURIComponent(this.session.spec.id)}&index=${index}`,
    );
    if (!res.ok) return '<div class="leaf leaf-absent" aria-hidden="true"></div>';
    const { html } = (await res.json()) as { html: string };
    this.cache.set(index, html);
    return html;
  }

  /** Fetch the leaves either side, so a turn never waits on the network. */
  private async warm(): Promise<void> {
    for (const index of [this.leaf + 2, this.leaf + 3, this.leaf - 1, this.leaf - 2]) {
      if (index >= 0 && index < this.leaves.length) void this.leafHtml(index);
    }
  }

  private refresh(): void {
    this.cache.clear();
    void this.paint(this.leaf);
    this.cover.refresh();
  }

  // ---------------------------------------------------------------- chrome

  private showPlace(): void {
    const of = this.leaves.length;
    const label = document.querySelector<HTMLElement>('[data-gs="place"]');
    const shown = this.single ? this.leaf + (this.side === 'recto' ? 1 : 0) : this.leaf;
    if (label) {
      label.textContent = this.single
        ? `of ${of}`
        : `${this.leaf + 1}–${Math.min(this.leaf + 2, of)} of ${of}`;
    }
    const shut = this.book.querySelector<HTMLElement>('[data-gs="closed"]');
    // Arriving from the shelf: the opening plays by itself, once. A reload lands on the pages.
    if (shut && new URLSearchParams(location.search).has('opening')) {
      const url = new URL(location.href);
      url.searchParams.delete('opening');
      history.replaceState(history.state, '', url);
      // Once the faces are loaded and a frame has been drawn, so nothing else competes with it.
      void document.fonts.ready.then(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.setTimeout(() => this.open(), 180)),
        ),
      );
    }
    shut?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.open();
    });
    shut?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.open();
      }
    });

    const jump = document.querySelector<HTMLInputElement>('[data-gs="jump"]');
    if (jump) {
      jump.max = String(of);
      jump.value = String(shown + 1);
    }
  }

  private status(state: 'saved' | 'saving' | 'offline'): void {
    const element = document.querySelector<HTMLElement>('[data-gs="saved"]');
    if (!element) return;
    element.dataset.state = state;
    element.textContent = state === 'offline' ? `offline · ${this.session.unsent} waiting` : state;
  }

  private bind(): void {
    onClick('next', () => void this.flip(1));
    onClick('prev', () => void this.flip(-1));
    onClick('add-leaf', () => this.addLeaf());
    onClick('archive', () => this.archive());
    onClick('pages', () => this.togglePages());
    onClick('page-setup', () => this.pageSetup());
    onClick('book-pdf', () => go(`/print?book=${encodeURIComponent(this.session.spec.id)}`));
    const repo = (): RepoSetup => {
      const leaf = this.leaves[Math.min(this.leaf, this.leaves.length - 1)]?.id;
      const page = leaf
        ? `/page?book=${encodeURIComponent(this.session.spec.id)}&leaf=${encodeURIComponent(leaf)}`
        : undefined;
      return new RepoSetup(this.session.spec, this.session.client, page);
    };
    onClick('repo-open', () => void repo().open());
    // Sent here from a page's drawer, to connect: straight into the setup, once.
    if (new URLSearchParams(location.search).has('repo')) {
      const url = new URL(location.href);
      url.searchParams.delete('repo');
      history.replaceState(history.state, '', url);
      void repo().open();
    }
    onClick('cover-open', () => void this.cover.open());
    // Asked for from the shelf's "the cover": straight into the cover editor, once.
    if (new URLSearchParams(location.search).has('cover')) {
      const url = new URL(location.href);
      url.searchParams.delete('cover');
      history.replaceState(history.state, '', url);
      void this.cover.open();
    }

    const jump = document.querySelector<HTMLInputElement>('[data-gs="jump"]');
    jump?.addEventListener('change', () => void this.goto(Number(jump.value) - 1));

    window.addEventListener('keydown', (event) => {
      if (typing(event.target) || this.cover.isOpen) return;
      if (event.key === 'Escape' && document.querySelector('.pages-grid')) {
        document.querySelector('.pages-grid')?.remove();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && letterOf(event) === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.session.redo();
        else this.session.undo();
        return;
      }
      // The arrow keys follow the reading direction: in a right-to-left book,
      // "next" is to the left, because that is where the next page is.
      const rtl = document.documentElement.dir === 'rtl';
      if (event.key === 'ArrowRight') void this.flip(rtl ? -1 : 1);
      if (event.key === 'ArrowLeft') void this.flip(rtl ? 1 : -1);
      if (event.key === 'PageDown') void this.flip(1);
      if (event.key === 'PageUp') void this.flip(-1);
      if (event.key === 'Home') void this.goto(0);
      if (event.key === 'End') void this.goto(this.leaves.length - 1);
    });

    /*
     * A page is opened to be worked on: double-click it, or its pencil. Every tool the board
     * has is there -- notes, pictures, ink, the eraser, moving, turning, grouping -- on a
     * sheet the size of the page. The spread is for reading and turning.
     */
    const edit = (leaf: HTMLElement | null): void => {
      const leafId = leaf?.dataset.gsId;
      if (!leafId) return;
      go(
        `/page?book=${encodeURIComponent(this.session.spec.id)}&leaf=${encodeURIComponent(leafId)}`,
      );
    };
    this.book.addEventListener('dblclick', (event) => {
      edit((event.target as HTMLElement).closest<HTMLElement>('[data-gs="leaf"]'));
    });
    const decorate = (): void => {
      for (const leaf of this.book.querySelectorAll<HTMLElement>('[data-gs="leaf"]')) {
        if (leaf.querySelector('.gs-leaf-edit')) continue;
        const pen = document.createElement('button');
        pen.type = 'button';
        pen.className = 'gs-btn gs-leaf-edit';
        pen.setAttribute('aria-label', 'work on this page');
        pen.innerHTML = PENCIL;
        pen.addEventListener('click', (event) => {
          event.stopPropagation();
          edit(leaf);
        });
        leaf.append(pen);
      }
    };
    decorate();
    // Leaves are replaced as pages turn and as edits arrive; each new one gets its pencil.
    new MutationObserver(decorate).observe(this.book, { childList: true, subtree: true });

    // Clicking the outer edge of a leaf turns it, as it would if you reached
    // for the corner of a real one.
    this.book.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('a, button, input, .note')) return;
      const box = this.book.getBoundingClientRect();
      const where = (event.clientX - box.left) / box.width;
      const rtl = document.documentElement.dir === 'rtl';
      if (where > 0.86) void this.flip(rtl ? -1 : 1);
      else if (where < 0.14) void this.flip(rtl ? 1 : -1);
    });

    // A swipe turns the page on a phone. Horizontal only, and only a decisive one.
    let from: { x: number; y: number } | undefined;
    this.book.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') from = { x: event.clientX, y: event.clientY };
    });
    this.book.addEventListener('pointerup', (event) => {
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      from = undefined;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const rtl = document.documentElement.dir === 'rtl';
      void this.flip(dx < 0 !== rtl ? 1 : -1);
    });
  }

  // ---------------------------------------------------------------- editing

  private addLeaf(): void {
    const id = `leaf-${Date.now().toString(36)}`;
    this.session.run([{ op: 'leaf.add', leaf: { id, items: [] } }], '');
    toast('a blank leaf was added at the end');
  }

  /** Put it away. Never a delete: the archive is a library, not a bin. */
  private archive(): void {
    const away = !this.session.spec.archived;
    this.session.run([{ op: 'archive', archived: away }], '');
    if (away) window.setTimeout(() => go('/shelf'), 200);
    else toast('taken out of the archive');
  }

  // ---------------------------------------------------------------- pages

  /**
   * The grid of leaves, for managing them.
   *
   * Flipping is for reading and this is for rearranging, and they want
   * different things on screen: one shows two leaves at full size, the other
   * shows forty at once so a chapter can be picked up and moved somewhere else.
   */
  /**
   * The notebook's page: how big, and what is printed on the pages that name nothing of their
   * own. Both are the book's settings, so both are a 'book' patch -- and the page is drawn again,
   * since a new size is a new layout for every leaf.
   */
  private pageSetup(): void {
    document.querySelector('.gs-pagesetup')?.remove();
    const spec = this.session.spec;
    const card = document.createElement('div');
    card.className = 'gs-pagesetup gs-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'page size and template');
    const row = (
      title: string,
      options: ReadonlyArray<readonly [string, string]>,
      current: string,
      pick: (value: string) => void,
    ): void => {
      const head = document.createElement('p');
      head.className = 'gs-menu-head';
      head.textContent = title;
      const chips = document.createElement('div');
      chips.className = 'gs-chip-row';
      for (const [value, label] of options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gs-btn gs-chip-btn';
        b.dataset.gs = `page-${value}`;
        b.textContent = label;
        b.setAttribute('aria-pressed', String(value === current));
        b.addEventListener('click', () => pick(value));
        chips.append(b);
      }
      card.append(head, chips);
    };
    const apply = (patch: Record<string, unknown>): void => {
      this.session.run([{ op: 'book', patch } as BookOp], 'page setup');
      window.setTimeout(() => window.location.reload(), 180);
    };
    row(
      'page size',
      [
        ['a5', 'A5'],
        ['a4', 'A4'],
        ['square', 'square'],
        ['index', 'index card'],
      ],
      spec.pageSize ?? 'a5',
      (value) => apply({ pageSize: value }),
    );
    row(
      'new pages are printed with',
      [
        ['none', 'nothing'],
        ['cornell', 'cornell'],
        ['kanban', 'kanban'],
      ],
      spec.template ?? 'none',
      (value) => apply({ template: value === 'none' ? null : value }),
    );
    row(
      'corners in this notebook',
      [
        ['workspace', 'as the workspace'],
        ['0', 'square'],
        ['0.5', 'crisp'],
        ['1', 'as designed'],
        ['1.8', 'soft'],
        ['3', 'round'],
      ],
      spec.corners === undefined ? 'workspace' : String(spec.corners),
      (value) => apply({ corners: value === 'workspace' ? null : Number(value) }),
    );
    const note = document.createElement('p');
    note.className = 'gs-pagesetup-note';
    note.textContent = 'A page can have its own template: open it, and choose in its settings.';
    card.append(note);
    const close = (event: Event): void => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !card.contains(event.target as Node)
      ) {
        card.remove();
        document.removeEventListener('pointerdown', close, true);
        document.removeEventListener('keydown', close, true);
      }
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', close, true);
    document.body.append(card);
  }

  private togglePages(): void {
    const existing = document.querySelector('.pages-grid');
    if (existing) {
      play('close');
      vanish(existing, () => existing.remove());
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'pages-grid';
    grid.dataset.gs = 'pages-grid';
    const chosen = new Set<string>();

    const draw = (): void => {
      grid.replaceChildren();
      this.leaves.forEach((leaf, index) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'page-cell';
        cell.dataset.gsId = leaf.id;
        cell.dataset.gsIndex = String(index);
        if (chosen.has(leaf.id)) cell.dataset.selected = '1';
        cell.draggable = true;
        const number = document.createElement('span');
        number.className = 'page-number';
        number.textContent = String(index + 1);
        const hint = document.createElement('span');
        hint.className = 'page-hint';
        hint.textContent = describe((leaf.items?.length ?? 0) + (leaf.blocks?.length ?? 0));
        // A miniature of the page itself, drawn by the server's own leaf renderer and shrunk --
        // blank cards with a number on them said nothing about which page was which.
        const thumb = document.createElement('div');
        thumb.className = 'page-thumb';
        thumb.setAttribute('aria-hidden', 'true');
        if ((leaf.items?.length ?? 0) + (leaf.blocks?.length ?? 0) > 0) {
          void this.leafHtml(index).then((html) => {
            // Our own server's markup, the same that fills the spread.
            thumb.innerHTML = html;
          });
        }
        cell.append(thumb, number, hint);
        cell.addEventListener('click', (event) => {
          if (event.shiftKey || event.metaKey || event.ctrlKey) {
            if (chosen.has(leaf.id)) chosen.delete(leaf.id);
            else chosen.add(leaf.id);
            draw();
            return;
          }
          grid.remove();
          void this.goto(index);
        });
        cell.addEventListener('dragstart', (event) => {
          if (!chosen.has(leaf.id)) {
            chosen.clear();
            chosen.add(leaf.id);
            draw();
          }
          event.dataTransfer?.setData('text/plain', leaf.id);
        });
        cell.addEventListener('dragover', (event) => event.preventDefault());
        cell.addEventListener('drop', (event) => {
          event.preventDefault();
          const ids = this.leaves.filter((l) => chosen.has(l.id)).map((l) => l.id);
          if (ids.length === 0 || ids.includes(leaf.id)) return;
          // One operation for the whole group. Moving them one at a time
          // shifts the destination under each following leaf.
          this.session.run([{ op: 'leaf.move', ids, to: index }], '');
          chosen.clear();
          window.setTimeout(draw, 40);
        });
        grid.append(cell);
        // The same scale for every miniature: the cells are all one width.
        if (index === 0) {
          requestAnimationFrame(() => {
            grid.style.setProperty('--thumb-scale', String(cell.clientWidth / 560));
          });
        }
      });
    };
    draw();
    document.body.append(grid);
    // The pages come in one after another, a sheaf being fanned out.
    play('open');
    for (const [n, cell] of [...grid.querySelectorAll('.page-cell')].entries())
      appear(cell, Math.min(n, 30) * 16);
  }
}

/** What a leaf has on it, in words. */
/** The pencil on a page, with its words: it is the way into the page, so it says so. */
const PENCIL =
  '<svg class="gs-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L5.6 14.8 L16.2 4.2 ' +
  'L19.8 7.8 L9.2 18.4 Z M14 6.4 L17.6 10"/></svg><span class="gs-btn-text">work on this page</span>';

function describe(blocks: number): string {
  if (blocks === 0) return 'blank';
  return blocks === 1 ? '1 thing' : `${blocks} things`;
}

export async function bootBook(): Promise<BookApp> {
  const book = must<HTMLElement>('[data-gs="book"]');
  const id = book.dataset.gsId ?? 'notebook';
  const res = await fetch(`/api/state?kind=book&id=${encodeURIComponent(id)}`);
  const { spec } = (await res.json()) as { spec: BookSpec };
  return new BookApp(spec);
}
