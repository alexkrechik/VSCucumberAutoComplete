import { getOSPath, getFileContent, clearComments, getId, escapeRegExp } from './util';
import {
    Definition,
    CompletionItem,
    Diagnostic,
    DiagnosticSeverity,
    Position,
    Location,
    Range,
    CompletionItemKind
} from 'vscode-languageserver';

import * as glob from 'glob';

export type StepSettings = string[];

export type Step = {
    id: string,
    reg: RegExp,
    text: string,
    desc: string,
    def: Definition
};

export default class StepsHandler {

    elements: Step[];

    constructor(stepsPathes: StepSettings) {
        this.populate(stepsPathes);
    }

    getElements(): Step[] {
        return this.elements;
    }

    getStepRegExp(): RegExp {

        //Actually, we dont care what the symbols are before our 'Gherkin' word
        //But they shouldn't end with letter
        let startPart = '^((?:.*?[^\\w])|.{0})';

        //All the steps should be declared using any gherkin keyword
        let gherkinPart = '(Given|When|Then|And|But)';

        //All the symbols, except of symbols, using as step start and letters, could be between gherkin word and our step
        let nonStepStartSymbols = `[^\/'"\\w]*?`;

        //Step text could be placed between '/' symbols (ex. in JS) or between quotes, like in Java
        let stepStart = `(\/|'|")`;

        //Our step could contain any symbols, except of our 'stepStart'. Use \3 to be sure in this
        let stepBody = '([^\\3]+)';

        //Step should be ended with same symbol it begins
        let stepEnd = '\\3';

        //Our RegExp will be case-insensitive to support cases like TypeScript (...@when...)
        let r = new RegExp(startPart + gherkinPart + nonStepStartSymbols + stepStart + stepBody + stepEnd, 'i');
        return r;

    }

    getMatch(line: string): RegExpMatchArray {
        return line.match(this.getStepRegExp());
    }

    getRegTextForStep(step: string): string {
        
        //Escape all the regex symbols to avoid errors
        step = escapeRegExp(step);
        
        //Ruby interpolation (like `#{Something}` )should be replaced with `.*`
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/65
        step = step.replace(/#{(.*?)}/g, '.*')

        return step;
    }

    getTextForStep(step: string): string {
        
        //Remove all the backslashes
        step = step.replace(/\\/g, '');

        //Remove "string start" and "string end" RegEx symbols
        step = step.replace(/^\^|\$$/g, '');

        //All the "match" parts from double quotes should be removed
        //ex. `"(.*)"` should be changed by ""
        //We should remove text between quotes, '^|$' regexp marks and backslashes
        step = step.replace(/"\([^\)]*\)"/g, '""');
        
        return step;
    }

    getDescForStep(step: string): string {
        
        //Remove 'Function body' part
        step = step.replace(/\{.*/, '');

        //Remove spaces in the beginning end in the end of string
        step = step.replace(/^\s*/, '').replace(/\s*$/, '');

        return step;
    }

    getSteps(filePath: string): Step[] {
        let steps = [];
        let definitionFile = getFileContent(filePath);
        definitionFile = clearComments(definitionFile);
        definitionFile.split(/\r?\n/g).forEach((line, lineIndex) => {
            let match = this.getMatch(line);
            if (match) {
                let [, beforeGherkin, , ,stepText] = match;
                let pos = Position.create(lineIndex, beforeGherkin.length);
                steps.push({
                    id: 'step' + getId(),
                    reg: new RegExp(this.getRegTextForStep(stepText)),
                    text: this.getTextForStep(stepText),
                    desc: this.getDescForStep(line),
                    def: Location.create(getOSPath(filePath), Range.create(pos, pos))
                });
            }
        });
        return steps;
    }

    populate(stepsPathes: StepSettings): void {
        let stepsFiles = [];
        this.elements = [];
        stepsPathes.forEach((path) => {
            glob.sync(path, { ignore: '.gitignore' }).forEach(f => {
                stepsFiles.push(f);
            });
        });
         stepsFiles.forEach(f => {
            this.elements = this.elements.concat(this.getSteps(f));
        });
    }

    gherkinWords = 'Given|When|Then|And|But';
    gherkinRegEx = new RegExp('^(\\s*)(' + this.gherkinWords + ')(.)(.*)');

    getStepByText(text: string): Step {
        return this.elements.find(s => {
            return s.reg.test(text);
        });
    }

    validate(line: string, lineNum: number): Diagnostic | null {
        line = line.replace(/\s*$/, '');
        let match = line.match(this.gherkinRegEx);
        if (!match) {
            return null;
        }
        let beforeGherkin = match[1];
        let step = this.getStepByText(match[4]);
        if (step) {
            return null;
        } else {
            return {
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: { line: lineNum, character: beforeGherkin.length },
                    end: { line: lineNum, character: line.length }
                },
                message: `Was unable to find step for "${line}"`,
                source: 'ex'
            };
        }
    }

    getDefinition(line: string, char: number): Definition | null {
        let match = line.match(this.gherkinRegEx);
        if (!match) {
            return null;
        }
        let step = this.getStepByText(match[4]);
        return step ? step.def : null;
    }

    getCompletion(line: string, position: Position): CompletionItem[] | null {
        //Get line part without gherkin part
        let match = line.match(this.gherkinRegEx);
        if (!match) {
            return null;
        }
        let stepPart = match[4];
        //Return all the braces into default state
        stepPart = stepPart.replace(/"[^"]*"/g, '""');
        //We should not obtain last word
        stepPart = stepPart.replace(/[^\s]+$/, '');
        //We should replace/search only string beginning
        let stepPartRe = new RegExp('^' + stepPart);
        let res = this.elements
            .filter(el => {
                return el.text.search(stepPartRe) !== -1;
            })
            .map(step => {
                return {
                    label: step.text.replace(stepPartRe, ''),
                    kind: CompletionItemKind.Function,
                    data: step.id
                };
            });
        return res.length ? res : null;
    }

    getCompletionResolve(item: CompletionItem): CompletionItem {
        return item;
    };

}