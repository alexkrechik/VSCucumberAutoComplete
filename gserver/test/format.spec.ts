import { format, clearText } from '../src/format';
import { Settings } from '../src/types';
import { getFileContent } from '../src/util';

// 'asdasd' as value of '#' in theory could be passed
// because not strong typing for theVsCode settings
const generalSettings = {
    skipDocStringsFormat: true,
    formatConfOverride: {
      But: 3,
      And: 'relativeUp',
      SomeTestKey: 12,
      'Scenario Outline': 0,
      '#': 'asdasd',
  },
} as any as Settings;

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
      const beforeArr = before.split(/\r?\n/);
      const formatted = clearText(format('\t', before, feature.settings)).split(
        /\r?\n/
      );
      const after = getFileContent(
        `${__dirname}/data/features/after/${feature.name}.feature`
      ).split(/\r?\n/);

      it('should not change lines num', () =>
        expect(formatted.length).toBe(after.length));
      beforeArr.forEach((l, i) =>
        it(`should correctly format line ${i + 1}: "${l}"`, () =>
          expect(formatted[i]).toBe(after[i]))
      );
    });
  });
});
