import { format, clearText } from '../src/format';
import { Settings } from '../src/types';
import { getFileContent } from '../src/util';

const generalSettings: Settings = {
  steps: [],
  pages: {},
  skipDocStringsFormat: true,
  formatConfOverride: {
    But: 3,
    And: 'relativeUp',
    SomeTestKey: 12,
    'Scenario Outline:': 0,
    // 'asdasd' as value of '#' in theory could be passed
    // because not strong typing for theVsCode settings
    '#': 'asdasd' as any,
    Wenn: 2,
  },
};

const ruleSettings = {
  steps: [],
  pages: {},
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
});
