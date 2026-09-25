/**
 * The "/" bar: one rounded box over the board that grows into the card being typed.
 *
 * The look is the Shapeshift demo's on purpose -- white, quiet, a 28px shell, one blue -- because
 * the point of the bar is to get out of the way of what is being written.
 */

export const SHAPE_BAR = `/* ---- the shape bar ---- */
.ss-layer {
  --ss-bg: #ffffff;
  --ss-fg: #1a1a19;
  --ss-soft: #6f6d68;
  --ss-line: #e7e5e1;
  --ss-tile: #f3f2ef;
  --ss-brand: #3b5bdb;
  --ss-brand-soft: #eef1fd;
  position: fixed;
  inset: 0;
  z-index: 70;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, Estedad, sans-serif;
}
.ss-scrim { position: absolute; inset: 0; background: rgba(20, 20, 18, 0.18); animation: ss-fade 140ms ease-out; }
.ss-wrap {
  position: absolute;
  top: clamp(64px, 16vh, 180px);
  left: 50%;
  width: min(560px, calc(100vw - 32px));
  translate: -50% 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.ss-shell {
  overflow: hidden;
  border: 1px solid var(--ss-line);
  border-radius: calc(28px * var(--round, 1));
  background: var(--ss-bg);
  box-shadow: 0 1px 2px rgba(20, 20, 18, 0.06), 0 24px 60px -24px rgba(20, 20, 18, 0.45);
  outline: 4px solid transparent;
  transition: border-color 150ms ease-out, outline-color 150ms ease-out;
  animation: ss-rise 180ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.ss-shell:focus-within { border-color: var(--ss-brand); outline-color: var(--ss-brand-soft); }
.ss-line { display: flex; align-items: center; height: 72px; padding: 0 22px; }
.ss-input {
  width: 100%;
  border: 0;
  background: none;
  color: var(--ss-fg);
  font: inherit;
  font-size: 22px;
  font-weight: 450;
  letter-spacing: -0.01em;
  caret-color: var(--ss-brand);
  outline: none;
}
.ss-input::placeholder { color: #b3b1ab; }
.ss-card:empty { display: none; }
.ss-card { padding: 0 6px; animation: ss-card 220ms ease-out; }
.ss-card .sc { min-width: 0; border: 0; box-shadow: none; padding: 4px 16px 6px; }
.ss-card.is-ghost { opacity: 0.35; filter: grayscale(0.6); pointer-events: none; transition: opacity 200ms, filter 200ms; }
.ss-foot:empty { display: none; }
.ss-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 52px; padding: 6px 22px 16px; }
.ss-keys { display: inline-flex; align-items: center; gap: 6px; color: var(--ss-soft); font-size: 13px; font-weight: 500; }
.ss-add {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 0 14px;
  border: 0;
  border-radius: calc(999px * var(--round, 1));
  background: var(--ss-fg);
  color: var(--ss-bg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.ss-add span { opacity: 0.6; }
.ss-add:focus-visible { outline: 2px solid var(--ss-brand); outline-offset: 2px; }
.ss-chips { display: flex; justify-content: center; gap: 8px; min-height: 44px; padding-top: 12px; }
.ss-chips:empty { min-height: 12px; }
.ss-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  overflow: hidden;
  padding: 0 12px;
  border: 1px solid var(--ss-line);
  border-radius: calc(999px * var(--round, 1));
  background: var(--ss-bg);
  color: var(--ss-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  animation: ss-card 200ms ease-out;
}
.ss-chip.is-on { border-color: color-mix(in srgb, var(--ss-brand) 45%, transparent); }
.ss-chip-bar { position: absolute; inset: auto 0 0 0; height: 2px; background: var(--ss-brand); transform-origin: left; }
.ss-icon { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.ss-help { margin: 4px 0 0; color: rgba(255, 255, 255, 0.92); font-size: 13px; text-align: center; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45); }
.ss-help .gs-kbd { color: var(--ss-fg); }
.ss-layer.has-card .ss-help { visibility: hidden; }

.ss-palette {
  position: absolute;
  top: 84px;
  left: 50%;
  width: min(480px, 100%);
  translate: -50% 0;
  overflow: hidden;
  border: 1px solid var(--ss-line);
  border-radius: calc(20px * var(--round, 1));
  background: var(--ss-bg);
  box-shadow: 0 24px 60px -20px rgba(20, 20, 18, 0.45);
}
.ss-palette-head { padding: 8px; }
.ss-palette-search {
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: calc(12px * var(--round, 1) + var(--round-up, 0px) * 0.5);
  background: var(--ss-tile);
  color: var(--ss-fg);
  font: inherit;
  font-size: 14px;
  outline: none;
}
.ss-palette-list { max-height: min(420px, 56vh); margin: 0; padding: 0 8px 8px; overflow-y: auto; overscroll-behavior: contain; list-style: none; }
.ss-option { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 8px; border-radius: calc(14px * var(--round, 1) + var(--round-up, 0px) * 0.5); color: var(--ss-fg); cursor: pointer; }
.ss-option.is-on, .ss-option:hover { background: var(--ss-tile); }
.ss-option-tile { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border: 1px solid var(--ss-line); border-radius: calc(9px * var(--round, 1) + var(--round-up, 0px) * 0.5); background: var(--ss-bg); }
.ss-option b { width: 96px; flex: none; font-size: 14px; font-weight: 500; }
.ss-option-example { min-width: 0; overflow: hidden; color: var(--ss-soft); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.ss-empty { padding: 14px 8px; color: var(--ss-soft); font-size: 13px; }

@keyframes ss-fade { from { opacity: 0; } }
@keyframes ss-rise { from { opacity: 0; transform: translateY(6px) scale(0.99); } }
@keyframes ss-card { from { opacity: 0; transform: translateY(6px); filter: blur(3px); } }
@media (max-width: 520px) {
  .ss-line { height: 60px; padding: 0 18px; }
  .ss-input { font-size: 18px; }
  .ss-option b { width: 80px; }
}
@media (prefers-reduced-motion: reduce) {
  .ss-scrim, .ss-shell, .ss-card, .ss-chip { animation: none; }
}
`;
