# grimstroke, for an agent

You are working on **grimstroke**, a notebook for agents. It draws pages: a
screenshot with the wrong thing circled, the measured numbers beside it, a note
stuck on the corner.

It is a drawing tool and nothing else. It does not know what a bug is, what a
severity means, or what a report should contain. Every time it has been asked to
learn one of those, the right answer has been that the caller owns it.

## Orientation

```
src/art/        seeded randomness, torn paper, tape
src/theme/      the eight palettes, and the contrast rules that keep them honest
src/text/       escaping, technical marking, digit shaping
src/render/     page -> HTML. Pure. No browser, no network.
src/export/     HTML -> PNG, through Playwright, which is optional
src/notebook.ts the builder and the page model
```

## Before you change anything

```sh
pnpm check
```

## Three rules that are not style

**`render()` must stay pure.** No browser, no network, no clock. Snapshots of its
output are readable text, so a regression reads as
`padding-inline-start: 18px -> 20px` rather than a red blob, and a caller with
its own browser can use the HTML directly.

**The plate is an LTR island.** Image space has no reading direction. Marks are
positioned with physical `left`/`top` inside `.plate { direction: ltr }`. Using
logical properties there sent every box to the far side of the picture in a
right-to-left page — a plausible-looking and completely wrong result. Chrome
mirrors; the plate never does.

**Texture never touches the picture.** Halftone and grain are chrome only, below
the plate in the stacking order. A page must not alter the image it is showing,
and a test asserts the pixels come out exactly as they went in.

## When you change how it looks

```sh
pnpm look
```

Then look at the output. Every palette, every block, both directions. This is the
only check for the things that do not reduce to a number, and an agent that can
see images can do it itself.

## The house style

Comments explain **why**, and where there is one, the failure that produced the
rule. A bare imperative gets reverted by whoever finds it inconvenient; a rule
with a scar attached survives. Several of the comments in this repository name
the exact mistake they exist to prevent — keep that up.

No `any`. No `innerHTML` in anything that could take untrusted text. Single
quotes, two-space indent, 100 columns; Biome enforces all of it.
