/**
 * Everything there is, in one answer: `GET /api/capabilities`.
 *
 * An agent arriving at a workspace should not have to read the source to learn that a bookcase
 * can be walnut or that a page can be a Kanban. Every endpoint is listed with what it is for,
 * and every closed vocabulary -- woods, coats, templates, sticker marks -- comes from the same
 * constant the interface draws from, so this can never offer a choice the workspace refuses.
 * A test holds the endpoint list to the routes the server actually answers.
 */

import { MATERIALS, PAGE_SIZES, SHAPES } from '~/draw/doc/book/model.ts';
import { PROVIDERS } from '~/draw/doc/remote/model.ts';
import { BACKS, WOODS } from '~/draw/doc/shelf/model.ts';
import { PAPERS as RULINGS } from '~/draw/look/grid.ts';
import { PALETTES } from '~/draw/look/palette.ts';
import { DEFAULT_COLUMNS, TEMPLATES } from '~/draw/look/template.ts';
import { DECOR } from '~/draw/material/decor/art.ts';
import { COATS } from '~/draw/material/pet/art.ts';
import { ACCENTS, PAPERS as PHOTO_PAPERS } from '~/draw/material/profile/model.ts';
import { MARKS } from '~/draw/material/sticker/marks.ts';
import { PACKS } from '~/draw/material/sticker/packs.ts';

/** One line per route: `METHOD path` and what it does. */
export const ENDPOINTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  reading: {
    'GET /api/capabilities': 'this answer',
    'GET /api/boards': 'every board',
    'GET /api/state?board=<address>': 'a board or a page: its spec and markup',
    'GET /api/state?kind=book&id=<notebook>': 'a notebook',
    'GET /api/leaf?id=&index=': 'one leaf of a notebook, drawn',
    'GET /api/cover?id=': 'a notebook cover, drawn',
    'GET /api/search?q=': 'find words anywhere',
    'GET /api/events?kind=&id=': 'a server-sent event stream of changes to a surface',
    'GET /api/layout?board=': 'where everything on a page is, measured, and what overlaps',
  },
  writing: {
    'POST /api/patch':
      'change a board, a page ({ board, ops }) or a notebook ({ kind: "book", id, ops })',
    'POST /api/items/move': 'move items from one surface to another',
    'POST /api/write': 'flow blocks down a page and on across the next pages, measured',
    'POST /api/tidy': 'move apart what overlaps on a page',
    'POST /api/assets': 'upload a picture; answers with its src',
  },
  notebooks: {
    'GET /api/books': 'every notebook: id, title, pages, archived, repository',
    'POST /api/books': 'make a notebook { title }',
    'DELETE /api/books?id=': 'throw a notebook away (thirty days in the trash)',
    'POST /api/books/batch': 'archive, unarchive or delete several { ids, action }',
    'GET /api/trash': 'what is in the trash',
    'POST /api/trash/restore': 'bring one back { name } or { id }',
    'POST /api/export': 'a PNG, SVG or PDF of a board or pages',
  },
  bookcase: {
    'GET /api/shelf': 'the shelves, the archive and the trash',
    'POST /api/shelf': 'put the shelves in a new order { rows }',
    'POST /api/shelf/drop': 'put books or objects down { ids, to, row, x }',
    'GET /api/shelf/catalogue': 'woods, backs, objects and sticker packs',
    'POST /api/shelf/style': 'the wood and the back { wood?, back? }',
    'POST /api/shelf/decor': 'put an object on a shelf { decor, row, x }',
    'POST /api/shelf/remove': 'take an object away { id }',
    'POST /api/shelf/decal': 'stick a sticker on the bookcase, or move one',
    'DELETE /api/shelf/decal?id=': 'peel a sticker off the bookcase',
  },
  you: {
    'GET /api/profile': 'the profile',
    'POST /api/profile': 'change the profile',
    'POST /api/profile/place': 'put the profile card on a board or a page',
    'GET /api/pet': 'the pet, and every animal and coat',
    'POST /api/pet': 'change the pet { species?, coat?, name?, on? }',
    'GET /api/archive': 'a backup of everything, as one file',
    'POST /api/archive': 'restore from a backup',
  },
  repositories: {
    'GET /api/remote/keys': 'the services this computer has a key for (never the keys)',
    'POST /api/remote/keys': 'keep a key for a host { host, provider, token }',
    'DELETE /api/remote/keys?host=': 'forget a key',
    'POST /api/remote/keys/hook': 'a webhook secret for a host',
    'GET /api/remote/repos?host=&q=': 'the repositories a key can see',
    'POST /api/remote/connect': 'connect a notebook to a repository { book, provider, host, repo }',
    'POST /api/remote/disconnect': 'disconnect a notebook { book }',
    'GET /api/remote/list?board=&of=': 'issues, merge requests or commits of a page’s repository',
    'GET /api/remote/thread?board=&id=': 'an issue card’s description and every comment',
    'POST /api/remote/place':
      'put an issue, merge request, commit, pipeline or live list on a page',
    'POST /api/remote/refresh': 'bring the cards on a page up to date',
    'POST /api/remote/act': 'close, reopen, comment on, label or assign an issue',
    'POST /api/remote/create': 'open a new issue',
    'POST /api/remote/hook': 'where a service’s webhook is delivered',
    'POST /api/remote/device/start': 'begin signing in to GitHub from a browser',
    'POST /api/remote/device/poll': 'finish signing in to GitHub',
    'GET /api/remote/oauth/available': 'which services can be signed in to through the browser',
    'GET /api/remote/oauth/start': 'begin signing in through the browser',
    'GET /api/remote/oauth/callback': 'where the service sends the browser back',
  },
};

export function capabilities(): Record<string, unknown> {
  return {
    docs: ['docs/api.md', 'docs/writing.md'],
    endpoints: ENDPOINTS,
    vocabulary: {
      blocks: [
        'heading',
        'text',
        'label',
        'bullets',
        'table',
        'code',
        'quote',
        'image',
        'compare',
        'note',
        'profile',
        'stack',
        'divider',
        'spacer',
        'sticker',
        'remote',
      ],
      inkTools: ['pen', 'pencil', 'marker', 'highlighter'],
      palettes: PALETTES.map((p) => ({ id: p.id, label: p.label, dark: p.dark })),
      rulings: RULINGS,
      templates: TEMPLATES,
      trackerColumns: DEFAULT_COLUMNS,
      pageSizes: PAGE_SIZES,
      cover: { materials: MATERIALS, stickerShapes: SHAPES },
      stickerMarks: Object.keys(MARKS),
      stickerPacks: PACKS.map((p) => ({ id: p.id, label: p.label, count: p.items.length })),
      bookcase: {
        woods: WOODS,
        backs: BACKS,
        objects: DECOR.map((d) => ({ id: d.id, label: d.label })),
      },
      pet: {
        species: ['cat', 'dog'],
        coats: COATS.map((c) => ({ id: c.id, label: c.label, species: c.species })),
      },
      profile: { accents: ACCENTS, photoPapers: PHOTO_PAPERS },
      providers: PROVIDERS,
    },
    // What is kept only in a browser, and so is not on the API: nothing an agent needs.
    browserOnly: {
      'gs-remote-trust:<notebook>':
        'this browser was told once that changes from this notebook go to the service',
      undo: 'the undo history of a tab',
    },
  };
}
