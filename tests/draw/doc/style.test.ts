/**
 * The stylesheet is a template literal in a TypeScript file, and it is edited
 * by hand and by script. Both of those have broken it in ways that compiled
 * fine and rendered wrong.
 */

import { describe, expect, it } from 'vitest';
import { PIECES, STYLESHEET } from '~/draw/doc/style.ts';

/*
 * Every piece on its own, not only the assembled sections. The sheet is cut into files that
 * live beside what they style, and a piece that is broken on its own can be hidden inside a
 * section by a neighbour that happens to be broken the other way.
 */
const SECTIONS = PIECES;

describe('the stylesheet', () => {
  it('has every piece in it', () => {
    for (const [name, css] of Object.entries(SECTIONS)) {
      expect(css.trim().length, name).toBeGreaterThan(0);
      expect(STYLESHEET, name).toContain(css);
    }
  });

  it('has no backtick anywhere', () => {
    // Each piece is a template literal. A backtick cannot survive in one -- this can only
    // fail if a piece was built some other way -- but the sheet is also inlined into exported
    // SVG and a stray one there is a parse error in someone else's viewer.
    expect(STYLESHEET).not.toContain('`');
  });

  it('has balanced braces', () => {
    // A script once deleted the braces from a rule and left
    // `.book3d-stage transition: none;` behind. It compiled, it served, and
    // every rule after it in that block was silently discarded by the parser.
    for (const [name, css] of Object.entries(SECTIONS)) {
      const open = (css.match(/\{/g) ?? []).length;
      const close = (css.match(/\}/g) ?? []).length;
      expect(open, `${name} open vs close`).toBe(close);
    }
  });

  it('has no property outside a rule', () => {
    // The same failure seen from the other side: a declaration at the top
    // level of a block means a brace went missing somewhere above it.
    for (const [name, css] of Object.entries(SECTIONS)) {
      // Comments are stripped across the whole sheet first. Stripping them
      // line by line leaves the middle of a multi-line comment behind, and
      // prose with a colon in it then reads as a declaration.
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
      let depth = 0;
      for (const line of stripped.split('\n')) {
        const bare = line.trim();
        depth += (bare.match(/\{/g) ?? []).length - (bare.match(/\}/g) ?? []).length;
        if (depth === 0 && /^[a-z-]+\s*:/.test(bare) && !bare.startsWith('@')) {
          expect.fail(`${name}: declaration outside a rule -- ${bare}`);
        }
      }
    }
  });

  it('never leaves a selector without its braces', () => {
    // A script once stripped every brace inside an @media block. The braces still BALANCED,
    // because whole matched pairs went, so the balance check passed -- and every rule inside
    // was silently discarded by the parser.
    //
    // A line of CSS either closes (brace, semicolon or comma) or it is in the middle of a
    // value that spans lines, which is exactly when an opening bracket is still unclosed.
    // A selector stranded without its brace is neither.
    //
    // The first version of this check asked whether the LINE looked like a continuation, and
    // "starts with a dot" matched every class selector in the file -- so it passed the very
    // corruption it was written for. Depth is a fact; shape is a guess.
    for (const [name, css] of Object.entries(SECTIONS)) {
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
      let parens = 0;
      for (const line of stripped.split('\n')) {
        const bare = line.trim();
        const inValue = parens > 0;
        parens += (bare.match(/\(/g) ?? []).length - (bare.match(/\)/g) ?? []).length;
        if (bare === '' || inValue) continue;
        // A colon or an open bracket at the end means the value runs on.
        if (/[{};,:(]$/.test(bare)) continue;
        expect.fail(`${name}: line neither closes nor continues a value -- ${bare}`);
      }
      expect(parens, `${name} brackets`).toBe(0);
    }
  });

  it('never lifts content with a selector that outranks the chrome', () => {
    // `body.live > *` is more specific than a class, so it overrode
    // `position: fixed` on the tool tray and the page turner and laid both of
    // them out in the flow, full width, at whatever the offsets happened to
    // produce.
    expect(STYLESHEET).not.toMatch(/body\.[a-z-]+ > \*\s*\{[^}]*position/);
  });
});

describe('chrome classes', () => {
  it('defines each one exactly once', () => {
    /*
     * The chrome and the documents share one stylesheet, which is why every chrome class is
     * prefixed gs-. That prefix stops a chrome class inheriting from a DOCUMENT class of the
     * same name; it does nothing about a chrome class defined twice in two different
     * sections, which is the same bug with the same symptom.
     *
     * It has happened: the note settings panel introduced its own `.gs-swatch` a thousand
     * lines below the tray's `.gs-swatch`, whose `all: unset` wiped the tray swatch's colour
     * and its shape. The seven ink colours came out as seven white squares, and nothing
     * anywhere reported a problem.
     */
    const body = STYLESHEET.replace(/\/\*[\s\S]*?\*\//g, '');
    const seen = new Map<string, number>();
    for (const match of body.matchAll(/^(\.gs-[\w-]+)\s*\{/gm)) {
      const name = match[1] as string;
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }
    const twice = [...seen].filter(([, count]) => count > 1).map(([name]) => name);
    expect(twice).toEqual([]);
  });
});

describe('the turning leaf', () => {
  it('is given a long enough perspective to stay inside the book', () => {
    /*
     * A leaf pivots about the spine, so its outer edge swings a full leaf-width towards the
     * viewer and perspective scales it by P / (P - width). At 2400 a 790px page reached
     * 1030px mid-turn: the sheet swept up over the title bar and down past the page turner,
     * outside the book altogether. The number is a measurement, so it is guarded like one.
     */
    const perspective = /\.book \{[^}]*perspective:\s*(\d+)px/s.exec(STYLESHEET)?.[1];
    expect(perspective).toBeDefined();
    const p = Number(perspective);
    const leaf = 560;
    const page = 790;
    const board = 870;
    expect((p / (p - leaf)) * page).toBeLessThanOrEqual(board);
  });
});
