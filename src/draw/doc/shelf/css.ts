/**
 * The bookcase's stylesheet piece.
 *
 * Wood is gradients: a frame, a back of vertical boards in shadow, planks with a lit top and a
 * front edge, a top board and a plinth. Every length is in the bookcase's own pixels and the app
 * zooms the whole room to fit, so a book is placed in the same numbers model.ts worked out.
 */

export const BOOKCASE = `/* ---- the bookcase ---- */
.shelves {
  --wood: #7a5230;
  --wood-light: #a2703f;
  --wood-dark: #4a2f1a;
  --wood-back: #2e1f14;
  display: grid;
  justify-items: center;
  gap: 18px;
  padding: 40px 16px 80px;
  overflow-x: auto;
}
.is-live .shelves { padding-block-start: 96px; }
.case-room {
  position: relative;
  display: grid;
  gap: 64px;
  zoom: var(--case-scale, 1);
}
.bookcase {
  position: relative;
  width: calc(var(--shelf-width) + 56px);
  padding: 0 28px;
  /* The side walls: the frame's end grain, lit from the left. */
  background:
    linear-gradient(to right, var(--wood-light) 0 3px, var(--wood) 3px 25px, var(--wood-dark) 25px 28px,
      transparent 28px calc(100% - 28px),
      var(--wood-dark) calc(100% - 28px) calc(100% - 25px), var(--wood) calc(100% - 25px) calc(100% - 3px),
      var(--wood-dark) calc(100% - 3px));
  filter: drop-shadow(0 26px 30px rgba(0, 0, 0, 0.45));
}
.case-top {
  height: 30px;
  margin-inline: -44px;
  background:
    linear-gradient(to bottom, var(--wood-light) 0 3px, var(--wood) 3px 22px, var(--wood-dark) 22px);
  border-radius: 3px 3px 0 0;
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.35);
  position: relative;
  z-index: 3;
}
.case-plinth {
  height: 38px;
  margin-inline: -34px;
  background:
    linear-gradient(to bottom, var(--wood-light) 0 2px, var(--wood) 2px 12px, var(--wood-dark) 12px 32px,
      rgba(0, 0, 0, 0.5) 32px);
  clip-path: polygon(0 0, 100% 0, 100% 100%, calc(100% - 26px) 100%, calc(100% - 30px) 84%,
    30px 84%, 26px 100%, 0 100%);
}
/* The back: vertical boards, darker where the walls and each plank shade it. */
.case-body {
  position: relative;
  background:
    linear-gradient(to right, rgba(0, 0, 0, 0.55), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.55)),
    repeating-linear-gradient(to right, transparent 0 128px, rgba(0, 0, 0, 0.35) 128px 130px, rgba(255, 255, 255, 0.04) 130px 131px),
    linear-gradient(var(--wood-back), color-mix(in oklab, var(--wood-back) 80%, #000));
}
.case-empty {
  position: absolute;
  inset-inline: 12%;
  top: calc(var(--shelf-clear) * 0.34);
  z-index: 1;
  margin: 0;
  color: rgba(255, 244, 222, 0.62);
  font-family: var(--ui-font, system-ui, sans-serif);
  font-size: 17px;
  line-height: 1.45;
  text-align: center;
  text-wrap: balance;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
.case-shelf {
  position: relative;
  height: calc(var(--shelf-clear) + 26px);
}
.case-space {
  position: absolute;
  inset-inline: 0;
  top: 0;
  height: calc(var(--shelf-clear) + 6px);
}
/* The plank above throws a shadow down the back. */
.case-space::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  top: 0;
  height: 54px;
  background: linear-gradient(rgba(0, 0, 0, 0.55), transparent);
  pointer-events: none;
}
.case-plank {
  position: absolute;
  inset-inline: -2px;
  bottom: 0;
  height: 22px;
  z-index: 2;
  background: linear-gradient(to bottom, var(--wood-light) 0 2px, var(--wood) 2px 16px, var(--wood-dark) 16px);
  box-shadow: 0 7px 9px rgba(0, 0, 0, 0.4);
}
/* The plank's top, seen from a little above: what the books stand on. */
.case-plank-top {
  position: absolute;
  inset-inline: 0;
  bottom: 100%;
  height: 10px;
  background: linear-gradient(to bottom, color-mix(in oklab, var(--wood) 55%, #000), var(--wood));
}
.case-name {
  position: absolute;
  z-index: 4;
  top: 7px;
  left: 50%;
  translate: -50% 0;
  margin: 0;
}
.case-name span {
  display: block;
  padding: 2px 14px 1px;
  background: linear-gradient(#e6c27a, #b88a3e);
  color: #3a2410;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255, 255, 255, 0.25);
  font-family: var(--mono-font);
  font-size: 11px;
  letter-spacing: var(--label-tracking);
}
.case-trash {
  justify-self: end;
  width: min(100%, calc((var(--shelf-width) + 56px) * var(--case-scale, 1)));
  text-align: end;
  padding: 6px 0;
  border: 0;
  background: none;
  color: color-mix(in oklab, var(--paper) 70%, var(--desk));
  font-family: var(--mono-font);
  font-size: 12px;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}
.case-trash:hover { color: var(--paper); text-decoration: underline; }

/* ---- a spine ---- */
.spine {
  position: absolute;
  z-index: 1;
  left: var(--x);
  bottom: calc(var(--y) + 4px);
  width: var(--w);
  height: var(--h);
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  transform-origin: 0 100%;
  rotate: var(--lean, 0deg);
  cursor: grab;
  touch-action: none;
  transition: translate 260ms cubic-bezier(0.2, 0.8, 0.25, 1), filter 260ms linear;
}
.spine-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  overflow: hidden;
  border-radius: 3px 3px 1px 1px;
  background:
    linear-gradient(to right, rgba(0, 0, 0, 0.38), rgba(255, 255, 255, 0.14) 28%, rgba(255, 255, 255, 0) 56%, rgba(0, 0, 0, 0.3)),
    var(--cover);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3), 3px 0 4px rgba(0, 0, 0, 0.35);
  color: var(--cover-ink);
}
.spine-cloth .spine-face {
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0 1px, transparent 1px 3px),
    linear-gradient(to right, rgba(0, 0, 0, 0.38), rgba(255, 255, 255, 0.12) 28%, rgba(255, 255, 255, 0) 56%, rgba(0, 0, 0, 0.3)),
    var(--cover);
}
.spine-leather .spine-face {
  background:
    linear-gradient(to right, rgba(0, 0, 0, 0.45), rgba(255, 255, 255, 0.22) 30%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.4)),
    var(--grain, none),
    var(--cover);
  background-blend-mode: normal, soft-light, normal;
}
.spine-kraft .spine-face { background-image: var(--grain, none), linear-gradient(to right, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.25)); background-blend-mode: multiply; }
.spine-plastic .spine-face { box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.22), 3px 0 4px rgba(0, 0, 0, 0.35); }
.spine-band {
  flex: none;
  width: 100%;
  height: 4px;
  margin-block: 16px;
  border-block: 1px solid color-mix(in oklab, var(--cover-ink) 55%, transparent);
}
.spine-title {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  font-family: var(--marker-font);
  font-size: min(16px, calc(var(--w) * 0.46));
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
  writing-mode: vertical-rl;
  /* Read bottom to top, as a spine is on a European shelf. */
  rotate: 180deg;
}
/* A card on the cover shows on the spine as a small white label: this one is somebody's. */
.spine-owner {
  flex: none;
  width: 62%;
  height: 22px;
  margin-block-start: 8px;
  background: #f4efe2;
  border-radius: 1px;
  box-shadow: inset 0 -5px 0 color-mix(in oklab, var(--cover) 40%, #f4efe2);
}

/* Pointed at, it slides a little way out towards you. */
.is-live .spine:hover,
.is-live .spine:focus-visible { translate: 0 -12px; filter: brightness(1.08) drop-shadow(0 10px 8px rgba(0, 0, 0, 0.45)); z-index: 3; }
.spine:focus-visible { outline: 2.5px solid var(--paper); outline-offset: 3px; }
.spine[data-archived] .spine-face { filter: saturate(0.7) brightness(0.9); }

/* Lying down: the spine seen along the shelf, its title across. */
.spine[data-flat] { width: var(--h); height: var(--w); rotate: 0deg; }
.spine[data-flat] .spine-face { flex-direction: row; border-radius: 1px 3px 3px 1px; }
.spine[data-flat] .spine-face {
  background:
    linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.14) 30%, rgba(255, 255, 255, 0) 56%, rgba(0, 0, 0, 0.38)),
    var(--cover);
}
.spine[data-flat] .spine-band { width: 4px; height: 100%; margin-block: 0; margin-inline: 16px; border-block: 0; border-inline: 1px solid color-mix(in oklab, var(--cover-ink) 55%, transparent); }
.spine[data-flat] .spine-title { writing-mode: horizontal-tb; rotate: 0deg; align-self: center; font-size: min(16px, calc(var(--w) * 0.46)); }
.spine[data-flat] .spine-owner { width: 22px; height: 62%; margin: 0 8px 0 0; align-self: center; }
.is-live .spine[data-flat]:hover { translate: 0 -6px; }
/* Just fallen: it tips over from standing, hits the plank, and settles. */
.spine[data-fell] { animation: gs-fall 620ms cubic-bezier(0.55, 0, 0.9, 0.45) both; }
@keyframes gs-fall {
  0% { rotate: -90deg; }
  78% { rotate: 0deg; }
  88% { rotate: -4deg; }
  100% { rotate: 0deg; }
}

/* Chosen for doing something to several at once. */
.spine[data-selected] { z-index: 3; }
.spine[data-selected] .spine-face { outline: 3px solid var(--paper); outline-offset: 2px; }
.spine[data-selected]::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 8px;
  width: 18px;
  height: 18px;
  translate: -50% 0;
  rotate: calc(var(--lean, 0deg) * -1);
  border-radius: 50%;
  background: var(--paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='%2314110e' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 72% no-repeat;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
body[data-selecting] .spine:not([data-selected]) .spine-face { filter: brightness(0.82); }

/* While a book is carried: where it would go. */
.case-drop {
  position: absolute;
  z-index: 4;
  bottom: 4px;
  pointer-events: none;
}
.case-drop-in { width: 4px; height: 230px; margin-inline-start: -2px; background: var(--paper); border-radius: 2px; box-shadow: 0 0 12px var(--paper); }
.case-drop-flat { height: 34px; border: 2px dashed var(--paper); border-radius: 3px; background: rgba(255, 255, 255, 0.08); }
.case-shelf[data-over] .case-plank-top { background: color-mix(in oklab, var(--wood-light) 70%, var(--paper)); }
.spine.is-carried { visibility: hidden; }
.shelf-carry {
  position: fixed;
  z-index: 70;
  left: 0;
  top: 0;
  pointer-events: none;
  transform-origin: 50% 100%;
  filter: drop-shadow(0 18px 14px rgba(0, 0, 0, 0.5));
}
.shelf-carry .spine { position: relative; left: 0; bottom: 0; rotate: 4deg; cursor: grabbing; }

@media (prefers-reduced-motion: reduce) {
  .spine { transition: none; }
  .spine[data-fell] { animation: none; }
}

/* ---- your own bookcase: wood, back, objects, stickers ---- */
.case-room[data-wood='walnut'] { --wood: #5a3a24; --wood-light: #7e5537; --wood-dark: #3a2416; --wood-back: #241710; }
.case-room[data-wood='pine'] { --wood: #c79a5e; --wood-light: #e2bd84; --wood-dark: #9b733d; --wood-back: #5a4128; }
.case-room[data-wood='cherry'] { --wood: #8a3b26; --wood-light: #b0573b; --wood-dark: #5e2616; --wood-back: #34170f; }
.case-room[data-wood='ebony'] { --wood: #2c2622; --wood-light: #46403a; --wood-dark: #171310; --wood-back: #100d0b; }
.case-room[data-wood='white'] { --wood: #e8e3da; --wood-light: #fbf8f2; --wood-dark: #c4bcae; --wood-back: #d8d2c6; }
.case-room[data-wood='sage'] { --wood: #7f9a7a; --wood-light: #a3bd9d; --wood-dark: #5a7254; --wood-back: #3c4d39; }
.case-room[data-wood='navy'] { --wood: #2f4468; --wood-light: #4a628c; --wood-dark: #1d2c46; --wood-back: #141e30; }
.case-room[data-wood='blush'] { --wood: #d69a9a; --wood-light: #ecbcbc; --wood-dark: #a86e6e; --wood-back: #6e4646; }
.case-room[data-back='plain'] .case-body { background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.5)), var(--wood-back); }
.case-room[data-back='stripes'] .case-body { background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.5)), repeating-linear-gradient(90deg, #3b5a4a 0 18px, #486b59 18px 36px); }
.case-room[data-back='dots'] .case-body { background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.5)), radial-gradient(circle at 50% 50%, #e6c27a 0 2.5px, transparent 3px) 0 0 / 22px 22px, #2e3b5a; }
.case-room[data-back='floral'] .case-body { background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.5)), radial-gradient(circle at 25% 25%, #f0a0b4 0 4px, transparent 4.5px) 0 0 / 44px 44px, radial-gradient(circle at 75% 75%, #f6d08a 0 3px, transparent 3.5px) 0 0 / 44px 44px, radial-gradient(circle at 25% 75%, #8fbf7a 0 2px, transparent 2.5px) 0 0 / 44px 44px, #5c3f4c; }
.case-room[data-back='brick'] .case-body { background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.5)), linear-gradient(#5e2c20 2px, transparent 2px) 0 0 / 100% 24px, linear-gradient(90deg, #5e2c20 2px, transparent 2px) 0 0 / 56px 48px, linear-gradient(90deg, #5e2c20 2px, transparent 2px) 28px 24px / 56px 48px, #9a4a33; }
.case-room[data-back='cork'] .case-body { background: linear-gradient(to right, rgba(0, 0, 0, 0.45), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.45)), radial-gradient(circle, #9c7448 0 1px, transparent 1.5px) 0 0 / 7px 9px, radial-gradient(circle, #d7ac75 0 1px, transparent 1.5px) 3px 4px / 9px 7px, #b88a58; }
.case-room[data-back='stars'] .case-body { background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent 40px, transparent calc(100% - 40px), rgba(0, 0, 0, 0.5)), radial-gradient(circle, #fff6c8 0 1px, transparent 1.5px) 0 0 / 37px 41px, radial-gradient(circle, #cfe0ff 0 1px, transparent 1.5px) 17px 23px / 53px 47px, #151a33; }

.decor {
  position: absolute;
  z-index: 1;
  left: var(--x);
  bottom: calc(var(--y) + 4px);
  width: var(--w);
  height: var(--h);
  display: grid;
  place-items: end center;
  cursor: grab;
  touch-action: none;
}
.decor-art { display: block; image-rendering: pixelated; filter: drop-shadow(1px 2px 0 rgba(0, 0, 0, 0.35)); }
.decor-moves .decor-art { grid-area: 1 / 1; }
.decor-moves .decor-frame2 { animation: gs-decor-frame 1.2s steps(1) infinite; }
@keyframes gs-decor-frame { 0%, 49% { opacity: 0; } 50%, 100% { opacity: 1; } }
.is-live .decor:hover, .is-live .decor:focus-visible { translate: 0 -4px; outline: none; }
.case-room[data-wood='white'] .case-name span, .case-room[data-wood='blush'] .case-name span { color: #3a2410; }
.case-decals { position: absolute; inset: 30px 28px 38px; pointer-events: none; z-index: 0; }
.case-decal { position: absolute; width: var(--size); translate: -50% -50%; rotate: var(--tilt); pointer-events: auto; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .decor-moves .decor-frame2 { animation: none; } }
`;
