//https://github.com/cucumber/cucumber-expressions

import StepsHandler from '../src/steps.handler';
import { expect } from 'chai';

const settings = {
    cucumberautocomplete: {
        steps: ['/data/steps/cucumberExpressions.steps.js'],
        syncfeatures: '/data/features/cucumberExpressions.feature',
        smartSnippets: true,
        stepsInvariants: true,
        strictGherkinCompletion: true,
        customParameters: [
        ]
    }
};

const stepsDefinitionNum = 8;
const s = new StepsHandler(__dirname, settings);

describe('getElements', () => {
    const e = s.getElements();
    it('should correctly fill used steps counts', () => {

        expect(e).to.have.length(stepsDefinitionNum);

        expect(e[0]).to.have.property("text", "I have a {int} in my belly");
        expect(e[0]).to.have.property("count", 6);

        expect(e[1]).to.have.property("text", "I have a {float} in my belly");
        expect(e[1]).to.have.property("count", 10);

        expect(e[2]).to.have.property("text", "I have a important {word} in my belly");
        expect(e[2]).to.have.property("count", 5);

        expect(e[3]).to.have.property("text", "I have a {string} in my belly");
        expect(e[3]).to.have.property("count", 6);
    
        expect(e[4]).to.have.property("text", "I have a wildcard {} in my belly");
        expect(e[4]).to.have.property("count", 2);

        expect(e[5]).to.have.property("text", "I have a cucumber in my belly/stomach");
        expect(e[5]).to.have.property("count", 2);
    
        expect(e[6]).to.have.property("text", "I have a gherkin(s) in my belly");
        expect(e[6]).to.have.property("count", 2);

        expect(e[7]).to.have.property("text", "I have a cucumber(s) in my belly");
        expect(e[7]).to.have.property("count", 1);
    });
});
