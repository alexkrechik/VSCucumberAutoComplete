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

//Create connection and setup communication between the client and server
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
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

interface Step {
    id: number,
    reg: RegExp,
    text: string,
    desc: string,
    def: Definition
}

let steps: Step[] = [
    {
        id: 1,
        reg: /^I do something$/,
        text: 'I do something',
        desc: 'I do somethig\n\rI do somethig',
        def: Location.create(
            'file://' + __dirname + '/../../gclient/test/test.steps.js',
            Range.create(Position.create(14, 17), Position.create(14, 17))
        )
    },
    {
        id: 2,
        reg: /I should have "[^"]*"/,
        text: 'I should have ""',
        desc: 'I should have "[^"]*"\n\rI should have "[^"]*"',
         def: Location.create(
            'file://' + __dirname + '/../../gclient/test/test.steps.js', 
            Range.create(Position.create(5, 17), Position.create(5, 17))
        )
    }
]

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
    let gerkinRegEx = /^\s*(Given|When|Then) /;
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
                    message: `Was unable to found step for "${line}"`,
                    source: 'ex'
                });
            }
        }
    })
    return diagnostics;
}

connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	var res = steps.map((step) => {
        return {
            label: step.text,
            kind: CompletionItemKind.Function,
            data: step.id
        }
    })
    return res;
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	var step = steps.find((el)=>{return el.id === item.data});
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