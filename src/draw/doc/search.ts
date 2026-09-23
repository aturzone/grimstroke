/**
 * Search across everything: boards, notebooks, the archive and the people in the studio.
 *
 * Pure. It is handed the documents and a query and returns what matched, where, and a piece
 * of the text around it -- so the server can run it over the store, the CLI can run it over a
 * backup file, and a test can run it over three objects with nothing started.
 *
 * An archive you cannot search is a drawer. The archived notebooks are searched exactly like
 * the ones in use, and said to be archived, because the archive is a library and a library is
 * where you go to find things.
 *
 * PERSIAN IS SEARCHED AS PERSIAN. Two keyboards produce two different characters for the
 * same letter -- Arabic yeh and kaf beside the Persian ones -- and a half-space may or may not
 * be typed between the parts of a word. Both the text and the query are folded the same way
 * before they are compared, so a search typed on either keyboard finds the words written on
 * the other.
 */

import type { BoardSpec } from '~/draw/doc/board/model.ts';
import type { BookSpec } from '~/draw/doc/book/model.ts';
import type { Profile } from '~/draw/material/profile/model.ts';
import { leafText, profileText, textOf } from '~/draw/material/read.ts';

export type HitKind = 'board' | 'notebook' | 'archive' | 'person';

/** A run of the snippet, marked when it is what matched. */
export interface Run {
  text: string;
  mark?: boolean;
}

export interface Hit {
  kind: HitKind;
  /** The document it is in. */
  doc: string;
  docTitle: string;
  /** What to call the thing that matched: the item, the page, the person. */
  title: string;
  snippet: Run[];
  /** Where it is, as a path the app can open. */
  href: string;
  score: number;
}

export interface Searchable {
  boards: readonly BoardSpec[];
  books: readonly BookSpec[];
  /** The workspace's one profile, if there is one. */
  profile?: Profile | undefined;
}

/**
 * Fold a string for comparison: case, accents, Arabic-script variants, digits and spacing.
 *
 * Every character maps to at most one character, and the index of each folded character in
 * the original is kept -- so a match found in the folded text can be marked in the text the
 * person actually wrote, however many diacritics and half-spaces were dropped on the way.
 */
export function fold(text: string): { folded: string; at: number[] } {
  let folded = '';
  const at: number[] = [];
  let spaced = true;
  for (let i = 0; i < text.length; i += 1) {
    let ch = (text[i] as string).toLowerCase();
    // Latin accents: an e with an accent is an e. NFD splits the mark off; the mark is dropped.
    const plain = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    ch = plain.length === 1 ? plain : ch;
    // Arabic-script diacritics and the tatweel carry no letter.
    if (/[\u064b-\u065f\u0670\u0640]/.test(ch)) continue;
    // One yeh, one kaf, one heh, whichever keyboard typed them.
    if (ch === '\u064a' || ch === '\u0649') ch = '\u06cc';
    else if (ch === '\u0643') ch = '\u06a9';
    else if (ch === '\u0629') ch = '\u0647';
    else if (/[\u0622\u0623\u0625]/.test(ch)) ch = '\u0627';
    // Persian and Arabic-Indic digits are digits.
    else if (/[\u06f0-\u06f9]/.test(ch)) ch = String(ch.charCodeAt(0) - 0x06f0);
    else if (/[\u0660-\u0669]/.test(ch)) ch = String(ch.charCodeAt(0) - 0x0660);
    // A half-space (zero-width non-joiner) is a space, and runs of space are one.
    if (ch === '\u200c' || /\s/.test(ch)) {
      if (spaced) continue;
      ch = ' ';
      spaced = true;
    } else {
      spaced = false;
    }
    folded += ch;
    at.push(i);
  }
  return { folded: folded.trimEnd(), at };
}

/** The words of a query, folded, longest first so a snippet centres on the rarest. */
export function terms(query: string): string[] {
  return [
    ...new Set(
      fold(query)
        .folded.split(' ')
        .filter((t) => t.length > 0),
    ),
  ].sort((a, b) => b.length - a.length);
}

const CONTEXT = 46;

/** A window of the text around the first term, with every term in it marked. */
function snippet(text: string, words: readonly string[]): Run[] {
  const { folded, at } = fold(text);
  const first = words.map((w) => folded.indexOf(w)).filter((i) => i >= 0);
  const centre = first.length ? Math.min(...first) : 0;
  const fromFolded = Math.max(0, centre - CONTEXT);
  const start = at[fromFolded] ?? 0;
  const endFolded = Math.min(folded.length, centre + CONTEXT * 2);
  const end = endFolded >= folded.length ? text.length : (at[endFolded] ?? text.length);

  // Mark every occurrence of every term inside the window, in original-text coordinates.
  const marks: Array<[number, number]> = [];
  for (const word of words) {
    let from = folded.indexOf(word, fromFolded);
    while (from >= 0 && from < endFolded) {
      const a = at[from] ?? 0;
      const b = (at[from + word.length - 1] ?? a) + 1;
      marks.push([a, b]);
      from = folded.indexOf(word, from + word.length);
    }
  }
  marks.sort((x, y) => x[0] - y[0]);
  const runs: Run[] = [];
  let cursor = start;
  if (start > 0) runs.push({ text: '… ' });
  for (const [a, b] of marks) {
    if (b <= cursor) continue;
    const from = Math.max(a, cursor);
    if (from > cursor) runs.push({ text: text.slice(cursor, from) });
    runs.push({ text: text.slice(from, b), mark: true });
    cursor = b;
  }
  if (cursor < end) runs.push({ text: text.slice(cursor, end) });
  if (end < text.length) runs.push({ text: ' …' });
  // Line breaks inside a snippet only waste its one line.
  return runs.map((run) => ({ ...run, text: run.text.replace(/\s+/g, ' ') }));
}

/** Does this text hold every word? And how well: a title beats a body, an exact run beats words. */
function score(text: string, words: readonly string[], phrase: string, weight: number): number {
  if (!text) return 0;
  const folded = fold(text).folded;
  for (const word of words) if (!folded.includes(word)) return 0;
  let s = weight;
  if (words.length > 1 && folded.includes(phrase)) s += weight;
  if (folded.startsWith(words[0] ?? '')) s += weight / 2;
  return s;
}

export function search(docs: Searchable, query: string, limit = 40): Hit[] {
  const words = terms(query);
  if (words.length === 0) return [];
  const phrase = fold(query).folded;
  const hits: Hit[] = [];
  const add = (hit: Omit<Hit, 'snippet'>, text: string): void => {
    hits.push({ ...hit, snippet: snippet(text, words) });
  };

  for (const board of docs.boards) {
    const docTitle = board.title ?? board.id;
    const boardScore = score(docTitle, words, phrase, 6);
    if (boardScore) {
      add(
        {
          kind: 'board',
          doc: board.id,
          docTitle,
          title: docTitle,
          href: `/?board=${encodeURIComponent(board.id)}`,
          score: boardScore,
        },
        docTitle,
      );
    }
    for (const item of board.items) {
      if (!item.block) continue;
      const parts = textOf(item.block).filter(Boolean);
      const text = parts.join(' — ');
      const s = score(text, words, phrase, 3);
      if (!s) continue;
      add(
        {
          kind: 'board',
          doc: board.id,
          docTitle,
          title:
            item.block.kind === 'note' && item.block.title ? item.block.title : item.block.kind,
          href: `/?board=${encodeURIComponent(board.id)}&focus=${encodeURIComponent(item.id)}`,
          score: s,
        },
        text,
      );
    }
  }

  for (const book of docs.books) {
    const kind: HitKind = book.archived ? 'archive' : 'notebook';
    const docTitle = book.title ?? book.id;
    const cover = [
      docTitle,
      book.cover?.title ?? '',
      book.cover?.spine ?? '',
      ...(book.tags ?? []),
      ...(book.cover?.stickers ?? []).map((s) => s.text ?? ''),
    ]
      .filter(Boolean)
      .join(' — ');
    const coverScore = score(cover, words, phrase, 5);
    if (coverScore) {
      add(
        {
          kind,
          doc: book.id,
          docTitle,
          title: 'the cover',
          href: `/book?id=${encodeURIComponent(book.id)}`,
          score: coverScore,
        },
        cover,
      );
    }
    book.leaves.forEach((leaf, index) => {
      const text = leafText(leaf).filter(Boolean).join(' — ');
      const s = score(text, words, phrase, 3);
      if (!s) return;
      add(
        {
          kind,
          doc: book.id,
          docTitle,
          title: `page ${index + 1}`,
          href: `/book?id=${encodeURIComponent(book.id)}&leaf=${index}`,
          score: s,
        },
        text,
      );
    });
  }

  if (docs.profile) {
    const text = profileText(docs.profile).filter(Boolean).join(' — ');
    const s = score(text, words, phrase, 4);
    if (s) {
      const name = docs.profile.name || 'me';
      add(
        { kind: 'person', doc: 'profile', docTitle: name, title: name, href: '/profile', score: s },
        text,
      );
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
