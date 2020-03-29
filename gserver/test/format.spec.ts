import { format, clearText } from '../src/format';
import { getFileContent } from '../src/util';
import { expect } from 'chai';

const userSettings: any = {
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

describe('format', () => {
    [
        {name: 'general', settings: userSettings},
        {name: 'rule', settings: undefined}
    ].forEach(feature => {
        describe(`for ${feature.name} syntax`, () => {
            let after = getFileContent(`${__dirname}/data/features/after/${feature.name}.feature`).split(/\r?\n/);
            let beforeU = getFileContent(`${__dirname}/data/features/before/${feature.name}.feature`);
            let beforeUArr = beforeU.split(/\r?\n/);
            let before = clearText(format('\t', beforeU, feature.settings)).split(/\r?\n/);
            it(`should not change lines num`, () => expect(before.length).to.be.equal(after.length));
            beforeUArr.forEach((l, i) => it(`should correctly format line ${i + 1}: "${l}"`, () =>
                expect(before[i]).to.be.equal(after[i])));
        });
    });
});
