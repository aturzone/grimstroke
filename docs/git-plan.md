# A notebook connected to a repository -- the plan

Status: **design, not built.** Written after the workspace, pages-as-boards and the profile
landed, so it builds on them.

## What it is

Any notebook can be connected to **one** repository -- on GitHub, on GitLab (gitlab.com or a
company's own, like `gitlab.example.com`, which is a self-hosted GitLab), or on Gitea/Forgejo.
Each notebook has its own connection; grimstroke as a whole is not tied to any. A connected
notebook becomes a notebook *about* that repository:

- its **issues / work items**, **merge requests / pull requests**, **commits** and
  **pipelines** can be pulled onto its pages as cards -- placed, annotated, circled, stuck
  next to screenshots, like anything else on a page;
- the cards are **live**: an issue card shows its current state, labels, assignees and
  comment count, and changes when the issue does;
- and they **act**: tick a card and the issue closes; write on a card's reply line and it is
  a comment on the issue; draw a new issue card and it is a new issue. The notebook is a
  paper front end to the tracker, not a copy of it.

For an agent this is the same vocabulary as everything else: `POST /api/patch` places a card,
and a small new family of operations (below) acts on the remote.

## What the platforms offer, and what we use

| capability | GitHub | GitLab | Gitea / Forgejo |
|---|---|---|---|
| issues: list, read, create, edit, close/reopen | REST `issues`, GraphQL | REST `issues`, GraphQL | REST `issues` |
| comments | issue comments | notes / discussions (threaded) | issue comments |
| labels, milestones, assignees | yes | yes (+ iterations, weights) | yes |
| **work items** (tasks, epics, OKRs as one model) | sub-issues, issue types | **Work Items** (GraphQL): task, issue, epic, objective, key result, incident | -- |
| boards / projects | Projects v2 (GraphQL only) | issue boards, epics boards | project boards |
| pull / merge requests | PRs, reviews, review comments | MRs, discussions, approvals | PRs, reviews |
| commits, compare, "closes #12" | yes; closing keywords | yes; closing patterns | yes |
| CI status | checks, Actions runs | pipelines, jobs | Actions (Forgejo) |
| reactions | yes | award emoji | yes |
| events | webhooks; no push to a client | webhooks | webhooks |
| auth for a desktop tool | fine-grained PAT; OAuth device flow; `gh auth token` | PAT (scopes `api` / `read_api`); OAuth2 + PKCE | access token |
| rate limit | 5000/h per token; conditional requests (ETag) are free | configurable per instance (usually generous) | instance-defined |

Where one platform has more (GitLab's work item types and iterations, GitHub's Projects
fields), the card shows it when present and leaves it out when not -- one card design, with
optional rows, rather than three designs.

## Shape of the build

### 1. The connection (per notebook)

```ts
BookSpec.remote?: {
  provider: 'github' | 'gitlab' | 'gitea';
  host: string;            // 'github.com', 'gitlab.example.com', ...
  repo: string;            // 'owner/name' or GitLab 'group/sub/project'
  // No token here. The notebook is a document that goes into backups and archives.
}
```

**Tokens never go in a notebook.** They live in the store's settings, keyed by host, in a file
readable only by the user (`0600`), are never included in `GET /api/archive`, and are never sent
to the browser. The browser asks the server; the server asks the provider. A notebook exported
and sent to someone carries which repository it is about, not the key to it.

Getting a token, easiest first:
- GitHub: reuse `gh auth token` when `gh` is logged in (it is, on this machine); else a
  fine-grained PAT pasted once; later the OAuth device flow (no secret needed).
- GitLab: a PAT with `api` scope pasted once (the company instance); OAuth2 + PKCE later.
- The connection dialog tests the token immediately and says what it can do ("can read
  issues, can comment, cannot close -- the token has no write scope").

### 2. The adapter (host/remote/)

One interface, three implementations, all in `host/` (network is not allowed in `draw/`):

```ts
interface Remote {
  whoami(): Promise<Person>;
  issues(q: { state?, labels?, assignee?, search?, page? }): Promise<Page<Issue>>;
  issue(n: string): Promise<Issue & { comments: Comment[] }>;
  create(i: NewIssue): Promise<Issue>;
  update(n: string, p: IssuePatch): Promise<Issue>;       // state, title, labels, assignees
  comment(n: string, body: string): Promise<Comment>;
  merges(q): Promise<Page<Merge>>;  merge(n): Promise<Merge>;
  commits(q: { ref?, path?, since? }): Promise<Page<Commit>>;
  pipelines(ref?): Promise<Pipeline[]>;
  labels(): Promise<Label[]>; members(): Promise<Person[]>; milestones(): Promise<Milestone[]>;
}
```

A normalised model (`Issue`, `Comment`, `Merge`, `Commit`, `Pipeline`, `Person`, `Label`) lives
in `draw/doc/remote/model.ts` -- pure data, so the renderer can draw cards without knowing
which platform they came from. Markdown bodies go through the note's markdown renderer, so
an issue body looks like a note.

Caching: every response is cached in the store by URL with its ETag; a refresh sends
`If-None-Match` (free on GitHub's rate limit). Cards render from the cache, so an offline
notebook still shows the last known state, marked as such.

### 3. The cards (draw/material/remote/)

New block kinds, placed like any other item on a page or a board:

- `issue` -- number, title, state stamp (OPEN / CLOSED, in the zine's rubber-stamp style),
  labels as small coloured tabs, assignee avatars as round stickers, comment count, the first
  lines of the body, a tick box, and a reply line. Work-item types get a type badge.
- `merge` -- branch -> target, state, review/approval stamps, CI status as a tick or cross.
- `commit` -- short sha on a typewriter strip, message, author, and the issues it closes.
- `pipeline` -- a strip of job boxes, green/red/grey.
- `query` -- a live list: "open issues labelled bug, assigned to me", as a column of small
  cards that refreshes. This is the one that makes a notebook page a dashboard.

Each block stores **the reference and a snapshot** (`{ ref: {repo, kind, number}, seen: {...},
seenAt }`), so a card still reads correctly in an export, a backup, or with no network -- the
same by-value rule as the profile card -- and the live layer updates the snapshot.

### 4. Acting on the remote

New patch family, applied by the server against the provider, then reflected back into the
snapshots through the normal `changed` reply:

```
{ op: 'remote.close',   ref }            { op: 'remote.reopen', ref }
{ op: 'remote.comment', ref, body }      { op: 'remote.create', repo, issue: {...}, at? }
{ op: 'remote.label',   ref, add?, remove? }
{ op: 'remote.assign',  ref, people }
```

Remote operations are **not undoable in the usual sense**: a comment posted is posted. The UI
says so -- a tick is a confirmation card the first time ("close #42 on GitLab?") with "don't
ask again for this notebook", and a comment is sent from an explicit send button, never on
blur. Failures (no permission, conflict, offline) come back as a toast on the card with the
provider's own message, and nothing on the page pretends it succeeded.

### 5. Live updates

The browser never talks to the provider. The server polls what is on open pages (ETag makes
unchanged polls cost nothing), every 60s while a page is open and on focus; webhooks are an
optional later step for a server that is reachable from the provider. Changes are broadcast
on the existing event stream, so a card closes on screen when somebody closes the issue in
the browser.

### 6. The notebook UI

- **Connect** in the notebook's menu -> a dialog: provider (sticker buttons: GitHub, GitLab,
  Gitea), host (pre-filled; company GitLab one click), repository (typeahead from the token's
  projects), token (or "use gh").
- A connected notebook carries a **repository sticker** on its cover and spine, and a small
  status tab on the spread ("connected to team/app · synced 1 min ago").
- A **remote drawer** in the page editor's tray: search and filter issues / MRs / commits,
  drag one onto the page. Paste an issue URL anywhere and it becomes a card.
- A **tracker page type**: a page whose paper is a Kanban -- columns by state or by label --
  and the cards on it are the live query results, movable between columns (which relabels or
  closes on the remote).
- The **"fixed it" flow**: a commit card that says "closes #12" shows the issue ticked with a
  pencil line through it once the commit is on the default branch; a person can also draw the
  line themselves, which closes the issue with a comment linking the commit.

### 7. Stickers

Stickers suit the look, and they become a system rather than a cover-only feature:

- A `sticker` block kind: a die-cut sticker (white border, hard shadow, a slight curl), with
  a symbol, an emoji or a logo on it, placeable on boards and pages as well as covers.
- A sticker sheet in the tray and the cover editor: status stamps (done, blocked, wip, ship
  it), arrows, stars, and the **platform marks** -- the GitHub mark, the GitLab tanuki, Gitea
  and Forgejo -- drawn from each project's published SVG mark (used as the brand guidelines
  allow: to identify the service a card or connection belongs to), set in sticker style.
- GitHub/GitLab emoji shortcodes (`:rocket:`, `:bug:`) in issue bodies and comments render as
  small stickers rather than as text.

## Order of work

1. Model + adapter for GitLab and GitHub, read-only; token storage; the connection dialog;
   `issue` and `commit` cards from a pasted URL. Tests against recorded responses.
2. Live refresh (ETag polling), the remote drawer, the `query` card.
3. Acting: close / reopen / comment / create / label / assign, with confirmation and errors.
4. `merge` and `pipeline` cards; the "fixed it" flow.
5. The tracker page (Kanban paper); sticker block and sticker sheet with platform marks.
6. Gitea/Forgejo adapter; webhooks; OAuth device flow / PKCE.

## Risks and decisions to confirm

- **Where tokens live** -- the proposal is the store's settings file, `0600`, never archived.
  A keyring would be nicer and adds a native dependency; decide before step 1.
- **Which company GitLab version** -- Work Items need GitLab 17+ (GraphQL); older instances get
  issues and epics only. Checked on connect.
- **Rate limits on big repositories** -- a query card over thousands of issues pages lazily
  and caps what it shows; nothing ever syncs a whole repository.
- **Privacy** -- a notebook export includes snapshots of issue text. That is the point of a
  record, but the export dialog says so when a notebook is connected.
