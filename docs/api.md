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
| board | `{ "op": "board", "patch": { "palette"?, "paper"?, "title"?, ... } }` -- on a page, only `paper` and `template` (`cornell`, `kanban`, or `null` for the book's) are the page's own |

A `block` is anything a page can hold: `heading`, `text`, `label`, `bullets`, `table`, `code`,
`quote`, `image`, `compare`, `note` (its text is markdown), `profile`, `stack` (a column of
blocks as one object), `divider`, `spacer`. `ink` is `{ "d": "<svg path>", "colour", "weight",
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
| sticker.add / .update / .remove | `label`, `picture`, `shape` (`circle`, `star`, `band`, `tape`), `portrait`, `card` -- each `{ id, kind, at: [x%, y%], width?: %, rotation? }`, placed from its centre |
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
