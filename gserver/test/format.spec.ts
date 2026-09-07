import { format, clearText, correctIndents, getIndent } from '../src/format';
import { getFileContent } from '../src/util';
import { defaultSettings } from './data/defaultSettings';

const generalSettings = {
  ...defaultSettings,
  skipDocStringsFormat: true,
  formatConfOverride: {
    But: 3,
    And: 'relativeUp',
    SomeTestKey: 12,
    'Scenario Outline:': 0,
    // As used could pass any value via the settings,
    // Check that it will not brake formatting in case of wrong value
    '#': 'asdasd' as any,
    // Also, check case with the wrong key
    Wenn: 2,
  },
};

const ruleSettings = {
  ...defaultSettings,
};

describe('format', () => {
  [
    { name: 'general', settings: generalSettings },
    { name: 'rule', settings: ruleSettings },
  ].forEach((feature) => {
    describe(`for ${feature.name} syntax`, () => {
      const before = getFileContent(
        `${__dirname}/data/features/before/${feature.name}.feature`
      );
      const formatted = clearText(format('\t', before, feature.settings)).split(
        /\r?\n/
      );
      const after = getFileContent(
        `${__dirname}/data/features/after/${feature.name}.feature`
      ).split(/\r?\n/);

      it('should not change lines num', () =>
        expect(formatted.length).toStrictEqual(after.length));
      formatted.forEach((l, i) =>
        it(`should correctly format line ${i + 1}: "${l}"`, () =>
          expect(formatted[i]).toStrictEqual(after[i]))
      );
    });
  });

  it('formats a feature without doc strings', () => {
    const feature = ['Feature: Plain feature', 'Scenario: Plain scenario'].join(
      '\n'
    );

    expect(format('  ', feature, defaultSettings)).toBe(
      ['Feature: Plain feature', '  Scenario: Plain scenario'].join('\r\n')
    );
  });

  it('uses nearby indentation when Rule has a relative override', () => {
    const settings = {
      ...defaultSettings,
      formatConfOverride: {
        'Rule:': 'relative' as const,
      },
    };
    const feature = [
      'Feature: Rule indentation',
      'Rule: Relative rule',
      'Scenario: Nested scenario',
    ].join('\n');

    expect(correctIndents(feature, '  ', settings)).toBe(
      [
        'Feature: Rule indentation',
        '  Rule: Relative rule',
        '  Scenario: Nested scenario',
      ].join('\r\n')
    );
  });
});

describe('getIndent', () => {
  it('uses the configured number of spaces', () => {
    expect(getIndent({ insertSpaces: true, tabSize: 3 })).toBe('   ');
  });

  it('uses a tab when spaces are disabled', () => {
    expect(getIndent({ insertSpaces: false, tabSize: 4 })).toBe('\t');
  });
});
