import StepsHandler from '../src/steps.handler';
import { expect } from 'chai';

const settings = {
    cucumberautocomplete: {
        steps: ['/data/test.steps*.js'],
        syncfeatures: '/data/test.feature',
        smartSnippets: true,
        stepsInvariants: true,
        customParameters: [
            {
                parameter: '${dictionaryObject}',
                value: '([a-zA-Z0-9_-]+ dictionary|"[^"]*")'
            }
        ]
    }
};

const s = new StepsHandler(__dirname, settings);

describe('getMatch', () => {
    describe('gherkin strings types', () => {
        const strings = [
            `Given(/I do something/, function(){);`,
            `@Given('I do something')`,
            `@Given("I do something")`,
            `@Given /I do something/`,
            `Given(~'I do something');`,
            'Given(`I do something`);',
        ];
        strings.forEach(str => {
            it(`should parse "${str}" step string`, () => {
                const match = s.getMatch(str);
                expect(match).to.not.be.null;
                expect(match[4]).to.be.equal('I do something');
            });
        });
    });

    describe('all the gherkin words strings', () => {
        const gherkinWords = [
            `Given`,
            `When`,
            `Then`,
            `And`,
            `But`,
            `defineStep`
        ];
        gherkinWords.forEach(g => {
            it(`should parse "${g}(/I do something/" string with ${g} gherkin word`, () => {
                const match = s.getMatch(`${g}(/I do something/, function(){);`);
                expect(match).to.not.be.null;
                expect(match[4]).to.be.equal('I do something');
            });
        });
    });

    describe('non-standard strings', () => {
        const nonStandardStrings = [
            [`Given(/I do "aa" something/);`, `I do "aa" something`],
            [`When('I do \' something');`, `I do \' something`],
            [`    When('I do something');`, `I do something`],
            [`"Given(/^Me and "([^"]*)"$/, function ()"`, `^Me and "([^"]*)"$`]
        ];
        nonStandardStrings.forEach(str => {
            it(`should get "${str[1]}" step from "${str[0]}" string`, () => {
                const match = s.getMatch(str[0]);
                expect(match).to.not.be.null;
                expect(match[4]).to.be.equals(str[1]);
            });
        });
    });

    describe('invalid lines', () => {
        const inbvalidStrings = [
            `iGiven('I do something')`,
            `Giveni('I do something')`,
            `console.log("but i do 'Something'");`
        ];
        inbvalidStrings.forEach(str => {
            it(`should not parse "${str}" string`, () => {
                const match = s.getMatch(str);
                expect(match).to.be.null;
            });
        });
    });

    describe('gherkin words in the middle of lines', () => {
        const line = 'Then(/^I do Fast Sign in with "([^"]*)" and "([^"]*)"$/)do |email, pwd|';
        const match = '^I do Fast Sign in with "([^"]*)" and "([^"]*)"$';
        expect(s.getMatch(line)[4]).to.be.equals(match);
    });
});

describe('getStepInvariants', () => {
    it('should correctly handle or experssions', () => {
        const str = 'I do (a|b) and then I do (c|d|(?:e|f))';
        const res = [
            'I do a and then I do c',
            'I do a and then I do d',
            'I do a and then I do e',
            'I do a and then I do c',
            'I do a and then I do d',
            'I do a and then I do f',
            'I do b and then I do c',
            'I do b and then I do d',
            'I do b and then I do e',
            'I do b and then I do c',
            'I do b and then I do d',
            'I do b and then I do f'
        ];
        expect(s.getStepTextInvariants(str)).to.deep.equal(res);
    });
});

describe('handleCustomParameters', () => {
    it('should correctly change cucumber parameters', () => {
        const data = [
            ['I use ${dictionaryObject} and ${dictionaryObject}',
            'I use ([a-zA-Z0-9_-]+ dictionary|"[^"]*") and ([a-zA-Z0-9_-]+ dictionary|"[^"]*")']
        ];
        data.forEach(d => {
            expect(s.handleCustomParameters(d[0])).to.be.equal(d[1]);
        });
    });
});

describe('getRegTextForStep', () => {
    it('should remove ruby interpolation for regex', () => {
        const str = '^the (#{SOMETHING}) cannot work$';
        const res = '^the (.*) cannot work$';
        expect(s.getRegTextForStep(str)).to.be.equal(res);
    });
    it('should correctly handle built-in transforms', () => {
        const data = [
            ['I use {float}', 'I use -?\\d*\\.?\\d+'],
            ['I use {int}', 'I use -?\\d+'],
            ['I use {stringInDoubleQuotes}', 'I use "[^"]+"'],
            ['I use {string}', 'I use "[^"]+"']
        ];
        data.forEach(d => {
            expect(s.getRegTextForStep(d[0])).to.be.equal(d[1]);
        });
    });
    it('should correctly handle cucumber expressions', () => {
        const data = [
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

describe('getPartialRegParts', () => {
    const data = 'I do (a| ( b)) and (c | d) and "(.*)"$';
    const res = ['I', 'do', '(a| ( b))', 'and', '(c | d)', 'and', '"(.*)"$'];
    it (`should correctly parse "${data}" string into parts`, () => {
        expect(s.getPartialRegParts(data)).to.deep.equal(res);
    });
});

describe('constructor', () => {
    const e = s.getElements();
    it('should fill all the elements', () => {
        expect(e).to.have.length(5);
    });
    it('should correctly fill used steps counts', () => {
        expect(e[0]).to.have.property('count', 2);
        expect(e[1]).to.have.property('count', 1);
        expect(e[2]).to.have.property('count', 2);
        expect(e[3]).to.have.property('count', 1);
    });
    it('should correcly fill all the step element fields', () => {
        const firstElement = e[0];
        expect(firstElement).to.have.property('desc', 'this.When(/^I do something$/, function (next)');
        expect(firstElement).to.have.property('id', 'stepc0c243868293a93f35e3a05e2b844793');
        // TODO check
        // expect(firstElement).to.have.property('reg', /^I do something$/);
        expect(firstElement).to.have.property('text', 'I do something');
        expect(firstElement.def).to.have.deep.property('range');
        expect(firstElement.def['uri']).to.have.string('test.steps.js');
    });
    it('should set correct names to the invariants steps', () => {
        expect(e[2]).to.have.property('text', 'I say a');
        expect(e[3]).to.have.property('text', 'I say b');
    });
});

describe('populate', () => {
    it('should not create duplicates via populating', () => {
        s.populate(__dirname, settings.cucumberautocomplete.steps);
        expect(s.getElements()).to.have.length(5);
    });
    it('should correctly recreate elements with their count using', () => {
        s.populate(__dirname, settings.cucumberautocomplete.steps);
        const e = s.getElements();
        expect(e[0]).to.have.property('count', 2);
        expect(e[1]).to.have.property('count', 1);
    });
});

describe('validateConfiguration', () => {
    it('should return correct Diagnostic for provided settings file', () => {
        const settings = [
            __dirname + '/../test/**/*.js',
            __dirname + '/../test/non/existent/path/*.js'
        ];
        const diagnostic = s.validateConfiguration('test/data/test.settings.json', settings, __dirname + '/..');
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
        expect(s.validate('Non_gherkin_word do something else', 1)).to.be.null;
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
        const definition0 = s.getDefinition('When I do something', 0);
        const definition21 = s.getDefinition('When I do something', 21);
        expect(definition0).to.not.be.null;
        expect(definition21).to.not.be.null;
    });
    it('should not return definition for missing step', () => {
        const definition = s.getDefinition('When I do something else', 0);
        expect(definition).to.be.null;
    });
    it('should correctly handle spaces at the line beginning', () => {
        const definition = s.getDefinition('   When I do something', 0);
        expect(definition).to.not.be.null;
    });
});

describe('getCompletion', () => {
    it('should return all the variants found', () => {
        const completion = s.getCompletion(' When I do', { character: 10, line: 2 });
        expect(completion).to.have.length(5);
    });
    it('should correctly filter completion', () => {
        const completion = s.getCompletion(' When I do another th', { character: 14, line: 2 });
        expect(completion).to.have.length(1);
        expect(completion[0].label).to.be.equal('I do another thing');
        expect(completion[0].insertText).to.be.equal('thing');
    });
    it('should not return completion for non-gherkin lines', () => {
        const completion = s.getCompletion('I do another th', { character: 14, line: 2 });
        expect(completion).to.be.null;
    });
    it('should not return completion for non-existing steps', () => {
        const completion = s.getCompletion('When non-existent step', { character: 14, line: 2 });
        expect(completion).to.be.null;
    });
    it('should return proper sortText', () => {
        const completion = s.getCompletion(' When I do', { character: 10, line: 2 });
        expect(completion[0].sortText).to.be.equals('ZZZZX_I do something');
        expect(completion[1].sortText).to.be.equals('ZZZZY_I do another thing');
    });
});

describe('getCompletionInsertText', () => {
    const regExpText = 'I do [a-z]+ and \\w* thing';
    const pairs = [
        {step: '', prefix: 'I do ${1:} and ${2:} thing'},
        {step: 'I', prefix: 'do ${1:} and ${2:} thing'},
        {step: 'I do', prefix: '${1:} and ${2:} thing'},
        {step: 'I do aaa', prefix: 'and ${1:} thing'},
        {step: 'I do aaa and', prefix: '${1:} thing'},
        {step: 'I do aaa and bbb', prefix: 'thing'},
        {step: 'I thing', prefix: 'do ${1:} and ${2:} thing'},
    ];
    pairs.forEach(pair => {
        const {step, prefix} = pair;
        it(`should return "${prefix}" part for "${step}" step part`, () => {
            const res = s.getCompletionInsertText(regExpText, step);
            expect(res).to.be.equals(prefix);
        });
    });
});
