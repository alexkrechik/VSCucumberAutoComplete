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
    Position
} from 'vscode-languageserver';

import * as fs from 'fs';

//Create connection and setup communication between the client and server
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);
let workspaceRoot: string;
//Array will be populated with all the steps found
let steps = [];
// Object will be populated with all the pages found
let pages = {};

interface Step {
    id: string,
    reg: RegExp,
    text: string,
    desc: string,
    def: Definition
}

interface stepLine {
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
function handleLine(line: String): stepLine {
    let gerkinRegEx = /^\s*(Given|When|Then|And) /;
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

//Validate all the Gherkin lines using steps[]
function validate(text: String): Diagnostic[] {
    let lines = text.split(/\r?\n/g);
    let diagnostics: Diagnostic[] = [];
    let gerkinRegEx = /^\s*(Given|When|Then|And) /;
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
                let match = line.match(/"[^"]*"."[^"]*"/g);
                if (match) {
                    match.forEach(m => {
                        let [page, pageObject] = m.match(/"([^"]*)"/g).map(v => {return v.replace(/"/g, '')});
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
                        if (!pages[page] || !pages[page].objects.find((val) => {return val.text === pageObject})) {
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
                    })
                }
            }
        }
    })
    return diagnostics;
}

interface Settings {
	cucumberautocomplete: AppSettings
}

interface AppSettings {
    steps: string | string[],
    pages?: Object
}

//Check path, determine its type and get all the possible steps using getFileSteps()
function getAllPathSteps(stepsPath): Step[] {
    let f = fs.lstatSync(stepsPath);
    if (f.isFile()) {
        return getFileSteps(stepsPath);
    } else if(f.isDirectory()) {
        let res = [];
        fs.readdirSync(stepsPath).forEach(val => {
            let filePath = stepsPath + '/' + val;
            if (fs.lstatSync(filePath).isFile() && filePath.match(/\.js/)) {
                res = res.concat(getFileSteps(filePath));
            }
        });
        return res;
    } else {
        throw new Error(stepsPath + 'is not a valid path');
    }
}

//Get all the steps from provided file
function getFileSteps(filePath: string): Step[] {
    let steps = [];
    fs.readFileSync(filePath, 'utf8').split(/\r?\n/g).forEach((line, lineIndex) => {
        if (line.search(/(Given|When|Then).*\/.*\//) !== -1) {
            let match = line.match(/\/[^\/]*\//);
            let pos = Position.create(lineIndex, match.index);
            steps.push({
                id: 'step' + (new Date().getTime()),
                reg: new RegExp(match[0].replace(/\//g, '')),
                text: match[0].replace(/\//g, '').replace(/^\^|\$$/g, '').replace(/"\([^\)]*\)"/g, '""'),
                desc: line.replace(/\{.*/, '').replace(/^\s*/, '').replace(/\s*$/, ''),
                def: Location.create('file://' + filePath, Range.create(pos, pos))
            });
        }
    });
    return steps;
}

function getPageObjects(text: string, path: string): PageObject[] {
    let pageObects = eval(text)();
    let zeroPos = Position.create(0, 0);
    return Object.keys(pageObects).map((key) => {
        return {
            id: 'pageObect' + (new Date().getTime()),
            text: key,
            desc: pageObects[key],
            def: Location.create('file://' + path, Range.create(zeroPos, zeroPos))
        }
    })
}

//Get Page object
function getPage(name: string, path: string): Page {
    let text = fs.readFileSync(path, 'utf8');
    let zeroPos = Position.create(0, 0);
    return {
        id: 'page' + (new Date().getTime()),
        text: name,
        desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
        def: Location.create('file://' + path, Range.create(zeroPos, zeroPos)),
        objects: getPageObjects(text, path)
    }
}

//Get steps completion
function getStepsCompletion(): CompletionItem[] {
    return steps.map((step) => {
        return {
            label: step.text,
            kind: CompletionItemKind.Function,
            data: step.id
        }
    })
}

function getPageCompletion(): CompletionItem[] {
    return Object.keys(pages).map((page) => {
        return {
            label: pages[page].text,
            kind: CompletionItemKind.Function,
            data: pages[page].id
        }
    });
}

function getPageObjectCompletion(page: string): CompletionItem[] {
    return pages[page].objects.map((pageObject) => {
        return {
            label: pageObject.text,
            kind: CompletionItemKind.Function,
            data: pageObject.id
        }
    })
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
            definitionProvider : true
        }
    }
});

connection.onDidChangeConfiguration((change) => {
    
    //Get settings object
    let settings = <Settings>change.settings;

    //Populate steps array
    let stepsPathes = [].concat(settings.cucumberautocomplete.steps);
    steps = [];
    stepsPathes.forEach((path) => {
        path = workspaceRoot + '/' + path;
        steps = steps.concat(getAllPathSteps(path));
    })

    //Populate pages array
    let pagesObj = settings.cucumberautocomplete.pages;
    pages = {};
    Object.keys(pagesObj).forEach((key) => {
        let path = workspaceRoot + '/' + pagesObj[key];
        pages[key] = getPage(key, path);
    })

})

connection.onCompletion((position: TextDocumentPositionParams): CompletionItem[] => {
	let text = documents.get(position.textDocument.uri).getText().split(/\r?\n/g);
    let line = text[position.position.line];
    let slicedLine = line.slice(0, position.position.character);
    let match = slicedLine.match(/"/g);
    if (match && match.length % 2) {
        //Double quote was opened but was not closed
        let pageMatch = slicedLine.match(/"([^"]*)"\."[^"]*$/);
        if (pageMatch) {
            //We have some page so should show all the page objects
            let page = pageMatch[1];
            return getPageObjectCompletion(page);
        } else {
            return getPageCompletion();
        }
    } else {
        return getStepsCompletion();
    }
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	let step = steps.find((el)=>{return el.id === item.data});
    item.detail = step.text;
    item.documentation = step.desc;
	return item;
});

documents.onDidChangeContent((change): void => {
    let changeText = change.document.getText();
    let diagnostics = validate(changeText);
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
})

connection.onDefinition((position: TextDocumentPositionParams): Definition => {
    let text = documents.get(position.textDocument.uri).getText().split(/\r?\n/g);
    let line = text[position.position.line];
    let match = handleLine(line);
    if (match.stepMatch) {
        return match.stepMatch.def;
    }
})

connection.listen();