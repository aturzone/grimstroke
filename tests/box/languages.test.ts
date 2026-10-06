/**
 * Repositories through the box in the lexicon's languages (src/box/lexicon.ts): an issue asked
 * for, read, labelled from the repository's own, and git asked of in their words.
 */

import { classify } from '@core/box/classify.ts';
import { understandGit } from '@core/box/git/understand.ts';
import { parseIssue } from '@core/box/issue.ts';
import { chooseLabels } from '@core/box/labels.ts';
import { describe, expect, it } from 'vitest';

const ref = new Date(2026, 9, 6, 9);
const kind = (s: string): string => classify(s, ref).intent.value;

const SENTENCES: Array<[string, string]> = [
  ['de', 'Fehler: Login funktioniert nicht auf Safari, label mobile im repository web'],
  ['fr', 'bogue : la recherche ne fonctionne pas, étiquette ui, dépôt web'],
  ['es', 'crea un issue: el botón guardar no funciona en el móvil, etiqueta mobile'],
  ['pt', 'crie uma issue: o login trava no iphone'],
  ['it', 'errore: la pagina si blocca sul telefono'],
  ['tr', 'hata: kaydet butonu çalışmıyor etiket mobile'],
  ['ar', 'خطأ: زر الحفظ لا يعمل وسم mobile'],
  ['zh', '错误: 保存按钮无法使用 标签 mobile'],
];

describe('an issue in eight more languages', () => {
  it.each(SENTENCES)('is an issue, and a bug, in %s', (_lang, s) => {
    expect(kind(s)).toBe('issue');
    const d = parseIssue(s);
    expect(d.type).toBe('bug');
    expect(d.title.length).toBeGreaterThan(4);
    expect(d.title).not.toMatch(/^(fehler|bogue|crea|crie|errore|hata|خطأ|错误)/i);
  });

  it('reads the labels and the repository the sentence names', () => {
    expect(parseIssue(SENTENCES[0]?.[1] as string)).toMatchObject({
      labels: ['mobile'],
      repo: 'web',
    });
    expect(parseIssue(SENTENCES[1]?.[1] as string)).toMatchObject({ labels: ['ui'], repo: 'web' });
  });

  it("chooses the repository's labels from what is said, in any of them", () => {
    const repo = ['type: bug', 'area/frontend', 'mobile', 'performance'];
    const names = (s: string) => chooseLabels(parseIssue(s), repo).map((c) => c.name);
    expect(names('Fehler: die Seite ist auf dem Handy sehr langsam')).toEqual(
      expect.arrayContaining(['type: bug', 'mobile', 'performance']),
    );
    expect(names('错误: 手机上页面很慢')).toEqual(
      expect.arrayContaining(['mobile', 'performance']),
    );
  });

  it('is understood by the git layer, lists of one’s own included', () => {
    expect(understandGit('ferme #12').action?.id).toBe('issue.close');
    expect(understandGit('kommentiere #3: erledigt').action?.id).toBe('issue.comment');
    const mine = understandGit('mis issues');
    expect(mine.action?.id).toBe('issue.list');
    expect(mine.slots.mine).toBe(true);
  });
});
