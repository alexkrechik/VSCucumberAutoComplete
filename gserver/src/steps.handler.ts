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
    CompletionItemKind,
    InsertTextFormat
} from 'vscode-languageserver';

import * as glob from 'glob';
import { settings } from 'cluster';

export type Step = {
    id: string,
    reg: RegExp,
    partialReg: RegExp,
    text: string,
    desc: string,
    def: Definition,
    count: number,
    gherkin: string
};

export type StepsCountHash = {
    [step: string]: number
};

const gherkinWords = escapeRegExp(`하지만|조건|먼저|만일|만약|단|그리고|그러면|那麼|那么|而且|同時|當|当|前提|假設|假定|假如|但是|但し|並且|并且|もし|ならば|ただし|しかし|かつ|و|متى|لكن|عندما|ثم|بفرض|اذاً|כאשר|וגם|בהינתן|אזי|אז|אבל|Якщо|Унда|То|Припустимощо|Припустимо|Онда|Но|Нехай|Лекин|Когато|Када|Кад|Ктомуже|И|Задато|Задати|Задате|Если|Допустим|Дадено|Ва|Бирок|Аммо|Али|Але|Агар|А|І|Și|És|anrhegediga|Zatati|Zakładając|Zadato|Zadate|Zadano|Zadani|Zadan|Youseknowwhenyousegot|Youseknowlikewhen|Yna|Yaknowhow|Yagotta|Y|Wun|Wtedy|Wheny'all|When|Wenn|WEN|Và|Ve|Und|Un|Thì|Theny'all|Then|Tapi|Tak|Tada|Tad|Så|Stel|Soit|Siis|Si|Quando|Quand|Quan|Pryd|Pokud|Pokiaľ|Però|Pero|Pak|Oraz|Onda|Ond|Oletetaan|Og|Och|Ozaman|Når|När|Niin|Nhưng|N|Mutta|Men|Mas|Maka|Majd|Mais|Maar|Ma|Lorsque|Lorsqu'|Kun|Kuid|Kui|Khi|Keď|Ketika|Když|Kai|Kada|Kad|Jeżeli|Ja|Ir|ICANHAZ|I|Ha|Givun|Givet|Giveny'all|Given|Gitt|Gegeven|Gegebensei|Fakat|Eğerki|Etantdonné|Et|Então|Entonces|Entao|En|Eeldades|E|Duota|Dun|Donat|Donada|Diyelimki|Dengan|Denyousegotta|De|Dato|Dar|Dann|Dan|Dado|Dacă|Daca|DEN|Când|Cuando|Cho|Cept|Cand|Cal|Buty'all|But|Buh|Biết|Bet|BUT|Atès|Atunci|Atesa|Angenommen|Andy'all|And|An|Ama|Als|Alors|Allora|Ali|Aleshores|Ale|Akkor|Aber|AN|Ataké|A`);

export default class StepsHandler {

    elements: Step[];

    elementsHash: { [step: string]: boolean } = {};

    elemenstCountHash: StepsCountHash = {};

    settings: Settings;

    constructor(root: string, settings: Settings) {
        const { steps, syncfeatures } = settings.cucumberautocomplete;
        this.settings = settings;
        this.populate(root, steps);
        if (syncfeatures === true) {
            this.setElementsHash(`${root}/**/*.feature`);
        } else if (typeof syncfeatures === 'string') {
            this.setElementsHash(`${root}/${syncfeatures}`);
        }
    }

    getGherkinRegEx() {
        return new RegExp(`^(\\s*)(${gherkinWords})(\\s+)(.*)`);
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
                const match = line.match(this.getGherkinRegEx());
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
        const gherkinPart = `(${gherkinWords}|defineStep)`;

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

    getPartialRegParts(text: string): string[] {
        // We should separate got string into the parts by space symbol
        // But we should not touch /()/ RegEx elements
        text = this.getRegTextForStep(text);
        let currString = '';
        let bracesMode = false;
        let openingBracesNum;
        let closingBracesNum;
        const res = [];
        for (let i = 0; i <= text.length; i++) {
            const currSymbol = text[i];
            if (i === text.length) {
                res.push(currString);
            } else if (bracesMode) {
                //We should do this hard check to avoid circular braces errors
                if (currSymbol === ')') {
                    closingBracesNum++;
                    if (openingBracesNum === closingBracesNum) {
                        bracesMode = false;
                    }
                }
                if (currSymbol === '(') {
                    openingBracesNum++;
                }
                currString += currSymbol;
            } else {
                if (currSymbol === ' ') {
                    res.push(currString);
                    currString = '';
                } else if (currSymbol === '(') {
                    currString += '(';
                    bracesMode = true;
                    openingBracesNum = 1;
                    closingBracesNum = 0;
                } else {
                    currString += currSymbol;
                }
            }
        }
        return res;
    }

    getPartialRegText(regText: string): string {
        //Same with main reg, only differ is match any string that same or less that current one
        return this.getPartialRegParts(regText)
            .map(el => `(${el}|$)`)
            .join('( |$)')
            .replace(/^\^|^/, '^');
    }

    getTextForStep(step: string): string {

        //Remove all the backslashes
        step = step.replace(/\\/g, '');

        //Remove "string start" and "string end" RegEx symbols
        step = step.replace(/^\^|\$$/g, '');

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
        //TODO - generate correct num of invariants for the circular braces
        const bracesRegEx = /(\([^\)^\()]+\|[^\(^\)]+\))/;
        if (~step.search(bracesRegEx)) {
            const match = step.match(bracesRegEx);
            const matchRes = match[1];
            const variants = matchRes.replace(/\(\?\:/, '').replace(/^\(|\)$/g, '').split('|');
            return variants.reduce((varRes, variant) => {
                return varRes.concat(this.getStepTextInvariants(step.replace(matchRes, variant)));
            }, []);
        } else {
            return [step];
        }
    }

    getCompletionInsertText(step: string, stepPart: string): string {

        // Return only part we need for our step
        let res = step;
        const strArray = this.getPartialRegParts(res);
        const currArray = [];
        const { length } = strArray;
        for (let i = 0; i < length; i++) {
            currArray.push(strArray.shift());
            const r = new RegExp('^' + escapeRegExp(currArray.join(' ')));
            if (!r.test(stepPart)) {
                res = [].concat(currArray.slice(-1), strArray).join(' ');
                break;
            }
        }

        if (this.settings.cucumberautocomplete.smartSnippets) {
            /*
                Now we should change all the 'user input' items to some snippets
                Create our regexp for this:
                1) \(? - we be started from opening brace
                2) \\.|\[\[^\]]\] - [a-z] or \w or .
                3) \*|\+|\{[^\}]+\} - * or + or {1, 2}
                4) \)? - could be finished with opening brace
            */
            const match = res.match(/((?:\()?(?:\\.|\.|\[[^\]]+\])(?:\*|\+|\{[^\}]+\})(?:\)?))/g);
            if (match) {
                for (let i = 0; i < match.length; i++) {
                    const num = i + 1;
                    res = res.replace(match[i], () => '${' + num + ':}');
                }
            }
        }

        return res;
    }

    getSteps(fullStepLine: string, stepPart: string, def: Location, gherkin: string): Step[] {
        const stepsVariants = this.settings.cucumberautocomplete.stepsInvariants ?
            this.getStepTextInvariants(stepPart) : [stepPart];
        const desc = this.getDescForStep(fullStepLine);
        return stepsVariants.map((step) => {
            const reg = new RegExp(this.getRegTextForStep(step));
            let partialReg;
            // Use long regular expression in case of error
            try {
                partialReg = new RegExp(this.getPartialRegText(step));
            } catch (err) {
                partialReg = reg;
            }
            //Todo we should store full value here
            const text = this.getTextForStep(step);
            const id = 'step' + getMD5Id(text);
            const count = this.getElementCount(id);
            return { id, reg, partialReg, text, desc, def, count, gherkin };
        });
    }

    getFileSteps(filePath: string): Step[] {
        const definitionFile = clearComments(getFileContent(filePath));
        return definitionFile.split(/\r?\n/g).reduce((steps, line, lineIndex) => {
            const match = this.getMatch(line);
            if (match) {
                const [, beforeGherkin, gherkin, , stepPart] = match;
                const pos = Position.create(lineIndex, beforeGherkin.length);
                const def = Location.create(getOSPath(filePath), Range.create(pos, pos));
                steps = steps.concat(this.getSteps(line, stepPart, def, gherkin));
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

    getStepByText(text: string): Step {
        return this.elements.find(s => s.reg.test(text));
    }

    validate(line: string, lineNum: number): Diagnostic | null {
        line = line.replace(/\s*$/, '');
        const lineForError = line.replace(/^\s*/, '');
        const match = line.match(this.getGherkinRegEx());
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
        const match = line.match(this.getGherkinRegEx());
        if (!match) {
            return null;
        }
        const step = this.getStepByText(match[4]);
        return step ? step.def : null;
    }

    getCompletion(line: string, position: Position): CompletionItem[] | null {
        //Get line part without gherkin part
        const match = line.match(this.getGherkinRegEx());
        if (!match) {
            return null;
        }
        let [, , gherkinPart, , stepPart] = match;
        //We don't need last word in our step part due to it could be incompleted
        stepPart = stepPart.replace(/[^\s]+$/, '');
        const res = this.elements
            //Filter via gherkin words comparing if strictGherkinCompletion option provided
            .filter((step) => this.settings.cucumberautocomplete.strictGherkinCompletion ? step.gherkin === gherkinPart : true)
            //Current string without last word should partially match our regexp
            .filter((step) => step.partialReg.test(stepPart))
            //We got all the steps we need so we could make completions from them
            .map(step => {
                return {
                    label: step.text,
                    kind: CompletionItemKind.Snippet,
                    data: step.id,
                    sortText: getSortPrefix(step.count, 5) + '_' + step.text,
                    insertText: this.getCompletionInsertText(step.text, stepPart),
                    insertTextFormat: InsertTextFormat.Snippet
                };
            });
        return res.length ? res : null;
    }

    getCompletionResolve(item: CompletionItem): CompletionItem {
        this.incrementElementCount(item.data);
        return item;
    };

}
