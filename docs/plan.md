# From a page renderer to a workspace

grimstroke today draws one thing: a page. The work ahead turns it into the
stationery an agent and a person share — an infinite board you can put anything
on, a notebook you can flip through, a character that signs the notes — without
losing the two properties that make the current thing worth having: `render()`
is pure, and a page always looks like itself.

This document is the plan. Decisions that were open have been taken and are
recorded with their reasons.

## 1. The one idea

**The document is the product. Everything else is a view of it.**

A page, a board, a notebook and a character are all plain JSON. One renderer
turns each into HTML. The browser app mounts *that same HTML* and adds handles
to it. The exporter prints or screenshots *that same HTML*. An agent edits the
JSON.

That single decision buys almost everything the brief asks for:

- **What you see is what you export**, because there is only one renderer.
- **No quality loss at any zoom**, because the board is DOM and SVG, not a
  `<canvas>` — strokes are paths, text is text, and a PDF of it is vector.
  Screenshots stay raster and are embedded at their own resolution, which is
  the honest answer: a PDF cannot invent pixels a PNG never had.
- **The agent and the person edit the same thing**, because both write to one
  document, not to two parallel states that have to be reconciled.
- **Backup is not a feature to be remembered**, because everything is already
  one serialisable tree.

## 2. The workspace

A **workspace is one infinite board**, and there can be as many of them as you
like. Everything else lives on a workspace: notebooks stand on its shelf, notes
stick to it, screenshots are pinned to it, drawings are made on it.

`grimstroke serve` puts them on a port. You open the port in a browser — any
browser, on any device — and that is the whole product. There is no install, no
extension, no desktop build and no browser automation in the path between a
person and their work.

Three rules follow from that, and they are constraints on everything below:

**No dependency the user has to satisfy.** The app is vanilla TypeScript, DOM
and SVG, bundled by the esbuild already in this repo. No framework, no runtime
package, no CDN. This is the same instinct that already hand-writes PNG with
nothing but `zlib` rather than taking an image library: a dependency is a thing
that will one day not install on the machine that needs it.

**Playwright is never required.** It stays exactly what it is today — an
optional peer, for a caller that wants a PNG without opening a browser. The
agent talks to the workspace over HTTP, which needs nothing at all.

**Reachable means reachable by everyone.** Any browser, any screen size down to
a phone, keyboard-navigable throughout, screen-reader labelled, honouring
`prefers-reduced-motion` and `prefers-contrast`, and readable in both reading
directions. The contrast floors already enforced for pages apply to every new
surface.

## 3. Where it goes

The tree already has its axis: `draw/` is pure, `host/` is not. The app touches
the DOM but no disk, so it is a third root.

```
src/index.ts
src/draw/               PURE. No browser, no network, no clock.
  look/                 colour · palette · rng · paper
    + texture.ts        paper grain and fibre, as CSS
    + grid.ts           ruled, squared, dotted and blank paper
    + hand.ts           wobble: arrows, circles, underlines, brackets
    + frame.ts          polaroid · taped · torn · keyline · none
  page/                 the page document                        (exists)
  + board/              the workspace document and its items
  + book/               the notebook: cover, leaves, flip, archive
  + figure/             the character: slots, parts, colouring
    parts/              the SVG art, one file per slot
src/+app/               THE LIVE SURFACE. DOM and SVG, no disk, no framework.
  shell/                chrome, settings, search, undo, the event stream
  board/ book/ studio/  the three editors
src/host/               NOT pure. The outside world.
  cli.ts                                                          (exists)
  export.ts -> export/  png.ts · pdf.ts · svg.ts
  + serve/              the server, the live document, the agent API
  + store/              workspaces, archive, assets, the backup archive
```

Nothing above is created until there is code to put in it. The point of naming
it now is that every item below has one obvious home.

## 4. Decisions taken

### 4.1 PDF comes from a print, not from a browser engine

The board must save as PDF and keep its quality under zoom, and it must not
drag in a dependency. So the primary path is **the browser's own
print-to-PDF**: paged-media CSS, `@page` geometry, a print stylesheet that
turns the infinite board into sheets, and `window.print()`. That is vector
output, with selectable text, from a button in the app, on any machine, with
nothing installed.

For an agent that wants a file without a person pressing anything, the optional
Playwright path can produce the same PDF headlessly. That would be Chromium —
`page.pdf()` exists nowhere else — and Chromium is opt-in on this machine, so
it is offered and never assumed. Firefox remains the default for PNG.

Rejected: writing our own PDF generator. It would mean re-implementing layout
and subsetting TTFs by hand, weeks of work, and the output would drift from
what the screen shows — which is the one property worth protecting.

### 4.2 How the agent drives it

Two ways in, both real, because they fail differently:

1. **The API.** localhost-only and token-guarded. `POST /patch` takes a list of
   commands; `GET /state` reads; `/events` streams changes. An agent putting
   forty findings on a board should use this: one call, atomic, cannot misclick.
2. **The UI.** Every control carries a stable `data-gs` name and the page
   exposes the same command set on `window.grimstroke`. An agent that does have
   a browser can click, type and drag exactly as a person would — useful when
   the point is to *show* the work rather than to write it.

Both write to the one document and every change is broadcast, so a person with
the workspace open watches the agent work in real time. That is the difference
between a tool an agent uses and a tool two parties share.

### 4.3 The faces

English is the working language, so the Latin faces are chosen first and the
handwriting is chosen to match the reference: a marker hand for annotations, a
plain hand for notes, the existing mono for anything technical.

Persian is supported from the first release, not retrofitted. The informal
handwriting category does not really exist as a libre Persian face, so Persian
annotation text uses a clean face and takes its handwritten quality from ink
colour, stroke weight and rotation instead of from the letterforms. Anything
further — other scripts, other registers — is an option added later, and the
glyph-coverage checker already in the renderer is what decides whether a face
can actually carry a document.

All faces are vendored under a libre licence. Nothing is resolved from the
system: a page that renders differently on someone else's laptop is not much
use as a record.

### 4.4 A name collision, settled

`Notebook` currently means "a list of pages". The notebook in the brief —
covers, leaves, flips, an archive — is a much richer thing and should have the
name. The existing class is really a *sheaf*: an ordered set of pages sharing
defaults. It gets renamed. A one-line breaking change at version `0.0.1` is
cheaper than two things called Notebook forever.

## 5. The order

Everything in the brief gets built. The order is chosen so that each phase ends
with something usable, and so that nothing has to be built twice.

**Phase 1 · The look.** Paper grain, ruled and squared and dotted paper, image
frames (polaroid, taped, torn, keyline), the hand vocabulary (arrows, circles,
underlines, brackets, highlighter), handwriting faces, sticky notes with a real
curl. Pure, testable, no server. *Everything later draws through this, so it is
first: built afterwards, it would mean redrawing everything already built.*

**Phase 2 · The workspace.** The board document. `grimstroke serve`. The app
shell. Pan, zoom, select, move, undo. The store, autosave and crash recovery.
The patch API and the event stream. *This is the spine: after it, the product
exists and every later phase is something new on a board that already works.*

**Phase 3 · The tools on the board.** Sticky notes, text in a hand, pen and
highlighter as SVG paths, shapes and arrows, screenshots dropped in and framed,
screenshot-to-sticky, embedded pages, groups and alignment.

**Phase 4 · The notebook.** The book document, minimum leaves, adding leaves,
the 3D page flip and the riffle, the grid view with bulk selection and
reordering, cover customisation with stickers placed anywhere, the archive as a
library rather than a bin, and the 3D shelf.

**Phase 5 · The character.** The slot system, the drawn SVG art, tokenised
colour, a default face, and the studio. A figure is a document, so it can sit
on a board, sign a page, or be exported on its own.

**Phase 6 · Export and backup.** PNG, SVG and the print-based PDF. The
`.grimstroke` archive holding every workspace, notebook, character, asset and
setting. *The rule that keeps it honest: a feature is not finished until its
data is in the manifest, and a test asserts the round trip is lossless.*

**Phase 7 · Finish.** Search across everything including the archive.
Performance with two hundred screenshots on one board. Migrations. The security
surface. Print geometry. The agent's command reference, written the way the page
format was: the format is the API.

Each phase ends green — `pnpm check` passes, `pnpm look` has been run and
looked at — and visual work is verified by rendering it and looking at it, not
by reading the CSS.

## 6. Things the brief did not ask for and needs anyway

Listed because these are the ones discovered late, when they hurt:

1. **Undo.** A tool a person edits by hand without undo is one they stop
   trusting after the first accident.
2. **Search.** An archive you cannot search is a drawer.
3. **Right-to-left everywhere.** The page renderer mirrors correctly today; the
   board, the shelf and the studio must too. The plate rule extends: image
   space has no reading direction, so a board's items never mirror.
4. **Determinism on the new surfaces.** Seeded look is why a page can be
   re-exported a year later unchanged. Boards and books need the same guarantee.
5. **Conflict.** Two writers on one document. Last-write-wins per item is
   probably enough, but it is a decision, not an accident.
6. **Asset lifetime.** Screenshots are big. Content-hashed storage,
   deduplicated, thumbnailed, with a stated rule for unreferenced assets.
7. **Reduced motion.** A page flip and a riffle are exactly what that setting
   exists for.
8. **Contrast on new surfaces.** The floors are enforced for pages today. A
   sticker on a cover and a skin tone against a palette need the same treatment,
   or the guarantee quietly stops being true.
9. **Licensing of the drawn art.** It is drawn here, so it ships under the
   repository's licence — said once, out loud, in `assets/`.
10. **A migration path.** Documents will change shape. A version field and a
    forward migration from the first release, not from the first breakage.
11. **Empty states.** A new workspace, an empty shelf, a notebook with one blank
    leaf. These are the first thing anyone sees and the last thing anyone builds.
12. **Offline.** The app is served from localhost and must work with no network
    at all — which means no CDN, no web font fetch, no telemetry. Already implied
    by the no-dependency rule; worth stating so nobody adds one.
