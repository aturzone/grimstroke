# grimstroke, for an agent

You are working on the **core** of grimstroke: what is kept and what is understood. Boards and
notebooks as data and the patches that change them, the / box's reading of a line of text (its
own model), the day, reminders, logins, repositories, and the server that answers all of it in
data. It never draws a document. What draws is a **face** -- `../grimstroke-face` is the one
there is -- plugged in through `src/host/serve/face.ts`. The core's own face is the smallest
complete one: the / box and the / board.

Keep it that way: nothing here imports a face, and a route that needs markup asks the face for
it and answers without it when there is none (`GRIMSTROKE_FACE=none` runs the core alone, and
tests/host/serve/core.test.ts holds it to that).

## Orientation

The tree has one axis, and that axis is **purity**. `draw/` never opens a browser, never touches
the network, never reads a clock; `host/` is where all three are allowed. `app/` runs in a
browser and touches no disk. (`draw/` keeps its name from before the split: here it is the
documents as data and the / box's understanding, plus the box's own card faces.)

```
src/index.ts            the core's public API: models, patches, the box's model, serve, Store

src/draw/               PURE.
  doc/                  boards, notebooks, the bookcase, repositories: models and patches;
                        board/extent.ts is a board's geometry; search.ts; legacy.ts
  look/                 the vocabulary the models name: palettes, rulings, templates, paper
  material/             the blocks as data (model.ts), and the vocabularies they name:
                        decor kinds, pet coats, sticker packs and marks; read.ts, any block's words
  shape/                THE / BOX: classify.ts (the model) and weights.ts (its weights, from
                        tools/train-shape.ts), rules.ts, parse.ts and the readers beside it
                        (issue.ts, when.ts, units.ts, zones.ts), labels.ts (choosing a
                        repository's labels), commands.ts (what the box does besides cards),
                        fields.ts, decide.ts (the box's calm state machine), render.ts (the
                        card faces) and css.ts
  slash/                the / board: render.ts (its column), page.ts (its page with no face)
  today/                gather.ts: the day, from every card; css.ts
  chrome/               the few chrome pieces the box shares: icons, tokens and kit, the box css
  type/text.ts          escaping

src/app/                THE BOX IN THE BROWSER (dist/box.js): shape/ (island.ts the box,
                        issue.ts, command.ts, editor.ts), slash.ts (the / board, and the box on a
                        page with no place of its own), pick.ts, toast.ts, feel.ts, remind.ts,
                        book/repo.ts (connecting an account or a notebook to a repository)

src/host/               NOT pure.
  cli.ts                serve, gateway, hash-password, save/open, search, trash, history; it
                        loads the face (face/face.js beside the install, or a checkout beside)
  remote/               GitHub, GitLab, Gitea adapters; keys (0600); sign-in; webhooks
  serve/
    server.ts           the door: the token or the login, static files, then the face's
                        routes, then the core's
    face.ts             the contract a face keeps, and the face in use
    api.ts              the JSON API: patch, state, events, search, archive, the bookcase
    live.ts             the documents held in memory, and who is watching
    slash.ts, issue.ts  the / board; issues from the box
    today.ts, push.ts   the day as data; reminders to a phone (Web Push)
    gateway.ts, login.ts  several people behind one login; the login page
  store/                boards, notebooks, assets by content hash; the archive

tests/                  mirrors src/
tools/                  build.ts, train-shape.ts and shape-data.ts (the model), the TS loader
docs/api.md             every endpoint and operation an agent can use
docs/split.md           the core and the face
```

## Before you change anything

```sh
pnpm check
```

It types, lints, tests and builds. (The responsive audit of every surface, `pnpm layout`, is the
face's.)

Commit only on a green check, gated on its exit code -- `pnpm check && git commit`, never a
pipe through grep that swallows the failure. A red commit got in exactly that way.

The server reads the renderer when it starts. After `pnpm build`, restart it
(`tools/serve.sh`), or you are looking at the old stylesheet and wondering why a fix is not
there.

## The rules that are not style

**`render()` must stay pure.** No browser, no network, no clock. Snapshots of its
output are readable text, so a regression reads as
`padding-inline-start: 18px -> 20px` rather than a red blob, and a caller with
its own browser can use the HTML directly. This is what the `draw/` and `host/`
split is for: if an import crosses from `draw/` into `host/`, the rule has
already been broken.

**The app does not render.** Every item on screen was drawn by the same code
that draws an export, and when one changes the server sends back its new markup.
An app that re-rendered items in the browser would be a second renderer, and a
second renderer is a second thing that can disagree with the first about what a
sticky note looks like. The one exception is the stroke you see while you are
still drawing it, which exists because a line that appears after a round trip is
not a line you drew.

**Chrome classes are prefixed `gs-`.** The chrome and the documents share one
stylesheet. The zoom button was called `.zoom`, which is also the magnified
inset on a picture, and it arrived wearing a seven-pixel hard black shadow that
read as a rendering fault.

## When you move files

Moving a file is not a refactor and must not become one. Move first, prove the
output is unchanged, and only then change what is inside. The proof is cheap:
`render()` is pure, so rendering every palette in both directions before and
after and diffing the HTML is a few seconds and catches what tests do not.

## The house style

Comments explain **why**, and where there is one, the failure that produced the
rule. A bare imperative gets reverted by whoever finds it inconvenient; a rule
with a scar attached survives. Several of the comments in this repository name
the exact mistake they exist to prevent — keep that up.

No `any`. No `innerHTML` in anything that could take untrusted text. Single
quotes, two-space indent, 100 columns; Biome enforces all of it.

**The stylesheet is a template literal, so it cannot contain a backtick.** Not
even inside a CSS comment. This has closed the string and broken the build four
separate times, always from a comment quoting a property name. Use single
quotes there. `tests/draw/style.test.ts` guards the other two ways the sheet
gets corrupted by editing: unbalanced braces, and a declaration left outside a
rule.

**Nothing may be lifted with `body.x > *`.** That selector outranks a class, so
it silently overrode `position: fixed` on every piece of chrome and laid the
tool tray and the page turner out in the flow, full width. Lift the content
containers by name.

**`null` clears a field in a patch; `undefined` does not exist.** JSON drops
`undefined` keys, so a patch that "cleared" a title with it arrived as a patch
that changed nothing, and its inverse could not restore the title either.
`apply` deletes keys set to `null`, and `invert` records `null` for keys that
were absent.

**A tab is never sent its own patch back.** Each tab has a client id, sent as
`x-grimstroke-client` on patches and `?client=` on the event stream. Without it,
every drag came back as an event and re-rendered the item under the pointer.
Position-only changes reply with `placed: [{id, at, z}]`, not re-rendered HTML.

**A backslash-u escape typed into a tool writes the literal character.** When
generating source that must contain `\u0627`-style escapes (the Persian
ranges in `material/read.ts`, `doc/search.ts`), double the backslash, then read
the file back and check.

**A page of a notebook is a board.** It is addressed as `book:<notebook>:<leaf>` and served
by `Live.page()`, which builds a BoardSpec from the leaf and writes items back into it. Do not
give pages their own editor, their own patch vocabulary or their own renderer: the whole point
is that every board tool works on a page because it is the same code.

**Stored data is upgraded on read and never rewritten for it.** `draw/doc/legacy.ts` turns old
shapes (characters, face stickers, columns of blocks on a leaf) into current ones in memory. A
file is only written when its content actually changes, and nothing deletes what a user left
on disk -- the old `faces/` directory is read once for the profile and then left alone.
