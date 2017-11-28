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

export type StepsCountHash = {
    [step: string]: number
};

export default class StepsHandler {

    elements: Step[];

    elementsHash: { [step: string]: boolean } = {};

    elemenstCountHash: StepsCountHash = {};

    constructor(root: string, stepsPathes: StepSettings, sync: boolean | string) {
        this.populate(root, stepsPathes);
        if (sync === true) {
            this.setElementsHash(`${root}/**/*.feature`);
        } else if (typeof sync === 'string') {
            this.setElementsHash(`${root}/${sync}`);
        }
    }

    getElements(): Step[] {
        return this.elements;
    }

    setElementsHash(path: string): void {
        this.elemenstCountHash = {};
        const files = glob.sync(path, { ignore: '.gitignore' });
        files.forEach(f => {
            const text = getFileContent(f);
            text.split(/\r?\n/g).forEach(line => {
                const match = line.match(this.gherkinRegEx);
                if (match) {
                    const step = this.getStepByText(match[4]);
                    if (step) {
                        this.incrementElementCount(step.id);
                    }
                }
            });
        });
        this.elements.forEach(el => el.count = this.getElementCount(el.id));
    }

    incrementElementCount(id: string): void {
        if (this.elemenstCountHash[id]) {
            this.elemenstCountHash[id]++;
        } else {
            this.elemenstCountHash[id] = 1;
        }
    }

    getElementCount(id: string): number {
        return this.elemenstCountHash[id] || 0;
    }

    getStepRegExp(): RegExp {

        //Actually, we dont care what the symbols are before our 'Gherkin' word
        //But they shouldn't end with letter
        const startPart = '^((?:[^\'"\/]*?[^\\w])|.{0})';

        //All the steps should be declared using any gherkin keyword. We should get first 'gherkin' word
        const gherkinPart = '(Given|When|Then|And|But|defineStep)';

        //All the symbols, except of symbols, using as step start and letters, could be between gherkin word and our step
        const nonStepStartSymbols = `[^\/'"\\w]*?`;

        //Step text could be placed between '/' symbols (ex. in JS) or between quotes, like in Java
        const stepStart = `(\/|'|")`;

        //Our step could contain any symbols, except of our 'stepStart'. Use \3 to be sure in this
        const stepBody = '([^\\3]+)';

        //Step should be ended with same symbol it begins
        const stepEnd = '\\3';

        //Our RegExp will be case-insensitive to support cases like TypeScript (...@when...)
        const r = new RegExp(startPart + gherkinPart + nonStepStartSymbols + stepStart + stepBody + stepEnd, 'i');

        // /^((?:[^'"\/]*?[^\w])|.{0})(Given|When|Then|And|But)?[^\/'"\w]*?(\/|'|")([^\3]+)\3/i
        return r;

    }

    getMatch(line: string): RegExpMatchArray {
        return line.match(this.getStepRegExp());
    }

    getRegTextForStep(step: string): string {

        //Ruby interpolation (like `#{Something}` ) should be replaced with `.*`
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/65
        step = step.replace(/#{(.*?)}/g, '.*');

        //Built in transforms
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/66
        step = step.replace(/{float}/g, '-?\\d*\\.?\\d+');
        step = step.replace(/{int}/g, '-?\\d+');
        step = step.replace(/{stringInDoubleQuotes}/g, '"[^"]+"');

        //Handle Cucumber Expressions (like `{Something}`) should be replaced with `.*`
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/99
        //Cucumber Expressions Custom Parameter Type Documentation
        //https://docs.cucumber.io/cucumber-expressions/#custom-parameters
        step = step.replace(/([^\\]){(?![\d,])(.*?)}/g, '$1.*');

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

    getStepTextInvariants(step: string): string[] {
        //Handle regexp's like 'I do (one|to|three)'
        if (~step.search(/(\([^\)^\()]+\|[^\(^\)]+\))/)) {
            const match = step.match(/(\([^\)]+\|[^\)]+\))/);
            const matchRes = match[1];
            const variants = matchRes.replace(/^\(|\)$/g, '').split('|');
            return variants.reduce((varRes, variant) => {
                return varRes.concat(this.getStepTextInvariants(step.replace(matchRes, variant)));
            }, []);
        } else {
            return [step];
        }
    }

    getSteps(fullStepLine: string, stepPart: string, def: Location): Step[] {
        const stepsVariants = this.getStepTextInvariants(stepPart);
        const desc = this.getDescForStep(fullStepLine);
        return stepsVariants.map((step) => {
            const reg = new RegExp(this.getRegTextForStep(step));
            const text = this.getTextForStep(step);
            const id = 'step' + getMD5Id(text);
            const count = this.getElementCount(id);
            return { id, reg, text, desc, def, count };
        });
    }

    getFileSteps(filePath: string): Step[] {
        const definitionFile = clearComments(getFileContent(filePath));
        return definitionFile.split(/\r?\n/g).reduce((steps, line, lineIndex) => {
            const match = this.getMatch(line);
            if (match) {
                const [, beforeGherkin, , , stepPart] = match;
                const pos = Position.create(lineIndex, beforeGherkin.length);
                const def = Location.create(getOSPath(filePath), Range.create(pos, pos));
                steps = steps.concat(this.getSteps(line, stepPart, def));
            }
            return steps;
        }, []);
    }

    validateConfiguration(settingsFile: string, stepsPathes: StepSettings, workSpaceRoot: string): Diagnostic[] {
        return stepsPathes.reduce((res, path) => {
            const files = glob.sync(path, { ignore: '.gitignore' });
            if (!files.length) {
                const searchTerm = path.replace(workSpaceRoot + '/', '');
                const range = getTextRange(workSpaceRoot + '/' + settingsFile, `"${searchTerm}"`);
                res.push({
                    severity: DiagnosticSeverity.Warning,
                    range: range,
                    message: `No steps files found`,
                    source: 'cucumberautocomplete'
                });
            }
            return res;
        }, []);
    }

    populate(root: string, stepsPathes: StepSettings): void {
        this.elementsHash = {};
        this.elements = stepsPathes
            .reduce((files, path) => files.concat(glob.sync(root + '/' + path, { ignore: '.gitignore' })), [])
            .reduce((elements, f) => elements.concat(
                this.getFileSteps(f).reduce((steps, step) => {
                    if (!this.elementsHash[step.id]) {
                        steps.push(step);
                        this.elementsHash[step.id] = true;
                    }
                    return steps;
                }, [])
            ), []);
    }

    gherkinWords = 'Given|When|Then|And|But';
    gherkinRegEx = new RegExp('^(\\s*)(' + this.gherkinWords + ')(\\s+)(.*)');

    getStepByText(text: string): Step {
        return this.elements.find(s => s.reg.test(text));
    }

    validate(line: string, lineNum: number): Diagnostic | null {
        line = line.replace(/\s*$/, '');
        const lineForError = line.replace(/^\s*/, '');
        const match = line.match(this.gherkinRegEx);
        if (!match) {
            return null;
        }
        const beforeGherkin = match[1];
        const step = this.getStepByText(match[4]);
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
        const match = line.match(this.gherkinRegEx);
        if (!match) {
            return null;
        }
        const step = this.getStepByText(match[4]);
        return step ? step.def : null;
    }

    getCompletion(line: string, position: Position): CompletionItem[] | null {
        //Get line part without gherkin part
        const match = line.match(this.gherkinRegEx);
        if (!match) {
            return null;
        }
        let stepPart = match[4];
        //Return all the braces into default state
        stepPart = stepPart.replace(/"[^"]*"/g, '""');
        //We should not obtain last word
        stepPart = stepPart.replace(/[^\s]+$/, '');
        //We should replace/search only string beginning
        const stepPartRe = new RegExp('^' + stepPart);
        const res = this.elements
            .filter(el => el.text.search(stepPartRe) !== -1)
            .map(step => {
                const label = step.text.replace(stepPartRe, '');
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
