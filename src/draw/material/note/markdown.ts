/**
 * A note's markdown, as HTML.
 *
 * The lexer is chevaletNote's, unchanged; this is the other half, written for a renderer that
 * produces strings rather than DOM nodes, because a note here is drawn by the server and by
 * the exporter, never in the browser. Every character of text passes through inline() -- the
 * one place escaping, technical marking and digit shaping happen -- so a hex colour in a note
 * is marked the way it is marked in a table, and nothing a note says is ever markup.
 *
 * Anything the lexer does not recognise stays as literal text, which is the right failure for
 * a note: you see what you typed rather than losing it.
 */

import { type Block, type Inline, type ListItem, lex } from '~/draw/material/note/md-lex.ts';
import { escapeHtml, inline } from '~/draw/type/text.ts';

export interface MarkdownOptions {
  digits?: string | undefined;
}

const SAFE = /^(https?:|mailto:)/i;

/** A link a click can safely follow, or nothing. A note never links to script. */
function safeHref(href: string): string | undefined {
  const trimmed = href.trim();
  return SAFE.test(trimmed) ? trimmed : undefined;
}

export function renderMarkdown(source: string, options: MarkdownOptions = {}): string {
  let blocks: Block[];
  try {
    blocks = lex(source);
  } catch {
    // A tokenizer failure must never cost someone their note.
    return `<p>${inline(source, options)}</p>`;
  }
  const state = { task: 0 };
  return blocks.map((b) => block(b, options, state)).join('');
}

function block(token: Block, o: MarkdownOptions, state: { task: number }): string {
  switch (token.type) {
    case 'heading': {
      // Notes are small; an h1 inside a 240px card is shouting. Everything shifts down two.
      const level = Math.min(6, token.depth + 2);
      return `<h${level} class="md-h">${runs(token.kids, o)}</h${level}>`;
    }
    case 'paragraph':
      return `<p>${runs(token.kids, o)}</p>`;
    case 'code':
      return `<pre class="md-pre"><code>${escapeHtml(token.text)}</code></pre>`;
    case 'hr':
      return '<hr class="md-hr">';
    case 'blockquote':
      return `<blockquote class="md-quote">${token.kids.map((k) => block(k, o, state)).join('')}</blockquote>`;
    case 'list': {
      const tag = token.ordered ? 'ol' : 'ul';
      const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
      return `<${tag} class="md-list"${start}>${token.items.map((i) => item(i, o, state)).join('')}</${tag}>`;
    }
  }
}

function item(entry: ListItem, o: MarkdownOptions, state: { task: number }): string {
  // A lone paragraph in a list item renders inline, so a one-line item does not carry a
  // paragraph's margins inside a small card.
  const body = entry.kids
    .map((child) =>
      child.type === 'paragraph' && entry.kids.length === 1
        ? runs(child.kids, o)
        : block(child, o, state),
    )
    .join('');
  if (entry.task === null) return `<li><span class="md-item">${body}</span></li>`;
  const index = state.task++;
  // A real checkbox, numbered in document order: the app ticks it by rewriting the source at
  // that index, so the rendered note stays a pure function of what was written.
  return (
    `<li class="md-task${entry.checked ? ' is-done' : ''}">` +
    `<input type="checkbox" class="md-check" data-gs="note-task" data-gs-index="${index}"` +
    `${entry.checked ? ' checked' : ''} aria-label="done" tabindex="-1">` +
    `<span class="md-item">${body}</span></li>`
  );
}

function runs(tokens: Inline[], o: MarkdownOptions): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
          return inline(token.text, o);
        case 'br':
          return '<br>';
        case 'code':
          return `<code>${escapeHtml(token.text)}</code>`;
        case 'strong':
          return `<strong>${runs(token.kids, o)}</strong>`;
        case 'em':
          return `<em>${runs(token.kids, o)}</em>`;
        case 'del':
          return `<del>${runs(token.kids, o)}</del>`;
        case 'link': {
          const href = safeHref(token.href);
          const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
          return href
            ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${title}>${runs(token.kids, o)}</a>`
            : runs(token.kids, o);
        }
        case 'image':
          // A note never fetches from anywhere: an image reference stays as the words it was.
          return `<span class="md-missing">${escapeHtml(token.raw)}</span>`;
      }
      return '';
    })
    .join('');
}

/**
 * Flip the nth task checkbox in the SOURCE text.
 *
 * Brought over from chevaletNote. Editing the markdown rather than the rendered DOM keeps the
 * source as the single truth -- the rendered note is always a pure function of it.
 */
export function toggleTaskInSource(source: string, index: number, checked: boolean): string {
  let seen = -1;
  return source
    .split('\n')
    .map((line) => {
      const m = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\].*)$/.exec(line);
      if (!m) return line;
      seen++;
      if (seen !== index) return line;
      return `${m[1]}${checked ? 'x' : ' '}${m[3]}`;
    })
    .join('\n');
}
