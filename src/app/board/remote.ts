/**
 * Repository cards on a live page, and the drawer they come from.
 *
 * A card's tick closes (or reopens) its issue and its reply line comments on it; an address
 * pasted onto the page becomes a card; the drawer searches the notebook's repository and puts
 * what is found on the page. On a Kanban page, moving an issue card into another column is a
 * change on the service too; a pen stroke drawn straight through an open issue offers to close it.
 *
 * Everything that reaches a service asks first, the first time, for this notebook -- a comment
 * posted is posted, undo cannot take it back -- and every failure is shown on the card in the
 * service's own words (the server writes it there), never quietly swallowed.
 */

import type { BoardContext } from '~/app/board/context.ts';
import { confirmCard, toast } from '~/app/chrome.ts';
import { typing } from '~/app/dom.ts';
import type { BoardItem } from '~/draw/doc/board/model.ts';
import { type Provider, type RemoteLink, refFromUrl } from '~/draw/doc/remote/model.ts';
import { renderStickerFace } from '~/draw/material/sticker/render.ts';

const NAMES: Record<Provider, string> = { github: 'GitHub', gitlab: 'GitLab', gitea: 'Gitea' };

interface Row {
  number?: string;
  sha?: string;
  title?: string;
  message?: string;
  state?: string;
  labels?: Array<{ name: string }>;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function post<T>(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: T & { error?: string };
  try {
    data = (await res.json()) as T & { error?: string };
  } catch {
    data = { error: `the workspace answered ${res.status}` } as T & { error?: string };
  }
  return { ok: res.ok, data };
}

export class RemoteCards {
  private readonly ctx: BoardContext;
  private drawer: HTMLElement | undefined;
  private providers = new Map<string, Provider>();
  /** Which Kanban column each issue card was in, to see it move to another. */
  private columns = new Map<string, number>();

  constructor(ctx: BoardContext) {
    this.ctx = ctx;
  }

  private get address(): string {
    return this.ctx.session.spec.id;
  }

  private get link(): RemoteLink | undefined {
    return this.ctx.session.spec.sheet?.remote;
  }

  bind(): void {
    const viewport = this.ctx.viewport;
    viewport.addEventListener('click', (event) => {
      const tick = (event.target as HTMLElement).closest<HTMLElement>('.rc-tick');
      if (!tick) return;
      event.preventDefault();
      event.stopPropagation();
      const id = tick.closest<HTMLElement>('[data-gs="item"]')?.dataset.gsId;
      if (id) void this.tick(id, tick.getAttribute('aria-pressed') === 'true');
    });
    viewport.addEventListener('submit', (event) => {
      const form = (event.target as HTMLElement).closest<HTMLFormElement>('.rc-reply');
      if (!form) return;
      event.preventDefault();
      const id = form.closest<HTMLElement>('[data-gs="item"]')?.dataset.gsId;
      const input = form.querySelector<HTMLInputElement>('input');
      if (id && input) void this.reply(id, input);
    });
    // Keys typed on a reply line are the reply's, not the board's shortcuts.
    viewport.addEventListener('keydown', (event) => {
      if ((event.target as HTMLElement).closest('.rc-reply')) event.stopPropagation();
    });
    window.addEventListener('paste', (event) => {
      if (typing(event.target)) return;
      const text = event.clipboardData?.getData('text/plain')?.trim();
      if (!text || !/^https?:\/\//.test(text)) return;
      void this.pasted(text, event);
    });
    viewport.addEventListener('dragover', (event) => {
      if (event.dataTransfer?.types.includes('application/x-grimstroke-remote'))
        event.preventDefault();
    });
    viewport.addEventListener('drop', (event) => {
      const raw = event.dataTransfer?.getData('application/x-grimstroke-remote');
      if (!raw) return;
      event.preventDefault();
      event.stopPropagation();
      const at = this.ctx.view.toBoard({ x: event.clientX, y: event.clientY });
      void this.place(JSON.parse(raw) as Record<string, unknown>, [
        Math.round(at.x - 160),
        Math.round(at.y - 40),
      ]);
    });
    // After a hand lets go: did an issue card change columns, or a stroke cross an issue out?
    viewport.addEventListener('pointerup', () => window.setTimeout(() => this.afterGesture(), 80));
    for (const b of document.querySelectorAll<HTMLElement>('[data-gs="repo-drawer"]')) {
      b.addEventListener('click', () => this.toggleDrawer());
    }
    this.rememberColumns();
    // Strokes already on the page are not crossings; only one drawn from now on can be.
    this.lastStroke = this.ctx.session.spec.items.filter((i) => i.ink).at(-1)?.id;
    void this.loadProviders();
  }

  private async loadProviders(): Promise<void> {
    try {
      const res = await fetch('/api/remote/keys');
      const { keys } = (await res.json()) as { keys: Array<{ host: string; provider: Provider }> };
      this.providers = new Map(keys.map((k) => [k.host, k.provider]));
    } catch {
      // No keys: pasted addresses on github.com and gitlab.com are still recognised.
    }
  }

  // ---------------------------------------------------------------- asking first

  /** The first write to a service from this notebook asks; after that it is trusted. */
  private async allowed(what: string): Promise<boolean> {
    const key = `gs-remote-trust:${this.ctx.session.spec.sheet?.book ?? this.address}`;
    try {
      if (localStorage.getItem(key)) return true;
    } catch {
      // No storage: ask every time, which is the safe side.
    }
    const service = this.link ? NAMES[this.link.provider] : 'the service';
    const yes = await confirmCard({
      title: `${what} on ${service}?`,
      body:
        `This changes the real ${this.link ? this.link.repo : 'repository'} for everyone who works in it, and undo here cannot take it back. ` +
        'After this, changes from this notebook go straight through.',
      yes: 'yes, and from now on',
    });
    if (yes) {
      try {
        localStorage.setItem(key, '1');
      } catch {
        // Asked again next time; nothing lost.
      }
    }
    return yes;
  }

  private async act(id: string, body: Record<string, unknown>): Promise<boolean> {
    const { ok, data } = await post<{ seen: unknown }>('/api/remote/act', {
      board: this.address,
      id,
      ...body,
    });
    if (!ok) toast(data.error ?? 'the service refused', 'error');
    return ok;
  }

  private async tick(id: string, closed: boolean): Promise<void> {
    const number = this.issueNumber(id);
    if (!(await this.allowed(closed ? `Reopen #${number}` : `Close #${number}`))) return;
    if (await this.act(id, { action: closed ? 'reopen' : 'close' })) {
      toast(closed ? `#${number} reopened` : `#${number} closed`);
    }
  }

  private async reply(id: string, input: HTMLInputElement): Promise<void> {
    const text = input.value.trim();
    if (!text) return;
    const number = this.issueNumber(id);
    if (!(await this.allowed(`Comment on #${number}`))) return;
    input.disabled = true;
    const ok = await this.act(id, { action: 'comment', body: text });
    input.disabled = false;
    if (ok) {
      input.value = '';
      toast(`replied on #${number}`);
    }
  }

  private issueNumber(id: string): string {
    const block = this.ctx.items().get(id)?.block;
    return block?.kind === 'remote' ? (block.ref?.id ?? '?') : '?';
  }

  // ---------------------------------------------------------------- placing

  private async pasted(url: string, event: ClipboardEvent): Promise<void> {
    const ref = refFromUrl(url, (host) => this.providers.get(host));
    if (!ref) return;
    event.preventDefault();
    const box = this.ctx.viewport.getBoundingClientRect();
    const at = this.ctx.view.toBoard({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
    await this.place({ url }, [Math.round(at.x - 160), Math.round(at.y - 60)]);
  }

  async place(what: Record<string, unknown>, at?: [number, number]): Promise<void> {
    const { ok, data } = await post<{ id: string; block: { error?: string } }>(
      '/api/remote/place',
      {
        board: this.address,
        ...what,
        ...(at ? { at } : {}),
      },
    );
    if (!ok) {
      toast(data.error ?? 'that could not be put on the page', 'error');
      return;
    }
    if (data.block.error) toast(`on the page, but: ${data.block.error}`, 'error');
    await this.ctx.session.refresh();
    this.rememberColumns();
  }

  // ---------------------------------------------------------------- the drawer

  private toggleDrawer(): void {
    if (this.drawer) {
      this.drawer.remove();
      this.drawer = undefined;
      document.querySelector('[data-gs="repo-drawer"]')?.setAttribute('aria-pressed', 'false');
      return;
    }
    const link = this.link;
    const drawer = el('aside', 'gs-drawer gs-card');
    drawer.dataset.gs = 'drawer';
    drawer.setAttribute('aria-label', 'the repository');
    document.querySelector('[data-gs="repo-drawer"]')?.setAttribute('aria-pressed', 'true');
    if (!link) {
      const book = this.ctx.session.spec.sheet?.book;
      drawer.append(
        el('h2', 'gs-drawer-title', 'no repository yet'),
        el(
          'p',
          'gs-drawer-note',
          'This notebook is not connected to a repository. Connect it -- it takes a minute, and every step is explained.',
        ),
      );
      if (book) {
        const go = el('a', 'gs-btn gs-btn-primary', 'connect a repository');
        go.href = `/book?id=${encodeURIComponent(book)}&repo`;
        drawer.append(go);
      }
      document.body.append(drawer);
      this.drawer = drawer;
      return;
    }
    const head = el('header', 'gs-drawer-head');
    const mark = el('span', 'gs-drawer-mark');
    mark.innerHTML = renderStickerFace({ mark: link.provider });
    const where = el('div');
    where.append(el('b', '', link.repo), el('small', '', link.host));
    const close = el('button', 'gs-btn gs-btn-icon', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'close the drawer');
    close.addEventListener('click', () => this.toggleDrawer());
    head.append(mark, where, close);

    let of: 'issues' | 'merges' | 'commits' = 'issues';
    let state: 'open' | 'closed' | 'all' = 'open';
    let mine = false;
    const tabs = el('div', 'gs-drawer-tabs');
    tabs.setAttribute('role', 'tablist');
    const tab = (value: typeof of, label: string): HTMLButtonElement => {
      const b = el('button', 'gs-btn gs-chip-btn', label);
      b.type = 'button';
      b.dataset.gs = `drawer-${value}`;
      b.setAttribute('aria-pressed', String(value === of));
      b.addEventListener('click', () => {
        of = value;
        for (const t of tabs.querySelectorAll('button'))
          t.setAttribute('aria-pressed', String(t === b));
        void load();
      });
      return b;
    };
    tabs.append(
      tab('issues', 'issues'),
      tab('merges', link.provider === 'gitlab' ? 'merge requests' : 'pull requests'),
      tab('commits', 'commits'),
    );
    const filters = el('div', 'gs-drawer-filters');
    const stateChip = (value: typeof state): HTMLButtonElement => {
      const b = el('button', 'gs-btn gs-chip-btn', value);
      b.type = 'button';
      b.dataset.gs = `drawer-state-${value}`;
      b.setAttribute('aria-pressed', String(value === state));
      b.addEventListener('click', () => {
        state = value;
        for (const c of filters.querySelectorAll('[data-gs^="drawer-state"]'))
          c.setAttribute('aria-pressed', String(c === b));
        void load();
      });
      return b;
    };
    const mineChip = el('button', 'gs-btn gs-chip-btn', 'mine');
    mineChip.type = 'button';
    mineChip.dataset.gs = 'drawer-mine';
    mineChip.setAttribute('aria-pressed', 'false');
    mineChip.addEventListener('click', () => {
      mine = !mine;
      mineChip.setAttribute('aria-pressed', String(mine));
      void load();
    });
    filters.append(stateChip('open'), stateChip('closed'), stateChip('all'), mineChip);
    const search = el('input', 'gs-field gs-drawer-search');
    search.type = 'search';
    search.placeholder = 'search';
    search.dataset.gs = 'drawer-search';
    let timer = 0;
    search.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 300);
    });
    const list = el('ul', 'gs-drawer-list');
    const status = el('p', 'gs-drawer-note');
    const foot = el('footer', 'gs-drawer-foot');
    const make = el('button', 'gs-btn gs-btn-primary', 'new issue');
    make.type = 'button';
    make.dataset.gs = 'drawer-new';
    make.addEventListener('click', () => this.newIssue());
    const liveList = el('button', 'gs-btn', 'live list of these');
    liveList.type = 'button';
    liveList.dataset.gs = 'drawer-live';
    liveList.addEventListener('click', () => {
      if (of === 'commits') {
        toast('a live list is of issues or merge requests');
        return;
      }
      void this.place({
        query: {
          of,
          state,
          ...(mine ? { assignee: 'me' } : {}),
          ...(search.value.trim() ? { search: search.value.trim() } : {}),
        },
      });
    });
    const tracker = el('button', 'gs-btn', 'make this page a tracker');
    tracker.type = 'button';
    tracker.dataset.gs = 'drawer-tracker';
    tracker.addEventListener('click', () => void this.makeTracker());
    foot.append(make, liveList, tracker);
    drawer.append(head, tabs, filters, search, status, list, foot);
    document.body.append(drawer);
    this.drawer = drawer;

    let ask = 0;
    const load = async (): Promise<void> => {
      const n = ++ask;
      status.textContent = 'asking…';
      const params = new URLSearchParams({ board: this.address, of, state });
      if (mine) params.set('assignee', 'me');
      if (search.value.trim()) params.set('q', search.value.trim());
      const res = await fetch(`/api/remote/list?${params}`);
      let data: { items?: Row[]; error?: string };
      try {
        data = (await res.json()) as { items?: Row[]; error?: string };
      } catch {
        data = { error: `the workspace answered ${res.status}` };
      }
      if (n !== ask) return;
      if (!res.ok) {
        status.textContent = data.error ?? 'the list could not be fetched';
        list.replaceChildren();
        return;
      }
      const items = data.items ?? [];
      status.textContent = items.length
        ? `${items.length} shown -- drag one onto the page, or press +`
        : 'nothing like that';
      list.replaceChildren(...items.map((row) => this.row(row, of)));
    };
    void load();
  }

  private row(row: Row, of: 'issues' | 'merges' | 'commits'): HTMLLIElement {
    const li = el('li', `gs-drawer-row is-${row.state ?? 'open'}`);
    li.draggable = true;
    const kind = of === 'commits' ? 'commit' : of === 'merges' ? 'merge' : 'issue';
    const id = of === 'commits' ? (row.sha ?? '') : (row.number ?? '');
    const what = { kind, id };
    li.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('application/x-grimstroke-remote', JSON.stringify(what));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    });
    const n = el(
      'span',
      'gs-drawer-n',
      of === 'commits'
        ? id.slice(0, 7)
        : `${of === 'merges' && this.link?.provider === 'gitlab' ? '!' : '#'}${id}`,
    );
    const title = el('span', 'gs-drawer-t', (row.title ?? row.message ?? '').split('\n')[0] ?? '');
    title.dir = 'auto';
    const add = el('button', 'gs-btn gs-btn-icon gs-drawer-add', '+');
    add.type = 'button';
    add.dataset.gs = 'drawer-add';
    add.setAttribute('aria-label', 'put it on the page');
    add.addEventListener('click', () => void this.place(what));
    li.append(el('span', 'gs-drawer-dot'), n, title, add);
    return li;
  }

  private newIssue(): void {
    const dialog = el('dialog', 'gs-dialog gs-ask');
    dialog.setAttribute('aria-label', 'a new issue');
    const form = el('form');
    form.method = 'dialog';
    form.innerHTML =
      '<header class="gs-dialog-head"><h2>a new issue</h2></header><div class="gs-dialog-body">' +
      '<label class="gs-ask-label" for="gs-issue-title">title</label>' +
      '<input class="gs-field" id="gs-issue-title" required dir="auto" data-gs="issue-title">' +
      '<label class="gs-ask-label" for="gs-issue-body">what is wrong, or what is wanted</label>' +
      '<textarea class="gs-field" id="gs-issue-body" rows="5" dir="auto" data-gs="issue-body"></textarea>' +
      '<label class="gs-ask-label" for="gs-issue-labels">labels, with commas</label>' +
      '<input class="gs-field" id="gs-issue-labels" data-gs="issue-labels" placeholder="bug, ui">' +
      '</div><div class="gs-dialog-actions"><button class="gs-btn" value="cancel" formnovalidate>not now</button>' +
      '<button class="gs-btn gs-btn-primary" value="make" data-gs="issue-make">make it</button></div>';
    dialog.append(form);
    dialog.addEventListener('close', async () => {
      const title = (
        form.querySelector('[data-gs="issue-title"]') as HTMLInputElement
      ).value.trim();
      const body = (
        form.querySelector('[data-gs="issue-body"]') as HTMLTextAreaElement
      ).value.trim();
      const labels = (form.querySelector('[data-gs="issue-labels"]') as HTMLInputElement).value
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      dialog.remove();
      if (dialog.returnValue !== 'make' || !title) return;
      if (!(await this.allowed('Make a new issue'))) return;
      const { ok, data } = await post<{ issue: { number: string } }>('/api/remote/create', {
        board: this.address,
        title,
        ...(body ? { body } : {}),
        ...(labels.length ? { labels } : {}),
      });
      if (!ok) {
        toast(data.error ?? 'the issue could not be made', 'error');
        return;
      }
      toast(`#${data.issue.number} made`);
      await this.ctx.session.refresh();
    });
    document.body.append(dialog);
    dialog.showModal();
  }

  // ---------------------------------------------------------------- the tracker

  /**
   * A page as a Kanban board over the repository: three live lists, one per column -- open,
   * in progress (labelled 'doing'), and recently closed -- printed on Kanban paper. Moving an
   * issue card from one column to another changes it on the service to match.
   */
  private async makeTracker(): Promise<void> {
    const spec = this.ctx.session.spec;
    const [w] = spec.extent ? [spec.extent[2] - spec.extent[0]] : [560];
    const col = (w - 48) / 3;
    this.ctx.session.run([{ op: 'board', patch: { template: 'kanban' } as never }], 'tracker');
    const columns = [
      { title: 'to do', query: { of: 'issues', state: 'open' } },
      { title: 'doing', query: { of: 'issues', state: 'open', labels: ['doing'] } },
      { title: 'done', query: { of: 'issues', state: 'closed', limit: 6 } },
    ];
    for (const [i, c] of columns.entries()) {
      await this.place({ query: { ...c.query, title: c.title } }, [Math.round(28 + i * col), 64]);
    }
    toast('a tracker: move an issue card between the columns to change it on the service');
    window.setTimeout(() => window.location.reload(), 400);
  }

  private columnOf(item: BoardItem): number | undefined {
    const spec = this.ctx.session.spec;
    if (spec.template !== 'kanban' || !spec.extent) return undefined;
    const w = spec.extent[2] - spec.extent[0];
    const middle = item.at[0] + (item.size?.[0] ?? 320) / 2;
    return Math.max(0, Math.min(2, Math.floor(((middle - 24) / (w - 48)) * 3)));
  }

  private rememberColumns(): void {
    this.columns.clear();
    for (const item of this.ctx.session.spec.items) {
      if (item.block?.kind !== 'remote' || item.block.ref?.kind !== 'issue') continue;
      const c = this.columnOf(item);
      if (c !== undefined) this.columns.set(item.id, c);
    }
  }

  private afterGesture(): void {
    void this.checkColumns();
    void this.checkStrike();
  }

  private async checkColumns(): Promise<void> {
    for (const item of this.ctx.session.spec.items) {
      if (item.block?.kind !== 'remote' || item.block.ref?.kind !== 'issue') continue;
      const was = this.columns.get(item.id);
      const now = this.columnOf(item);
      if (now === undefined || was === undefined || was === now) continue;
      this.columns.set(item.id, now);
      const n = item.block.ref.id;
      const closed = (item.block.seen as { state?: string } | undefined)?.state === 'closed';
      const plan: Array<{ what: string; body: Record<string, unknown> }> =
        now === 2
          ? [{ what: `Close #${n}`, body: { action: 'close' } }]
          : now === 1
            ? [
                ...(closed ? [{ what: `Reopen #${n}`, body: { action: 'reopen' } }] : []),
                { what: `Label #${n} “doing”`, body: { action: 'label', add: ['doing'] } },
              ]
            : [
                ...(closed ? [{ what: `Reopen #${n}`, body: { action: 'reopen' } }] : []),
                { what: `Take “doing” off #${n}`, body: { action: 'label', remove: ['doing'] } },
              ];
      if (!(await this.allowed(plan.map((p) => p.what).join(', ')))) continue;
      for (const step of plan) await this.act(item.id, step.body);
      toast(`#${n} moved to ${['to do', 'doing', 'done'][now]}`);
    }
  }

  /**
   * A line drawn straight through an open issue is a line through a to-do: it offers to close
   * it -- with a comment naming the commit that fixed it, if a commit card on the page says so.
   */
  private async checkStrike(tries = 0): Promise<void> {
    const items = this.ctx.session.spec.items;
    const stroke = items.filter((i) => i.ink).at(-1);
    if (!stroke || stroke.id === this.lastStroke) return;
    // A stroke is on the page once the server has drawn it; until then, look again shortly.
    const drawn = this.ctx.element(stroke.id);
    if (!drawn) {
      if (tries < 8) window.setTimeout(() => void this.checkStrike(tries + 1), 150);
      return;
    }
    this.lastStroke = stroke.id;
    // A lone stroke is a zero-sized svg with its path drawn outside it: measure the path.
    const box = (
      drawn.tagName.toLowerCase() === 'svg' ? (drawn.querySelector('path') ?? drawn) : drawn
    ).getBoundingClientRect();
    if (box.width < 40) return;
    for (const item of items) {
      if (item.block?.kind !== 'remote' || item.block.ref?.kind !== 'issue') continue;
      if ((item.block.seen as { state?: string } | undefined)?.state !== 'open') continue;
      const card = this.ctx.element(item.id)?.getBoundingClientRect();
      if (!card) continue;
      const across = Math.min(box.right, card.right) - Math.max(box.left, card.left);
      const flat = box.height < card.height * 0.35;
      const inside = box.top > card.top && box.bottom < card.bottom;
      if (across < card.width * 0.6 || !flat || !inside) continue;
      const n = item.block.ref.id;
      const fixer = items.find(
        (i) =>
          i.block?.kind === 'remote' &&
          i.block.ref?.kind === 'commit' &&
          ((i.block.seen as { closes?: string[] } | undefined)?.closes ?? []).includes(n),
      );
      const sha = fixer?.block?.kind === 'remote' ? fixer.block.ref?.id : undefined;
      const yes = await confirmCard({
        title: `Crossed out: close #${n}?`,
        body: sha
          ? `With a comment saying it was fixed in ${sha.slice(0, 8)}.`
          : 'The line stays on the page either way.',
        yes: 'close it',
      });
      if (!yes || !(await this.allowed(`Close #${n}`))) return;
      if (sha) await this.act(item.id, { action: 'comment', body: `Fixed in ${sha}.` });
      if (await this.act(item.id, { action: 'close' })) toast(`#${n} closed`);
      return;
    }
  }

  private lastStroke: string | undefined;
}
