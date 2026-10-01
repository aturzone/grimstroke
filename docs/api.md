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
| `POST /api/write` `{ book, blocks, from?, columns?: 1 \| 2 }` | pour blocks into a notebook, page after page, split where each page is full (measured in a headless browser), never a heading alone at a page's foot. A figure (`table`, `code`, `compare`, `image`) may carry `caption`: numbered, and kept with its caption. `{ref: words}` in text becomes the page of that heading or figure. Answers with `pages`, `figures`, `refs` and `warnings` |
| `GET /api/layout?board=<address>` | every item's measured box, what overlaps, what runs over a page's edge, and the clear room left on a page |
| `POST /api/tidy` `{ board, ids, as: "column" \| "row" \| "grid", gap?, at?, columns? }` | line items up with even gaps, by their measured sizes |
| `POST /api/tidy` `{ board, fix: "overlaps", gap? }` | move apart what overlaps: in reading order, anything lying on something above it slides down clear of it (ink and stickers stay put); answers with what still overlaps and what now runs off the page |

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

## The look: corners and faces, section by section

| | |
|---|---|
| `GET /api/look` | each section's look -- `board`, `notebook`, `settings` -- as `{ corners, ui?, text? }`, and the faces there are to choose from |
| `POST /api/look` | `{ corners }` sets every section's corners at once; `{ board: { corners: 0 } }` one section; `{ notebook: { ui: 'Estedad', text: 'system serif' } }` its faces (`null` goes back to as designed) |

`feel` is how working feels, everywhere: `{ sound: true|false, volume: 0..1, motion: 'full'|'calm'|'none', quiet?: { from: 0..23, to: 0..23 } }`
-- small synthesised sounds when a hand does something (paper lifted and set down, a page
turned, a card placed, a box ticked, a timer done, the pet purring), and things that arrive,
settle and leave. `POST /api/look { feel: { sound: false } }` turns the sounds off. No audio file
is ever loaded; nothing plays before the page has been touched.
`quiet` is the hours, on the browser's clock, when no sound is made -- across midnight when `to`
is the smaller; send `quiet: null` to turn them off.

`corners` is 0 (square) to 3 (very round); 1 is as designed. Below 1 the rounded things straighten;
above 1 even the things drawn square round too, and the bars grow their padding to keep what is
written in them clear of the bend. `ui` is the face of a section's buttons and menus; `text` the
face its words are set in wherever a document does not name its own (`fonts` on a board or a
notebook). The faces: `JetBrains Mono`, `Estedad`, `Caveat`, `Caveat Brush`, `system sans`,
`system serif`.

The sections: **board** is the board and everything on it; **notebook** is a notebook's spread, its
pages, its print view and the controls around the bookcase; **settings** is the settings page.
The bookcase itself and the books themselves -- covers, pages, spines -- are objects with their own
look (the bookcase's decorate panel, a notebook's cover and page setup) and are never rounded or
re-set by this. A notebook or a board keeps its own corners with `corners` in a `book` or `board`
op. Torn paper, die-cut stickers and pixel art keep their edges. People have all of this in
**Settings → look and fonts**, and the per-document choice in a notebook's page setup and a board's
menu.

## Settings

`/settings` (and the old `/profile`) is one page with a section for each kind of setting: profile,
pet, look and fonts, connections (the repository keys this computer keeps, and which notebooks are
connected), workspace (backup, restore, the trash), about. `#<section>` in the address opens it.

## Shapes: a line of text that becomes a card

On a board, a page or a notebook's spread, **/** opens one box: type a plan, a list, a colour or a sum and it becomes a
card -- an event, a checklist, a timer, a colour, a split, an expense, a conversion, a sum, a
trip, a poll, a contact, a bookmark, a countdown, a time zone, a dice roll, a goal or a note.
**/** again in the empty box lists every kind, to choose one by hand. English and Persian both
work ("شام با مریم جمعه ساعت ۸ شب" is an event on Friday at 20:00).

Which card a line is comes from a small classifier that ships inside the page (55 KB of int8
weights, a logistic model over named facts and character n-grams, trained on generated English
and Persian sentences; 97% on held-out phrasings, 99.9% on whole unseen sentences). Everything on the card -- dates, amounts,
units, sums -- is computed by code, never guessed.

| | |
|---|---|
| `GET /api/shape/kinds` | every kind, with its English and Persian name and an example of each |
| `POST /api/shape` `{ text, intent? }` | read a line as the bar does: `intent`, `confidence`, `probabilities`, `readiness` (0-2), `signals` (video call? urgent? shopping?), and -- when it is a card -- `card`, `summary`, the `block` and its `html` |
| `POST /api/shape/place` `{ board, text, intent?, at?, width?, state? }` | put a line on a board or page as its card; `intent` forces the kind; answers with the new `id` and the `summary` |

A placed card is an item whose block is `{ "kind": "shape", "intent", "text", "made", "state"? }`.
`made` is when it was written: relative dates in its text are read against it. `state` is what has
been done to it since, and changes with an ordinary `update` patch: `done` (ticked checklist
indices), `votes` (per poll option), `people` and `total` (a split), `days` and `log` (a habit's
weekdays and the dates it was done), `current` (a goal), `elapsed` and `startedAt` (a timer, in
seconds and epoch ms), `to` (the unit a conversion shows), `result` (the last roll), `closed`
(a reminder done). Searching finds a card by its words and by its summary.

**Values set by hand: `state.fields`.** Every card's values can be changed without retyping it --
the pencil on a card, or "Details" in the bar, opens them with a date picker, a clock, a colour
well, lists with add and remove -- and what is set by hand is kept in `state.fields`, over what the
text says (the text stays the text; a field not set still follows it). An agent sends the same
keys, in an `update` patch or in `POST /api/shape/place`'s `state` (checked against the kind;
unknown keys are dropped). `GET /api/shape/kinds` lists each kind's fields with their types.

| kind | `fields` |
|---|---|
| event | `title`, `date` (YYYY-MM-DD), `time` (HH:MM), `place`, `people` (list) |
| reminder | `task`, `date`, `time` |
| todo | `items` (list) |
| timer | `label`, `duration` (seconds) |
| habit | `title`, `label` (how often, in words), `days` (0-6, Sunday is 0) |
| color | `hex` (#rrggbb), `name` |
| split | `total`, `people`, `currency` (`$` `€` `£` `₹` `تومان` `ریال` or empty) |
| expense | `amount`, `item`, `currency` |
| convert | `value`, `from`, `to` (unit keys: `km` `mi` `m` `cm` `kg` `lb` `C` `F` `kmh` `mph` ...) |
| calc | `expression` |
| travel | `destination`, `origin`, `start`, `end` (dates), `mode` (`flight` `train` `bus` `car`) |
| poll | `title`, `options` (list) |
| contact | `name`, `phone`, `email` |
| link | `url`, `note` |
| countdown | `title`, `date` |
| timezone | `from`, `to` (zone keys such as `tehran`, `london`, `pst`, or `local`), `time` (HH:MM in `from`; empty for now) |
| random | `kind` (`dice` `coin` `number` `pick`), `count`, `sides`, `min`, `max`, `options` (list) |
| goal | `title`, `current`, `target`, `unit` |
| note | `text` |

```sh
curl -s -X POST $B/api/shape/place -H "x-grimstroke-token: $T" -d '{
  "board": "workspace", "text": "tea", "intent": "timer",
  "state": { "fields": { "label": "Tea", "duration": 240 } } }'
```

On a notebook's spread, **/** (or the "type anything" button) puts the card on the page in view --
the right-hand page, or the one on show on a phone -- under what is on it; a full page sends it
to the other page, then to the next empty one. Controls on a card work on the spread as they do
on its page.

## The day

`GET /today` is the page a person opens in the morning; `GET /api/today` is the same day as
data, for an agent planning around it. Both read every card on every board and on every page
of a notebook in use:

| key | what |
|---|---|
| `date` | the day, `YYYY-MM-DD`, local |
| `now` | timers running, with `endsAt` (epoch ms) |
| `today` | events, reminders and countdowns falling today, by time |
| `habits` | habits due today, with `done` for kept |
| `overdue` | reminders whose day has gone by and are not done |
| `lists` | checklists not finished, with their `items` |
| `soon` | what falls in the next seven days |

Each entry carries `address` (a board id or `book:<id>:<page>`), the item `id`, a `title` and
`where` it lives. `POST /api/today/act { address, id, act, index? }` does what the card itself
would: `tick` a checklist item, mark a reminder or event `done`, keep a `habit` today. It
answers with the day page's markup, drawn again. `POST /api/today/add { block, width? }` puts a
card typed on the day page onto the home board, under what is already there, and answers the same.

## The / board

`GET /slash` is the page where everything the / box made is looked after; `GET /api/slash` is the
same as data: every card on every board and page, as `{ address, id, block, where, summary, done }`.
What the box makes without being told where goes onto the board `slash` -- `POST /api/slash/add
{ block, width? }`, where the block is a shape or a note. `POST /api/slash/save { address, id, block }`
changes a card, `POST /api/slash/delete { address, id }` lets one go and answers with the item, and
`POST /api/slash/restore { address, item }` puts it back. Moving one is `POST /api/items/move`.

## Issues from the / box

A line like `bug: the save button is slow on the phone, label mobile, in owner/name` is an
**issue** card. `GET /api/remote/targets` lists every repository an issue can go to -- each
connected account's own and each connected notebook's -- so an account connected later is there
the next time. `GET /api/remote/labels?host=&repo=` gives a repository's labels.
`POST /api/remote/issue { block, address?, id?, images? }` opens it: the repository is the one the
sentence names (by whole name, short name or nearest), the labels are the repository's own,
chosen from what the sentence says (draw/shape/labels.ts: an archive of what labels stand for, in
English, Persian and Russian, matched to however a repository spells them), and `images` are
assets (`POST /api/assets`) carried into the issue -- an upload on GitLab, an attachment on
Gitea, and on GitHub, which has no API for it, a file on the branch `grimstroke-uploads`. The
card stays where it was typed, or on the / board, and says which number it became.

The box also acts on issues by number: `GET /api/remote/issues?repo=&mine=&state=` lists them,
and `POST /api/remote/issues/act { repo?, number, action: close|reopen|comment, body? }` does one
of those on its service. A month of the calendar as data is `GET /api/calendar?year=&month=`.

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

`GET /api/export/book?id=` is the notebook as one PDF: `{ print, save, pageSize, pages, contents }`.
`contents` is one line per written page -- its topmost heading, or its first words -- with the
page number printed on it. `print` is `/print?book=<id>`, the page that holds the cover, the
contents and every written page, one sheet each at the notebook's page size (`@page` is set, so
there are no margins to choose); a browser prints it to PDF, and `save` opens the print dialog
by itself. `pdf` is `/api/export/book.pdf?id=<id>`: the PDF file itself, printed on the server by
Chromium (the one engine Playwright can print with; everything else stays on Firefox) -- for an
agent with no browser of its own. Blank pages after the last written one are left out. In the notebook, **PDF** on the
bar goes there.

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
| `GET /api/remote/thread?board=&id=` | the issue on card `id` in full: `{ ref, issue, comments }`, its description and every comment, oldest first. In the browser, a card's "replies" opens it beside the page, with a reply box (Ctrl+Enter sends) |
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
