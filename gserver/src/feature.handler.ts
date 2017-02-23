import { Step, Page, Pages, PageObject } from './objects.getter';

let gherkinRegEx = /^(\s*)((?:Given|When|Then|And|But) )(.*)/;

interface Interval {
    start: number,
    end: number
}

interface HandledStep {
    text: string,
    step: Step | null,
    interval: Interval
}

interface HandledLine {
    isGherkin: boolean,
    step: HandledStep
}

function getStep(line: string, steps: Step[]): HandledStep | null {
    let match = line.match(gherkinRegEx);
    let beforeGherkin = match[1];
    let gherkinPart = match[2];
    let stepText = match[3];
    let step = steps.find(s => {return s.reg.test(stepText); });
    return {
        text: gherkinPart + stepText,
        step: step || null,
        interval: {
            start: beforeGherkin.length,
            end: line.length
        }
    };
}

export function handleLine(line: string, steps: Step[] ): HandledLine {
    let stepMatch = line.match(gherkinRegEx);
    if (line.search(gherkinRegEx) === -1) {
        return {
            isGherkin: false,
            step: null
        };
    } else {
        return {
            isGherkin: true,
            step: getStep(line, steps)
        };
    }
}