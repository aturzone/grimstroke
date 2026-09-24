# The workspace API

Everything a person can do in the workspace, an agent can do over HTTP with the same
vocabulary: there is one way to move a note, and a drag is just a person producing it.

`grimstroke serve` prints a URL with a token. Send the token with every request, as the
`x-grimstroke-token` header or `?t=` once in a browser (it is then kept in a cookie). The
server listens on loopback only.

```sh
T=...   # the token from `grimstroke serve`
curl -s "http://127.0.0.1:$PORT/api/state?board=workspace" -H "x-grimstroke-token: $T"
```

Start with `GET /api/capabilities`: every endpoint with what it is for, and every closed
vocabulary there is to choose from -- block kinds, palettes, rulings, page templates and sizes,
tracker columns, cover materials, sticker marks and packs, the bookcase's woods, backs and
objects, the pet's animals and coats, the profile's accents, the repository services. They come
from the same constants the interface draws from, so nothing it lists is refused. `GET
/api/books` lists every notebook with its title, pages, whether it is archived and the
repository it is connected to.

To write a document that reads well -- the page grid, the type, measured flow across pages, and
a worked example -- see [writing.md](writing.md).

## Writing, measured

| | |
|---|---|
| `POST /api/write` `{ book, blocks, from? }` | pour blocks into a notebook, page after page, split where each page is full (measured in a headless browser), never a heading alone at a page's foot; answers with the pages written |
| `GET /api/layout?board=<address>` | every item's measured box, what overlaps, what runs over a page's edge, and the clear room left on a page |
| `POST /api/tidy` `{ board, ids, as: "column" \| "row" \| "grid", gap?, at?, columns? }` | line items up with even gaps, by their measured sizes |

## Addresses

| What | Address |
|---|---|
| a board | `workspace`, or any id |
| a page of a notebook, as a board | `book:<notebook>:<leaf>` -- the leaf id, or `blank-N` for page N not yet written |
| a notebook | its id, with `kind: "book"` |

A page of a notebook **is a small board**. Everything below that works on a board works on a
page by its `book:` address: the same patch operations, the same events, the same export.

## Reading

| | |
|---|---|
| `GET /api/state?board=<id>` | the board, or page, as JSON |
| `GET /api/state?kind=book&id=<id>` | the notebook |
| `GET /api/boards`, `GET /api/books` | the ids |
| `GET /api/leaf?id=<book>&index=<n>` | one leaf, rendered |
| `GET /api/search?q=<words>` | boards, notebooks (archived too) and the profile; Persian spelling variants fold together |
| `GET /api/events?kind=board&id=<id>&client=<tab>` | server-sent events: `patch` (what changed) and `reload` (the file changed underneath) |

## Changing a board or a page

`POST /api/patch` with `{ "board": "<address>", "ops": [...] }`.

| op | shape |
|---|---|
| add | `{ "op": "add", "item": { "id", "at": [x, y], "size": [w, h?], "rotation"?, "z"?, "group"?, "locked"?, "block" \| "ink" } }` |
| move | `{ "op": "move", "id", "at": [x, y] }` |
| update | `{ "op": "update", "id", "patch": { ... } }` -- a field set to `null` is removed |
| remove | `{ "op": "remove", "id" }` |
| order | `{ "op": "order", "id", "z" }` |
| board | `{ "op": "board", "patch": { "palette"?, "paper"?, "title"?, ... } }` -- on a page, only `paper`, `template` (`cornell`, `kanban`, or `null` for the book's) and `tracker` are the page's own; `tracker` is a Kanban page's columns, each `{ title, state: "open" \| "closed", labels?, limit? }` |

A `block` is anything a page can hold: `heading`, `text`, `label`, `bullets`, `table`, `code`,
`quote`, `image`, `compare`, `note` (its text is markdown, and `:rocket:`-style shortcodes are
drawn as small stickers), `profile`, `stack` (a column of blocks as one object), `divider`,
`spacer`, and `sticker` -- `{ "kind": "sticker", "mark"? | "emoji"? | "words"?, "colour"? }`, a
die-cut sticker: a mark from the sheet (`done`, `blocked`, `wip`, `ship`, `review`, `bug`,
`star`, `heart`, `check`, `cross`, `arrow`, `warning`, `question`, `pin`, `bolt`, `eye`, and the
services `github`, `gitlab`, `gitea`, `forgejo`), an emoji, or a few words as a stamp. `ink` is `{ "d": "<svg path>", "colour", "weight",
"tool": "pen" | "pencil" | "marker" | "highlighter", "fill"? }`, relative to `at`.

The reply says what happened: `placed` (items whose only change was position, with their new
`at` and `z`) and `changed` (everything else, with fresh markup), plus `removed`. Send an
`x-grimstroke-client` header naming your tab, and your own patches are not echoed back to you
on the event stream.

## Moving things between surfaces

`POST /api/items/move` with `{ "from": "<address>", "to": "<address>", "ids": [...] }` takes the
items off one board or page and puts them on another, keeping where they lie relative to each
other: on a page at its margins, on a board beside what is already there. A page can be named by
number: `book:<notebook>:3`. The reply has the new `ids` (a taken id gets a suffix), and both
surfaces hear it on their event streams.

## Changing a notebook

`POST /api/patch` with `{ "kind": "book", "id": "<notebook>", "ops": [...] }`.

| op | shape |
|---|---|
| leaf.add | `{ "op": "leaf.add", "leaf": { "id", "items"?, "blocks"? }, "at"? }` |
| leaf.remove | `{ "op": "leaf.remove", "id" }` |
| leaf.move | `{ "op": "leaf.move", "ids": [...], "to": <index> }` |
| leaf.items | `{ "op": "leaf.items", "id", "ops": [ board ops ] }` -- writing on `blank-N` writes the pages up to it |
| leaf.blocks | `{ "op": "leaf.blocks", "id", "blocks": [...] }` -- a column, folded into one movable stack |
| leaf.replace | `{ "op": "leaf.replace", "leaf": {...} }` |
| cover | `{ "op": "cover", "patch": { "title"?, "colour"?, "ink"?, "material"?, "profile"? } }` |
| sticker.add / .update / .remove | `label`, `picture`, `shape` (`circle`, `star`, `band`, `tape`), `portrait`, `card`, `mark` (a sheet mark or `emoji`) -- each `{ id, kind, at: [x%, y%], width?: %, rotation? }`, placed from its centre |
| book | `{ "op": "book", "patch": { "title"?, "palette"?, "paper"?, "minLeaves"?, "pageSize"?, "template"? } }` -- `pageSize` is `a5` (the default), `a4`, `square` or `index`; `template` is what new pages are printed with |
| archive | `{ "op": "archive", "archived": true }` -- put away, never thrown away |

The card on a cover is a `card` sticker holding the profile by value (`profile`), so it is moved,
turned and resized like any sticker. `cover` with `profile` still works: set, it puts the card on
(or brings the one there up to date, where it is); `null` takes it off.

`POST /api/books` with `{ "title" }` makes a notebook and answers with its id.

## The bookcase, and throwing away

| | |
|---|---|
| `GET /api/shelf` | `{ rows, archive, trash, html }` -- the shelves in use, top first; a slot is `{ id }` standing or `{ id, flat: x }` lying flat x pixels along |
| `POST /api/shelf` `{ rows }` | put the shelves in a new order |
| `POST /api/shelf/drop` `{ ids, to: "use" \| "archive", row, x }` | put books down as a hand does: near the run on shelf `row` they join it at `x`; out along the shelf, where nothing holds them up, they lie flat; on the archive they are archived, and off it, taken out |
| `DELETE /api/books?id=` | throw a notebook away: into the trash for thirty days |
| `POST /api/books/batch` `{ ids, action }` | `archive`, `unarchive` or `delete` several at once; answers with `done` and `missing` |
| `GET /api/trash` | what is in the trash, newest first |
| `POST /api/trash/restore` `{ name }` or `{ id }` | bring one back; a taken id gets a new one |

From the command line: `grimstroke trash` and `grimstroke untrash <name|id>`.

### Making the bookcase your own

| | |
|---|---|
| `GET /api/shelf/catalogue` | everything to choose from: `woods`, `backs`, `decor` (objects), sticker `packs` |
| `POST /api/shelf/style` `{ wood?, back? }` | the wood (`oak`, `walnut`, `pine`, `cherry`, `ebony`, `white`, `sage`, `navy`, `blush`) and the back (`boards`, `stripes`, `dots`, `floral`, `brick`, `cork`, `plain`, `stars`) |
| `POST /api/shelf/decor` `{ decor, row, x }` | put an object on shelf `row`, `x` along it; it stands in the run like a book (a book can lean on it) or where it was put |
| `POST /api/shelf/remove` `{ id }` | take an object away (objects move with `/api/shelf/drop`, like books) |
| `POST /api/shelf/decal` `{ mark? \| emoji?, x, y, size?, rotation? }` | stick a sticker on the bookcase, at percent `x`, `y`; with `{ id, ... }` it moves or turns one; `DELETE /api/shelf/decal?id=` peels it off |

### The pet

`GET /api/pet` answers with the pet and every animal and coat; `POST /api/pet`
`{ species?: "cat" | "dog", coat?, name?, on? }` changes only what it names. It is also the
profile's `pet` field. An open bookcase redraws when the pet or the shelves change elsewhere.

## Repositories

A notebook can be connected to one repository on GitHub, GitLab (gitlab.com or a company's
own) or Gitea/Forgejo. The notebook stores which repository; the key to it is kept on this
machine in `tokens.json` (mode 0600), never in a notebook, a backup or the browser. The server
talks to the service; nothing else does.

| | |
|---|---|
| `GET /api/remote/keys` | which hosts have a key (never the keys), whether the GitHub CLI can lend one (`gh`), whether browser sign-in is set up (`device`) |
| `POST /api/remote/keys` `{ provider, host, token }` or `{ provider: "github", gh: true }` | test a key and keep it; answers with `user`, `scopes`, `canWrite`. A refused key is not kept |
| `DELETE /api/remote/keys?host=` | forget a host's key |
| `GET /api/remote/repos?provider=&host=&q=` | the repositories the key can see |
| `POST /api/remote/connect` `{ book, provider, host, repo }` | connect a notebook (the repository is checked first); puts the service's mark on the cover |
| `POST /api/remote/disconnect` `{ book }` | cards keep what they last saw |
| `GET /api/remote/list?board=<page>&of=issues\|merges\|commits&state=&q=&assignee=me&labels=` | the drawer's lists |
| `POST /api/remote/place` `{ board, url }`, `{ board, kind, id }`, `{ board, ref }` or `{ board, query }` | put a card on a page: an issue, merge request, commit, pipeline, or a live list |
| `POST /api/remote/act` `{ board, id, action, body?, add?, remove?, people? }` | `close`, `reopen`, `comment`, `label`, `assign` the issue on card `id`; the card shows the result, or the service's own error |
| `POST /api/remote/create` `{ board, title, body?, labels? }` | a new issue, from a page of a connected notebook, placed as a card |
| `POST /api/remote/refresh` `{ board }` | ask about every card on the page again (the server also does this every minute for open pages, with ETags) |
| `POST /api/remote/keys/hook` `{ host }` | make a webhook secret; `POST /api/remote/hook?host=` then refreshes open pages for signed deliveries only |

A card is the `remote` block: `{ "kind": "remote", "ref": { provider, host, repo, kind, id } }`
or `{ "kind": "remote", "query": { provider, host, repo, of, state?, labels?, assignee?, search?, limit?, title? } }`,
with the server-kept snapshot (`seen` or `rows`, `seenAt`, `error?`, `fixedBy?`). A commit card
that says it closes #n marks the card for #n on the same page as fixed by it.

Signing in with the browser needs an app registered with the service:
`GRIMSTROKE_GITHUB_CLIENT_ID` (GitHub device flow) or `GRIMSTROKE_GITLAB_APP_<HOST>` (GitLab,
PKCE, redirect `http://127.0.0.1:<port>/api/remote/oauth/callback`). Without one, a pasted token.

## The profile

One per workspace: a name, a role, a sentence, details, a card colour and a drawn portrait.

| | |
|---|---|
| `GET /api/profile` | the profile |
| `POST /api/profile` `{ "profile": {...} }` | replace it |
| `POST /api/profile` `{ "patch": {...} }` | change only the fields named |
| `POST /api/profile/place` `{ "board"?, "at"? }` | put the card on a board, by value |

A portrait is `{ "paper"?, "strokes": [ ink, ... ] }` in a 300 x 400 frame.

## Files

| | |
|---|---|
| `POST /api/assets?name=shot.png` (bytes) | store a picture by its contents; answers with the path to use in an `image` block |
| `POST /api/export` `{ "board", "only"? }` | a PNG of the board, or of the named items; needs Playwright |
| `GET /api/archive` | the whole workspace as one `.grimstroke` file |
| `POST /api/archive` (that file) | restore it: what it names is replaced, everything else is left alone |
