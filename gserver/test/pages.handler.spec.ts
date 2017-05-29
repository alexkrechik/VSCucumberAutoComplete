import PagesHandler from '../src/pages.handler';
import { expect } from 'chai';

let pagesSettings = {
    page: '/data/page.objects.js',
    page2: '/data/page.objects.java',
};
let pagesHandler = new PagesHandler(__dirname, pagesSettings);

describe('getPoMatch', () => {
    describe('diff input PO lines', () => {
        let diffStrings = [
            'var a = 1',
            'let a=1',
            'a: 1',
            'test.a = 1',
            'public a(){}'
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

describe('getElements', () => {
    it('should return all the elements if no parameters provided', () => {
        let res = pagesHandler.getElements();
        expect(res).to.have.length(2);
        expect(res[0].text === 'page');
    });
    it('should return page if provided', () => {
        let res = pagesHandler.getElements('page');
        expect(res['id']).to.contains('page');
        expect(res['text']).to.be.equals('page');
        expect(res['objects']).to.have.length(2);
    });
    it('should return page object if provided', () => {
        let res = pagesHandler.getElements('page', 'a');
        expect(res['id']).to.contains('pageObject');
        expect(res['text']).to.be.equals('a');
    });
    it('should return null if wrong page/page object provided', () => {
        expect(pagesHandler.getElements('page55')).to.be.null;
        expect(pagesHandler.getElements('page', 'x')).to.be.null;
        expect(pagesHandler.getElements('page2', 'a')).to.be.null;
    });
});


describe('populate', () => {
    it('should populate the elements after constructor call', () => {
        let elements = pagesHandler.getElements();
        expect(elements).to.have.length(2);
        expect(elements[0].objects).to.have.length(2);
        expect(elements[1].objects).to.have.length(1);
    });

    it('should not concat elements after repopulating', () => {
        pagesHandler.populate(__dirname, pagesSettings);
        let elements = pagesHandler.getElements();
        expect(elements).to.have.length(2);
        expect(elements[0].objects).to.have.length(2);
        expect(elements[1].objects).to.have.length(1);
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
        let pageObject3 = pagesHandler.getElements()[1].objects[0];
        expect(pageObject1.id).to.contains('pageObject');
        expect(pageObject1.id).to.not.be.equals(pageObject2.id);
        expect(pageObject1.text).to.be.equals('a');
        expect(pageObject1.def['uri']).to.contains('page.objects.js');
        expect(pageObject1.def['range'].start.line).to.be.equals(5);
        expect(pageObject2.id).to.contains('pageObject');
        expect(pageObject2.text).to.be.equals('b');
        expect(pageObject2.def['uri']).to.contains('page.objects.js');
        expect(pageObject2.def['range'].start.line).to.be.equals(6);
        expect(pageObject3.id).to.contains('pageObject');
        expect(pageObject3.text).to.be.equals('variable');
        expect(pageObject3.def['uri']).to.contains('page.objects.java');
        expect(pageObject3.def['range'].start.line).to.be.equals(1);
    });
});

describe('validate', () => {
    it('should not return Diagnostic for correct lines', () => {
        expect(pagesHandler.validate('When I click "page"."a" or "page2"."variable"', 2)).to.have.length(0);
    });
    it('should return correct Diagnostic for non-existent page', () => {
        let d = pagesHandler.validate('I use "pag"."a"', 2);
        expect(d).to.have.length(1);
        expect(d[0]).to.be.deep.equal({
            severity: 2,
            range:
            {
                start: { line: 2, character: 7 },
                end: { line: 2, character: 10 }
            },
            message: 'Was unable to find page "pag"',
            source: 'cucumberautocomplete'
        });
    });
    it('should return corrext Diagnostic for non-existent page object', () => {
        let d = pagesHandler.validate('I use "page"."c"', 2);
        expect(d).to.have.length(1);
        expect(d[0]).to.be.deep.equal({
            severity: 2,
            range:
            {
                start: { line: 2, character: 14 },
                end: { line: 2, character: 15 }
            },
            message: 'Was unable to find page object "c" for page "page"',
            source: 'cucumberautocomplete'
        });
    });
    it('it should return diagnostic for several same non-existent pages', () => {
        let d = pagesHandler.validate('I use "pag"."a" and "pag"."a"', 2);
        expect(d).to.have.length(2);
        expect(d[0].range.start.character).to.be.equal(7);
        expect(d[0].range.end.character).to.be.equal(10);
        expect(d[1].range.start.character).to.be.equal(21);
        expect(d[1].range.end.character).to.be.equal(24);
    });
    let invalidLines = [
          'When I click "page"." a"',
          'When I click "page "."a"',
          'When I click "".""',
          'When I click "page".""'
    ];
    invalidLines.forEach(l => {
        it(`should return diagnostic for "${l}" line`, () => {
            expect(pagesHandler.validate(l, 0)).to.have.length.above(0);
        });
    })
});

describe('getFeaturePosition', () => {
    it('should correctly determine feature line position', () => {
        let line = '  When I use use "page1"."object1" and "page2"."object2"';
        expect(pagesHandler.getFeaturePosition(line, 5)).to.be.null;
        expect(pagesHandler.getFeaturePosition(line, 18)).to.be.deep.equals({
            page: 'page1'
        });
        expect(pagesHandler.getFeaturePosition(line, 26)).to.be.deep.equals({
            page: 'page1',
            object: 'object1'
        });
        expect(pagesHandler.getFeaturePosition(line, 36)).to.be.null;
        expect(pagesHandler.getFeaturePosition(line, 41)).to.be.deep.equals({
            page: 'page2'
        });
        expect(pagesHandler.getFeaturePosition(line, 49)).to.be.deep.equals({
            page: 'page2',
            object: 'object2'
        });
    });
});

describe('getDefinition', () => {
    it('should correctly get page definition', () => {
        let line = 'When I use "page"."a"';
        let page = pagesHandler.getElements('page');
        expect(pagesHandler.getDefinition(line, 13)).to.be.deep.equals(page['def']);
    });
    it('should correctly get page object definition', () => {
        let line = 'When I use "page"."a"';
        let pageObject = pagesHandler.getElements('page', 'a');
        expect(pagesHandler.getDefinition(line, 20)).to.be.deep.equals(pageObject['def']);
    });
    it('should not return definition for wrong cases', () => {
        expect(pagesHandler.getDefinition('When I use "page"."a"', 2)).to.be.null;
        expect(pagesHandler.getDefinition('When I use "pagx"."a"', 13)).to.be.null;
        expect(pagesHandler.getDefinition('When I use "page"."e"', 20)).to.be.null;
        expect(pagesHandler.getDefinition('When I use "pagx"."a"', 20)).to.be.null;
    });
});

describe('getCompletion', () => {
    it('should return all the pages', () => {
        let line = 'When I use "';
        expect(pagesHandler.getCompletion(line, {character: 12, line: 2})).to.have.length(2);
    });
    it('should return correct page objects', () => {
        let page1Line = 'When I use "page"."a';
        let page2Line = 'When I use "page2"."';
        expect(pagesHandler.getCompletion(page1Line, {character: 21, line: 2})).to.have.length(2);
        expect(pagesHandler.getCompletion(page2Line, {character: 20, line: 2})).to.have.length(1);
    });
    it('should return usual string for stab=ndard page', () => {
       let line = 'When I use "".""';
       let pageCompletion = pagesHandler.getCompletion(line, {character: 12, line: 2})[0];
       expect(pageCompletion).to.not.have.property('insertText');
    });
    it('should return smart page if string ends with "', () => {
       let line = 'When I use ""';
       let pageCompletion = pagesHandler.getCompletion(line, {character: 12, line: 2})[0];
       expect(pageCompletion).to.have.property('insertText').that.is.equals('page".');
       expect(pageCompletion).to.have.property('command')
    });
    it('should return correct insertText for pageObject differs from string', () => {
        let poCompletion1 = pagesHandler.getCompletion('When I use "page"."', {character: 19, line: 2})[0];
        let poCompletion2 = pagesHandler.getCompletion('When I use "page".""', {character: 19, line: 2})[0];
        expect(poCompletion1).to.have.property('insertText').that.is.equals('a" ');
        expect(poCompletion2).to.have.property('insertText').that.is.equals('a');
    });
});
