import { 
    getOSPath,
    getFileContent,
    clearComments,
    getMD5Id,
    escapeRegExp,
    getTextRange,
    getSortPrefix
} from './util';

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
    def: Definition,
    count: number
};

export type StepsHash = {
    [step: string]: number
}

export default class StepsHandler {

    elements: Step[];

    elemenstHash: StepsHash;

    constructor(root: string, stepsPathes: StepSettings, sync: boolean) {
        this.elemenstHash = {};
        this.populate(root, stepsPathes);
        sync && this.setElementsHash(root);
    }

    getElements(): Step[] {
        return this.elements;
    }

    setElementsHash(root: string): void {
        this.elemenstHash = {};
        let files = glob.sync(`${root}/**/*.feature`, { ignore: '.gitignore' });
        files.forEach(f => {
            let text = getFileContent(f);
            text.split(/\r?\n/g).forEach(line => {
                let match = line.match(this.gherkinRegEx);
                if (match) {
                    let step = this.getStepByText(match[4]);
                    if (step) {
                        this.incrementElementCount(step.id);
                    }
                }
            });
        });
        this.elements.forEach(el => el.count = this.getElementCount(el.id));
    }

    incrementElementCount(id: string): void {
        if(this.elemenstHash[id]) {
            this.elemenstHash[id]++;
        } else {
            this.elemenstHash[id] = 1;
        }
    }

    getElementCount(id: string): number {
        return this.elemenstHash[id] || 0; 
    }

    getStepRegExp(): RegExp {

        //Actually, we dont care what the symbols are before our 'Gherkin' word
        //But they shouldn't end with letter
        let startPart = '^((?:.*?[^\\w])|.{0})';

        //All the steps should be declared using any gherkin keyword. We should get first 'gherkin' word
        let gherkinPart = '(Given|When|Then|And|But)?';

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

        // /^((?:.*?[^\w])|.{0})(Given|When|Then|And|But)[^\/'"\w]*?(\/|'|")([^\3]+)\3/i
        return r;

    }

    getMatch(line: string): RegExpMatchArray {
        return line.match(this.getStepRegExp());
    }

    getRegTextForStep(step: string): string {
        
        //Ruby interpolation (like `#{Something}` )should be replaced with `.*`
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/65
        step = step.replace(/#{(.*?)}/g, '.*')

        //Built in transforms
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/66
        step = step.replace(/{float}/g, '-?\\d*\\.?\\d+')
        step = step.replace(/{int}/g, '-?\\d+')
        step = step.replace(/{stringInDoubleQuotes}/g, '"[^"]+"')

        //Escape all the regex symbols to avoid errors
        step = escapeRegExp(step);

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
                let text = this.getTextForStep(stepText);
                let id = 'step' + getMD5Id(text);
                steps.push({
                    id: id,
                    reg: new RegExp(this.getRegTextForStep(stepText)),
                    text: text,
                    desc: this.getDescForStep(line),
                    def: Location.create(getOSPath(filePath), Range.create(pos, pos)),
                    count: this.getElementCount(id)
                });
            }
        });
        return steps;
    }

    validateConfiguration(settingsFile: string, stepsPathes: StepSettings, workSpaceRoot: string): Diagnostic[] {
        let res = [];
        stepsPathes.forEach((path) => {
            let files = glob.sync(path, { ignore: '.gitignore' });
            if (!files.length) {
                let searchTerm = path.replace(workSpaceRoot + '/', '');
                let range = getTextRange(workSpaceRoot + '/' + settingsFile, `"${searchTerm}"`);
                res.push({
                    severity: DiagnosticSeverity.Warning,
                    range: range,
                    message: `No steps files found`,
                    source: 'cucumberautocomplete'
                });
            }
        });
        return res;
    }

    populate(root: string, stepsPathes: StepSettings): void {
        let stepsFiles = [];
        this.elements = [];
        stepsPathes.forEach((path) => {
            path = root + '/' + path;
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
        let lineForError = line.replace(/^\s*/, '');
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
                message: `Was unable to find step for "${lineForError}"`,
                source: 'cucumberautocomplete'
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
                let label = step.text.replace(stepPartRe, '');
                return {
                    label: label,
                    kind: CompletionItemKind.Function,
                    data: step.id,
                    sortText: getSortPrefix(step.count, 5) + '_' + label
                };
            });
        return res.length ? res : null;
    }

    getCompletionResolve(item: CompletionItem): CompletionItem {
        this.incrementElementCount(item.data);
        return item;
    };

}