/**
 * The / box writing an issue: the repositories there are and their labels, chosen as the words
 * are typed; pictures pasted into the box; and the issue opened on its service.
 *
 * What is chosen here is only offered: the card in the box shows the repository and the labels
 * the model picked, Details changes any of them, and what is shown is what is sent.
 */

import { toast } from '~/app/chrome.ts';
import { play } from '~/app/feel.ts';
import type { Fields } from '~/draw/shape/fields.ts';
import { type KnownRepo, parseIssue, resolveRepo } from '~/draw/shape/issue.ts';
import { chooseLabels } from '~/draw/shape/labels.ts';
import type { ShapeBlock } from '~/draw/shape/render.ts';

interface Repo extends KnownRepo {
  from: string;
}

export interface Picture {
  asset: string;
  name: string;
  type: string;
  /** A local address to show it by, while the box is open. */
  view: string;
}

const LAST = 'gs-issue-repo';

function last(): string | undefined {
  try {
    return localStorage.getItem(LAST) ?? undefined;
  } catch {
    return undefined;
  }
}

export class IssueDraft {
  private repos: Repo[] | undefined;
  private loading: Promise<void> | undefined;
  private readonly labels = new Map<string, string[]>();
  pictures: Picture[] = [];
  /** Called when something arrives that changes what the card in the box shows. */
  private readonly changed: () => void;

  constructor(changed: () => void) {
    this.changed = changed;
  }

  /** The repositories, fetched once per box. */
  private load(): void {
    if (this.repos || this.loading) return;
    this.loading = fetch('/api/remote/targets')
      .then(async (res) => {
        this.repos = res.ok ? ((await res.json()) as { repos: Repo[] }).repos : [];
      })
      .catch(() => {
        this.repos = [];
      })
      .finally(() => this.changed());
  }

  private loadLabels(repo: Repo): string[] | undefined {
    const key = `${repo.host}/${repo.repo}`;
    if (this.labels.has(key)) return this.labels.get(key);
    this.labels.set(key, []);
    void fetch(
      `/api/remote/labels?host=${encodeURIComponent(repo.host)}&repo=${encodeURIComponent(repo.repo)}`,
    )
      .then(async (res) => {
        const list = res.ok
          ? ((await res.json()) as { labels: Array<{ name: string }> }).labels
          : [];
        this.labels.set(
          key,
          list.map((l) => l.name),
        );
        this.changed();
      })
      .catch(() => {});
    return undefined;
  }

  /**
   * What the model offers for this sentence, under what was set by hand: the repository it
   * names (or the one used last), and the labels of that repository it means.
   */
  offer(text: string, hand: Fields | undefined): Fields {
    this.load();
    const d = parseIssue(text);
    const out: Fields = {};
    const asked = typeof hand?.repo === 'string' && hand.repo ? hand.repo : d.repo;
    const repo = this.repos ? resolveRepo(asked, this.repos, last()) : undefined;
    if (repo) {
      out.repo = repo.repo;
      const available = this.loadLabels(repo);
      if (available?.length && !hand?.labels) {
        const type = typeof hand?.type === 'string' && hand.type ? hand.type : d.type;
        out.labels = chooseLabels({ ...d, type: (type as typeof d.type) ?? null }, available).map(
          (c) => c.name,
        );
      }
    }
    return { ...out, ...(hand ?? {}) };
  }

  /** Pictures pasted into the box go into the workspace first, and with the issue after. */
  async paste(event: ClipboardEvent): Promise<boolean> {
    const files = [...(event.clipboardData?.items ?? [])]
      .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
      .map((i) => i.getAsFile())
      .filter((f): f is File => Boolean(f));
    if (!files.length) return false;
    event.preventDefault();
    for (const file of files.slice(0, 8 - this.pictures.length)) {
      const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
      const name =
        file.name && file.name !== 'image.png'
          ? file.name
          : `picture-${this.pictures.length + 1}.${ext}`;
      try {
        const res = await fetch(`/api/assets?name=${encodeURIComponent(name)}`, {
          method: 'POST',
          body: file,
        });
        if (!res.ok) throw new Error(String(res.status));
        const { name: asset } = (await res.json()) as { name: string };
        this.pictures.push({ asset, name, type: file.type, view: URL.createObjectURL(file) });
        play('pop', 0.6);
      } catch {
        toast('that picture could not be kept', 'error');
      }
    }
    this.changed();
    return true;
  }

  drop(index: number): void {
    const [gone] = this.pictures.splice(index, 1);
    if (gone) URL.revokeObjectURL(gone.view);
    this.changed();
  }

  clear(): void {
    for (const p of this.pictures) URL.revokeObjectURL(p.view);
    this.pictures = [];
  }

  /** The strip of pasted pictures under the card, each one with a way to take it back out. */
  strip(fa: boolean): HTMLElement | undefined {
    if (!this.pictures.length) return undefined;
    const strip = document.createElement('div');
    strip.className = 'ss-pictures';
    this.pictures.forEach((p, i) => {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = p.view;
      img.alt = p.name;
      const out = document.createElement('button');
      out.type = 'button';
      out.className = 'ss-picture-out';
      out.setAttribute('aria-label', fa ? 'برداشتن تصویر' : 'take this picture out');
      out.textContent = '×';
      out.addEventListener('mousedown', (e) => e.preventDefault());
      out.addEventListener('click', () => this.drop(i));
      figure.append(img, out);
      strip.append(figure);
    });
    return strip;
  }
}

/**
 * Open the issue: from a card in the box (no id), or from a card already placed (its address
 * and id). Answers with where its card is, or undefined when it did not happen -- and says why.
 */
export async function openIssue(
  block: ShapeBlock,
  where: { address?: string | undefined; id?: string | undefined },
  pictures: Picture[] = [],
): Promise<{ address: string; id: string } | undefined> {
  try {
    const res = await fetch('/api/remote/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        block,
        ...where,
        images: pictures.map(({ asset, name, type }) => ({ asset, name, type })),
        last: last(),
      }),
    });
    const reply = (await res.json()) as {
      error?: string;
      issue?: { number: string; url: string };
      repo?: string;
      address?: string;
      id?: string;
    };
    if (!res.ok || !reply.issue || !reply.address || !reply.id) {
      toast(reply.error ?? 'the issue was not opened', 'error');
      return undefined;
    }
    try {
      if (reply.repo) localStorage.setItem(LAST, reply.repo);
    } catch {
      // Remembering the repository is a convenience.
    }
    play('pop');
    const url = reply.issue.url;
    toast(`#${reply.issue.number} opened in ${reply.repo ?? 'the repository'}`, 'info', {
      label: 'see it',
      run: () => window.open(url, '_blank', 'noopener'),
    });
    return { address: reply.address, id: reply.id };
  } catch {
    toast('the issue was not opened -- is the workspace running?', 'error');
    return undefined;
  }
}
