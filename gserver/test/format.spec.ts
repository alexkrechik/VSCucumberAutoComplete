import { format, clearText } from '../src/format';
import { getFileContent } from '../src/util';
import { expect } from 'chai';

const generalSettings = {
    cucumberautocomplete: {
        skipDocStringsFormat: true,
        formatConfOverride: {
            'But': 3,
            'And': 'asdasd',
            'SomeTestKey': 12,
            'Scenario Outline': 0,
        }
    }
};

const ruleSettings = {
    cucumberautocomplete: {}
}

describe('format', () => {
    [
        {name: 'general', settings: generalSettings},
        {name: 'rule', settings: ruleSettings}
    ].forEach(feature => {
        describe(`for ${feature.name} syntax`, () => {
            const before = getFileContent(`${__dirname}/data/features/before/${feature.name}.feature`);
            const beforeArr = before.split(/\r?\n/);
            const formatted = clearText(format('\t', before, feature.settings)).split(/\r?\n/);
            const after = getFileContent(`${__dirname}/data/features/after/${feature.name}.feature`).split(/\r?\n/);

            it(`should not change lines num`, () => expect(formatted.length).to.be.equal(after.length));
            beforeArr.forEach((l, i) => it(`should correctly format line ${i + 1}: "${l}"`, () =>
                expect(formatted[i]).to.be.equal(after[i])));
        });
    });
});
