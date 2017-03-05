import StepsHandler from '../src/handlers/steps.handler';
import { expect } from 'chai';

let data = [
    __dirname + '/data/test.steps.js'
];
let s = new StepsHandler(data);

describe('constructor', function () {
    it('should correctly fill elements object', function () {
        expect(s.elements.length).to.be.equal(2);
    });
});

describe('populate', function () {
    it('should not create duplicates via populating', function () {
        s.populate(data);
        expect(s.elements.length).to.be.equal(2);
    });
});

describe('validate', function () {
    it('should not return diagnostic for correct lines', function () {
        expect(s.validate('When I do something', 1)).to.be.null;
        expect(s.validate('When I do another thing', 1)).to.be.null;
    });
    it('should not check non-Gherkin steps', function () {
        expect(s.validate('I do something else', 1)).to.be.null;
    });
    it('should return an diagnostic for wrong lines', function () {
        expect(s.validate('WhenI do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with Given', function () {
        expect(s.validate('Given I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with When', function () {
        expect(s.validate('When I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with Then', function () {
        expect(s.validate('Then I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with And', function () {
        expect(s.validate('And I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with But', function () {
        expect(s.validate('But I do something else', 1)).to.not.be.null;
    });
});

describe('getDefinition', function () {
    it('should return correct definition for any gherkin position', function () {
        let definition0 = s.getDefinition('When I do something', 0);
        let definition21 = s.getDefinition('When I do something', 21);
        expect(definition0).to.not.be.null;
        expect(definition21).to.not.be.null;
    });
    it('should not return definition for missing step', function () {
        let definition = s.getDefinition('When I do something else', 0);
        expect(definition).to.be.null;
    });

});

// describe('getCompletion', function () {
//     let completion1 = s.getCompletion();
// });
