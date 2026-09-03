import { pathToFileURL } from 'node:url';

import {
  clearComments,
  clearGherkinComments,
  escapeRegExp,
  escaprRegExpForPureText,
  getFileContent,
  getMD5Id,
  getOSPath,
  getSortPrefix,
  getTextRange,
} from '../src/util';

describe('file utilities', () => {
  it('creates a language-server file URI', () => {
    const filePath = '/tmp/example feature.feature';
    expect(getOSPath(filePath)).toBe(pathToFileURL(filePath).toString());
  });

  it('reads existing files and safely handles missing files', () => {
    expect(getFileContent(__filename)).toContain('getFileContent');
    expect(getFileContent(__dirname + '/data/missing.file')).toBe('');
  });

  it('removes source comments while preserving line positions', () => {
    expect(clearComments('first\n// comment\nlast').split(/\r?\n/)).toEqual([
      'first',
      '',
      'last',
    ]);
  });
});

describe('text utilities', () => {
  it.each(["'''", '"""'])(
    'removes %s doc-string content and regular comments',
    (delimiter) => {
      const text = [
        'Given a step',
        delimiter,
        'hidden content',
        delimiter,
        '// hidden comment',
        'Then another step',
      ].join('\n');

      const lines = clearGherkinComments(text).split(/\r?\n/);
      expect(lines[0]).toBe('Given a step');
      expect(lines[2]).toBe('');
      expect(lines[4]).toBe('');
      expect(lines[5]).toBe('Then another step');
    }
  );

  it('creates stable ids and applies the documented regexp escaping behavior', () => {
    expect(getMD5Id('step')).toBe('2764ca9d34e90313978d044f27ae433b');
    expect(escapeRegExp('a.*')).toBe('a.*');
    expect(escaprRegExpForPureText('a.* / b')).toBe('a\\.\\* \\/ b');
  });

  it('finds a text range and returns an empty range when text is absent', () => {
    const file = __dirname + '/data/test.settings.json';
    expect(getTextRange(file, 'cucumberautocomplete.steps').start.line).toBe(1);
    expect(getTextRange(file, 'not present')).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    });
  });
});

describe('getSortPrefix', () => {
  const data = [
    { num: 0, res: 'ZZZZZ' },
    { num: 1, res: 'ZZZZY' },
    { num: 25, res: 'ZZZZA' },
    { num: 26, res: 'ZZZYZ' },
    { num: 676, res: 'ZZYZZ' },
    { num: 727, res: 'ZZYYA' },
  ];
  data.forEach((d) => {
    it(`should get "${d.res}" prefix from "${d.num}" string`, () => {
      expect(getSortPrefix(d.num, 5)).toStrictEqual(d.res);
    });
  });
});
