/**
 * Text on a page: escaping, technical marking and digit shaping.
 *
 * Everything a reader sees passes through inline(), which is the single place
 * any of it happens. That matters most for one rule: digits are shaped in prose
 * and never inside a technical token. A pass over the finished HTML -- the
 * obvious shortcut -- would rewrite the digits inside #F0B030 and inside a
 * wallet address, which is exactly the class of bug this tool exists to help
 * people report.
 */

/**
 * A run that must read left to right whatever surrounds it. Deliberately narrow:
 * a plain word needs no marking, and a bare number in prose is prose. What
 * actually breaks is neutrals next to digits -- #1E5AFF coming out as 1E5AFF#
 * inside Arabic-script text -- and slash- or dot-joined tokens.
 *
 * Order matters: alternation is first-match-wins, and the dotted branch would
 * otherwise take 1.02 out of 1.02:1 and split the ratio across two isolates.
 */
const TECHNICAL =
  /[A-Za-z][A-Za-z0-9+.-]*:\/\/\S+|[#$@][A-Za-z0-9_.-]+|\/[A-Za-z0-9_./-]+|[A-Za-z0-9_]+(?:[./:-][A-Za-z0-9_]+)+|[0-9a-fA-F]{12,}|[A-Za-z_]+[0-9]+[A-Za-z0-9_]*/g;

/** Trailing punctuation belongs to the sentence, not to the token. */
const TRAILING = new Set(['.', ',', ':', ';', ')', ']', '}', '\u060c', '\u061b', '\u06d4']);

const DIGITS: Record<string, string> = {
  latn: '0123456789',
  arab: '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669',
  arabext: '\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9',
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function shapeDigits(text: string, style: string | undefined): string {
  const target = DIGITS[style ?? 'latn'];
  if (!target || target === DIGITS.latn) return text;
  return text.replace(/[0-9]/g, (d) => target[Number(d)] ?? d);
}

export interface InlineOptions {
  /** Explicitly `| undefined`: exactOptionalPropertyTypes is on, and callers
   *  pass a value that may legitimately be absent. */
  digits?: string | undefined;
}

function markSegment(segment: string, digits: string | undefined): string {
  let out = '';
  let cursor = 0;
  TECHNICAL.lastIndex = 0;
  for (let match = TECHNICAL.exec(segment); match !== null; match = TECHNICAL.exec(segment)) {
    let token = match[0];
    let end = match.index + token.length;
    while (token.length > 0 && TRAILING.has(token.slice(-1))) {
      token = token.slice(0, -1);
      end -= 1;
    }
    if (token.length === 0) continue;
    out += shapeDigits(escapeHtml(segment.slice(cursor, match.index)), digits);
    out += `<code>${escapeHtml(token)}</code>`;
    cursor = end;
    TECHNICAL.lastIndex = end;
  }
  return out + shapeDigits(escapeHtml(segment.slice(cursor)), digits);
}

/**
 * Escape, mark technical runs as code, and shape digits everywhere else.
 *
 * Backticks are an explicit override, because the author always knows better
 * than the pattern does. The string is split on them first rather than stashed
 * behind sentinel characters: a sentinel that can appear in real input is a bug
 * waiting for the one document that contains it.
 */
export function inline(text: string, options: InlineOptions = {}): string {
  const parts = text.split('`');
  return parts
    .map((part, index) =>
      index % 2 === 1 ? `<code>${escapeHtml(part)}</code>` : markSegment(part, options.digits),
    )
    .join('');
}

/** A small label, uppercased only where that means something. */
export function label(text: string, uppercase: boolean): string {
  const escaped = escapeHtml(text);
  return uppercase ? escaped.toUpperCase() : escaped;
}
