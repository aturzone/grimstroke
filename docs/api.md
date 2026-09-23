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
| board | `{ "op": "board", "patch": { "palette"?, "paper"?, "title"?, ... } }` -- on a page, only `paper` is the page's own |

A `block` is anything a page can hold: `heading`, `text`, `label`, `bullets`, `table`, `code`,
`quote`, `image`, `compare`, `note` (its text is markdown), `profile`, `stack` (a column of
blocks as one object), `divider`, `spacer`. `ink` is `{ "d": "<svg path>", "colour", "weight",
"tool": "pen" | "pencil" | "marker" | "highlighter", "fill"? }`, relative to `at`.

The reply says what happened: `placed` (items whose only change was position, with their new
`at` and `z`) and `changed` (everything else, with fresh markup), plus `removed`. Send an
`x-grimstroke-client` header naming your tab, and your own patches are not echoed back to you
on the event stream.

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
| sticker.add / .update / .remove | `label`, `picture`, `shape` (`circle`, `star`, `band`, `tape`), `portrait` |
| book | `{ "op": "book", "patch": { "title"?, "palette"?, "paper"?, "minLeaves"? } }` |
| archive | `{ "op": "archive", "archived": true }` -- put away, never thrown away |

`POST /api/books` with `{ "title" }` makes a notebook and answers with its id.

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
