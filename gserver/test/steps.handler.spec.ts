import StepsHandler from '../src/steps.handler';
import { GherkinType } from '../src/gherkin';
import { expect } from 'chai';
import { getFileContent } from '../src/util';

const settings = {
    cucumberautocomplete: {
        steps: ['/data/steps/test.steps*.js'],
        syncfeatures: '/data/features/test.feature',
        smartSnippets: true,
        stepsInvariants: true,
        strictGherkinCompletion: true,
        customParameters: [
            {
                parameter: '${dictionaryObject}',
                value: '([a-zA-Z0-9_-]+ dictionary|"[^"]*")'
            },
            {
                parameter: /\{a.*\}/,
                value: 'aa'
            }
        ]
    }
};

const stepsDefinitionNum = 7;

const s = new StepsHandler(__dirname, settings);

describe('geStepDefinitionMatch', () => {
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
                const match = s.geStepDefinitionMatch(str);
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
            `defineStep`,
            `@Step`,
            `Step`,
            `*`
        ];
        gherkinWords.forEach(g => {
            it(`should parse "${g}(/I do something/" string with ${g} gherkin word`, () => {
                const match = s.geStepDefinitionMatch(`${g}(/I do something/, function(){);`);
                expect(match).to.not.be.null;
                expect(match[4]).to.be.equal('I do something');
            });
        });
    });

    describe('non-standard strings', () => {
        const nonStandardStrings = [
            [`Given(/I do "aa" something/);`, `I do "aa" something`],
            [String.raw`When('I do \' something');`, String.raw`I do \' something`], //String.raw needed to ensure escaped values can be read.
            [`  When('I do something');`, `I do something`],
            [`"Given(/^Me and "([^"]*)"$/, function ()"`, `^Me and "([^"]*)"$`],
            [`Given('the test cookie is set', () => cy.setCookie('TEST_COOKIE', 'true'));`, `the test cookie is set`]
        ];
        nonStandardStrings.forEach(str => {
            it(`should get "${str[1]}" step from "${str[0]}" string`, () => {
                const match = s.geStepDefinitionMatch(str[0]);
                expect(match).to.not.be.null;         
                expect(match[4]).to.be.toString();   
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
                const match = s.geStepDefinitionMatch(str);
                expect(match).to.be.null;
            });
        });
    });

    describe('gherkin words in the middle of lines', () => {
        const line = 'Then(/^I do Fast Sign in with "([^"]*)" and "([^"]*)"$/)do |email, pwd|';
        const match = '^I do Fast Sign in with "([^"]*)" and "([^"]*)"$';
        expect(s.geStepDefinitionMatch(line)[4]).to.be.equals(match);
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
            'I use ([a-zA-Z0-9_-]+ dictionary|"[^"]*") and ([a-zA-Z0-9_-]+ dictionary|"[^"]*")'],
            ['I use {aTest} parameter', 'I use aa parameter'],
            ['I use {bTest} parameter', 'I use {bTest} parameter'],
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
            ['I use {string}', 'I use (\"|\')[^\\1]*\\1'],
            ['I use {}', 'I use .*'],
            ['I have 1 cucumber(s) in my belly', 'I have 1 cucumber(s)? in my belly'],
            ['I have cucumbers in my belly/stomach', 'I have cucumbers in my (belly|stomach)'],
            ['I use {word}', 'I use [A-Za-z]+']
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
            ['I use \\{ some backslashed thing \\}', 'I use \\{ some backslashed thing \\}'],
            ['{parameter} in the beginning of the string', '.* in the beginning of the string']
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
        expect(e).to.have.length(stepsDefinitionNum);
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
        expect(firstElement).to.have.property('gherkin', GherkinType.When);
        expect(firstElement.reg.toString()).to.be.eq('/^I do something$/');
        expect(firstElement.partialReg.toString()).to.be.eq('/^(^I|$)( |$)(do|$)( |$)(something$|$)/');
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
        expect(s.getElements()).to.have.length(stepsDefinitionNum);
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

describe('Documentation parser', () => {
    const sDocumentation = new StepsHandler(__dirname, {
        cucumberautocomplete: {
            steps: ['/data/steps/test.documentation*.js'],
            customParameters: []
        },
    });

    it('should extract JSDOC properties when available', () => {
        expect(sDocumentation.elements.some(step => step.documentation === 'unstructured description')).to.be.true;
        expect(sDocumentation.elements.some(step => step.documentation === 'structured description')).to.be.true;
        expect(sDocumentation.elements.some(step => step.documentation === 'structured name')).to.be.true;
        expect(sDocumentation.elements.some(step => step.documentation === 'Overriding description')).to.be.true;
    });
});

describe('validate', () => {
    it('should not return diagnostic for correct lines', () => {
        expect(s.validate('When I do something', 1, '')).to.be.null;
        expect(s.validate('    When I do something', 1, '')).to.be.null;
        expect(s.validate('When I do another thing', 1, '')).to.be.null;
        expect(s.validate('When I do something  ', 1, '')).to.be.null;
        expect(s.validate('When  I do something  ', 1, '')).to.be.null;
    });
    it('should not return diagnostic for uncorresponding gherkin words lines', () => {
        expect(s.validate('Given I do something', 1, '')).to.be.null;
        expect(s.validate('When I do something', 1, '')).to.be.null;
        expect(s.validate('Then I do something', 1, '')).to.be.null;
        expect(s.validate('And I do something', 1, '')).to.be.null;
        expect(s.validate('But I do something', 1, '')).to.be.null;
    });
    it('should not check non-Gherkin steps', () => {
        expect(s.validate('Non_gherkin_word do something else', 1, '')).to.be.null;
    });
    it('should return an diagnostic for lines beggining with Given', () => {
        expect(s.validate('Given I do something else', 1, '')).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with When', () => {
        expect(s.validate('When I do something else', 1, '')).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with Then', () => {
        expect(s.validate('Then I do something else', 1, '')).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with And', () => {
        expect(s.validate('And I do something else', 1, '')).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with But', () => {
        expect(s.validate('But I do something else', 1, '')).to.not.be.null;
    });
    it('should return an diagnostic for lines beggining with *', () => {
        expect(s.validate('* I do something else', 1, '')).to.not.be.null;
    });
    it('should correctly handle outline steps', () => {
        const outlineFeature = getFileContent(__dirname + '/data/features/outlines.feature');
        expect(s.validate('When I test outline using "<number1>" variable', 1, outlineFeature)).to.be.null;
        expect(s.validate('When I test outline using <number2> variable', 1, outlineFeature)).to.be.null;
        expect(s.validate('When I test outline using <string1> variable', 1, outlineFeature)).to.not.be.null;
    });
    it('should correctly validate steps with incorrect gherkin word in case of strictGherkinValidation', () => {
        const strictGherkinHandler = new StepsHandler(__dirname, {
            cucumberautocomplete: {
                ...settings.cucumberautocomplete,
                strictGherkinValidation: true
            }
        });
        const testFeature = getFileContent(__dirname + '/data/features/test.feature');
        expect(strictGherkinHandler.validate('Given I do something', 12, testFeature)).to.not.be.null;
        expect(strictGherkinHandler.validate('When I do something', 12, testFeature)).to.be.null;
        expect(strictGherkinHandler.validate('Then I do something', 12, testFeature)).to.not.be.null;
        expect(strictGherkinHandler.validate('And I do something', 5, testFeature)).to.not.be.null;
        expect(strictGherkinHandler.validate('But I do something', 5, testFeature)).to.not.be.null;
        expect(strictGherkinHandler.validate('And I do something', 12, testFeature)).to.be.null;
        expect(strictGherkinHandler.validate('But I do something', 12, testFeature)).to.be.null;
    });
});

describe('getDefinition', () => {
    it('should return correct definition for any gherkin position', () => {
        const definition0 = s.getDefinition('When I do something', '');
        const definition21 = s.getDefinition('When I do something', '');
        expect(definition0).to.not.be.null;
        expect(definition21).to.not.be.null;
    });
    it('should not return definition for missing step', () => {
        const definition = s.getDefinition('When I do something else', '');
        expect(definition).to.be.null;
    });
    it('should correctly handle spaces at the line beginning', () => {
        const definition = s.getDefinition('   When I do something', '');
        expect(definition).to.not.be.null;
    });
});

describe('getCompletion', () => {
    it('should return all the variants found', () => {
        const completion = s.getCompletion(' When I do', 1, '');
        expect(completion).to.have.length(stepsDefinitionNum);
    });
    it('should correctly filter completion', () => {
        const completion = s.getCompletion(' When I do another th', 1, '');
        expect(completion).to.have.length(1);
        expect(completion[0].label).to.be.equal('I do another thing');
        expect(completion[0].insertText).to.be.equal('thing');
    });
    it('should not return completion for non-gherkin lines', () => {
        const completion = s.getCompletion('I do another th', 1, '');
        expect(completion).to.be.null;
    });
    it('should not return completion for non-existing steps', () => {
        const completion = s.getCompletion('When non-existent step', 1, '');
        expect(completion).to.be.null;
    });
    it('should return proper sortText', () => {
        const completion = s.getCompletion(' When I do', 1, '');
        expect(completion[0].sortText).to.be.equals('ZZZZX_I do something');
        expect(completion[1].sortText).to.be.equals('ZZZZY_I do another thing');
    });
    it ('should return proper text in case of strict gherkin option', () => {
        const strictGherkinFeature = getFileContent(__dirname + '/data/features/strict.gherkin.feature');
        expect(s.getCompletion(' Given I do', 1, strictGherkinFeature)).to.be.null;
        expect(s.getCompletion(' When I do', 1, strictGherkinFeature)).to.not.be.null;
        expect(s.getCompletion(' Then I do', 1, strictGherkinFeature)).to.be.null;
        expect(s.getCompletion(' And I do', 0, strictGherkinFeature)).to.be.null;
        expect(s.getCompletion(' And I do', 2, strictGherkinFeature)).to.not.be.null;
        expect(s.getCompletion(' And I do', 4, strictGherkinFeature)).to.be.null;
    });
    it ('should show correct completion for lower case step definitions', () => {
        const strictGherkinFeature = getFileContent(__dirname + '/data/features/strict.gherkin.feature');
        expect(s.getCompletion(' Given I test lower case ', 1, strictGherkinFeature)).to.be.null;
        expect(s.getCompletion(' When I test lower case ', 1, strictGherkinFeature)).to.not.be.null;
        expect(s.getCompletion(' Then I test lower case ', 1, strictGherkinFeature)).to.be.null;
        expect(s.getCompletion(' And I test lower case ', 0, strictGherkinFeature)).to.be.null;
        expect(s.getCompletion(' And I test lower case ', 2, strictGherkinFeature)).to.not.be.null;
        expect(s.getCompletion(' And I test lower case ', 4, strictGherkinFeature)).to.be.null;
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

describe('gherkin definition part overrides', () => {
    const customSettings = {
        cucumberautocomplete: {
            ...settings.cucumberautocomplete,
            gherkinDefinitionPart: '(steptest)\\(',
            steps: ['/data/steps/gherkinDefinitionPart.steps.js'],
            strictGherkinCompletion: false
        }
    };
    const customStepsHandler = new StepsHandler(__dirname, customSettings);
    const strictGherkinFeature = getFileContent(__dirname + '/data/features/strict.gherkin.feature');

    it('should suggest only proper step definitions', () => {
        expect(customStepsHandler.getCompletion(' When I test something ', 1, strictGherkinFeature)).to.be.null;
        expect(customStepsHandler.getCompletion(' And I test something ', 2, strictGherkinFeature)).to.be.null;
        expect(customStepsHandler.getCompletion(' When I test gherkinDefinitionPart ', 1, strictGherkinFeature)).to.not.be.null;
        expect(customStepsHandler.getCompletion(' And I test gherkinDefinitionPart ', 2, strictGherkinFeature)).to.not.be.null;
    });

    it('should properly validate steps', () => {
        expect(customStepsHandler.validate('When I test something else', 1, '')).to.not.be.null;
        expect(customStepsHandler.validate('Given I test something else', 1, '')).to.not.be.null;
        expect(customStepsHandler.validate('When I test gherkinDefinitionPart option', 1, '')).to.be.null;
        expect(customStepsHandler.validate('Given I test gherkinDefinitionPart option', 1, '')).to.be.null;
    });
});

describe('gherkin regex step start', () => {
    const customSettings = {
        cucumberautocomplete: {
            ...settings.cucumberautocomplete,
            stepRegExSymbol: '\\\'',
            steps: ['/data/steps/stepRegExSymbol.steps.js']
        }
    };
    const customStepsHandler = new StepsHandler(__dirname, customSettings);
    const elements = customStepsHandler.getElements();

    it('should correctly parse the default case', () => {
        expect(elements.length).to.be.gte(1);
        expect(elements[0].text).to.be.eq('I test quotes step');
    });

    it('should correctly parse non-standard string with ""', () => {
        expect(elements.length).to.be.gte(2);
        expect(elements[1].text).to.be.eq('I do "aa" something');
    });
    it('should correctly parse non-standard string an escape char', () => {
        expect(elements.length).to.be.gte(3);
        expect(elements[2].text).to.be.eq('I do \' something');
    });
    it('should correctly parse non-standard string a tab and escape char', () => {
        expect(elements.length).to.be.gte(4);
        expect(elements[3].text).to.be.eq('I do \' something different');
    });
    it('should correctly parse non-standard string a complex string', () => {
        expect(elements.length).to.be.gte(5);
        expect(elements[4].text).to.be.eq('/^Me and "([^"]*)"$/');
    });
    it('should correctly parse non-standard string with an arrow function', () => {
        expect(elements.length).to.be.gte(6);
        expect(elements[5].text).to.be.eq('the test cookie is set');
    });
    
});

describe('step as a pure text test', () => {
    const customSettings = {
        cucumberautocomplete: {
            ...settings.cucumberautocomplete,
            steps: ['/data/steps/pureTextSteps.steps.js'],
            pureTextSteps: true
        }
    };
    const customStepsHandler = new StepsHandler(__dirname, customSettings);
    const elements = customStepsHandler.getElements();

    it('should properly handle steps', () => {
        expect(elements.length).to.be.eq(1);
        expect(elements[0].text).to.be.eq('I give 3/4 and 5$');
    });

    it('should return proper completion', () => {
        const completion = customStepsHandler.getCompletion('When I', 1, '');
        expect(completion[0].insertText).to.be.eq('I give 3/4 and 5$');
    })

    it('should return proper partial completion', () => {
        const completion = customStepsHandler.getCompletion('When I give 3', 1, '');
        expect(completion[0].insertText).to.be.eq('3/4 and 5$');
    })
})
