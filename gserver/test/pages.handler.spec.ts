import PagesHandler from '../src/handlers/pages.handler';
import { expect } from 'chai';

let pagesSettings = {
    page: __dirname + '/data/page.objects.js'
};
let pagesHandler = new PagesHandler(pagesSettings);

describe('getPoMatch', () => {
    describe('diff input PO lines', () => {
        let diffStrings = [
            'var a = 1',
            'let a=1',
            'a: 1',
            'test.a = 1'
        ];
        diffStrings.forEach(l => {
            it(`should get "a" page object from "${l}" line`, () => {
                let match = pagesHandler.getPoMatch(l);
                expect(match).to.not.be.null;
                expect(match[1]).to.be.equals('a');
            });
        });
    });
    describe('non PO lines', () => {
        let nonPoLines = [
            'var a ? 1',
            'var a 1 =',
            '?a: 1'
        ];
        nonPoLines.forEach(l => {
            it(`should not get match from "${l}" string`, () => {
                let match = pagesHandler.getPoMatch(l);
                expect(match).to.be.null;
            });
        });
    });
});