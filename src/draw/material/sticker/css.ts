/**
 * Stickers: die-cut vinyl on paper. The white border is the shape grown outwards by offset
 * shadows, so it follows any outline; a harder, darker shadow under it lifts it off the page.
 */

export const STICKER = `/* ---- stickers ---- */
.dcut {
  display: block;
  width: 100%;
  line-height: 1;
  filter: drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff) drop-shadow(1.5px 2.5px 0 rgba(0, 0, 0, 0.28));
}
.dcut svg { display: block; width: 100%; height: auto; }
.dcut-emoji { text-align: center; container-type: inline-size; }
.dcut-emoji > span { display: block; font-size: 78cqw; line-height: 1.05; }
.dcut-stamp { container-type: inline-size; }
.dcut-words {
  display: block;
  padding: 0.18em 0.4em 0.1em;
  border: 0.12em solid var(--mark);
  border-radius: 0.14em;
  outline: 0.05em solid var(--mark);
  outline-offset: -0.28em;
  background: #fff;
  color: var(--mark);
  font-family: var(--marker-font);
  font-size: 26cqw;
  letter-spacing: 0.04em;
  text-align: center;
  white-space: nowrap;
  rotate: -4deg;
}
.sticker-block { margin: 0; }
:is(.board, .leaf-items) .item:has(> .sticker-block) { width: var(--sticker-size, 96px); }
.emoji-sticker {
  display: inline-block;
  padding: 0 0.05em;
  font-size: 1.15em;
  line-height: 1;
  vertical-align: -0.12em;
  filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff) drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.25));
}
.sticker-mark { display: block; }
`;
