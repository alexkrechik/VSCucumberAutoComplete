import { format } from '../src/format';
import { getFileContent } from '../src/util';
import { Range, Position } from 'vscode-languageserver';

import { expect } from 'chai';

describe('format', () => {
    let after = getFileContent(__dirname + '/data/after.format.feature').split(/\r?\n/);
    let beforeU = getFileContent(__dirname + '/data/before.format.feature');
    let beforeUArr = beforeU.split(/\r?\n/);
    let range = Range.create(Position.create(0, 0),
        Position.create(beforeUArr.length - 1, beforeUArr[beforeUArr.length - 1].length));
    let before = format('\t', range, beforeU).split(/\r?\n/);
    it(`should not change lines num`, () => expect(before.length).to.be.equal(after.length));
    it(`should format before.format.feature file properly`, () => beforeUArr.forEach((l, i) =>
        expect(before[i]).to.be.equal(after[i])));
});