# grimstroke

A notebook for agents.

An agent needs somewhere to put what it found. Not a log line and not a wall of
markdown: a page, with the screenshot on it, the thing that is wrong circled, the
measured numbers beside it, and a note stuck on the corner. Something a person
can look at and immediately understand.

That is what this is. Pages an agent writes, draws and annotates on, exported as
images.

```ts
import { notebook, exportPages } from 'grimstroke';

const book = notebook({ palette: 'newsprint' });

book
  .page('login-button')
  .title('The login button is the same colour as its background')
  .chip('critical')
  .trail('Wallet', 'Top button row')
  .bullets('Measured `#4070F0` on `#4070F0` — ratio `1.0:1`, against a `3:1` threshold')
  .image('shot.png', {
    caption: 'Build 102',
    marks: [
      { rect: 'src:60,860,600,90', badge: '1', note: 'The button is here, and invisible.' },
      { rect: 'src:40,300,540,54', kind: 'redact' },
    ],
  })
  .note('Contrast cannot be judged by eye.', { title: 'measured' });

await exportPages(book.render().map((page) => ({ page, out: `${page.id}.png` })));
```

Or, for an agent that can only write a file and run a command:

```sh
grimstroke render page.json --out ./images
grimstroke search 'login button'
```

## The workspace

A page is a column. A **board** is a plane with things placed on it, and a
workspace is one board.

```sh
grimstroke serve
# grimstroke is on http://127.0.0.1:53199/?t=...
```

Open the port in any browser and that is the whole product: no install, no
extension, no desktop build. Pan it, zoom it, drop screenshots on it, draw on
it, write on it. It saves as you go, into plain JSON files in a directory you
can open.

An agent talks to the same server over HTTP and needs nothing at all — not even
a browser:

```sh
curl -X POST "$URL/api/patch" -H 'content-type: application/json' -d '{
  "board": "workspace",
  "ops": [{ "op": "add", "item": {
    "id": "n1", "at": [120, 200], "size": [280],
    "block": { "kind": "note", "text": "Two-factor is off by default.", "title": "measured" }
  }}]
}'
```

Both write to the one document, and every change is broadcast, so a person with
the board open watches the agent work.

**Anything that can go on a page can go on a board.** An item is a block plus a
position, so a sticky note is the same sticky note and improving one improves
both. Strokes are SVG paths, which is why the board is DOM and SVG rather than a
canvas: `pdf` prints through the browser's own vector pipeline, so the text is
still text and a hairline is still a hairline at four hundred per cent.

On a board, anything can be resized, rotated, grouped, aligned, spaced evenly,
locked and duplicated, and a sticky note's body is markdown — headings, lists,
task boxes you can tick, code, links — with the editing shortcuts you would
expect. It stays smooth at a couple of hundred items and a few thousand strokes.

**Notebooks** sit on a shelf. A notebook has a cover you can design — title,
material, ink, stickers, a profile card — and leaves you turn through, rearrange
and archive.

Every **page of a notebook is a small board**: open one and every board tool is
there -- notes, pictures, ink, the eraser, moving, turning, grouping -- on a sheet
the size of the page. A notebook opens on its cover and turns like paper.

The **profile** is you: a portrait you draw yourself in a 3:4 photo frame with the
same pens, your name and a few words, on an ID card you can pin to a board, paste
on a notebook's cover, or stick on as a portrait.

**Search** covers every board, every notebook — archived ones too — and every
the profile, and folds Persian spelling variants so a search finds what you meant.

Every one of those is a patch operation, so an agent can do all of it over
`POST /api/patch`, and all of it round-trips through the `.grimstroke` backup
the workspace can download and restore. `docs/api.md` lists every endpoint and
operation.

## What it is for

Anything an agent has to hand back to a person and cannot say in a sentence. QA
findings are the obvious case — a bug is a picture with an argument attached —
but so are design reviews, migration reports, before-and-after comparisons,
anything with a screenshot and a claim about it.

It knows nothing about bugs, severities or reports. It draws pages.

## The blocks

`heading` · `text` · `label` · `bullets` · `table` · `code` · `quote` ·
`image` · `compare` · `note` · `profile` · `stack` · `divider` · `spacer`

`image` takes marks. Some are machine-precise — a box, a numbered badge, a
callout with a leader note, a censor bar. Some are made by a hand — a circle
round it, an arrow at it, an underline, a highlighter swipe. The difference is
not decoration: a box says *this rectangle, exactly*, and a circle says *this
thing, roughly*, which is a claim about how precisely you measured.

A picture can also be mounted: `polaroid`, `taped`, `torn`, `pinned`, a plain
`keyline`, or `none`. The mount is a card the picture sits on — it tilts, it
tears and it takes the tape, and the picture inside it is never touched.

`compare` puts two images side by side and copies the marks onto both, which is
what a before-and-after almost always wants.

A page can be `blank`, `ruled`, `squared`, `graph` or `dotted` paper, with as
much `grain` as you want and none by default. `heading` and `text` can be
written in a hand rather than typed, and `label` is a band of flat colour with
words across it — for the one thing on a page that matters more than the rest.

## Two properties worth knowing

**`render()` never opens a browser.** It returns HTML and the list of files that
HTML references. An agent that already drives a browser can screenshot that
itself; Playwright is an optional peer, only needed by `exportPages`.

**A page always looks like itself.** Every generative mark — the tear of the
paper, the angle of the tape, the drift of a sticky note — is seeded from the
page id. Export it again next year and nothing moves.

## The look

Late-80s photocopied zine: Risograph flat spot inks, torn edges, tape, halftone,
thick keylines, hard shadows with zero blur. Nine palettes, or your own.
`docs/design.md` says which parts of that are style and which two are
correctness.

## Install

```sh
pnpm add grimstroke
pnpm add -D playwright   # only if you want it to export PNGs for you
```

Node 22 or newer.

## Working on it

```sh
pnpm check   # typecheck, lint, test, build
pnpm look    # render every palette and every block, then LOOK at them
```

The tree has one axis, and it is purity. `src/draw/` opens no browser, touches
no network and reads no clock; `src/host/` is where all three are allowed;
`src/app/` is the live surface in the browser.
`AGENTS.md` maps the rest.

The look-sheet is the only instrument for problems that do not reduce to a
number. There is deliberately no image baseline: output is stable within one
browser build and changes with the next, so a baseline breaks on every upgrade
and teaches whoever maintains it to accept the new one unread.

## License

MPL-2.0. The vendored faces are SIL OFL 1.1 — see `assets/fonts`.
