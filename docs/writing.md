# Writing a good document, as an agent

You cannot see the page. You do not know how tall a paragraph turns out, whether a heading
wrapped, or whether the note you placed covers the table under it. Placing things by guessed
coordinates is how a page becomes a pile. So: let the workspace measure, then look.

This guide is the grid, the type, the tools and a worked example. The API itself is in
[api.md](api.md).

## The page

A notebook page is 560 x 790 px unless the notebook says otherwise (`pageSize`: `a4`
640 x 905, `square` 640 x 640, `index` 720 x 432). Its column is set at the margins:

| | |
|---|---|
| column starts at | x 40, y 44 |
| column width | page width - 80 (480 on A5) |
| usable height | page height - 44 - 64 (the foot keeps room for the folio) |

A board has no edge; lay things out on it in the same widths, and keep related things within
a screen of each other.

## The type

| block | use it for |
|---|---|
| `heading` level 1 | the title of a page or a section: one per page, at the top. It gets an accent bar. |
| `heading` level 2 | the parts of it |
| `text` | paragraphs. Markdown-free: say it plainly. |
| `bullets` | three to seven parallel points; longer lists are paragraphs |
| `table` | anything with columns: measurements, expected against actual, who owns what. First row is the head. |
| `code` | commands, requests, logs, with a `label` saying what it is |
| `quote` | a requirement or a message quoted exactly, with `cite` |
| `image` | the evidence: a screenshot with marks on it. Upload it with `POST /api/assets` first. |
| `note` | an aside that should stand out: a decision, a warning, a next step. One or two per page. |
| `sticker` | status at a glance: `done`, `blocked`, `wip`, `ship`, `review`, `bug`, or a service's mark |
| `label` | a short tag next to something placed |

Write for someone scanning: the heading says what the section found, the first sentence says
the rest.

## The tools

**Flow text into a notebook.** `POST /api/write` with `{ "book", "blocks": [...], "from"? }`
pours the blocks onto pages, one column per page, splitting where each page is full -- measured
in a headless browser with the same stylesheet the page is drawn with -- and never leaving a
heading alone at the foot of a page. It starts on the first empty page unless `from` names one,
and answers with the pages it wrote and an address to look at each.

- **Two columns.** `"columns": 2` sets each page as two columns with a 28px gutter, filling the
  first before the second. Good for long reference text; keep a report with pictures in one.
- **Figures.** A `table`, `code`, `compare` or `image` block may carry `"caption"` (a picture's
  own `image.caption` counts too). Figures are numbered in order -- "Figure 1. ..." -- and each is
  kept on the same page as its caption. The reply lists them with the page each landed on.
- **References.** Write `{ref: words}` in any text, bullet, quote, note or table cell, where the
  words are a heading's or a figure caption's -- or the start of exactly one. Once the pages are
  known it becomes "page 4", or "figure 2, page 5". Headings already in the notebook before
  `from` can be referred to as well. A reference to nothing becomes "page ?" and is named in the
  reply's `warnings`; fix it rather than leave it.

**See where things really are.** `GET /api/layout?board=<address>` answers with every item's
measured box, the pairs that overlap (ink over something is not counted -- that is annotation),
the items that run over a page's edge, and on a page the clear band left below everything
(`page.freeFrom`, `page.freeHeight`). Check it after placing anything by hand.

**Undo overlaps.** `POST /api/tidy` with `{ "board", "fix": "overlaps" }` measures the page and
slides whatever lies on something above it down clear of it, in reading order -- the fix for a
heading that wrapped onto the paragraph under it. On a page, a person has the same thing in the
page menu: "move apart what overlaps".

**Line things up.** `POST /api/tidy` with `{ "board", "ids", "as": "column" | "row" | "grid",
"gap"?, "at"?, "columns"? }` moves the items into a column, a row or a grid in the order given,
with even gaps, using their measured sizes.

**Look.** `POST /api/export` with `{ "board": "book:<id>:<page>" }` gives a PNG of a page. Look
at every page you wrote. A layout that is wrong is only found by looking.

Without Playwright installed, `write`, `layout` and `tidy` fall back to an estimate and say so
(`measured: false`); page breaks are then approximate, and looking matters more.

## A worked example: a bug report page

```sh
T=...   # the workspace token
B=http://127.0.0.1:7777
# 1. the notebook
curl -s -X POST $B/api/books -H "x-grimstroke-token: $T" -d '{"title":"Login audit"}'
# 2. the screenshot
curl -s -X POST "$B/api/assets?name=login.png" -H "x-grimstroke-token: $T" --data-binary @login.png
# 3. the words, flowed
curl -s -X POST $B/api/write -H "x-grimstroke-token: $T" -d '{
  "book": "login-audit",
  "blocks": [
    { "kind": "heading", "text": "The sign-in button disappears in dark mode" },
    { "kind": "text", "text": "Build 102 on Android 14. The button is drawn in the background colour." },
    { "kind": "table", "rows": [["", "expected", "measured"], ["contrast", "4.5:1", "1.02:1"]] },
    { "kind": "image", "image": { "src": "<path from step 2>", "marks": [{ "kind": "circle", "rect": "pct:40,60,20,10" }] } },
    { "kind": "note", "text": "**Blocks release.** Owner: design." },
    { "kind": "heading", "text": "Steps", "level": 2 },
    { "kind": "bullets", "items": ["Turn on dark mode", "Open the app", "Look at the sign-in screen"] }
  ]
}'
# 4. check, then look
curl -s "$B/api/layout?board=book:login-audit:1" -H "x-grimstroke-token: $T"
curl -s -X POST $B/api/export -H "x-grimstroke-token: $T" -d '{"board":"book:login-audit:1"}' -o page1.png
```

Then stick a status on it where it belongs -- `POST /api/patch` with a `sticker` item at a free
spot `layout` reported -- and, if the notebook is connected to a repository, put the issue on
the page as a card (`POST /api/remote/place`).

## Checklist

- One title per page; headings say what was found, not "Section 2".
- Evidence next to the claim: the screenshot beside the sentence that cites it.
- Tables for anything compared; no numbers buried in paragraphs.
- Every figure captioned, and pointed at with `{ref: ...}` from the text that relies on it.
- No `warnings` left in the reply to `write`.
- `layout` shows no overlaps and nothing outside the page.
- Every page looked at.
