
import { getOSPath, getFileContent, clearComments, getId } from './util';

import { Definition, Position, Range, Location } from 'vscode-languageserver';


// ************************************* STEPS ************************************* //

export interface Step {
    id: string,
    reg: RegExp,
    text: string,
    desc: string,
    def: Definition
}

export function getStepRegExp() {

    //Actually, we dont care what the symbols are before our 'Gherkin' word
    let startPart = '^(.*)';

    //All the steps should be declared using Given, When or Then keyword
    let gherkinPart = '(Given|When|Then)';

    //All the symbols, except of symbols, using as step start could be between gherkin word and our step
    let nonStepStartSymbols = '[^\'|^"|^\\/]*';

    //Step text could be placed between '/' symbols (ex. in JS) or between quotes, like in Java
    let stepStart = `('|"|\\/)`;

    //Our step could contain any symbols, except of our 'stepStart'. Use \3 to be sure in this
    let stepBody = '([^\\3]+)';

    //Step should be ended with same symbol it begins
    let stepEnd = '\\3';

    //Our RegExp will be case-insensitive to support cases like TypeScript (...@when...)
    let r = new RegExp(startPart + gherkinPart + nonStepStartSymbols + stepStart + stepBody + stepEnd, 'i');

    return r;

}

//Get all the steps from provided file
export function getSteps(filePath: string): Step[] {
    let steps = [];
    let definitionFile = getFileContent(filePath);
    definitionFile = clearComments(definitionFile);
    let stepRegExp = getStepRegExp();
    definitionFile.split(/\r?\n/g).forEach((line, lineIndex) => {
        let match = line.match(stepRegExp);
        if (match) {
            let beforeGherkin = match[1];
            let stepText = match[4];
            let pos = Position.create(lineIndex, beforeGherkin.length);
            steps.push({
                id: 'step' + getId(),
                reg: new RegExp(stepText),
                //We should remove text between quotes, '^|$' regexp marks and backslashes
                text: stepText.replace(/^\^|\$$/g, '').replace(/"\([^\)]*\)"/g, '""').replace(/\\/g, ''),
                desc: line.replace(/\{.*/, '').replace(/^\s*/, '').replace(/\s*$/, ''),
                def: Location.create(getOSPath(filePath), Range.create(pos, pos))
            });
        }
    });
    return steps;
}

// ************************************* PAGES ************************************* //

export interface PageObject {
    id: string,
    text: string,
    desc: string,
    def: Definition
}

export function getPageObjects(text: string, path: string): PageObject[] {
    let res = [];
    text.split(/\r?\n/g).forEach((line, i) => {
        let poMatch = line.match(/[\s\.]([a-zA-z][^\s^\.]*)\s*[:=]/);
        if (poMatch) {
            let pos = Position.create(i, 0);
            if (!res.find(v => {return v.text === poMatch[1]; })) {
                res.push({
                    id: 'pageObect' + getId(),
                    text: poMatch[1],
                    desc: line,
                    def: Location.create(getOSPath(path), Range.create(pos, pos))
                });
            }
        }
    });
    return res;
}

export interface Page {
    id: string,
    text: string,
    desc: string,
    def: Definition,
    objects: PageObject[]
}

export interface Pages {
    [key: string]: Page ;
}

//Get Page object
export function getPage(name: string, path: string): Page {
    let text = getFileContent(path);
    let zeroPos = Position.create(0, 0);
    return {
        id: 'page' + getId(),
        text: name,
        desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
        def: Location.create(getOSPath(path), Range.create(zeroPos, zeroPos)),
        objects: getPageObjects(text, path)
    };
}

