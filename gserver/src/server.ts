'use strict';

import {
    IPCMessageReader,
    IPCMessageWriter,
    IConnection,
    createConnection,
    TextDocuments,
    InitializeResult,
    Diagnostic,
    TextDocumentPositionParams,
    CompletionItem,
    Definition,
    Range,
    Position,
    DocumentFormattingParams,
    TextEdit,
    DocumentRangeFormattingParams,
    FormattingOptions
} from 'vscode-languageserver';
import { format } from './format';
import StepsHandler from './handlers/steps.handler';

interface Settings {
    cucumberautocomplete: {
        steps: StepsSettings
    }
}
type StepsSettings = string[];

//Create connection and setup communication between the client and server
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);
//Path to the root of our workspace
let workspaceRoot: string;
// Object, which contains current configuration
let settings: Settings;
// Elements handlers
let stepsHandler: StepsHandler;

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
            definitionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true
        }
    };
});

connection.onDidChangeConfiguration((change) => {
    //Get settings object
    settings = <Settings>change.settings;

    //Steps settings. Pathes should be completed with workspaceRoot
    let steps = settings.cucumberautocomplete.steps;
    steps = Array.isArray(steps) ? steps : [steps];
    steps = steps.map(s => {
        return workspaceRoot + '/' + s;
    });
    stepsHandler = new StepsHandler(steps);
});


function populateHandlers() {
    stepsHandler.populate(settings.cucumberautocomplete.steps);
}

documents.onDidOpen(() => {
    populateHandlers();
});

connection.onCompletion((position: TextDocumentPositionParams): CompletionItem[] => {
    let text = documents.get(position.textDocument.uri).getText().split(/\r?\n/g);
    let line = text[position.position.line];
    let char = position.position.character;
    return stepsHandler.getCompletion(line, char);
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return stepsHandler.getCompletionResolve(item);
});

function validate(text: string): Diagnostic[] {
    let res = [];
    text.split(/\r?\n/g).forEach( (line, i) => {
        let diagnostic;
        if (diagnostic = stepsHandler.validate(line, i)) {
            res.push(diagnostic);
        }
    });
    return res;
}

documents.onDidChangeContent((change): void => {
    let changeText = change.document.getText();
    //Validate document
    let diagnostics = validate(changeText);
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
    //Populate steps and page objects after every symbol typed
    populateHandlers();
});

connection.onDefinition((position: TextDocumentPositionParams): Definition => {
    let text = documents.get(position.textDocument.uri).getText().split(/\r?\n/g);
    let line = text[position.position.line];
    let char = position.position.character;
    return stepsHandler.getDefinition(line, char);
});

function getIndent(options: FormattingOptions): string {
    let spaces = options.insertSpaces;
    let tabSize = options.tabSize;
    let indent;
    if (spaces) {
        indent = ' '.repeat(tabSize);
    } else {
        indent = '\t';
    }
    return indent;
}

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
    let text = documents.get(params.textDocument.uri).getText();
    let textArr = text.split(/\r?\n/g);
    let indent = getIndent(params.options);
    let range = Range.create(Position.create(0, 0), Position.create(textArr.length - 1, textArr[textArr.length - 1].length));
    return [TextEdit.replace(range, format(indent, range, text))];
});

connection.onDocumentRangeFormatting((params: DocumentRangeFormattingParams): TextEdit[] => {
    let text = documents.get(params.textDocument.uri).getText();
    let textArr = text.split(/\r?\n/g);
    let range = params.range;
    let indent = getIndent(params.options);
    range = Range.create(Position.create(range.start.line, 0), Position.create(range.end.line, textArr[range.end.line].length));
    text = textArr.splice(range.start.line, range.end.line - range.start.line + 1).join('\r\n');
    return [TextEdit.replace(range, format(indent, range, text))];
});

connection.listen();