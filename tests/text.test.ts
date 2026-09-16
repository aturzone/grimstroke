import { describe, expect, it } from 'vitest';
import { escapeHtml, inline, label, shapeDigits } from '~/text/inline.ts';

describe('inline text', () => {
  it('marks a hex colour so the stylesheet can isolate it', () => {
    // Without the isolation #1E5AFF renders as 1E5AFF# inside Arabic script.
    expect(inline('the button is #1E5AFF here')).toContain('<code>#1E5AFF</code>');
  });

  it('keeps a measured ratio whole', () => {
    expect(inline('ratio 1.02:1 measured')).toContain('<code>1.02:1</code>');
  });

  it('leaves trailing punctuation to the sentence', () => {
    // Swallowing it put the colon inside the isolate, which renders it on the
    // wrong side of the token in a right-to-left page.
    const out = inline('see report.md: it says so');
    expect(out).toContain('<code>report.md</code>:');
    expect(out).not.toContain('<code>report.md:</code>');
  });

  it('does not mark a bare number at all', () => {
    const out = inline('clause 2 says so');
    expect(out).toBe('clause 2 says so');
  });

  it('treats a bare number in prose as prose', () => {
    // Marking it technical would switch it to the mono face AND exempt it from
    // digit shaping, which is the opposite of what the rule is for.
    const out = inline('10 items were checked', { digits: 'arabext' });
    expect(out).not.toContain('<code>10</code>');
    expect(out).toContain('\u06f1\u06f0');
  });

  it('never shapes digits inside a technical token', () => {
    // Persian digits leaking into a deposit address is a real bug this tool
    // exists to help people report. It must not commit it.
    const out = inline('paid #F0B030 at 10:30', { digits: 'arabext' });
    expect(out).toContain('<code>#F0B030</code>');
    expect(out).not.toContain('#F\u06f0B\u06f0\u06f3\u06f0');
  });

  it('honours backticks over the pattern', () => {
    expect(inline('say `hello world` please')).toContain('<code>hello world</code>');
  });

  it('escapes markup wherever it appears', () => {
    expect(inline('<script>alert(1)</script>')).not.toContain('<script>');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('marks urls and paths', () => {
    expect(inline('see https://a.test/b now')).toContain('<code>https://a.test/b</code>');
    expect(inline('open /var/log/app now')).toContain('<code>/var/log/app</code>');
    expect(inline('file report.md there')).toContain('<code>report.md</code>');
  });

  it('shapes digits only when asked', () => {
    expect(shapeDigits('2026', undefined)).toBe('2026');
    expect(shapeDigits('2026', 'latn')).toBe('2026');
    expect(shapeDigits('2026', 'arabext')).toBe('\u06f2\u06f0\u06f2\u06f6');
    expect(shapeDigits('2026', 'arab')).toBe('\u0662\u0660\u0662\u0666');
  });

  it('uppercases a label only where that means something', () => {
    expect(label('measured', true)).toBe('MEASURED');
    expect(label('\u0627\u0646\u062f\u0627\u0632\u0647', false)).toBe(
      '\u0627\u0646\u062f\u0627\u0632\u0647',
    );
  });
});
