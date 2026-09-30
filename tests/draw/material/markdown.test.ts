import { describe, expect, it } from 'vitest';
import { renderMarkdown, toggleTaskInSource } from '~/draw/material/note/markdown.ts';

describe('a note in markdown', () => {
  it('renders the subset a note needs', () => {
    const html = renderMarkdown('# Findings\n**bold** and *soft*, `code`\n- one\n- two');
    expect(html).toContain('<h3 class="md-h">Findings</h3>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>soft</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul class="md-list"><li><span class="md-item">one</span></li>');
  });

  it('keeps every empty line the writer typed, and a single Enter is a new line', () => {
    expect(renderMarkdown('one\ntwo')).toBe('<p>one<br>two</p>');
    expect(renderMarkdown('one\n\ntwo')).toBe('<p>one</p><p>two</p>');
    expect(renderMarkdown('one\n\n\n\ntwo')).toBe('<p>one</p><p><br></p><p><br></p><p>two</p>');
    // Leading and trailing blank lines make no empty space.
    expect(renderMarkdown('\n\none\n\n\n')).toBe('<p>one</p>');
  });

  it('never lets what a note says become markup', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)> **<b>x</b>**');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;img');
  });

  it('follows only links a click can safely follow', () => {
    expect(renderMarkdown('[ok](https://example.com)')).toContain('href="https://example.com"');
    const bad = renderMarkdown('[no](javascript:alert(1))');
    expect(bad).not.toContain('href');
    expect(bad).toContain('no');
  });

  it('marks technical runs and shapes digits in prose, as everywhere else', () => {
    const html = renderMarkdown('ratio 12 on #4070F0', { digits: 'arabext' });
    expect(html).toContain('<code>#4070F0</code>');
    expect(html).toContain('۱۲');
  });

  it('numbers its checkboxes, and ticks them in the source', () => {
    const source = '- [ ] first\n- [x] second\n- [ ] third';
    const html = renderMarkdown(source);
    expect(html.match(/data-gs="note-task"/g)).toHaveLength(3);
    expect(html).toContain('data-gs-index="1" checked');
    expect(toggleTaskInSource(source, 2, true)).toBe('- [ ] first\n- [x] second\n- [x] third');
  });

  it('shows an image reference as the words it was, and fetches nothing', () => {
    expect(renderMarkdown('![shot](http://x/y.png)')).toContain('md-missing');
  });
});
