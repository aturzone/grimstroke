/**
 * Talking to the server, and remembering what was done.
 *
 * The app keeps its own copy of the board and applies every change to it with
 * the SAME `apply()` the server uses. Not a convenience: it is what makes the
 * app's idea of the board and the server's idea of it the same idea. An app
 * that only knew the DOM would have to read positions back out of style
 * attributes to work out what to undo.
 *
 * Changes are optimistic. A drag applies locally at once and goes to the server
 * afterwards, because a note that waits for a round trip before it moves is a
 * note that feels broken on a laptop, never mind over a network.
 */

export interface Change {
  id: string;
  html: string;
}

/** An item that only moved, or changed its place in the pile. */
export interface Placed {
  id: string;
  at: [number, number];
  z: number;
}

export interface PatchReply {
  version: number;
  changed: Change[];
  removed: string[];
  /** Board patches only: items whose content did not change, only their position. */
  placed?: Placed[];
  reset?: boolean;
}

/**
 * A document this session can hold.
 *
 * Generic over the document and its operations, because a board and a notebook
 * have genuinely different vocabularies -- "move these four leaves to after
 * leaf nine" means nothing on a plane -- but identical needs from a session:
 * optimistic local application, a patch on the wire, an undo stack, and a
 * stream of what other people did.
 */
export interface Doc {
  id: string;
  version?: number;
}

export interface SessionOptions<S extends Doc, O> {
  /** Which kind of document, so the server knows which vocabulary to expect. */
  kind: 'board' | 'book';
  spec: S;
  apply(spec: S, ops: readonly O[]): { spec: S };
  invert(spec: S, ops: readonly O[]): O[];
  onPatch(reply: PatchReply): void;
  onStatus(state: 'saved' | 'saving' | 'offline'): void;
}

/** How long a run of edits is gathered before it counts as one undo step. */
const COALESCE_MS = 600;

export class Session<S extends Doc, O> {
  spec: S;
  private readonly id: string;
  private readonly options: SessionOptions<S, O>;
  private readonly past: O[][] = [];
  private readonly future: O[][] = [];
  /**
   * Who this tab is, to the server.
   *
   * Every patch is broadcast to everyone watching the document -- and this tab is watching
   * it too. Without saying who sent it, a tab got its own patch back over the event stream a
   * moment after the reply, re-rendered the item a second time, and threw away whatever it
   * had just opened inside it: a new note's editor vanished before a word was typed.
   */
  readonly client = Math.random().toString(36).slice(2, 12);
  private lastEdit = 0;
  private lastLabel = '';

  constructor(options: SessionOptions<S, O>) {
    this.options = options;
    this.id = options.spec.id;
    this.spec = options.spec;
    this.serverVersion = options.spec.version ?? 0;
    this.recall();
    this.recallOutbox();
  }

  // ---------------------------------------------------------------- changes made offline

  /** The version the server last said the document is at. */
  private serverVersion = 0;
  /** The server's version when the oldest unsent change was made. */
  private outboxBase = 0;

  private get outboxKey(): string {
    return `gs-outbox:${this.options.kind}:${this.id}`;
  }

  /**
   * Changes not yet on the server, kept for this tab across a reload.
   *
   * A move made offline and then a refresh used to be lost: the outbox lived only in memory.
   * It is kept with the version it was made against; on the next load it is sent again. If the
   * document has moved on meanwhile, it is still sent -- a move or an edit usually still applies
   * -- and whatever the server refuses as naming something gone is dropped, and the page says how
   * many changes that was.
   */
  private keepOutbox(): void {
    try {
      if (this.outbox.length === 0) sessionStorage.removeItem(this.outboxKey);
      else
        sessionStorage.setItem(
          this.outboxKey,
          JSON.stringify({ base: this.outboxBase, ops: this.outbox }),
        );
    } catch {
      // No storage: unsent changes end with the tab, as they always did.
    }
  }

  private recallOutbox(): void {
    let kept: { base?: number; ops?: O[][] } | undefined;
    try {
      const raw = sessionStorage.getItem(this.outboxKey);
      kept = raw ? (JSON.parse(raw) as { base?: number; ops?: O[][] }) : undefined;
    } catch {
      kept = undefined;
    }
    const ops = kept?.ops ?? [];
    if (!ops.length) return;
    const stale = kept?.base !== this.serverVersion;
    for (const batch of ops) this.applyLocal(batch);
    this.outbox.push(...ops);
    this.outboxBase = this.serverVersion;
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('gs-restored', { detail: { count: ops.length, stale } }),
      );
      void this.flush();
    }, 0);
  }

  // ---------------------------------------------------------------- undo that outlives the tab

  private get memoryKey(): string {
    return `gs-undo:${this.options.kind}:${this.id}`;
  }

  /**
   * The undo and redo stacks, kept for this tab across a reload.
   *
   * A Backspace and then a refresh used to lose the one thing that could bring the deletion
   * back. The stacks are the inverse operations, so they are kept as they are, with the version
   * of the document they were made against: brought back only if the document is still at that
   * version -- if anyone else has changed it since, an old inverse could undo their work
   * instead, and a lost undo is better than a wrong one.
   */
  private remember(): void {
    try {
      sessionStorage.setItem(
        this.memoryKey,
        JSON.stringify({
          version: this.spec.version ?? 0,
          past: this.past.slice(-60),
          future: this.future.slice(-60),
        }),
      );
    } catch {
      // No storage (a private window, a full quota): undo simply ends with the tab, as before.
    }
  }

  private recall(): void {
    try {
      const raw = sessionStorage.getItem(this.memoryKey);
      if (!raw) return;
      const kept = JSON.parse(raw) as { version?: number; past?: O[][]; future?: O[][] };
      if (kept.version !== (this.spec.version ?? 0)) {
        sessionStorage.removeItem(this.memoryKey);
        return;
      }
      this.past.push(...(kept.past ?? []));
      this.future.push(...(kept.future ?? []));
    } catch {
      // Whatever is there cannot be read; start clean.
    }
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Do something, and be able to take it back.
   *
   * `label` groups a run of edits into one undo step: dragging a note produces
   * a move on every pointer event, and undo that steps back through four
   * hundred of them is undo nobody will use. A different label, or a pause,
   * starts a new step.
   */
  run(ops: O[], label = ''): void {
    if (ops.length === 0) return;
    const back = this.options.invert(this.spec, ops);
    const now = Date.now();
    const merge = label !== '' && label === this.lastLabel && now - this.lastEdit < COALESCE_MS;
    if (merge && this.past.length > 0) {
      // The older inverse has to run last, so it goes at the end.
      (this.past[this.past.length - 1] as O[]).unshift(...back);
    } else {
      this.past.push(back);
      if (this.past.length > 200) this.past.shift();
    }
    this.lastEdit = now;
    this.lastLabel = label;
    this.future.length = 0;
    this.applyLocal(ops);
    void this.send(ops);
  }

  undo(): void {
    const ops = this.past.pop();
    if (!ops) return;
    this.future.push(this.options.invert(this.spec, ops));
    this.lastLabel = '';
    this.applyLocal(ops);
    void this.send(ops);
  }

  redo(): void {
    const ops = this.future.pop();
    if (!ops) return;
    this.past.push(this.options.invert(this.spec, ops));
    this.lastLabel = '';
    this.applyLocal(ops);
    void this.send(ops);
  }

  /** A change that arrived from somewhere else: another tab, or an agent. */
  absorb(spec: S): void {
    this.spec = spec;
  }

  private applyLocal(ops: O[]): void {
    try {
      this.spec = this.options.apply(this.spec, ops).spec;
    } catch {
      // The server is authoritative. A local failure means this copy has
      // drifted, and the reload below is the honest way to find out.
    }
  }

  /**
   * Patches not yet accepted by the server, oldest first.
   *
   * A patch that failed to send used to be dropped: the page showed the change, the status
   * said "offline", and the change was never saved anywhere -- a move made on a train was
   * gone by the next stop. Now it waits here, and the queue is sent in order, one patch at a
   * time, until the server takes it: order matters, because the second of two moves of the
   * same note is the one that has to win.
   */
  private readonly outbox: O[][] = [];
  /** Changes the server refused since the page loaded, for telling the person. */
  dropped = 0;
  private flushing = false;
  private retry = 0;
  private backoff = 1000;

  private send(ops: O[]): Promise<void> {
    if (this.outbox.length === 0) this.outboxBase = this.serverVersion;
    this.outbox.push(ops);
    this.keepOutbox();
    return this.flush();
  }

  private async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    this.options.onStatus('saving');
    while (this.outbox.length > 0) {
      const ops = this.outbox[0] as O[];
      let reply: PatchReply;
      try {
        const res = await fetch('/api/patch', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-grimstroke-client': this.client },
          body: JSON.stringify({ kind: this.options.kind, id: this.id, ops }),
        });
        if (res.status === 409) {
          // The server refused it outright: it names something that is not there any more.
          // Sending it again will not change that, so it is dropped, and the page is brought
          // back to what the server actually holds.
          this.outbox.shift();
          this.keepOutbox();
          this.dropped += 1;
          void this.refresh();
          continue;
        }
        if (!res.ok) throw new Error(String(res.status));
        reply = (await res.json()) as PatchReply;
      } catch {
        this.flushing = false;
        this.options.onStatus('offline');
        window.clearTimeout(this.retry);
        this.retry = window.setTimeout(() => void this.flush(), this.backoff);
        this.backoff = Math.min(15000, this.backoff * 2);
        return;
      }
      this.outbox.shift();
      this.keepOutbox();
      this.backoff = 1000;
      this.spec.version = reply.version;
      this.serverVersion = reply.version;
      this.options.onPatch(reply);
    }
    this.flushing = false;
    this.options.onStatus('saved');
    // Everything this tab did is on the server, at this version: the stacks match it.
    this.remember();
  }

  /** How many changes are waiting for the server. */
  get unsent(): number {
    return this.outbox.length;
  }

  /** Changes made by anyone else, as they happen. */
  listen(): EventSource {
    // Back online: send what is waiting now rather than at the end of the current backoff.
    window.addEventListener('online', () => void this.flush());
    // Leaving with changes unsent is the one way to lose them for good, so the page asks.
    window.addEventListener('beforeunload', (event) => {
      if (this.outbox.length > 0) event.preventDefault();
    });
    const source = new EventSource(
      `/api/events?kind=${this.options.kind}&id=${encodeURIComponent(this.id)}&client=${this.client}`,
    );
    source.addEventListener('patch', (event) => {
      const reply = JSON.parse((event as MessageEvent).data) as PatchReply;
      this.options.onPatch(reply);
      void this.refresh();
    });
    /*
     * The document changed on disk, underneath everyone.
     *
     * A restore from a backup, an edit from the CLI, another process, a git checkout. The
     * page is looking at something that no longer exists, and the safe thing -- the only
     * thing that cannot overwrite what just arrived -- is to go and get the new one.
     */
    source.addEventListener('reload', () => {
      window.location.reload();
    });
    // The notebook was thrown away, here or elsewhere: nothing left to write in. Stopping the
    // stream first, so a later write cannot quietly bring it back into being.
    source.addEventListener('gone', () => {
      source.close();
      window.location.href = '/shelf?gone=1';
    });
    return source;
  }

  /** Pull the authoritative copy. Used after someone else changed something. */
  async refresh(): Promise<void> {
    try {
      const res = await fetch(
        `/api/state?kind=${this.options.kind}&id=${encodeURIComponent(this.id)}`,
      );
      if (!res.ok) return;
      const { spec } = (await res.json()) as { spec: S };
      this.absorb(spec);
    } catch {
      // Offline; the next successful patch will resynchronise.
    }
  }
}
