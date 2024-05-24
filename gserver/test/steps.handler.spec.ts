import StepsHandler from '../src/steps.handler';
import { GherkinType } from '../src/gherkin';
import { getFileContent } from '../src/util';
import { defaultSettings } from './data/defaultSettings';

const settings = {
  ...defaultSettings,
  steps: ['/data/steps/test.steps*.js'],
  syncfeatures: '/data/features/test.feature',
  smartSnippets: true,
  stepsInvariants: true,
  strictGherkinCompletion: true,
  customParameters: [
    {
      parameter: '${dictionaryObject}',
      value: '([a-zA-Z0-9_-]+ dictionary|"[^"]*")',
    },
    {
      parameter: /\{a.*\}/,
      value: 'aa',
    },
  ],
};

const stepsDefinitionNum = 7;

const s = new StepsHandler(__dirname, settings);

describe('geStepDefinitionMatch', () => {
  describe('gherkin strings types', () => {
    const strings = [
      'Given(/I do something/, function(){);',
      '@Given(\'I do something\')',
      '@Given("I do something")',
      '@Given /I do something/',
      'Given(~\'I do something\');',
      'Given(`I do something`);',
    ];
    strings.forEach((str) => {
      it(`should parse "${str}" step string`, () => {
        const match = s.geStepDefinitionMatch(str);
        expect(match).not.toBeNull();
        expect(match![4]).toStrictEqual('I do something');
      });
    });
  });

  describe('all the gherkin words strings', () => {
    const gherkinWords = [
      'Given',
      'When',
      'Then',
      'And',
      'But',
      'defineStep',
      '@Step',
      'Step',
      '*',
    ];
    gherkinWords.forEach((g) => {
      it(`should parse "${g}(/I do something/" string with ${g} gherkin word`, () => {
        const match = s.geStepDefinitionMatch(
          `${g}(/I do something/, function(){);`
        );
        expect(match).not.toBeNull();
        expect(match![4]).toStrictEqual('I do something');
      });
    });
  });

  describe('non-standard strings', () => {
    const nonStandardStrings = [
      ['Given(/I do "aa" something/);', 'I do "aa" something'],
      [String.raw`When('I do \' something');`, String.raw`I do \' something`], //String.raw needed to ensure escaped values can be read.
      ['  When(\'I do something\');', 'I do something'],
      ['"Given(/^Me and "([^"]*)"$/, function ()"', '^Me and "([^"]*)"$'],
      [
        'Given(\'the test cookie is set\', () => cy.setCookie(\'TEST_COOKIE\', \'true\'));',
        'the test cookie is set',
      ],
    ];
    nonStandardStrings.forEach((str) => {
      it(`should get "${str[1]}" step from "${str[0]}" string`, () => {
        const match = s.geStepDefinitionMatch(str[0]);
        expect(match).not.toBeNull();
        expect(match![4]).toStrictEqual(str[1]);
      });
    });
  });

  describe('invalid lines', () => {
    const inbvalidStrings = [
      'iGiven(\'I do something\')',
      'Giveni(\'I do something\')',
      'console.log("but i do \'Something\'");',
    ];
    inbvalidStrings.forEach((str) => {
      it(`should not parse "${str}" string`, () => {
        const match = s.geStepDefinitionMatch(str);
        expect(match).toBeNull();
      });
    });
  });

  describe('gherkin words in the middle of lines', () => {
    const line =
      'Then(/^I do Fast Sign in with "([^"]*)" and "([^"]*)"$/)do |email, pwd|';
    const match = '^I do Fast Sign in with "([^"]*)" and "([^"]*)"$';
    expect(s.geStepDefinitionMatch(line)![4]).toStrictEqual(match);
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
      'I do b and then I do f',
    ];
    expect(s.getStepTextInvariants(str)).toStrictEqual(res);
  });
});

describe('handleCustomParameters', () => {
  it('should correctly change cucumber parameters', () => {
    const data = [
      [
        'I use ${dictionaryObject} and ${dictionaryObject}',
        'I use ([a-zA-Z0-9_-]+ dictionary|"[^"]*") and ([a-zA-Z0-9_-]+ dictionary|"[^"]*")',
      ],
      ['I use {aTest} parameter', 'I use aa parameter'],
      ['I use {bTest} parameter', 'I use {bTest} parameter'],
    ];
    data.forEach((d) => {
      expect(s.handleCustomParameters(d[0])).toStrictEqual(d[1]);
    });
  });
});

describe('getRegTextForStep', () => {
  it('should remove ruby interpolation for regex', () => {
    const str = '^the (#{SOMETHING}) cannot work$';
    const res = '^the (.*) cannot work$';
    expect(s.getRegTextForStep(str)).toStrictEqual(res);
  });
  it('should correctly handle built-in transforms', () => {
    const data = [
      ['I use {float}', 'I use -?\\d*\\.?\\d+'],
      ['I use {int}', 'I use -?\\d+'],
      ['I use {stringInDoubleQuotes}', 'I use "[^"]+"'],
      ['I use {string}', "I use (\"|')[^\\1]*\\1"],
      ['I use {}', 'I use .*'],
      ['I have 1 cucumber(s) in my belly', 'I have 1 cucumber(s)? in my belly'],
      [
        'I have cucumbers in my belly/stomach',
        'I have cucumbers in my (belly|stomach)',
      ],
      ['I use {word}', 'I use [^\\s]+'],
    ];
    data.forEach((d) => {
      expect(s.getRegTextForStep(d[0])).toStrictEqual(d[1]);
    });
  });
  it('should correctly handle cucumber expressions', () => {
    const data = [
      [
        'Test multiples: { cuke expression 1 } { cuke-expression-2 }',
        'Test multiples: .* .*',
      ],
      ['Test regex - braces: {.*}', 'Test regex - braces: .*'],
      [
        'Test regex - misc: (.*){3,4} (.*){,5}',
        'Test regex - misc: (.*){3,4} (.*){,5}',
      ],
      [
        'Test order: {first} {.*} (.*){6,7} (.*) (.*){,5} {last}',
        'Test order: .* .* (.*){6,7} (.*) (.*){,5} .*',
      ],
      [
        'I use \\{ some backslashed thing \\}',
        'I use \\{ some backslashed thing \\}',
      ],
      [
        '{parameter} in the beginning of the string',
        '.* in the beginning of the string',
      ],
    ];
    data.forEach((d) => {
      expect(s.getRegTextForStep(d[0])).toStrictEqual(d[1]);
    });
  });
});

describe('getPartialRegParts', () => {
  const data = 'I do (a| ( b)) and (c | d) and "(.*)"$';
  const res = ['I', 'do', '(a| ( b))', 'and', '(c | d)', 'and', '"(.*)"$'];
  it(`should correctly parse "${data}" string into parts`, () => {
    expect(s.getPartialRegParts(data)).toStrictEqual(res);
  });
});

describe('constructor', () => {
  const e = s.getElements();
  it('should fill all the elements', () => {
    expect(e).toHaveLength(stepsDefinitionNum);
  });
  it('should correctly fill used steps counts', () => {
    expect(e[0]).toHaveProperty('count', 2);
    expect(e[1]).toHaveProperty('count', 1);
    expect(e[2]).toHaveProperty('count', 2);
    expect(e[3]).toHaveProperty('count', 1);
  });
  it('should correcly fill all the step element fields', () => {
    const firstElement = e[0];
    expect(firstElement).toHaveProperty(
      'desc',
      'this.When(/^I do something$/, function (next)'
    );
    expect(firstElement).toHaveProperty(
      'id',
      'stepc0c243868293a93f35e3a05e2b844793'
    );
    expect(firstElement).toHaveProperty('gherkin', GherkinType.When);
    expect(firstElement.reg.toString()).toStrictEqual('/^I do something$/');
    expect(firstElement.partialReg.toString()).toStrictEqual(
      '/^(^I|$)( |$)(do|$)( |$)(something$|$)/'
    );
    expect(firstElement).toHaveProperty('text', 'I do something');
    expect(firstElement.def['uri']).toContain('test.steps.js');
  });
  it('should set correct names to the invariants steps', () => {
    expect(e[2]).toHaveProperty('text', 'I say a');
    expect(e[3]).toHaveProperty('text', 'I say b');
  });
});

describe('populate', () => {
  it('should not create duplicates via populating', () => {
    s.populate(__dirname, settings.steps);
    expect(s.getElements()).toHaveLength(stepsDefinitionNum);
  });
  it('should correctly recreate elements with their count using', () => {
    s.populate(__dirname, settings.steps);
    const e = s.getElements();
    expect(e[0]).toHaveProperty('count', 2);
    expect(e[1]).toHaveProperty('count', 1);
  });
});

describe('validateConfiguration', () => {
  it('should return correct Diagnostic for provided settings file', () => {
    const settings = [
      __dirname + '/../test/**/*.js',
      __dirname + '/../test/non/existent/path/*.js',
    ];
    const diagnostic = s.validateConfiguration(
      'test/data/test.settings.json',
      settings,
      __dirname + '/..'
    );
    expect(diagnostic).toHaveLength(1);
    expect(diagnostic[0].range).toStrictEqual({
      start: { line: 3, character: 8 },
      end: { line: 3, character: 37 },
    });
  });
});

describe('Documentation parser', () => {
  const sDocumentation = new StepsHandler(__dirname, {
    ...defaultSettings,
    steps: ['/data/steps/test.documentation*.js'],
  });

  it('should extract JSDOC properties when available', () => {
    expect(
      sDocumentation.elements.some(
        (step) => step.documentation === 'unstructured description'
      )
    ).toStrictEqual(true);
    expect(
      sDocumentation.elements.some(
        (step) => step.documentation === 'structured description'
      )
    ).toStrictEqual(true);
    expect(
      sDocumentation.elements.some(
        (step) => step.documentation === 'structured name'
      )
    ).toStrictEqual(true);
    expect(
      sDocumentation.elements.some(
        (step) => step.documentation === 'Overriding description'
      )
    ).toStrictEqual(true);
  });
});

describe('validate', () => {
  it('should not return diagnostic for correct lines', () => {
    expect(s.validate('When I do something', 1, '')).toBeNull();
    expect(s.validate('    When I do something', 1, '')).toBeNull();
    expect(s.validate('When I do another thing', 1, '')).toBeNull();
    expect(s.validate('When I do something  ', 1, '')).toBeNull();
    expect(s.validate('When  I do something  ', 1, '')).toBeNull();
  });
  it('should not return diagnostic for uncorresponding gherkin words lines', () => {
    expect(s.validate('Given I do something', 1, '')).toBeNull();
    expect(s.validate('When I do something', 1, '')).toBeNull();
    expect(s.validate('Then I do something', 1, '')).toBeNull();
    expect(s.validate('And I do something', 1, '')).toBeNull();
    expect(s.validate('But I do something', 1, '')).toBeNull();
  });
  it('should not check non-Gherkin steps', () => {
    expect(s.validate('Non_gherkin_word do something else', 1, '')).toBeNull();
  });
  it('should return an diagnostic for lines beggining with Given', () => {
    expect(s.validate('Given I do something else', 1, '')).not.toBeNull();
  });
  it('should return an diagnostic for lines beggining with When', () => {
    expect(s.validate('When I do something else', 1, '')).not.toBeNull();
  });
  it('should return an diagnostic for lines beggining with Then', () => {
    expect(s.validate('Then I do something else', 1, '')).not.toBeNull();
  });
  it('should return an diagnostic for lines beggining with And', () => {
    expect(s.validate('And I do something else', 1, '')).not.toBeNull();
  });
  it('should return an diagnostic for lines beggining with But', () => {
    expect(s.validate('But I do something else', 1, '')).not.toBeNull();
  });
  it('should return an diagnostic for lines beggining with *', () => {
    expect(s.validate('* I do something else', 1, '')).not.toBeNull();
  });
  it('should correctly handle outline steps', () => {
    const outlineFeature = getFileContent(
      __dirname + '/data/features/outlines.feature'
    );
    expect(
      s.validate(
        'When I test outline using "<number1>" variable',
        1,
        outlineFeature
      )
    ).toBeNull();
    expect(
      s.validate(
        'When I test outline using <number2> variable',
        1,
        outlineFeature
      )
    ).toBeNull();
    expect(
      s.validate(
        'When I test outline using <string1> variable',
        1,
        outlineFeature
      )
    ).not.toBeNull();
  });
  it('should correctly validate steps with incorrect gherkin word in case of strictGherkinValidation', () => {
    const strictGherkinHandler = new StepsHandler(__dirname, {
      ...settings,
      strictGherkinValidation: true,
    });
    const testFeature = getFileContent(
      __dirname + '/data/features/test.feature'
    );
    expect(
      strictGherkinHandler.validate('Given I do something', 12, testFeature)
    ).not.toBeNull();
    expect(
      strictGherkinHandler.validate('When I do something', 12, testFeature)
    ).toBeNull();
    expect(
      strictGherkinHandler.validate('Then I do something', 12, testFeature)
    ).not.toBeNull();
    expect(strictGherkinHandler.validate('And I do something', 5, testFeature))
      .not.toBeNull();
    expect(strictGherkinHandler.validate('But I do something', 5, testFeature))
      .not.toBeNull();
    expect(strictGherkinHandler.validate('And I do something', 12, testFeature))
      .toBeNull();
    expect(strictGherkinHandler.validate('But I do something', 12, testFeature))
      .toBeNull();
  });
});

describe('getDefinition', () => {
  it('should return correct definition for any gherkin position', () => {
    const definition0 = s.getDefinition('When I do something', '');
    const definition21 = s.getDefinition('When I do something', '');
    expect(definition0).not.toBeNull();
    expect(definition21).not.toBeNull();
  });
  it('should not return definition for missing step', () => {
    const definition = s.getDefinition('When I do something else', '');
    expect(definition).toBeNull();
  });
  it('should correctly handle spaces at the line beginning', () => {
    const definition = s.getDefinition('   When I do something', '');
    expect(definition).not.toBeNull();
  });
});

describe('getCompletion', () => {
  it('should return all the variants found', () => {
    const completion = s.getCompletion(' When I do', 1, '');
    expect(completion).toHaveLength(stepsDefinitionNum);
  });
  it('should correctly filter completion', () => {
    const completion = s.getCompletion(' When I do another th', 1, '');
    expect(completion).toHaveLength(1);
    expect(completion![0].label).toStrictEqual('I do another thing');
    expect(completion![0].insertText).toStrictEqual('thing');
  });
  it('should not return completion for non-gherkin lines', () => {
    const completion = s.getCompletion('I do another th', 1, '');
    expect(completion).toBeNull();
  });
  it('should not return completion for non-existing steps', () => {
    const completion = s.getCompletion('When non-existent step', 1, '');
    expect(completion).toBeNull();
  });
  it('should return proper sortText', () => {
    const completion = s.getCompletion(' When I do', 1, '');
    expect(completion![0].sortText).toStrictEqual('ZZZZX_I do something');
    expect(completion![1].sortText).toStrictEqual('ZZZZY_I do another thing');
  });
  it('should return proper text in case of strict gherkin option', () => {
    const strictGherkinFeature = getFileContent(
      __dirname + '/data/features/strict.gherkin.feature'
    );
    expect(s.getCompletion(' Given I do', 1, strictGherkinFeature)).toBeNull();
    expect(s.getCompletion(' When I do', 1, strictGherkinFeature)).not.toBeNull();
    expect(s.getCompletion(' Then I do', 1, strictGherkinFeature)).toBeNull();
    expect(s.getCompletion(' And I do', 0, strictGherkinFeature)).toBeNull();
    expect(s.getCompletion(' And I do', 2, strictGherkinFeature)).not.toBeNull();
    expect(s.getCompletion(' And I do', 4, strictGherkinFeature)).toBeNull();
  });
  it('should show correct completion for lower case step definitions', () => {
    const strictGherkinFeature = getFileContent(
      __dirname + '/data/features/strict.gherkin.feature'
    );
    expect(
      s.getCompletion(' Given I test lower case ', 1, strictGherkinFeature)
    ).toBeNull();
    expect(s.getCompletion(' When I test lower case ', 1, strictGherkinFeature))
      .not.toBeNull();
    expect(s.getCompletion(' Then I test lower case ', 1, strictGherkinFeature))
      .toBeNull();
    expect(s.getCompletion(' And I test lower case ', 0, strictGherkinFeature))
      .toBeNull();
    expect(s.getCompletion(' And I test lower case ', 2, strictGherkinFeature))
      .not.toBeNull();
    expect(s.getCompletion(' And I test lower case ', 4, strictGherkinFeature))
      .toBeNull();
  });
});

describe('getCompletionInsertText', () => {
  const regExpText = 'I do [a-z]+ and \\w* thing';
  const pairs = [
    { step: '', prefix: 'I do ${1:} and ${2:} thing' },
    { step: 'I', prefix: 'do ${1:} and ${2:} thing' },
    { step: 'I do', prefix: '${1:} and ${2:} thing' },
    { step: 'I do aaa', prefix: 'and ${1:} thing' },
    { step: 'I do aaa and', prefix: '${1:} thing' },
    { step: 'I do aaa and bbb', prefix: 'thing' },
    { step: 'I thing', prefix: 'do ${1:} and ${2:} thing' },
  ];
  pairs.forEach((pair) => {
    const { step, prefix } = pair;
    it(`should return "${prefix}" part for "${step}" step part`, () => {
      const res = s.getCompletionInsertText(regExpText, step);
      expect(res).toStrictEqual(prefix);
    });
  });
});

describe('gherkin definition part overrides', () => {
  const customSettings = {
    ...settings,
    gherkinDefinitionPart: '(steptest)\\(',
    steps: ['/data/steps/gherkinDefinitionPart.steps.js'],
    strictGherkinCompletion: false,
  };
  const customStepsHandler = new StepsHandler(__dirname, customSettings);
  const strictGherkinFeature = getFileContent(
    __dirname + '/data/features/strict.gherkin.feature'
  );

  it('should suggest only proper step definitions', () => {
    expect(
      customStepsHandler.getCompletion(
        ' When I test something ',
        1,
        strictGherkinFeature
      )
    ).toBeNull();
    expect(
      customStepsHandler.getCompletion(
        ' And I test something ',
        2,
        strictGherkinFeature
      )
    ).toBeNull();
    expect(
      customStepsHandler.getCompletion(
        ' When I test gherkinDefinitionPart ',
        1,
        strictGherkinFeature
      )
    ).not.toBeNull();
    expect(
      customStepsHandler.getCompletion(
        ' And I test gherkinDefinitionPart ',
        2,
        strictGherkinFeature
      )
    ).not.toBeNull();
  });

  it('should properly validate steps', () => {
    expect(customStepsHandler.validate('When I test something else', 1, '')).not
      .toBeNull();
    expect(customStepsHandler.validate('Given I test something else', 1, ''))
      .not.toBeNull();
    expect(
      customStepsHandler.validate(
        'When I test gherkinDefinitionPart option',
        1,
        ''
      )
    ).toBeNull();
    expect(
      customStepsHandler.validate(
        'Given I test gherkinDefinitionPart option',
        1,
        ''
      )
    ).toBeNull();
  });
});

describe('gherkin regex step start', () => {
  const customSettings = {
    ...settings,
    stepRegExSymbol: "\\'",
    steps: ['/data/steps/stepRegExSymbol.steps.js'],
  };
  const customStepsHandler = new StepsHandler(__dirname, customSettings);
  const elements = customStepsHandler.getElements();

  it('should correctly parse the default case', () => {
    expect(elements.length).toBeGreaterThan(1);
    expect(elements[0].text).toStrictEqual('I test quotes step');
  });

  it('should correctly parse non-standard string with ""', () => {
    expect(elements.length).toBeGreaterThan(2);
    expect(elements[1].text).toStrictEqual('I do "aa" something');
  });
  it('should correctly parse non-standard string an escape char', () => {
    expect(elements.length).toBeGreaterThan(3);
    expect(elements[2].text).toStrictEqual("I do ' something");
  });
  it('should correctly parse non-standard string a tab and escape char', () => {
    expect(elements.length).toBeGreaterThan(4);
    expect(elements[3].text).toStrictEqual("I do ' something different");
  });
  it('should correctly parse non-standard string a complex string', () => {
    expect(elements.length).toBeGreaterThan(5);
    expect(elements[4].text).toStrictEqual('/^Me and "([^"]*)"$/');
  });
  it('should correctly parse non-standard string with an arrow function', () => {
    expect(elements.length).toBeGreaterThan(5);
    expect(elements[5].text).toStrictEqual('the test cookie is set');
  });
});

describe('step as a pure text test', () => {
  const customSettings = {
    ...settings,
    steps: ['/data/steps/pureTextSteps.steps.js'],
    pureTextSteps: true,
  };
  const customStepsHandler = new StepsHandler(__dirname, customSettings);
  const elements = customStepsHandler.getElements();

  it('should properly handle steps', () => {
    expect(elements.length).toStrictEqual(2);
    expect(elements[0].text).toStrictEqual('I give 3/4 and 5$');
    expect(elements[1].text).toStrictEqual('Could drink {string} if his age is 21+');
  });
  
  it('should properly validate steps', () => {
    expect(customStepsHandler.validate('When I give 3/4 and 5$', 1, '')).toBeNull();
    expect(customStepsHandler.validate('When I give 4 and 5', 1, '')).not.toBeNull();
    expect(customStepsHandler.validate('Then Could drink "tequila" if his age is 21+', 1, '')).toBeNull();
  });

  it('should return proper completion', () => {
    const completion1 = customStepsHandler.getCompletion('When I', 1, '');
    expect(completion1![0].insertText).toStrictEqual('I give 3/4 and 5$');
    
    const completion2 = customStepsHandler.getCompletion('Then C', 1, '');
    // TODO - fix this, insert text should be prettier, but we already have ticket for {string}
    expect(completion2![0].insertText).toStrictEqual('Could drink ("|\')${1:}1 if his age is 21+');
  });

  it('should return proper partial completion', () => {
    const completion = customStepsHandler.getCompletion('When I give 3', 1, '');
    expect(completion![0].insertText).toStrictEqual('3/4 and 5$');
  });
});
