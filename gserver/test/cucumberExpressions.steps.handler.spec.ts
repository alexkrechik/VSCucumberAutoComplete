//https://github.com/cucumber/cucumber-expressions

import StepsHandler from '../src/steps.handler';

const settings = {
  pages: {},
  steps: ['/data/steps/cucumberExpressions.steps.js'],
  syncfeatures: '/data/features/cucumberExpressions.feature',
  smartSnippets: true,
  stepsInvariants: true,
  strictGherkinCompletion: true,
  customParameters: [],
};

const stepsDefinitionNum = 8;
const s = new StepsHandler(__dirname, settings);

describe('getElements', () => {
  const e = s.getElements();
  it('should correctly fill used steps counts', () => {
    expect(e).toHaveLength(stepsDefinitionNum);

    expect(e[0]).toHaveProperty('text', 'I have a {int} in my belly');
    expect(e[0]).toHaveProperty('count', 6);

    expect(e[1]).toHaveProperty('text', 'I have a {float} in my belly');
    expect(e[1]).toHaveProperty('count', 10);

    expect(e[2]).toHaveProperty(
      'text',
      'I have a important {word} in my belly'
    );
    expect(e[2]).toHaveProperty('count', 5);

    expect(e[3]).toHaveProperty('text', 'I have a {string} in my belly');
    expect(e[3]).toHaveProperty('count', 6);

    expect(e[4]).toHaveProperty('text', 'I have a wildcard {} in my belly');
    expect(e[4]).toHaveProperty('count', 2);

    expect(e[5]).toHaveProperty(
      'text',
      'I have a cucumber in my belly/stomach'
    );
    expect(e[5]).toHaveProperty('count', 2);

    expect(e[6]).toHaveProperty('text', 'I have a gherkin(s) in my belly');
    expect(e[6]).toHaveProperty('count', 2);

    expect(e[7]).toHaveProperty('text', 'I have a cucumber(s) in my belly');
    expect(e[7]).toHaveProperty('count', 1);
  });
});
