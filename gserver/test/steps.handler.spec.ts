import StepsHandler from '../src/steps.handler';
import { expect } from 'chai';

let data = [
    '/data/test.steps.js'
];
let s = new StepsHandler(__dirname, data, '/data/test.feature');

describe('getMatch', () => {
    describe('gherkin strings types', () => {
        let strings = [
            `Given(/I do something/, function(){);`,
            `@Given('I do something')`,
            `@Given("I do something")`,
            `@Given /I do something/`,
            `Given(~'I do something');`
        ];
        strings.forEach(str => {
            it(`should parse "${str}" step string`, () => {
                let match = s.getMatch(str);
                expect(match).to.not.be.null;
                expect(match[4]).to.be.equal('I do something');
            });
        });
    });

    describe('all the gherkin words strings', () => {
        let gherkinWords = [
            `Given`,
            `When`,
            `Then`,
            `And`,
            `But`,
            `defineStep`
        ];
        gherkinWords.forEach(g => {
            it(`should parse "${g}(/I do something/" string with ${g} gherkin word`, () => {
                let match = s.getMatch(`${g}(/I do something/, function(){);`);
                expect(match).to.not.be.null;
                expect(match[4]).to.be.equal('I do something');
            });
        });
    });

    describe('non-standard strings', () => {
        let nonStandardStrings = [
            [`Given(/I do "aa" something/);`, `I do "aa" something`],
            [`When('I do \' something');`, `I do \' something`],
            [`    When('I do something');`, `I do something`],
            [`"Given(/^Me and "([^"]*)"$/, function ()"`, `^Me and "([^"]*)"$`]
        ];
        nonStandardStrings.forEach(str => {
            it(`should get "${str[1]}" step from "${str[0]}" string`, () => {
                let match = s.getMatch(str[0]);
                expect(match).to.not.be.null;
                expect(match[4]).to.be.equals(str[1]);
            });
        });
    });

    describe('invalid lines', () => {
        let inbvalidStrings = [
            `iGiven('I do something')`,
            `Giveni('I do something')`,
            `console.log("but i do 'Something'");`
        ];
        inbvalidStrings.forEach(str => {
            it(`should not parse "${str}" string`, () => {
                let match = s.getMatch(str);
                expect(match).to.be.null;
            });
        });
    });

    describe('gherkin words in the middle of lines', () => {
        let line = 'Then(/^I do Fast Sign in with "([^"]*)" and "([^"]*)"$/)do |email, pwd|';
        let match = '^I do Fast Sign in with "([^"]*)" and "([^"]*)"$';
        expect(s.getMatch(line)[4]).to.be.equals(match);
    });
});

describe('getStepInvariants', () => {
    it('should correctly handle or experssions', () => {
        const str = 'I do (a|b) and then I do (c|d)';
        const res = [
            'I do a and then I do c',
            'I do a and then I do d',
            'I do b and then I do c',
            'I do b and then I do d'
        ];
        expect(s.getStepTextInvariants(str)).to.deep.equal(res);
    });
});

describe('getRegTextForStep', () => {
    it('should remove ruby interpolation for regex', () => {
        let str = '^the (#{SOMETHING}) cannot work$';
        let res = '^the (.*) cannot work$';
        expect(s.getRegTextForStep(str)).to.be.equal(res);
    });
    it('should correctly handle built-in transforms', () => {
        let data = [
            ['I use {float}', 'I use -?\\d*\\.?\\d+'],
            ['I use {int}', 'I use -?\\d+'],
            ['I use {stringInDoubleQuotes}', 'I use "[^"]+"']
        ];
        data.forEach(d => {
            expect(s.getRegTextForStep(d[0])).to.be.equal(d[1]);
        });
    });
    it('should correctly handle cucumber expressions', () => {
        let data = [
            ['Test multiples: { cuke expression 1 } { cuke-expression-2 }', 'Test multiples: .* .*'],
            ['Test regex - braces: {.*}', 'Test regex - braces: .*'],
            ['Test regex - misc: (.*){3,4} (.*){,5}', 'Test regex - misc: (.*){3,4} (.*){,5}'],
            ['Test order: {first} {.*} (.*){6,7} (.*) (.*){,5} {last}', 'Test order: .* .* (.*){6,7} (.*) (.*){,5} .*'],
            ['I use \\{ some backslashed thing \\}', 'I use \\{ some backslashed thing \\}']
        ];
        data.forEach(d => {
            expect(s.getRegTextForStep(d[0])).to.be.equal(d[1]);
        });
    });
});

describe('constructor', () => {
    it('should correctly fill elements object', () => {
        let e = s.getElements();
        //Count of elements should be correct
        expect(e).to.have.length(4);
        //Each element 'count' propertyy should be correctly got from the feature file
        expect(e[0]).to.have.property('count', 2);
        expect(e[1]).to.have.property('count', 1);
        //Check all the properties of some element
        const firstElement = e[0];
        expect(firstElement).to.have.property('desc', 'this.When(/^I do something$/, function (next)');
        expect(firstElement).to.have.property('id', 'stepc0c243868293a93f35e3a05e2b844793');
        // TODO Can't check
        // expect(firstElement).to.have.property('reg', /^I do something$/);
        expect(firstElement).to.have.property('text', 'I do something');
        expect(firstElement.def).to.have.deep.property('range');
        expect(firstElement.def['uri']).to.have.string('test.steps.js');
        //Check correct duplicated steps
        expect(e[2]).to.have.property('text', 'I say a');
        expect(e[3]).to.have.property('text', 'I say b');
    });
});

describe('populate', () => {
    it('should not create duplicates via populating', () => {
        s.populate(__dirname, data);
        expect(s.getElements()).to.have.length(4);
    });
    it('should correctly recreate elements with their count using', () => {
        s.populate(__dirname, data);
        let e = s.getElements();
        expect(e[0]).to.have.property('count', 2);
        expect(e[1]).to.have.property('count', 1);
    });
});

describe('validateConfiguration', () => {
    it('should return correct Diagnostic for provided settings file', () => {
        let settings = [
            __dirname + '/../test/**/*.js',
            __dirname + '/../test/non/existent/path/*.js'
        ];
        let diagnostic = s.validateConfiguration('test/data/test.settings.json', settings, __dirname + '/..');
        expect(diagnostic).to.have.length(1);
        expect(diagnostic[0].range).to.be.deep.equal({
            start: { line: 3, character: 8 },
            end: { line: 3, character: 37 }
        });
    });
});

describe('validate', () => {
    it('should not return diagnostic for correct lines', () => {
        expect(s.validate('When I do something', 1)).to.be.null;
        expect(s.validate('    When I do something', 1)).to.be.null;
        expect(s.validate('When I do another thing', 1)).to.be.null;
        expect(s.validate('When I do something  ', 1)).to.be.null;
        expect(s.validate('When  I do something  ', 1)).to.be.null;
    });
    it('should not check non-Gherkin steps', () => {
        expect(s.validate('I do something else', 1)).to.be.null;
    });
    it('should return an diagnostic for lines beggining with Given', () => {
        expect(s.validate('Given I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with When', () => {
        expect(s.validate('When I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with Then', () => {
        expect(s.validate('Then I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with And', () => {
        expect(s.validate('And I do something else', 1)).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with But', () => {
        expect(s.validate('But I do something else', 1)).to.not.be.null;
    });
});

describe('getDefinition', () => {
    it('should return correct definition for any gherkin position', () => {
        let definition0 = s.getDefinition('When I do something', 0);
        let definition21 = s.getDefinition('When I do something', 21);
        expect(definition0).to.not.be.null;
        expect(definition21).to.not.be.null;
    });
    it('should not return definition for missing step', () => {
        let definition = s.getDefinition('When I do something else', 0);
        expect(definition).to.be.null;
    });
    it('should correctly handle spaces at the line beginning', () => {
        let definition = s.getDefinition('   When I do something', 0);
        expect(definition).to.not.be.null;
    });
});

describe('getCompletion', () => {
    it('should return all the variants found', () => {
        let completion = s.getCompletion(' When I do', { character: 10, line: 2 });
        expect(completion).to.have.length(4);
    });
    it('should correctly filter completion', () => {
        let completion = s.getCompletion(' When I do another th', { character: 14, line: 2 });
        expect(completion).to.have.length(1);
        expect(completion[0].label).to.be.equal('thing');
    });
    it('should not return completion for non-gherkin lines', () => {
        let completion = s.getCompletion('I do another th', { character: 14, line: 2 });
        expect(completion).to.be.null;
    });
    it('should not return completion for non-existing steps', () => {
        let completion = s.getCompletion('When non-existent step', { character: 14, line: 2 });
        expect(completion).to.be.null;
    });
    it('should return proper sortText', () => {
        let completion = s.getCompletion(' When I do', { character: 10, line: 2 });
        expect(completion[0].sortText).to.be.equals('ZZZZX_do something');
        expect(completion[1].sortText).to.be.equals('ZZZZY_do another thing');
    });
});
