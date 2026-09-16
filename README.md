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
```

## What it is for

Anything an agent has to hand back to a person and cannot say in a sentence. QA
findings are the obvious case — a bug is a picture with an argument attached —
but so are design reviews, migration reports, before-and-after comparisons,
anything with a screenshot and a claim about it.

It knows nothing about bugs, severities or reports. It draws pages.

## The blocks

`heading` · `text` · `bullets` · `table` · `code` · `quote` · `image` ·
`compare` · `note` · `divider` · `spacer`

`image` takes marks: a box, a numbered badge, a callout with a leader note, a
censor bar. `compare` puts two images side by side and copies the marks onto
both, which is what a before-and-after almost always wants.

## Two properties worth knowing

**`render()` never opens a browser.** It returns HTML and the list of files that
HTML references. An agent that already drives a browser can screenshot that
itself; Playwright is an optional peer, only needed by `exportPages`.

**A page always looks like itself.** Every generative mark — the tear of the
paper, the angle of the tape, the drift of a sticky note — is seeded from the
page id. Export it again next year and nothing moves.

## The look

Late-80s photocopied zine: Risograph flat spot inks, torn edges, tape, halftone,
thick keylines, hard shadows with zero blur. Eight palettes, or your own.
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
pnpm check   # typecheck, lint, test
pnpm look    # render every palette and every block, then LOOK at them
```

The look-sheet is the only instrument for problems that do not reduce to a
number. There is deliberately no image baseline: output is stable within one
browser build and changes with the next, so a baseline breaks on every upgrade
and teaches whoever maintains it to accept the new one unread.

## License

MPL-2.0. The vendored faces are SIL OFL 1.1 — see `assets/fonts`.
