# Next round -- the list to plan from

Written at the end of the round that landed endless paper, the drawn profile, pages as boards,
the shut cover, the 3D shelf, stroke merging and the golden check (branch `workspace-studio`).
The user reviews this list, adds their own changes, and the next round plans all of it together.

## Waiting on the user

- **Lost pictures on the real board.** Against the backup `~/grimstroke-backup-2026-09-23.tgz`
  (board version 243), `~/.grimstroke/boards/workspace.json` is missing `shot-a`, `shot-b`,
  `photo-14-rljp4` (pictures) and `ink3` (a stroke), and every item has moved. Offer: merge those
  four back in from the backup without removing the newer `label-13-mxzlb` and `text-14-1x5io`.
  Do not touch the real data until the user says so.
- **Where git tokens live:** settings file readable only by the user (0600), or the system keyring.
- The user's own bug reports and changes from checking the running app.

## Proposed

1. **Git connection, step 1** (docs/git-plan.md): per-notebook connection dialog for the company
   GitLab (`gitlab.example.com`, self-hosted, API v4) and GitHub (reuse `gh auth token`); tokens
   never in notebooks or archives; live `issue` and `commit` cards from a pasted URL; read-only.
2. **Git, step 2:** a repository drawer in the page tray (search, drag issues onto a page); a live
   `query` card ("my open bugs"); ETag polling and push to open pages.
3. **Git, step 3:** acting on the remote from the notebook -- close/reopen by ticking, comment,
   create issue, labels, assignees -- with a confirmation and honest errors.
4. **Git, step 4 and on:** merge-request and pipeline cards, the "fixed it" flow (commit closes
   issue), a Kanban tracker page, Gitea/Forgejo, webhooks, OAuth device flow / PKCE.
5. **Stickers as a system:** a `sticker` block for boards and pages as well as covers; a sticker
   sheet in the tray and the cover editor (status stamps, arrows, stars, emoji); the GitHub,
   GitLab, Gitea and Forgejo marks in die-cut sticker style; `:emoji:` shortcodes as stickers.
6. **Undo that survives a reload:** keep each tab's undo stack in session storage, so a Backspace
   followed by a refresh is still recoverable.
7. **Smoother navigation:** move between board, shelf, notebook and page without a white flash
   (keep the top bar, crossfade the surface).
8. **Pages:** a page-size choice per notebook (A5, A4, square), a page template (grid, lined,
   dotted, cornell, kanban), and dragging items between the page and the board.
9. **Profile:** a mirror/symmetry guide and a light pencil sketch layer on the easel; an
   optional photo to trace over that is never stored.
10. **Performance on a real GPU:** measure in the user's own Firefox, not only headless, and the
    fit-view pan target of 60 fps.
11. **Full RTL pass** of the new surfaces (page editor, profile easel, shut cover, shelf captions)
    with Persian text, in Firefox, at all three sizes.
12. **Docs and release:** merge `workspace-studio` into `main` once the user is happy; the
    untracked `ink1.png`, `px1.png`, `px2.png` in the root are the user's and stay untouched.

## How to work (carried over)

- Test data is a copy (`GRIMSTROKE_HOME=<scratchpad>/work-data`, port 7788); the real
  workspace is `~/.grimstroke` on 7777.
- Rebuild AND restart the server after changes to `draw/`; it reads the renderer at start.
- Commit only on a green `pnpm check`, gated on its exit code.
- Firefox only for automation.
