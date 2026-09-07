import {
  getGherkinType,
  getGherkinTypeLower,
  GherkinType,
} from '../src/gherkin';

const classifications = [
  { word: 'Given', mixedCaseWord: 'gIvEn', type: GherkinType.Given },
  { word: 'When', mixedCaseWord: 'wHeN', type: GherkinType.When },
  { word: 'Then', mixedCaseWord: 'tHeN', type: GherkinType.Then },
  { word: 'And', mixedCaseWord: 'aNd', type: GherkinType.And },
  { word: 'But', mixedCaseWord: 'bUt', type: GherkinType.But },
  { word: 'Unknown', mixedCaseWord: 'uNkNoWn', type: GherkinType.Other },
];

describe('Gherkin keyword classification', () => {
  it.each(classifications)(
    'classifies $word with exact matching',
    ({ word, type }) => {
      expect(getGherkinType(word)).toBe(type);
    }
  );

  it.each(classifications)(
    'classifies $mixedCaseWord case-insensitively',
    ({ mixedCaseWord, type }) => {
      expect(getGherkinTypeLower(mixedCaseWord)).toBe(type);
    }
  );
});
