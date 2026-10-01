/**
 * Connecting a notebook to a repository, step by step.
 *
 * Nobody should have to know in advance what a personal access token is, which scopes to tick,
 * or where on a company's GitLab the page for one lives. Each step says exactly what to do --
 * with the link straight to the right page and the boxes to tick -- and checks it worked before
 * the next: the key is tested and the service says whose it is and what it may do; the
 * repository is looked up and the key's access to it confirmed.
 *
 *   1  which service          GitHub, GitLab, Gitea / Forgejo, as sticker buttons
 *   2  where                  github.com, gitlab.com, or a company's own address
 *   3  a key                  borrow the GitHub CLI's, or make one: link, scopes, paste, test
 *   4  which repository       search the ones the key can see, or type owner/name
 *   5  done                   the service's mark on the cover, and where to go next
 *
 * A host that already has a key skips step 3; a connected notebook opens on its settings.
 */

import { toast } from '~/app/toast.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import type { Provider, RemoteLink } from '~/draw/doc/remote/model.ts';
import { renderStickerFace } from '~/draw/material/sticker/render.ts';

interface KeyInfo {
  host: string;
  provider: Provider;
  user?: string;
  gh?: boolean;
}

interface State {
  provider?: Provider;
  host?: string;
  user?: string;
  canWrite?: boolean;
  repo?: string;
}

const NAMES: Record<Provider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  gitea: 'Gitea or Forgejo',
};

/** The page on each service where a key is made, with the boxes already ticked where it can be. */
export function tokenPage(
  provider: Provider,
  host: string,
): { url: string; also?: string; scopes: string[]; note: string } {
  if (provider === 'github') {
    return {
      url: `https://${host}/settings/tokens/new?scopes=repo&description=grimstroke`,
      also:
        host === 'github.com'
          ? 'https://github.com/settings/personal-access-tokens/new'
          : undefined,
      scopes: ['repo'],
      note:
        'The link opens a classic token with “repo” already ticked: give it a name, choose how long it lasts, and press “Generate token”. ' +
        'For a fine-grained token instead, choose the repositories, and give it Issues: read and write, Pull requests: read, Contents: read, Actions: read.',
    } as { url: string; also?: string; scopes: string[]; note: string };
  }
  if (provider === 'gitlab') {
    return {
      url: `https://${host}/-/user_settings/personal_access_tokens?name=grimstroke&scopes=api`,
      also: `https://${host}/-/profile/personal_access_tokens?name=grimstroke&scopes=api`,
      scopes: ['api'],
      note:
        'The link opens GitLab’s token page with the name and the “api” scope filled in: choose an expiry date and press “Create personal access token”. ' +
        '“read_api” is enough to look, but closing, commenting and new issues need “api”. On an older GitLab, use the second link.',
    };
  }
  return {
    url: `https://${host}/user/settings/applications`,
    scopes: ['issue: read and write', 'repository: read'],
    note: 'Under “Manage access tokens”, give it a name, set issue to read and write and repository to read, and press “Generate token”.',
  };
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

function button(label: string, gs: string, tone = ''): HTMLButtonElement {
  const b = el('button', `gs-btn ${tone}`.trim(), label);
  b.type = 'button';
  b.dataset.gs = gs;
  return b;
}

async function json<T>(res: Response): Promise<T & { error?: string }> {
  try {
    return (await res.json()) as T & { error?: string };
  } catch {
    return { error: `the workspace answered ${res.status}` } as T & { error?: string };
  }
}

export class RepoSetup {
  /** The notebook being connected; none when only an account is (from the / box). */
  private readonly book: BookSpec | undefined;
  private dialog: HTMLDialogElement | undefined;
  private body: HTMLElement | undefined;
  private steps: HTMLElement | undefined;
  private state: State = {};
  private keys: KeyInfo[] = [];
  private gh = false;
  /** Whether signing in to GitHub through the browser is set up on this workspace. */
  private device = false;

  /** This tab, so the server can tell every other tab on the notebook to reload, and not this. */
  private readonly client: string;

  /** The page open on the spread, to go straight to with the drawer open. */
  private readonly pageHref: string | undefined;

  constructor(book: BookSpec | undefined, client = '', page?: string) {
    this.book = book;
    this.client = client;
    this.pageHref = page;
  }

  /**
   * What to do now that the notebook is connected. The drawer lives on a page, not on the
   * spread, and nobody could be expected to guess that: so the way there is a button.
   */
  private nextSteps(): HTMLElement {
    const box = el('section', 'gs-repo-now');
    box.dataset.gs = 'repo-now';
    box.append(el('h3', 'gs-menu-head', 'what now'));
    if (this.pageHref) {
      const go = el('a', 'gs-btn gs-btn-primary', 'open this page with the repository drawer');
      go.href = `${this.pageHref}&drawer`;
      go.dataset.gs = 'repo-go';
      box.append(go);
    }
    const what = el('ul', 'gs-repo-next');
    for (const line of [
      'On any page, press R (or the branch button in the tray) for the drawer: search issues, merge requests and commits, and drag them onto the page as cards.',
      'Paste an address -- an issue, a merge request, a commit, a pipeline -- straight onto a page.',
      'Tick a card to close its issue, write on its reply line to comment, or make a new issue from the drawer. Cards on an open page stay up to date by themselves.',
      'In the drawer, “make this page a tracker” lays out columns of issues on the page, kept in step with the service.',
    ]) {
      what.append(el('li', '', line));
    }
    box.append(what);
    return box;
  }

  async open(): Promise<void> {
    const res = await fetch('/api/remote/keys');
    const known = await json<{ keys: KeyInfo[]; gh: boolean; device?: boolean }>(res);
    this.keys = known.keys ?? [];
    this.gh = Boolean(known.gh);
    this.device = Boolean(known.device);
    const dialog = el('dialog', 'gs-dialog gs-repo');
    dialog.setAttribute('aria-label', 'connect a repository');
    const head = el('header', 'gs-dialog-head');
    head.append(
      el(
        'h2',
        '',
        !this.book
          ? 'connect an account'
          : this.book.remote
            ? 'the repository'
            : 'connect a repository',
      ),
    );
    const close = button('×', 'repo-close', 'gs-btn-icon');
    close.setAttribute('aria-label', 'close');
    close.addEventListener('click', () => dialog.close());
    head.append(close);
    this.steps = el('ol', 'gs-repo-steps');
    this.body = el('div', 'gs-repo-body');
    dialog.append(head, this.steps, this.body);
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    this.dialog = dialog;
    dialog.showModal();
    if (this.book?.remote) this.connected(this.book.remote);
    else this.chooseService();
  }

  /** The row of numbered steps along the top, with this one lit. */
  private progress(at: number): void {
    const names = ['service', 'where', 'key', 'repository', 'done'];
    this.steps?.replaceChildren(
      ...names.map((name, i) => {
        const li = el('li', i + 1 < at ? 'is-done' : i + 1 === at ? 'is-here' : '', name);
        li.dataset.n = String(i + 1);
        return li;
      }),
    );
  }

  private page(step: number, title: string, lead: string): HTMLElement {
    this.progress(step);
    const box = el('section', 'gs-repo-page');
    box.append(el('h3', 'gs-repo-title', title), el('p', 'gs-repo-lead', lead));
    this.body?.replaceChildren(box);
    return box;
  }

  private error(box: HTMLElement, message: string): void {
    box.querySelector('.gs-repo-error')?.remove();
    const p = el('p', 'gs-repo-error', message);
    p.setAttribute('role', 'alert');
    box.append(p);
  }

  // ---------------------------------------------------------------- 1

  private chooseService(): void {
    const box = this.page(
      1,
      'Which service is the repository on?',
      'The notebook gets its own connection; other notebooks are not affected.',
    );
    const row = el('div', 'gs-repo-services');
    for (const provider of ['github', 'gitlab', 'gitea'] as Provider[]) {
      const b = button('', `repo-service-${provider}`, 'gs-repo-service');
      b.innerHTML = `<span class="gs-repo-service-mark">${renderStickerFace({ mark: provider })}</span>`;
      b.append(el('span', 'gs-repo-service-name', NAMES[provider]));
      b.addEventListener('click', () => {
        this.state = { provider };
        this.chooseHost();
      });
      row.append(b);
    }
    box.append(row);
  }

  // ---------------------------------------------------------------- 2

  private chooseHost(): void {
    const provider = this.state.provider as Provider;
    const box = this.page(
      2,
      provider === 'github'
        ? 'GitHub, or your company’s GitHub?'
        : provider === 'gitlab'
          ? 'Which GitLab?'
          : 'Where is it?',
      provider === 'gitlab'
        ? 'gitlab.com, or your company’s own GitLab -- type its address as you would open it in the browser.'
        : provider === 'github'
          ? 'Most repositories are on github.com. GitHub Enterprise has its own address.'
          : 'Gitea and Forgejo are always somebody’s own server: type its address.',
    );
    const input = el('input', 'gs-field gs-repo-host');
    input.dataset.gs = 'repo-host';
    input.placeholder =
      provider === 'gitea'
        ? 'code.example.com'
        : provider === 'gitlab'
          ? 'gitlab.com'
          : 'github.com';
    input.value = provider === 'github' ? 'github.com' : provider === 'gitlab' ? 'gitlab.com' : '';
    input.autocomplete = 'off';
    // Hosts already connected for this service are one press away.
    const mine = this.keys.filter((k) => k.provider === provider);
    if (mine.length) {
      const chips = el('div', 'gs-chip-row');
      for (const key of mine) {
        const chip = button(
          `${key.host}${key.user ? ` · ${key.user}` : ''}`,
          'repo-known-host',
          'gs-chip-btn',
        );
        chip.addEventListener('click', () => {
          input.value = key.host;
          go();
        });
        chips.append(chip);
      }
      box.append(el('p', 'gs-repo-hint', 'Already connected here:'), chips);
    }
    const next = button('next', 'repo-host-next', 'gs-btn-primary');
    const back = button('back', 'repo-back');
    back.addEventListener('click', () => this.chooseService());
    const go = (): void => {
      let host = input.value.trim().toLowerCase();
      try {
        host = new URL(host.includes('://') ? host : `https://${host}`).host;
      } catch {
        host = '';
      }
      if (!host || !host.includes('.')) {
        this.error(box, 'That is not an address. It looks like gitlab.example.com.');
        return;
      }
      this.state.host = host;
      const key = this.keys.find((k) => k.host === host);
      if (key) {
        if (key.user) this.state.user = key.user;
        this.chooseRepo();
      } else this.makeKey();
    };
    next.addEventListener('click', go);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') go();
    });
    const actions = el('div', 'gs-dialog-actions');
    actions.append(back, next);
    box.append(input, actions);
    input.focus();
  }

  // ---------------------------------------------------------------- 3

  private makeKey(): void {
    const provider = this.state.provider as Provider;
    const host = this.state.host as string;
    const box = this.page(
      3,
      `A key for ${host}`,
      'grimstroke asks the service on your behalf with a key you make once. It is kept on this computer only, readable only by you -- never in a notebook, a backup, or the browser.',
    );
    if (provider === 'github' && host === 'github.com' && this.gh) {
      const borrow = button('use the GitHub CLI’s key', 'repo-use-gh', 'gs-btn-primary');
      borrow.addEventListener('click', () => void this.testKey(box, { gh: true }));
      box.append(
        el(
          'p',
          'gs-repo-hint',
          'The GitHub CLI is signed in on this computer, so its key can be borrowed -- nothing to make or paste.',
        ),
        borrow,
        el('p', 'gs-repo-or', 'or make one:'),
      );
    }
    void this.offerSignIn(box, provider, host);
    const page = tokenPage(provider, host);
    const steps = el('ol', 'gs-repo-howto');
    const open = el('a', 'gs-btn', `open the ${NAMES[provider]} token page`);
    open.href = page.url;
    open.target = '_blank';
    open.rel = 'noopener';
    open.dataset.gs = 'repo-token-page';
    const li1 = el('li');
    li1.append(open);
    if (page.also) {
      const also = el('a', 'gs-repo-also', 'or this one');
      also.href = page.also;
      also.target = '_blank';
      also.rel = 'noopener';
      li1.append(' ', also);
    }
    const li2 = el('li', '', `Tick: ${page.scopes.join(', ')}.`);
    const li3 = el('li', '', page.note);
    const li4 = el(
      'li',
      '',
      'Copy the key it shows you -- it is shown only once -- and paste it here:',
    );
    steps.append(li1, li2, li3, li4);
    const paste = el('input', 'gs-field gs-repo-token');
    paste.type = 'password';
    paste.dataset.gs = 'repo-token';
    paste.placeholder =
      provider === 'github'
        ? 'ghp_… or github_pat_…'
        : provider === 'gitlab'
          ? 'glpat-…'
          : 'the token';
    paste.autocomplete = 'off';
    const test = button('test the key', 'repo-token-test', 'gs-btn-primary');
    test.addEventListener('click', () => void this.testKey(box, { token: paste.value }));
    paste.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') void this.testKey(box, { token: paste.value });
    });
    const back = button('back', 'repo-back');
    back.addEventListener('click', () => this.chooseHost());
    const actions = el('div', 'gs-dialog-actions');
    actions.append(back, test);
    box.append(steps, paste, actions);
  }

  /**
   * Signing in with the browser, where the workspace has an app registered for it: GitHub's
   * device flow (a code typed at github.com), or GitLab's own sign-in page. Otherwise nothing is
   * shown, and the token steps below are the way.
   */
  private async offerSignIn(box: HTMLElement, provider: Provider, host: string): Promise<void> {
    const githubReady = provider === 'github' && host === 'github.com' && this.device;
    let gitlabReady = false;
    if (provider === 'gitlab') {
      const res = await fetch(`/api/remote/oauth/available?host=${encodeURIComponent(host)}`);
      gitlabReady = Boolean((await json<{ available: boolean }>(res)).available);
    }
    if (!githubReady && !gitlabReady) return;
    const b = button('sign in with the browser', 'repo-signin', 'gs-btn-primary');
    const note = el(
      'p',
      'gs-repo-hint',
      'No token to make or paste: sign in on the service’s own page.',
    );
    const holder = el('div', 'gs-repo-signin');
    holder.append(note, b, el('p', 'gs-repo-or', 'or with a token:'));
    box.querySelector('.gs-repo-lead')?.after(holder);
    b.addEventListener('click', async () => {
      if (gitlabReady) {
        window.open(
          `/api/remote/oauth/start?host=${encodeURIComponent(host)}${this.book ? `&book=${encodeURIComponent(this.book.id)}` : ''}`,
          '_blank',
          'noopener',
        );
        note.textContent = `Finish signing in on ${host} in the tab that opened; this waits for it.`;
        await this.waitForKey(host);
        return;
      }
      const res = await fetch('/api/remote/device/start', { method: 'POST' });
      const start = await json<{ device: string; code: string; url: string; interval: number }>(
        res,
      );
      if (!res.ok) {
        this.error(box, start.error ?? 'the sign-in could not be started');
        return;
      }
      note.innerHTML = '';
      note.append(
        'Open ',
        Object.assign(el('a', '', start.url), {
          href: start.url,
          target: '_blank',
          rel: 'noopener',
        }),
        ' and type this code:',
      );
      const code = el('p', 'gs-repo-code', start.code);
      note.after(code);
      const poll = async (): Promise<void> => {
        const r = await fetch('/api/remote/device/poll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ device: start.device }),
        });
        const got = await json<{
          done?: boolean;
          user?: string;
          wait?: string;
          canWrite?: boolean;
        }>(r);
        if (got.done) {
          if (got.user) this.state.user = got.user;
          if (got.canWrite !== undefined) this.state.canWrite = got.canWrite;
          this.chooseRepo();
        } else if (got.wait && this.dialog?.open) {
          window.setTimeout(
            () => void poll(),
            (start.interval + (got.wait === 'slow' ? 5 : 0)) * 1000,
          );
        } else if (!got.wait) this.error(box, got.error ?? 'GitHub refused the sign-in');
      };
      window.setTimeout(() => void poll(), start.interval * 1000);
    });
  }

  /** Wait for a key to appear for a host -- a sign-in finishing in another tab. */
  private async waitForKey(host: string): Promise<void> {
    for (let i = 0; i < 200 && this.dialog?.open; i++) {
      await new Promise((r) => window.setTimeout(r, 1500));
      const res = await fetch('/api/remote/keys');
      const known = await json<{ keys: KeyInfo[] }>(res);
      const key = known.keys?.find((k) => k.host === host);
      if (key) {
        this.keys = known.keys;
        if (key.user) this.state.user = key.user;
        if (!this.book) {
          toast(`signed in to ${host}: the / box can now open issues in its repositories`);
          this.dialog?.close();
          return;
        }
        this.chooseRepo();
        return;
      }
    }
  }

  private async testKey(box: HTMLElement, key: { token?: string; gh?: boolean }): Promise<void> {
    if (!key.gh && !key.token?.trim()) {
      this.error(box, 'Paste the key first.');
      return;
    }
    box.classList.add('is-busy');
    const res = await fetch('/api/remote/keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: this.state.provider, host: this.state.host, ...key }),
    });
    box.classList.remove('is-busy');
    const reply = await json<{ user: string; name?: string; canWrite: boolean; scopes: string[] }>(
      res,
    );
    if (!res.ok) {
      this.error(box, `${this.state.host} did not accept it: ${reply.error ?? res.status}`);
      return;
    }
    this.state.user = reply.user;
    this.state.canWrite = reply.canWrite;
    this.keys.push({
      host: this.state.host as string,
      provider: this.state.provider as Provider,
      user: reply.user,
    });
    toast(`signed in to ${this.state.host} as ${reply.name ?? reply.user}`);
    // An account on its own: its repositories are the / box's from now on, nothing to choose.
    if (!this.book) {
      toast(
        `the / box can now open issues in ${this.state.host}'s repositories -- try “bug: … in owner/name”`,
      );
      this.dialog?.close();
      return;
    }
    this.chooseRepo(
      reply.canWrite
        ? undefined
        : 'This key can read but not write: closing, commenting and new issues will be refused. Make one with the write scope to do those.',
    );
  }

  // ---------------------------------------------------------------- 4

  private chooseRepo(warning?: string): void {
    const box = this.page(
      4,
      'Which repository?',
      `Signed in to ${this.state.host}${this.state.user ? ` as ${this.state.user}` : ''}. Search the repositories this key can see, or type one as owner/name.`,
    );
    if (warning) box.append(el('p', 'gs-repo-warn', warning));
    const input = el('input', 'gs-field');
    input.dataset.gs = 'repo-search';
    input.placeholder = this.state.provider === 'gitlab' ? 'group/project' : 'owner/name';
    input.autocomplete = 'off';
    const list = el('ul', 'gs-repo-list');
    list.setAttribute('role', 'listbox');
    let ask = 0;
    const search = async (): Promise<void> => {
      const n = ++ask;
      const q = input.value.trim();
      const res = await fetch(
        `/api/remote/repos?provider=${this.state.provider}&host=${encodeURIComponent(this.state.host ?? '')}&q=${encodeURIComponent(q.includes('/') ? (q.split('/').pop() ?? q) : q)}`,
      );
      const reply = await json<{
        repos: Array<{ repo: string; description?: string; private?: boolean }>;
      }>(res);
      if (n !== ask) return;
      if (!res.ok) {
        this.error(box, reply.error ?? 'the list could not be fetched');
        return;
      }
      list.replaceChildren(
        ...(reply.repos ?? []).map((r) => {
          const li = el('li');
          const b = button('', 'repo-pick', 'gs-repo-pick');
          b.append(el('b', '', r.repo));
          if (r.description) b.append(el('small', '', r.description));
          if (r.private) b.append(el('span', 'gs-repo-private', 'private'));
          b.addEventListener('click', () => void this.connect(box, r.repo));
          li.append(b);
          return li;
        }),
      );
    };
    let timer = 0;
    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void search(), 250);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && input.value.includes('/'))
        void this.connect(box, input.value.trim());
    });
    const back = button('back', 'repo-back');
    back.addEventListener('click', () => this.chooseHost());
    const typed = button('connect what I typed', 'repo-connect-typed', 'gs-btn-primary');
    typed.addEventListener('click', () => {
      if (input.value.includes('/')) void this.connect(box, input.value.trim());
      else this.error(box, 'Type it as owner/name, or choose one from the list.');
    });
    const actions = el('div', 'gs-dialog-actions');
    actions.append(back, typed);
    box.append(input, list, actions);
    input.focus();
    void search();
  }

  private async connect(box: HTMLElement, repo: string): Promise<void> {
    if (!this.book) return;
    box.classList.add('is-busy');
    const res = await fetch('/api/remote/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-grimstroke-client': this.client },
      body: JSON.stringify({
        book: this.book.id,
        provider: this.state.provider,
        host: this.state.host,
        repo,
      }),
    });
    box.classList.remove('is-busy');
    const reply = await json<{ remote: RemoteLink; canPush: boolean }>(res);
    if (!res.ok) {
      this.error(box, `That repository could not be opened: ${reply.error ?? res.status}`);
      return;
    }
    this.done(reply.remote);
  }

  // ---------------------------------------------------------------- 5

  private done(remote: RemoteLink): void {
    const box = this.page(
      5,
      `Connected to ${remote.repo}`,
      'This notebook is now about that repository.',
    );
    const what = this.nextSteps();
    what.append(
      el(
        'p',
        'gs-repo-lead',
        'The service’s mark is on the cover as a sticker; move it or peel it off like any other.',
      ),
    );
    const finish = button('done', 'repo-done', 'gs-btn-primary');
    finish.addEventListener('click', () => {
      this.dialog?.close();
      window.location.reload();
    });
    const actions = el('div', 'gs-dialog-actions');
    actions.append(finish);
    box.append(what, actions);
  }

  /** A connected notebook: what it is connected to, and what can be changed. */
  private connected(remote: RemoteLink): void {
    this.progress(5);
    this.steps?.replaceChildren();
    const box = el('section', 'gs-repo-page');
    const card = el('div', 'gs-repo-current');
    card.innerHTML = `<span class="gs-repo-service-mark">${renderStickerFace({ mark: remote.provider })}</span>`;
    const words = el('div');
    words.append(
      el('b', '', remote.repo),
      el('small', '', `${NAMES[remote.provider]} · ${remote.host}`),
    );
    card.append(words);
    const key = this.keys.find((k) => k.host === remote.host);
    box.append(
      card,
      el(
        'p',
        'gs-repo-lead',
        key
          ? `Signed in as ${key.user ?? 'someone'}${key.gh ? ' (through the GitHub CLI)' : ''}. Cards on open pages are refreshed every minute.`
          : `There is no key for ${remote.host} on this computer -- the cards show what they last saw. Set one up to bring them to life.`,
      ),
    );
    const site = el('a', 'gs-btn', `open on ${remote.host}`);
    site.href = `https://${remote.host}/${remote.repo}`;
    site.target = '_blank';
    site.rel = 'noopener';
    const change = button('connect another repository', 'repo-change');
    change.addEventListener('click', () => {
      this.state = {
        provider: remote.provider,
        host: remote.host,
        ...(key?.user ? { user: key.user } : {}),
      };
      if (key) this.chooseRepo();
      else this.makeKey();
    });
    const newKey = button(key ? 'use a different key' : 'set up a key', 'repo-rekey');
    newKey.addEventListener('click', () => {
      this.state = { provider: remote.provider, host: remote.host };
      this.makeKey();
    });
    const off = button('disconnect', 'repo-disconnect', 'gs-btn-danger');
    off.addEventListener('click', async () => {
      await fetch('/api/remote/disconnect', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-grimstroke-client': this.client },
        body: JSON.stringify({ book: this.book?.id }),
      });
      toast('disconnected; the cards keep what they last saw');
      this.dialog?.close();
      window.location.reload();
    });
    const actions = el('div', 'gs-repo-actions');
    actions.append(site, change, newKey, off);
    box.append(this.nextSteps(), actions);
    this.body?.replaceChildren(box);
  }
}
