# Round 3 -- the plan

Every item below is also a GitHub issue on aturzone/grimstroke, under the milestone
**Round 3** (issues #24-#42), so nothing is dropped. Close each from its commit with
`Closes #N`. Each is done, tested in Firefox as a user and as an agent
(the API), and closed from its commit. Nineteen items: seven reported by the user (U1-U7), twelve
proposed (P1-P12). The order at the bottom is the order of work.

Working rules: test data is a copy (`GRIMSTROKE_HOME=<scratchpad>/work-data`, port 7788),
the real workspace is `~/.grimstroke` on 7777 and is never touched without asking; rebuild AND
restart the server after `draw/` changes; commit only on a green `pnpm check` gated on its exit
code; Firefox only; the golden check is updated only after reading the diff.

---

## U1 (#24) -- A note's pen cannot be put down  `bug`

**Seen:** a note's own pen (the Draw button on its toolbar) turns on, and pressing Draw again
does not turn it off; choosing the Select tool does not end it either. Escape and a press on the
empty board do. The user had to reload the page.
**Cause to confirm:** the toolbar press goes through the board's capturing pointerdown and the
note's action toggle in an order that re-enables it; `setTool('select')` skips `stopDrawing()`
because the pen itself calls `setTool('select')` when it starts.
**Do:** the Draw button is a true toggle; every exit ends it -- Draw again, Escape, any tray tool
including Select, a press anywhere else, selecting another item, opening the settings panel. The
note shows it is in pen mode (its toolbar pen pressed, a dashed edge, a "done" chip on the note)
so there is always a visible way out.
**Test:** Firefox script: each of the seven exits ends pen mode; drawing still works in between.

## U2 (#25) -- Editing a note opens a separate box  `bug` `look`

**Seen:** double-clicking a note opens a 240x120 textarea with a 2px accent outline -- red or blue
depending on the palette -- that reads as a second box over the note.
**Do:** edit in place. The words turn into editable text exactly where they are, in the same
font, size, colour and position; no outline, no background, the caret is the only sign besides a
faint ruled line under the current line. The note grows as it is typed into (up to its size, then
scrolls). Markdown source is shown while editing and rendered on leaving, as now.
**Test:** screenshot diff of a note before and during editing shows only the source text change;
no outline pixels; typing, Escape, Ctrl+Enter, formatting chords still work; RTL text.

## U3 (#26) -- Resize AND turn, everywhere  `enhancement`

**Seen:** single items can be turned, but several selected items or a group turn only one of
them, and cover stickers and the card on a cover are turned with sliders.
**Do:** one set of handles for everything that can be placed: board items, page items, a
multi-selection and a group (resize scales from the far corner, the turn grip turns all of them
about the selection's centre), cover stickers and the profile card on a cover. Shift snaps to 15
degrees; `[` and `]` turn the selection by 15 degrees, Alt for 1 degree; a rotation readout
while turning. Undo is one step per gesture.
**Test:** turn and resize a note, a picture, a stroke, a group, a mixed selection, a sticker and
a cover card, on the board and on a page; values on the server match what is on screen.

## U4 (#27) -- Opening a notebook is broken  `bug` `look`

**Seen:** the left page shows before the cover moves; halfway the cover's back shows its front
mirrored ("Wallet audit" reversed) because the endpaper face does not render in Firefox; then the
cover fades out as a translucent sheet over the left page.
**Do:** a real two-sided cover: a front face and an inside face (endpaper), each its own element
with `backface-visibility: hidden` inside a `preserve-3d` hinge. The spread stays hidden under the
cover until the cover passes 90 degrees, then the first leaf is revealed; the cover lands flat on
the left and becomes the inside of the front board, then settles into the spread with a page
shadow sweeping across. A soft shadow moves with the lifting board. Reduced motion: a crossfade.
**Test:** frames at 0/25/50/75/100% of the opening show no mirrored text and no page before its
time, in LTR and RTL, desktop and phone.

## U5 (#28) -- A real bookshelf  `enhancement` `look`

**Seen:** the shelves are short and untidy and the books look like they float.
**Do:**
- A proper bookcase: full-width wooden shelves with depth, back panel and side walls; books stand
  **spine out, side by side**, touching, leaning naturally against each other or a bookend, with
  heights and thicknesses from the notebook itself (page count, size).
- Hover: the book slides a little out of the shelf. Click: it comes out towards the viewer as a
  **preview** in front of the bookcase -- cover, title, page count, last edited, whose it is,
  actions (open, cover, archive, delete). Open: the book opens with the opening animation (U4)
  and lands in the reading spread. The shut state lives only on the shelf, never in the page
  editor.
- **Rearrange by dragging**: pick a book up and drop it anywhere on any shelf; the others make
  room. A book dropped where it is not supported -- off the end of a shelf, in the middle of an
  empty stretch with nothing to lean on -- tips over and lies flat on the shelf, as a real one
  would. Order and position are saved (a shelf layout in the settings).
- **A shelf cat**: a pixel cat that walks along the shelves, sits, washes, sleeps on a flat book,
  and jumps between shelves. Find a CC0 sprite (OpenGameArt, itch.io with a verified CC0
  licence) and vendor it with its licence like the fonts; if none is clean, draw one. It never
  covers a control and pauses under reduced motion.
**Test:** screenshots at three sizes; drag a book between shelves and to an unsupported spot (it
falls flat); reload keeps the layout; the cat never blocks a click.

## U6 (#29) -- Delete notebooks, and manage several at once  `enhancement`

**Do:** permanent delete (with a confirmation that names the notebook and says it cannot be
undone; the file goes to a trash folder in the store for 30 days, recoverable from the CLI).
Multi-select on the shelf (Shift/Ctrl click, a checkbox in select mode, drag a marquee):
archive, unarchive, delete and move several together. API: `DELETE /api/books?id=`, and a batch
form; the CLI gains `grimstroke trash` and `grimstroke untrash`.
**Test:** delete one and several through the UI and the API; archive several; recover from trash.

## U7 (#30) -- The card goes on the cover from the cover editor  `enhancement`

**Seen:** the profile page has an "on a notebook" box with a dropdown and "use as cover".
**Do:** remove that box from the profile page. In the cover editor, "your card" places the
profile card on the cover as an object like a sticker: move it, resize it, turn it (U3), bring
it forward or back, remove it. Stored as a positioned card on the cover, by value, with an
"update to my current card" action.
**Test:** place, move, resize, turn and remove the card on a cover; the shelf and the spread show
it where it was put; old covers with a card keep it where it was.

---

## P1 (#31) -- Git connection, step 1: connect and read  `git`
Per-notebook connection dialog (sticker buttons: GitHub, GitLab, Gitea) for the company GitLab
(`gitlab.example.com`, self-hosted, API v4) and GitHub (reuse `gh auth token`). Tokens stored per
host in a `0600` settings file, never in a notebook, an archive or the browser (decision to
confirm with the user: file or keyring). Live `issue` and `commit` cards from a pasted URL,
read-only, snapshots kept for offline and exports. See docs/git-plan.md.

## P2 (#32) -- Git, step 2: the repository drawer  `git`
A drawer in the page editor's tray: search and filter issues, merge requests and commits, drag
them onto the page. A live `query` card ("open bugs assigned to me"). ETag polling of what is on
open pages, pushed over the event stream.

## P3 (#33) -- Git, step 3: act on the repository  `git`
Tick to close or reopen, comment from a card, create an issue, change labels and assignees --
each confirmed the first time, with the provider's own error shown on the card when it fails.

## P4 (#34) -- Git, step 4: merge requests, pipelines, the tracker  `git`
Merge-request and pipeline cards; the "fixed it" flow (a commit that closes an issue ticks it);
a Kanban tracker page whose columns are live queries; Gitea/Forgejo; webhooks; OAuth device flow
and PKCE.

## P5 (#35) -- Stickers as a system  `enhancement` `look`
A `sticker` block for boards and pages as well as covers, die-cut style; a sticker sheet in the
tray and the cover editor (status stamps, arrows, stars, emoji); the GitHub, GitLab, Gitea and
Forgejo marks in sticker style; `:emoji:` shortcodes in notes and issue bodies as stickers.

## P6 (#36) -- Undo that survives a reload  `enhancement`
Keep each tab's undo and redo stacks (the inverse operations) in session storage, keyed by
document and version, so a Backspace followed by a refresh is still one Ctrl+Z away.

## P7 (#37) -- Moving between surfaces without a flash  `look`
Board, shelf, notebook, page and profile change without a white flash: the top bar stays, the
surface crossfades (View Transitions where Firefox supports them, a prepared overlay otherwise).

## P8 (#38) -- Page sizes and templates  `enhancement`
A page size per notebook (A5, A4, square, index card), page templates (grid, lined, dotted,
Cornell, Kanban), and moving items between a page and the board (send to board / send to page).

## P9 (#39) -- A better easel  `enhancement`
A symmetry guide, a light sketch layer that can be hidden, and an optional photo to trace over
that is shown only while drawing and never stored.

## P10 (#40) -- Speed on a real GPU  `perf`
Measure in the user's own Firefox (not only headless software rendering) on the 200-item,
2000-stroke board; target 60 fps panning at fit; keep the harness in `tools/`.

## P11 (#41) -- A full right-to-left pass  `i18n`
Every new surface -- page editor, easel, shut cover and opening, the bookshelf and preview,
the cover editor -- with Persian text, in Firefox, at desktop, tablet and phone.

## P12 (#42) -- Release  `infra`
Merge `workspace-studio` into `main` when the user is happy; update the README and AGENTS.md; the
untracked `ink1.png`, `px1.png`, `px2.png` in the root are the user's and stay untouched. Also
waiting on the user: whether to restore the four items missing from the real board
(`shot-a`, `shot-b`, `photo-14-rljp4`, `ink3`) from `~/grimstroke-backup-2026-09-23.tgz`.

---

## Order of work

1. U1, U2, U4 -- the bugs the user hit.
2. U3 -- handles everywhere (U7 and P5 depend on it).
3. U7, then U6, then U5 -- the notebook side, ending with the bookshelf.
4. P6, P7 -- undo and navigation.
5. P8, P9, P5 -- pages, the easel, stickers.
6. P1, P2, P3, P4 -- the git connection, in its four steps.
7. P10, P11 -- measurement and the RTL pass over everything above.
8. P12 -- release.
