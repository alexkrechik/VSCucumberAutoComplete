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

describe('populate', () => {
    it('should populate the elements after constructor call', () => {
        expect(pagesHandler.getElements()[0].objects.length).to.be.equal(2);
    });

    it('should not concat elements after repopulating', () => {
        pagesHandler.populate(pagesSettings);
        expect(pagesHandler.getElements()[0].objects.length).to.be.equal(2);
    });

    it('should correctly populate the page from file', () => {
        let page = pagesHandler.getElements()[0];
        expect(page.id).to.contains('page');
        expect(page.text).to.be.equals('page');
        expect(page.desc).to.contains('var a = 1');
        expect(page.def['uri']).to.contains('page.objects.js');
    });

    it('should correctly populate the page Objects from file', () => {
        let pageObject1 = pagesHandler.getElements()[0].objects[0];
        let pageObject2 = pagesHandler.getElements()[0].objects[1];
        expect(pageObject1.id).to.contains('pageObject');
        expect(pageObject2.id).to.contains('pageObject');
        expect(pageObject1.id).to.not.be.equals(pageObject2.id);
        expect(pageObject1.text).to.be.equals('a');
        expect(pageObject2.text).to.be.equals('b');
        expect(pageObject1.def['uri']).to.contains('page.objects.js');
        expect(pageObject2.def['uri']).to.contains('page.objects.js');
    });
});
