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

describe('handleLine()', () => {

    it('should correctly parse line beginning with "Given" gherkin keyword', () => {
            let res = featureHandler.handleLine('Given I do something', steps);
            expect(res.isGherkin).to.be.equals(true);
    });

    it('should correctly parse line beginning with "When" gherkin keyword', () => {
            let res = featureHandler.handleLine('When I do something', steps);
            expect(res.isGherkin).to.be.equals(true);
    });

    it('should correctly parse line beginning with "Then" gherkin keyword', () => {
            let res = featureHandler.handleLine('Then I do something', steps);
            expect(res.isGherkin).to.be.equals(true);
    });

    it('should correctly parse line beginning with "And" gherkin keyword', () => {
            let res = featureHandler.handleLine('And I do something', steps);
            expect(res.isGherkin).to.be.equals(true);
    });

    it('should correctly parse line beginning with "But" gherkin keyword', () => {
            let res = featureHandler.handleLine('But I do something', steps);
            expect(res.isGherkin).to.be.equals(true);
    });

    it('should not determine as gherkin line, that doesn\'t begin from gherkin word ', () => {
            let res = featureHandler.handleLine('Scenario: I do something', steps);
            expect(res.isGherkin).to.be.equals(false);
    });

    it('should not determine as gherkin line, then begins from lowercase gherkin word ', () => {
            let res = featureHandler.handleLine('when I do something', steps);
            expect(res.isGherkin).to.be.equals(false);
    });

    it('should not determine as gherkin line with typos', () => {
            let res = featureHandler.handleLine('WhenI do something', steps);
            expect(res.isGherkin).to.be.equals(false);
    });

    it('should not get step from wrong lines', () => {
        let stepWithoutGherkin = featureHandler.handleLine('I do something', steps);
        expect(stepWithoutGherkin.step).to.be.equal(null);
    });

    it('should correctly fill all the handled step memebers for missing step', () => {
        let missingStep = featureHandler.handleLine('   When I do something else', steps);
        expect(missingStep.step).to.be.deep.equals({
            text: 'When I do something else',
            step: null,
            interval: {
                start: 3,
                end: 27
            }
        });
    });

    it('should correctly fill all the handled step memebers for present step', () => {
        let correctStep = featureHandler.handleLine('   When I do something', steps);
        expect(correctStep.step).to.be.deep.equals({
            text: 'When I do something',
            step: steps[0],
            interval: {
                start: 3,
                end: 22
            }
        });
    });
});