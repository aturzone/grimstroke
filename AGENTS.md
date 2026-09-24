# grimstroke, for an agent

You are working on **grimstroke**, a notebook for agents. It draws pages: a
screenshot with the wrong thing circled, the measured numbers beside it, a note
stuck on the corner.

It is a drawing tool and nothing else. It does not know what a bug is, what a
severity means, or what a report should contain. Every time it has been asked to
learn one of those, the right answer has been that the caller owns it.

## Orientation

The tree has one axis, and that axis is **purity**. `draw/` never opens a
browser, never touches the network, never reads a clock; `host/` is where all
three are allowed. `app/` is a third thing: it runs in a browser and touches no
disk. Anything you add belongs in one of the three, and which one is not a
matter of taste — see the first of the rules below.

```
src/index.ts            the whole public API. Nothing else is exported, so the
                        tree below can be rearranged without breaking a caller.

src/draw/               PURE. No browser, no network, no clock.
  look/                 the visual vocabulary, shared by everything drawn
    colour.ts           contrast arithmetic -- the measurement
    palette.ts          the palettes and their floors -- the policy
    rng.ts              seeded randomness, so a page always looks like itself
    paper.ts            torn edges and tape, as geometry
    grain.ts, png.ts    the paper-tooth tile, baked to a PNG
    grid.ts             ruled, squared, graph and dotted paper
    hand.ts             marks a hand makes: arrows, circles, swipes, bands
    frame.ts            how a picture is mounted: polaroid, taped, torn, pinned
  type/                 letters: the vendored faces, what they cover, escaping
  material/             the things placed on a document, whatever the document
    model.ts            Block, as data
    block.ts            one block -> HTML, dispatching on kind
    words.ts, read.ts   headings and text; the text of any block, for search
    plate/              the picture, and what is drawn on it
      coords.ts         the space-prefixed coordinate contract
      redact.ts         destructive redaction, on raw pixels
    note/               the sticky note: model, markdown body, render
    profile/            the one profile: the drawn portrait and the card
    css.ts              each folder keeps its own stylesheet piece beside it
  doc/                  the documents, each a model, a builder or patch, a render
    page/               a column of blocks
    board/              a plane with things placed on it
    book/               a sequence you turn through: cover, leaves, stickers;
                        each leaf is a small board of placed items
    legacy.ts           old stored shapes, upgraded as they are read
    search.ts           Persian-aware folding and ranking, over all of them
    style.ts            the stylesheet: only the ORDER of the pieces lives here
  chrome/               the controls around a document, as markup: the top bar,
                        the tray, the turner, the page nav, the profile page
    css/                their stylesheet pieces

src/app/                THE LIVE SURFACE. A browser, no disk, no framework.
  main.ts               which surface this page is
  net.ts                the transport, the outbox and the undo stack
  chrome.ts             toasts, menus, confirm cards, search, help
  board/                camera, gestures, handles, arrange, ink, notes, export
  book/                 turning, jumping, the cover editor
  profile.ts            the easel: drawing the portrait
  note/                 a live note: grab, edit, format chords
  motion/               springs and poses, for things that move

src/host/               NOT pure. The outside world.
  cli.ts                write a JSON file, run one command, get PNGs; search
  export.ts             HTML -> PNG, through Playwright, which is optional
  redact.ts             redaction, from a file and back to one
  serve/                the workspace on a port
    server.ts           auth and static files, then the routes
    pages.ts            the HTML surfaces
    api.ts              the JSON API: patch, state, events, search, archive
    live.ts             the documents held in memory, and who is watching
  store/                boards, notebooks, assets by content hash; the archive

tests/                  mirrors src/: tests/draw/..., tests/host/...
  fixtures/index.ts     every fixture path, resolved once
tools/                  build.ts, look.ts, and the TypeScript loader they need
assets/fonts/           the vendored faces. Nothing is resolved from the system.
docs/api.md             every endpoint and operation an agent can use
```

It is deliberately a deep tree and not a wide one. A folder holds few enough
entries to read at a glance, and the nesting carries the meaning instead: the
path `draw/material/plate/coords.ts` tells you it is pure, that it is something
placed on a document rather than a document, and that it is about the picture — before
you have opened it.

## Before you change anything

```sh
pnpm check
```

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

**The plate is an LTR island.** Image space has no reading direction. Marks are
positioned with physical `left`/`top` inside `.plate { direction: ltr }`. Using
logical properties there sent every box to the far side of the picture in a
right-to-left page — a plausible-looking and completely wrong result. Chrome
mirrors; the plate never does.

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

**Texture never touches the picture.** Halftone and grain are chrome only, below
the plate in the stacking order. A page must not alter the image it is showing,
and a test asserts the pixels come out exactly as they went in.

The same rule governs frames. A mount is a card the picture sits ON: the tilt,
the tape and the tear all belong to the card. The tear is painted on a backing
element *behind* the picture rather than clipped around it, because a nick can
be deeper than the mat is wide -- and it was, and it bit a notch out of a
screenshot. Cropping evidence to make it look nicer is the worst thing this
library could do, so the geometry makes it impossible rather than unlikely.

## When you change how the board moves

```sh
pnpm build && pnpm perf            # headless: software rendering, the worst case
pnpm build && pnpm perf --headed   # a real window, so this machine's GPU does the drawing
```

A board of 200 items and 2000 strokes, panned and zoomed by script, frames counted as the
browser paints them. Measured on 2026-09-24, Firefox 155, integrated Intel graphics:
headless 36 fps panning at fit / 43 at 100% / 39 zooming; headed 77 / 60 / 51. Keep panning
at fit at 60 or better on real hardware.

## When you change how it looks

```sh
pnpm look
```

Then look at the output. Every palette, every block, every frame, every paper,
both directions. This is the only check for the things that do not reduce to a
number, and an agent that can see images can do it itself.

It has earned its keep. Looking at the sheet is what found the tape drawn
through the title, the tear biting into a screenshot, two callouts numbered 1,
and a 'none' frame that rendered an identical border to 'keyline'.

**Judge it by looking, but diagnose it by measuring.** Three separate faults in
the paper texture were invisible to the eye and obvious to a number: a gradient
that silently drew nothing, a filter reference escaped twice, and a blend mode
that was the identity against the tile it was given. Crop a patch, take the
standard deviation, and compare it against the same patch with the effect off.
A layer that is doing nothing measures zero, and no amount of squinting at a
screenshot will tell you that.

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

**The grain tile is translucent, and it is not blended.** It used to be opaque,
which forced a `mix-blend-mode` on every layer that used it -- and every blended
layer is an extra offscreen pass the size of the layer. On a board that was a
measurable share of each frame. It is now sparse RGBA specks composited plainly.
If you ever make a texture opaque again, it will paint solid noise over whatever
was underneath; that has cost a desk, a leather cover and a sheet of paper.

**Nothing on the board gets a big `box-shadow` or filter.** The board is a
10,000px element under a transform; a 70px blurred shadow on it was the single
largest cost of panning. The shadow is now a separate `.gs-shadow` rectangle
moved by the camera. Measure a pan's frame rate before and after adding
anything that paints the whole plane.

**The camera writes one inline transform.** Not custom properties that every
item inherits: changing an inherited property restyles every descendant, and
at 200 items and 2,000 strokes that alone missed the frame. Items carry a
transform only when they are rotated; a note gets a 3D context only while it is
lifted.

**`null` clears a field in a patch; `undefined` does not exist.** JSON drops
`undefined` keys, so a patch that "cleared" a title with it arrived as a patch
that changed nothing, and its inverse could not restore the title either.
`apply` deletes keys set to `null`, and `invert` records `null` for keys that
were absent.

**A tab is never sent its own patch back.** Each tab has a client id, sent as
`x-grimstroke-client` on patches and `?client=` on the event stream. Without it,
every drag came back as an event and re-rendered the item under the pointer.
Position-only changes reply with `placed: [{id, at, z}]`, not re-rendered HTML.

**A note only takes the pointer under the select tool.** `canGrab` decides.
Notes used to grab every press, so a pen stroke that began on a note moved the
note instead. Links and checkboxes in a note's body still get their clicks.

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

**The golden check is the proof a refactor changed nothing.** `tests/golden/` holds every
surface to a fingerprint. When a change is meant to alter output, run `pnpm golden before` on
the old code and `pnpm golden after` on the new, diff them, and only then `pnpm test -u`.

