import { parseIssue } from '@core/box/issue.ts';
import { alike, chooseLabels, labelWords } from '@core/box/labels.ts';
import { describe, expect, it } from 'vitest';

describe('an issue read from a sentence', () => {
  it('takes the kind, the labels, the repository and the description out of the title', () => {
    const d = parseIssue(
      'bug: login button does nothing on safari, labels ui, mobile in aturzone/grimstroke description: tap it and nothing happens',
    );
    expect(d.title).toBe('Login button does nothing on safari');
    expect(d.type).toBe('bug');
    expect(d.labels).toEqual(['ui', 'mobile']);
    expect(d.repo).toBe('aturzone/grimstroke');
    expect(d.body).toBe('tap it and nothing happens');
  });

  it('reads a request in Persian', () => {
    const d = parseIssue(
      'یه ایشو بساز تایپ باگ لیبل فرانت روی ریپو grimstroke دکمه ورود در سافاری کار نمیکنه توضیحات: با آیفون تست شد',
    );
    expect(d.type).toBe('bug');
    expect(d.labels).toEqual(['فرانت']);
    expect(d.repo).toBe('grimstroke');
    expect(d.title).toContain('دکمه ورود');
    expect(d.body).toBe('با آیفون تست شد');
  });

  it('reads one in Russian', () => {
    const d = parseIssue('задача: обновить документацию, метки docs');
    expect(d.labels).toEqual(['docs']);
    expect(d.title.toLowerCase()).toContain('обновить документацию');
  });

  it('knows a kind from what is said when it is not named', () => {
    expect(parseIssue('the app crashes when I open settings').type).toBe('bug');
    expect(parseIssue('add support for dark mode').type).toBe('feature');
  });
});

describe("choosing a repository's labels", () => {
  const repo = [
    'type: bug',
    'kind/feature',
    '📖 documentation',
    'area/frontend',
    'P1',
    'mobile',
    'good first issue',
    'performance',
  ];

  it("folds a label's name into its words", () => {
    expect(labelWords('type: bug')).toBe('bug');
    expect(labelWords('📖 Documentation')).toBe('documentation');
    expect(labelWords('area/front-end')).toBe('front end');
    expect(alike('frontend', 'front end')).toBeGreaterThan(0.6);
  });

  it("puts on the kind's label and the areas the sentence speaks of", () => {
    const d = parseIssue('bug: the save button is very slow on the phone, urgent');
    const names = chooseLabels(d, repo).map((c) => c.name);
    expect(names).toContain('type: bug');
    expect(names).toContain('mobile');
    expect(names).toContain('performance');
    expect(names).toContain('P1');
    expect(names).not.toContain('kind/feature');
  });

  it('finds a label named outright, even in another language or near miss', () => {
    expect(
      chooseLabels(parseIssue('issue: x y z, label front-end'), repo).map((c) => c.name),
    ).toContain('area/frontend');
    expect(
      chooseLabels(parseIssue('یه ایشو: صفحه اصلی کند است لیبل موبایل'), repo).map((c) => c.name),
    ).toContain('mobile');
  });

  it('reads Persian for areas', () => {
    const names = chooseLabels(parseIssue('باگ: دکمه ذخیره روی گوشی خیلی کند است'), repo).map(
      (c) => c.name,
    );
    expect(names).toEqual(expect.arrayContaining(['type: bug', 'mobile', 'performance']));
  });

  it('gives nothing for a repository with no labels', () => {
    expect(chooseLabels(parseIssue('bug: it broke'), [])).toEqual([]);
  });
});
