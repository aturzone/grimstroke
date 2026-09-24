import { describe, expect, it } from 'vitest';
import { readProfile } from '~/draw/material/profile/model.ts';
import { cardNumber, renderPortrait, renderProfile } from '~/draw/material/profile/render.ts';

describe('the portrait', () => {
  it('draws each stroke as a path in a 3:4 frame', () => {
    const svg = renderPortrait({
      paper: '#dfe9f3',
      strokes: [
        { d: 'M0 0 L 10 10', colour: '#c0392b', weight: 4, tool: 'marker' },
        { d: 'M0 0 L 10 0 L 10 10 Z', tool: 'highlighter', fill: true },
      ],
    });
    expect(svg).toContain('viewBox="0 0 300 400"');
    expect(svg).toContain('class="pt-stroke tool-marker line"');
    expect(svg).toContain('class="pt-stroke tool-highlighter fill"');
    expect(svg).toContain('--stroke:#c0392b');
    expect(svg).toContain('fill:#dfe9f3');
    expect(svg).not.toContain('pt-empty');
  });

  it('says so when there is nothing drawn yet', () => {
    expect(renderPortrait(undefined)).toContain('no portrait yet');
    expect(renderPortrait({ strokes: [] }, '')).not.toContain('pt-empty');
  });

  it('escapes whatever it is handed', () => {
    const svg = renderPortrait({ strokes: [{ d: '"/><script>', colour: 'red;"><x' }] });
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('"><x');
  });
});

describe('the card', () => {
  it('carries the name, the role, the details and the drawing', () => {
    const html = renderProfile({
      name: 'Rio',
      role: 'design lead',
      details: [{ label: 'team', value: 'platform' }],
      portrait: { strokes: [{ d: 'M5 5 L 6 6' }] },
    });
    expect(html).toContain('Rio');
    expect(html).toContain('design lead');
    expect(html).toContain('platform');
    expect(html).toContain('M5 5 L 6 6');
    expect(html).toContain(`no. ${cardNumber('Rio')}`);
  });

  it('keeps its number, and writes the band in a colour that can be read on it', () => {
    expect(cardNumber('Rio')).toBe(cardNumber('Rio'));
    expect(renderProfile({ name: 'x', accent: '#ffd23f' })).toContain('--pf-on-accent:#14110e');
    expect(renderProfile({ name: 'x', accent: '#1f3fd0' })).toContain('--pf-on-accent:#fbf8f0');
  });
});

describe('reading a profile', () => {
  it('makes something usable of anything', () => {
    expect(readProfile(null)).toEqual({ name: 'me', accent: '#ff2e63', portrait: { strokes: [] } });
    expect(readProfile({ name: 4, details: [{ label: 1 }], portrait: { strokes: [{}] } })).toEqual({
      name: 'me',
      accent: '#ff2e63',
      portrait: { strokes: [] },
    });
  });
});

describe('the sketch layer', () => {
  it('is drawn on the easel and nowhere else', async () => {
    const { renderPortrait } = await import('~/draw/material/profile/render.ts');
    const portrait = {
      strokes: [{ d: 'M0,0 L10,10', sketch: true }, { d: 'M5,5 L20,20' }],
    };
    const card = renderPortrait(portrait);
    expect(card).not.toContain('M0,0 L10,10');
    expect(card).toContain('M5,5 L20,20');
    const easel = renderPortrait(portrait, '', true);
    expect(easel).toContain('pt-sketch');
    expect(easel).toContain('M0,0 L10,10');
  });
});
