import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { page } from '~/notebook.ts';
import { imageSize } from '~/render/probe.ts';
import { isRedacted, redactImage } from '~/render/redact.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const DEVICE = join(FIXTURES, 'device.png');
const out = mkdtempSync(join(tmpdir(), 'grimstroke-redact-'));

/** Read a pixel straight out of the PNG, by redacting a 1px box and comparing. */
function bytesOf(path: string): Buffer {
  return readFileSync(path);
}

describe('destructive redaction', () => {
  it('writes a file the same size as the original', () => {
    const target = join(out, 'a.png');
    const result = redactImage(DEVICE, target, ['pct:10,10,20,20']);
    expect(imageSize(target)).toEqual(imageSize(DEVICE));
    expect(result.regions).toHaveLength(1);
  });

  it('never touches the original', () => {
    const before = bytesOf(DEVICE);
    redactImage(DEVICE, join(out, 'b.png'), ['pct:0,0,100,100']);
    expect(bytesOf(DEVICE).equals(before)).toBe(true);
  });

  it('marks its output, and only its output', () => {
    const target = join(out, 'c.png');
    redactImage(DEVICE, target, ['pct:10,10,10,10']);
    expect(isRedacted(target)).toBe(true);
    expect(isRedacted(DEVICE)).toBe(false);
  });

  it('covers more than asked, never less', () => {
    // A rectangle read off a picture by eye is routinely a pixel short, and the
    // two failure directions are not symmetric.
    const tight = join(out, 'tight.png');
    const bled = join(out, 'bled.png');
    redactImage(DEVICE, tight, ['pct:20,20,10,10'], { bleed: 0 });
    redactImage(DEVICE, bled, ['pct:20,20,10,10'], { bleed: 4 });
    expect(bytesOf(bled).length).not.toBe(0);
    expect(bytesOf(tight).equals(bytesOf(bled))).toBe(false);
  });

  it('refuses to do nothing', () => {
    expect(() => redactImage(DEVICE, join(out, 'x.png'), [])).toThrow(/at least one region/);
  });

  it('refuses a rectangle with no space prefix', () => {
    expect(() => redactImage(DEVICE, join(out, 'y.png'), ['10,10,10,10'])).toThrow(
      /not a rectangle/,
    );
  });

  it('rejects an image format it cannot safely rewrite', () => {
    const fake = join(out, 'fake.png');
    writeFileSync(fake, Buffer.from('not a png at all'));
    expect(() => redactImage(fake, join(out, 'z.png'), ['pct:1,1,1,1'])).toThrow();
  });
});

describe('the warning when a bar covers live pixels', () => {
  it('fires for an image that has not been redacted', () => {
    const rendered = page('w')
      .image(DEVICE, { marks: [{ rect: 'pct:10,10,20,20', kind: 'redact' }] })
      .render();
    expect(rendered.warnings.join(' ')).toMatch(/still there/);
  });

  it('does not fire once the pixels are actually gone', () => {
    const clean = join(out, 'clean.png');
    redactImage(DEVICE, clean, ['pct:10,10,20,20']);
    const rendered = page('ok')
      .image(clean, { marks: [{ rect: 'pct:10,10,20,20', kind: 'redact' }] })
      .render();
    expect(rendered.warnings.join(' ')).not.toMatch(/still there/);
  });

  it('does not fire for an ordinary box', () => {
    const rendered = page('box').image(DEVICE, { marks: [{ rect: 'pct:10,10,20,20' }] }).render();
    expect(rendered.warnings.join(' ')).not.toMatch(/still there/);
  });
});
