'use strict';

import { IPCMessageReader, IPCMessageWriter, IConnection, createConnection, TextDocuments, InitializeResult, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';

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
            textDocumentSync: documents.syncKind
        }
    }
});

interface Step {
    reg: RegExp,
    text: String
}

let steps: Step[] = [
    {reg: /^I do something$/, text: 'I do somethig'},
    {reg: /I should have "[^"]*"/, text: 'I should have ""'}
]

function validate(text: String): Diagnostic[] {
    let lines = text.split(/\r?\n/g);
    let diagnostics: Diagnostic[] = [];
    let gerkinRegEx = /^\s*(Given|When|Then) /;
    let typeRegEx = /Given|When|Then/;
    lines.forEach((line, i) => {
        if (line.search(gerkinRegEx) !== -1) {
            let typeMatch = line.match(typeRegEx);
            let typePart = typeMatch[0];
            let stepMatch: String;
            let stepPart = line.replace(gerkinRegEx, '');
            for (let i = 0; i < steps.length; i++) {
                if (stepPart.search(steps[i].reg) !== -1) {
                    stepMatch = stepPart.match(steps[i].reg)[0];
                    break;
                }
            }
            if (!stepMatch) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: i, character: typeMatch.index },
                        end: { line: i, character: typeMatch.index + typePart.length + stepPart.length + 1}
                    },
                    message: `Was unable to found step for "${line}"`,
                    source: 'ex'
                });
            }
        }
    })
    return diagnostics;
}

documents.onDidChangeContent((change): void => {
    let changeText = change.document.getText();
    let diagnostics = validate(changeText);
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
})

connection.listen();