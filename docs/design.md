# The look, and which of it is negotiable

grimstroke draws one thing: a sheet of paper that came out of a photocopier.
Late-80s zine — Risograph flat spot inks, torn edges, tape, halftone, thick
keylines, hard shadows with zero blur.

Almost all of that is **style**. It is a choice, it can be argued with, and a
future palette or block may break it on purpose. Two things in it are
**correctness**: get them wrong and the page lies about what it is showing.
This document separates them, because the difference is invisible in a diff.

## Style

Negotiable. Change it if you have a reason, run `pnpm look`, and look.

- **Flat spot inks.** Every palette is three roles — `paper`, `ink`, `accent` —
  never a hue. A palette can invert (`carbon` does) and every mark still works,
  because nothing is drawn against a colour, only against a role.
- **Ink is never `#000`.** A photocopier never produces pure black, and pure
  black beside a fluorescent paper vibrates.
- **No sheen, at any angle, in any state.** Paper is matte. This has been got
  wrong once: a glossy highlight was added and read immediately as glass.
  Explicitly excluded: gradients, glassmorphism, Material elevation,
  neumorphism, and any shadow that blurs by even one pixel.
- **Torn edges and tape are generated, not drawn.** `draw/look/paper.ts` walks
  the perimeter and displaces each point inward along the edge normal. Corners
  are pinned: a perimeter left entirely free stops reading as a rectangle that
  was torn and starts reading as a blob.
- **Magnification is nearest-neighbour.** An honest enlargement invents no
  pixels, and it reads as a photocopier blow-up, which is on-register here.
- **Redaction is a censor bar, never a mosaic.** Pixelation is a digital
  artefact in a paper world, it *looks* reversible and invites the question,
  and for a short low-entropy string like a card number it is genuinely
  attackable.

## Correctness

Not negotiable. Each of these has already been got wrong once, and each failure
looked completely plausible on screen.

### 1. The plate is an LTR island

Image space has no reading direction. Marks are positioned with physical
`left`/`top` inside `.plate { direction: ltr }`.

Positioning them with logical properties sent every box to the far side of the
picture in a right-to-left page. The page still looked correct — a box, a badge,
a confident red rectangle — and it pointed at nothing. Chrome mirrors; the plate
never does.

The plate also shrink-wraps its image. As a block it stretched to fill the grid
cell, and since marks are percentages *of the plate*, boxes extended past the
picture onto empty paper.

### 2. Texture never touches the picture

Halftone and grain are chrome only. They sit below the plate in the stacking
order, and the plate opens its own stacking context above them.

Putting the texture above the plates laid dots across the screenshots. A page
must not alter the image it is showing: it is evidence, and a tool that
quietly re-renders evidence is worse than no tool. A test asserts the pixels
come out exactly as they went in.

There is a related trap in the shadow. It was a `::before` with a negative
`z-index` first, which is wrong: inside a stacking context an element's own
background paints *before* its negative-`z-index` descendants, so the shadow
covered the whole sheet and every page rendered ink on ink. It is a real
sibling element now.

## Measured, not judged

Two numbers are enforced rather than eyeballed, in `draw/look/`:

| what | floor | why |
|---|---|---|
| ink on paper | 4.5:1 | body text is real text, so WCAG AA applies |
| chip lettering | 3:1 | large and bold, so the large-text floor applies |

Chip lettering is **derived, never authored**: whichever of `paper` or `ink`
scores higher against that accent wins. A palette therefore cannot ship with
unreadable chips, whoever adds it.

A chip's *fill* is deliberately not held to a floor against the paper. Every
chip is enclosed by a keyline and the keyline carries the non-text contrast,
which is how riso and screen printing actually work: a hot flat ink inside a
hard outline.

## Determinism

Every generative mark — the tear of the paper, the angle of the tape, the drift
of a sticky note — is seeded from the page's own id. Re-export a page next year
and nothing moves.

This is why there is no image baseline in the test suite. Output is stable
within one browser build and changes with the next, so a baseline breaks on
every upgrade and teaches whoever maintains it to accept the new one unread —
which feels like coverage and is not. `pnpm look` exists instead, and it is
meant to be looked at.
