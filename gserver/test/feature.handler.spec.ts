import * as objectsGetter from '../src/objects.getter';
import * as featureHandler from '../src/feature.handler';
import { expect } from 'chai';

let steps: objectsGetter.Step[] = [
    {
        id: 'step1',
        reg: /^I do something$/,
        text: 'I do something',
        desc: 'I do something',
        def: {
            uri: 'test.uri',
            range: {
                start: {
                    line: 1,
                    character: 1
                },
                end: {
                    line: 2,
                    character: 2
                }
            }
        }
    }
];

describe('isGherkin()', () => {

    it('should correctly determine line beginning with "Given" gherkin keyword', () => {
            let res = featureHandler.isGherkin('Given I do something');
            expect(res).to.be.equals(true);
    });

    it('should correctly determine line beginning with "When" gherkin keyword', () => {
            let res = featureHandler.isGherkin('When I do something');
            expect(res).to.be.equals(true);
    });

    it('should correctly determine line beginning with "Then" gherkin keyword', () => {
            let res = featureHandler.isGherkin('Then I do something');
            expect(res).to.be.equals(true);
    });

    it('should correctly determine line beginning with "And" gherkin keyword', () => {
            let res = featureHandler.isGherkin('And I do something');
            expect(res).to.be.equals(true);
    });

    it('should correctly determine line beginning with "But" gherkin keyword', () => {
            let res = featureHandler.isGherkin('But I do something');
            expect(res).to.be.equals(true);
    });

    it('should not determine as gherkin line, that doesn\'t begin from gherkin word ', () => {
            let res = featureHandler.isGherkin('Scenario: I do something');
            expect(res).to.be.equals(false);
    });

    it('should not determine as gherkin line, then begins from lowercase gherkin word ', () => {
            let res = featureHandler.isGherkin('when I do something');
            expect(res).to.be.equals(false);
    });

    it('should not determine as gherkin line with typos', () => {
            let res = featureHandler.isGherkin('WhenI do something');
            expect(res).to.be.equals(false);
    });

});


describe('getStep()', () => {

    it('should not get step from wrong lines', () => {
        let stepWithoutGherkin = featureHandler.getStep('I do something', steps);
        expect(stepWithoutGherkin).to.be.equal(null);
    });

    it('should correctly fill all the handled step memebers for missing step', () => {
        let missingStep = featureHandler.getStep('   When I do something else', steps);
        expect(missingStep).to.be.deep.equals({
            text: 'When I do something else',
            step: null,
            interval: {
                start: 3,
                end: 27
            }
        });
    });

    it('should correctly fill all the handled step memebers for present step', () => {
        let correctStep = featureHandler.getStep('   When I do something', steps);
        expect(correctStep).to.be.deep.equals({
            text: 'When I do something',
            step: steps[0],
            interval: {
                start: 3,
                end: 22
            }
        });
    });
});