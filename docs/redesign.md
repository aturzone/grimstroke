# The redesign: a workspace that feels made, not assembled

grimstroke 0.2.0 does a great deal, and it shows its seams: every feature arrived with its own
idea of spacing, type and motion. This plan is about the whole thing feeling like one object --
calm when you are thinking, lively when you are doing, and never in the way.

It keeps what grimstroke is (docs/design.md): the paper is a photocopied zine -- flat spot inks,
torn edges, tape, hard shadows that never blur. What changes is everything around the paper.

## Principles

1. **Two materials, one hand.** The *paper* (pages, notes, pictures, stickers, the bookcase) is
   the zine: flat, inked, physical. The *tools* (bars, menus, the `/` island, settings) are quiet
   and exact, and step back. Every element is one or the other, and looks it.
2. **Everything that changes, moves; nothing moves for its own sake.** A thing arriving drops in, a
   thing leaving lifts off, a thing moved slides there, a choice made slides its highlight across.
   Motion says *what just happened* and then stops. Under 300 ms, transform and opacity only,
   off for reduced motion.
3. **Sound is touch, not music.** Paper sounds for paper, a tick for a tick, silence for reading.
   Never on a timer, never twice in a burst, always optional.
4. **Every surface explains itself.** An empty place says what goes in it; every control says what
   it does on hover; the first visit is a short, skippable walk-through.
5. **Measured, not guessed.** Every visual change is looked at, at phone and desktop sizes, in both
   directions, before it is kept -- and the layout audit keeps it that way.

## Phases

### 1. Motion that tells you what happened (tonight)
- Things slide to where they now are -- undo, redo, a tidy, an agent's move -- instead of jumping.
- Picking something up lifts it: the hard shadow grows and it rises a little; putting it down
  lands it.
- A choice slides its highlight: the tool in the tray, the place in the top bar, the section in
  settings, the tabs of a card.
- Selection handles and the selection bar grow out of the thing selected.
- Surfaces hand over to each other: board to page, shelf to notebook, a card placed from the bar
  flies from the island to its spot on the page.
- The bookcase reflows with motion when a book is set down or taken away.

### 2. Sound, rounded out
- A distinct sound per material: sticky note, picture, card, ink.
- Opening and closing a notebook; the drawer's cards; a repository card closing its issue.
- A volume curve that respects the system, and a "quiet hours" off switch in settings.

### 3. One type and spacing system
- A single scale for the tools (sizes, weights, line heights, a 4 px spacing grid), applied to
  every bar, menu, dialog and panel; the zine faces stay on the paper.
- The tools' default face becomes a clear sans; mono only where it means something (keys, code,
  numbers that must line up). Settings keeps the choice per section.
- Contrast checked for every token pair in light and dark papers.

### 4. The bars, decluttered
- The notebook's seven icon buttons become three groups (pages, the notebook, share) with labels.
- A single "more" menu pattern everywhere, with sections and shortcuts shown.
- The shelf's title counts what is on it: "1 in use · 5 archived".

### 5. Welcome and empty places
- A first-run walk-through (skippable, remembered): the board, `/`, notebooks, the bookcase,
  settings.
- Empty states with one clear action: an empty bookcase, an empty page, an empty board, no
  connections yet.

### 6. The notebook, finished
- The page in view is always obvious; a card placed on another page turns to it.
- Page thumbnails that fly into place when "every page" opens.

### 7. The pet and the bookcase
- Every pose reviewed against the Stardew-quality bar; the weak ones redrawn (side loaf, dog
  crouch/leap/land, Siamese mask, Dalmatian face).
- Books that lean and settle with a small physical wobble when set down.

## Where it stands (2026-09-28, morning)

- [x] 1. Things moved by anything but the hand slide there; picked-up things lift; choices slide
  their highlight; the selection bar grows in; a card flies from the island to its place; a page
  grows off the spread to be worked on and settles back into it; every page fans in; the bookcase
  reflows its books and objects; going between the board, the notebooks and the settings, the
  place's highlight slides over before the next surface fades up.
- [x] 2. A sound per material (note, sticker, picture, card, ink), notebook opening, repository
  tick, undo; settings for sound, volume, motion and quiet hours.
- [x] 3. The tools in a clear sans on a readable scale; faces per section in settings; the tools'
  inks measured on every palette by a test (it found Carbon's quiet ink at 3.6:1, now 4.7:1).
  Spacing: most values off the 4 px grid are there to answer the 1.5 px keyline, and stay.
- [x] 4. The notebook's bar in three; the shelf counts what is in use and archived; every button
  says what it does.
- [x] 5. A first-visit tour; empty places say what goes in them (the board, the bookcase, a bookcase with everything put away, the archive, connections, the trash).
- [x] 6. A card sent to another page is followed there; a rail on the turner shows where in the book you are, and "every page" marks the open ones.
- [x] 7. The pet's weak poses redrawn in two rounds (loaf, crouch/leap/land, sleep, Siamese mask and
  ears, Dalmatian face); a book set down rocks once on its foot.

## Done means
- `pnpm check` green (types, lint, 390+ tests, build, the layout audit at six sizes and two
  corner settings).
- Every phase looked at in Firefox at 390 and 1440 wide, LTR and RTL, and at corners 1 and 3.
- The user's verdict.
