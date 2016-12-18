'use strict';

import { IPCMessageReader,
    IPCMessageWriter,
    IConnection,
    createConnection,
    TextDocuments,
    InitializeResult,
    Diagnostic,
    DiagnosticSeverity,
    TextDocumentPositionParams,
    CompletionItemKind,
    CompletionItem
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
			}
        }
    }
});

interface Step {
    id: number,
    reg: RegExp,
    text: string,
    desc: string
}

let steps: Step[] = [
    {id: 1, reg: /^I do something$/, text: 'I do something', desc: 'I do somethig\n\rI do somethig'},
    {id: 2, reg: /I should have "[^"]*"/, text: 'I should have ""', desc: 'I should have "[^"]*"\n\rI should have "[^"]*"'}
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

connection.listen();