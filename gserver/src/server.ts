'use strict';

import {
    IPCMessageReader,
    IPCMessageWriter,
    IConnection,
    createConnection,
    TextDocuments,
    InitializeResult,
    Diagnostic,
    DiagnosticSeverity,
    TextDocumentPositionParams,
    CompletionItemKind,
    CompletionItem,
    Definition,
    Location,
    Range,
    Position,
    DocumentFormattingParams,
    TextEdit,
    DocumentRangeFormattingParams,
    FormattingOptions
} from 'vscode-languageserver';

import * as fs from 'fs';
import * as glob from 'glob-fs';

//Create connection and setup communication between the client and server
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);
let workspaceRoot: string;
//Array will be populated with all the steps found
let steps = [];
// Object will be populated with all the pages found
let pages = {};
//Gerkin Reg ex
let gerkinRegEx = /^\s*(Given|When|Then|And) /;
// Object, which contains current configuration
let settings;

//get unique id for the elements ids
let id = {
    x: 0,
    get() {
        return this.x++;
    }
};

interface Step {
    id: string,
    reg: RegExp,
    text: string,
    desc: string,
    def: Definition
}

interface StepLine {
    //Line without 'Given|When|Then|And' part
    stepPart: string,
    //Step, matched to the stepPart, or null if absent
    stepMatch: Step,
    //Start position of line
    start: number,
    //End position of line
    end: number
}

interface PageObject {
    id: string,
    text: string,
    desc: string,
    def: Definition
}

interface Page {
    id: string,
    text: string,
    desc: string,
    def: Definition,
    objects: PageObject[]
}

//Return start, end position and matched (if any) Gherkin step
function handleLine(line: String): StepLine {
    let typeRegEx = /Given |When |Then |And /;
    let typeMatch = line.match(typeRegEx);
    let typePart = typeMatch[0];
    let stepPart = line.replace(gerkinRegEx, '');
    let stepMatch;
    for (let i = 0; i < steps.length; i++) {
        if (stepPart.search(steps[i].reg) !== -1) {
            stepMatch = steps[i];
            break;
        }
    }
    let start = typeMatch.index;
    let end = typeMatch.index + typePart.length + stepPart.length;
    return {
        stepPart: stepPart,
        stepMatch: stepMatch,
        start: start,
        end: end
    };
}

//Validate all the Gherkin lines using steps[] and pages{}
function validate(text: String): Diagnostic[] {
    let lines = text.split(/\r?\n/g);
    let diagnostics: Diagnostic[] = [];
    lines.forEach((line, i) => {
        if (line.search(gerkinRegEx) !== -1) {
            let res = handleLine(line);
            if (!res.stepMatch) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: i, character: res.start },
                        end: { line: i, character: res.end }
                    },
                    message: `Was unable to find step for "${line}"`,
                    source: 'ex'
                });
            } else {
                if (Object.keys(pages).length) {
                    let match = line.match(/"[^"^\s]*"."[^"^\s]*"/g);
                    if (match) {
                        match.forEach(m => {
                            let [page, pageObject] = m.match(/"([^"]*)"/g).map(v => {return v.replace(/"/g, ''); });
                            if (!pages[page]) {
                                let pagePos = line.search(new RegExp(`"${page}"."`)) + 1;
                                diagnostics.push({
                                    severity: DiagnosticSeverity.Warning,
                                    range: {
                                        start: { line: i, character: pagePos },
                                        end: { line: i, character: pagePos + page.length }
                                    },
                                    message: `"${page}" page doesn't exists`,
                                    source: 'ex'
                                });
                            }
                            if (!pages[page] || !pages[page].objects.find((val) => {return val.text === pageObject; })) {
                                let pageObjectPos = line.search(new RegExp(`"."${pageObject}"`)) + 3;
                                diagnostics.push({
                                    severity: DiagnosticSeverity.Warning,
                                    range: {
                                        start: { line: i, character: pageObjectPos },
                                        end: { line: i, character: pageObjectPos + pageObject.length }
                                    },
                                    message: `"${pageObject}" page object for "${page}" page doesn't exists`,
                                    source: 'ex'
                                });
                            }
                        });
                    }
                }
            }
        }
    });
    return diagnostics;
}

interface Settings {
    cucumberautocomplete: AppSettings
}

interface AppSettings {
    steps: string | string[],
    pages?: Object
}

//Add 'file://' for the non-windows OS's and file:/// for windows
function getOSPath(path) {
    if (/win/.test(require('process').platform)) {
        path = 'file:///' + path;
    } else {
        path = 'file://' + path;
    }
    return path;
}

//Get all the steps from provided file
function getFileSteps(filePath: string): Step[] {
    let steps = [];
    let regExpStart, regExpEnd;
    if (settings) {
        regExpStart = settings.cucumberautocomplete.regExpStart || '\/';
        regExpEnd = settings.cucumberautocomplete.regExpEnd || '\/';
    } else {
        regExpStart = '\/';
        regExpEnd = '\/';
    }
    fs.readFileSync(filePath, 'utf8').split(/\r?\n/g).forEach((line, lineIndex) => {
        if (line.search(new RegExp('(Given|When|Then).*' + regExpStart + '.+' + regExpEnd)) !== -1) {
            //Get the '//' match
            let match = line.match(new RegExp(regExpStart + '(.+)' + regExpEnd));
            //Get matched text, remove start and finish slashes
            let matchText = match[1];
            let pos = Position.create(lineIndex, match.index);
            steps.push({
                id: 'step' + id.get(),
                reg: new RegExp(matchText),
                //We should remove text between quotes, '^|$' regexp marks and backslashes
                text: matchText.replace(/^\^|\$$/g, '').replace(/"\([^\)]*\)"/g, '""').replace(/\\/g, ''),
                desc: line.replace(/\{.*/, '').replace(/^\s*/, '').replace(/\s*$/, ''),
                def: Location.create(getOSPath(filePath), Range.create(pos, pos))
            });
        }
    });
    return steps;
}

function getPageObjects(text: string, path: string): PageObject[] {
    let res = [];
    text.split(/\r?\n/g).forEach((line, i) => {
        let poMatch = line.match(/[\s\.]([a-zA-z][^\s^\.]*)\s*[:=]/);
        if (poMatch) {
            let pos = Position.create(i, 0);
            if (!res.find(v => {return v.text === poMatch[1]; })) {
                res.push({
                    id: 'pageObect' + id.get(),
                    text: poMatch[1],
                    desc: line,
                    def: Location.create(getOSPath(path), Range.create(pos, pos))
                });
            }
        }
    });
    return res;
}

//Get Page object
function getPage(name: string, path: string): Page {
    let text = fs.readFileSync(path, 'utf8');
    let zeroPos = Position.create(0, 0);
    return {
        id: 'page' + id.get(),
        text: name,
        desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
        def: Location.create(getOSPath(path), Range.create(zeroPos, zeroPos)),
        objects: getPageObjects(text, path)
    };
}

//Get steps completion
function getStepsCompletion(line: string): CompletionItem[] {
    //Get line part without gherkin (Given When Then)
    let stepPart = line.replace(gerkinRegEx, '');
    //Return all the braces into default state
    stepPart = stepPart.replace(/"[^"]*"/g, '""');
    //We should not obtain last word
    stepPart = stepPart.replace(/[^\s]+$/, '');
    //We should replace/search only string beginning
    let stepPartRe = new RegExp('^' + stepPart);
    return steps
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
}

function getPageCompletion(): CompletionItem[] {
    return Object.keys(pages).map((page) => {
        return {
            label: pages[page].text,
            kind: CompletionItemKind.Function,
            data: pages[page].id
        };
    });
}

function getPageObjectCompletion(page: string): CompletionItem[] {
    return pages[page].objects.map((pageObject) => {
        return {
            label: pageObject.text,
            kind: CompletionItemKind.Function,
            data: pageObject.id
        };
    });
}

//Current position of our cursor
enum PositionType {
    Step,
    Page,
    PageObject
}

interface PositionObject {
    type: PositionType,
    page?: string,
    pageObject?: string
}

function getPositionObject(line: string, position: number): PositionObject {
    let slicedLine = line.slice(0, position);
    let match = slicedLine.match(/"/g);
    if (match && match.length % 2) {
        //Double quote was opened but was not closed
        let pageMatch = slicedLine.match(/"([^"]*)"\."([^"]*)$/);
        let endLine = line.slice(position).replace(/".*/, '');
        if (pageMatch) {
            return {
                type: PositionType.PageObject,
                page: pageMatch[1],
                pageObject: pageMatch[2] + endLine
            };
        } else {
            return {
                type: PositionType.Page,
                page: slicedLine.match(/([^"]*)$/)[1] + endLine
            };
        }
    } else {
        return {type: PositionType.Step};
    }
}

connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
    // setSteps();
    return {
        capabilities: {
            // Full text sync mode
            textDocumentSync: documents.syncKind,
            //Completion will be triggered after every character pressing
            completionProvider: {
                resolveProvider: true,
            },
            definitionProvider : true,
            documentFormattingProvider : true,
            documentRangeFormattingProvider: true
        }
    };
});

function populateStepsAndPageObjects() {
    //Populate steps array
    let stepsPathes = [].concat(settings.cucumberautocomplete.steps);
    steps = [];
    stepsPathes.forEach((path) => {
        glob({ gitignore: true }).readdirSync(path).forEach(f => {
            steps = steps.concat(getFileSteps(f));
        });
    });

    //Populate pages array
    let pagesObj = settings.cucumberautocomplete.pages;
    pages = {};
    Object.keys(pagesObj).forEach((key) => {
        let path = workspaceRoot + '/' + pagesObj[key];
        pages[key] = getPage(key, path);
    });
}

connection.onDidChangeConfiguration((change) => {
    //Get settings object
    settings = <Settings>change.settings;
});

documents.onDidOpen(() => {
    settings && populateStepsAndPageObjects();
});

connection.onCompletion((position: TextDocumentPositionParams): CompletionItem[] => {
    let text = documents.get(position.textDocument.uri).getText().split(/\r?\n/g);
    let line = text[position.position.line];
    let char = position.position.character;
    let positionObj = getPositionObject(line, char);
    if (line.search(gerkinRegEx) !== -1) {
        switch (positionObj.type) {
            case PositionType.Page:
                return getPageCompletion();
            case PositionType.Step:
                return getStepsCompletion(line);
            case PositionType.PageObject:
                return getPageObjectCompletion(positionObj.page);
        }
    }
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    let step = steps.find((el) => {return el.id === item.data; });
    item.detail = step.text;
    item.documentation = step.desc;
    return item;
});

documents.onDidChangeContent((change): void => {
    let changeText = change.document.getText();
    let diagnostics = validate(changeText);
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
    //Populate steps and page objects after every symbol typed
    settings && populateStepsAndPageObjects();
});

connection.onDefinition((position: TextDocumentPositionParams): Definition => {
    let text = documents.get(position.textDocument.uri).getText().split(/\r?\n/g);
    let line = text[position.position.line];
    let char = position.position.character;
    let positionObj = getPositionObject(line, char);
    switch (positionObj.type) {
        case PositionType.Page:
            return pages[positionObj.page].def;
        case PositionType.Step:
            let match = handleLine(line);
            if (match.stepMatch) {
                return match.stepMatch.def;
            }
        case PositionType.PageObject:
            return pages[positionObj.page].objects
                .find((el) => { return positionObj.pageObject === el.text; }).def;
    }
});

interface FormatConf {
    text: string,
    indents: number
}

let formatConf = [
    {text: 'Feature:', indents: 0},
    {text: 'Scenario:', indents: 1},
    {text: 'Given', indents: 2},
    {text: 'When', indents: 2},
    {text: 'Then', indents: 2},
    {text: 'And', indents: 2},
    {text: '#', indents: 2}
];

function format(options: FormattingOptions, text: string, range?: Range): TextEdit  {

    //Get indent
    let spaces = options.insertSpaces;
    let tabSize = options.tabSize;
    let indent;
    if (spaces) {
        indent = ' '.repeat(tabSize);
    } else {
        indent = '\t';
    }

    //Get text array
    let textArr = text.split(/\r?\n/g);

    //Use whole document if no range provided
    if (range) {
        range = Range.create(Position.create(range.start.line, 0), Position.create(range.end.line, textArr[range.end.line].length));
        textArr = textArr.splice(range.start.line, range.end.line - range.start.line + 1);
    } else {
        range = Range.create(Position.create(0, 0), Position.create(textArr.length - 1, textArr[textArr.length - 1].length));
    }

    //Get formatted array
    let indentsCount = 0;
    let newTextArr = textArr.map(line => {
        if (line.search(/^\s*$/) !== -1) {
            return '';
        } else {
            let foundFormat = formatConf.find(conf => {
                return (line.search(new RegExp('^\\s*' + conf.text)) !== -1);
            });
            if (foundFormat) {
                indentsCount = foundFormat.indents;
            }
            return line.replace(/^\s*/, indent.repeat(indentsCount));
        }
    });

    //Return TextEdit
    return TextEdit.replace(range, newTextArr.join('\r\n'));
}

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
    let text = documents.get(params.textDocument.uri).getText();
    return [format(params.options, text)];
});

connection.onDocumentRangeFormatting((params: DocumentRangeFormattingParams): TextEdit[] => {
    let text = documents.get(params.textDocument.uri).getText();
    return [format(params.options, text, params.range)];
});

connection.listen();