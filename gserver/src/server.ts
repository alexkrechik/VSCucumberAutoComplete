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
import StepsHandler, { StepSettings } from './steps.handler';
import PagesHandler, { PagesSettings } from './pages.handler';
import { getOSPath } from './util';

interface Settings {
    cucumberautocomplete: {
        steps: StepSettings,
        pages: PagesSettings,
        syncfeatures: boolean | string
    }
}

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
let pagesHandler: PagesHandler;

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

function handleSteps(): boolean {
    let s = settings.cucumberautocomplete.steps;
    return s && s.length ? true : false;
}

function handlePages(): boolean {
    let p = settings.cucumberautocomplete.pages;
    return p && Object.keys(p).length ? true : false;
}

function pagesPosition(line: string, char: number): boolean {
    if (handlePages() && pagesHandler.getFeaturePosition(line, char)) {
        return true;
    } else {
        return false;
    }
}

connection.onDidChangeConfiguration(change => {
    settings = <Settings>change.settings;
    //We should get array from step string if provided
    settings.cucumberautocomplete.steps = Array.isArray(settings.cucumberautocomplete.steps)
        ? settings.cucumberautocomplete.steps : [settings.cucumberautocomplete.steps];
    if (handleSteps()) {
        stepsHandler = new StepsHandler(workspaceRoot, settings.cucumberautocomplete.steps, settings.cucumberautocomplete.syncfeatures);
        let sFile = '.vscode/settings.json';
        let diagnostics = stepsHandler.validateConfiguration(sFile, settings.cucumberautocomplete.steps, workspaceRoot);
        connection.sendDiagnostics({ uri: getOSPath(workspaceRoot + '/' + sFile), diagnostics });
    }
    handlePages() && (pagesHandler = new PagesHandler(workspaceRoot, settings.cucumberautocomplete.pages));
});

function populateHandlers() {
    handleSteps() && stepsHandler.populate(workspaceRoot, settings.cucumberautocomplete.steps);
    handlePages() && pagesHandler.populate(workspaceRoot, settings.cucumberautocomplete.pages);
}

documents.onDidOpen(() => {
    populateHandlers();
});

connection.onCompletion((position: TextDocumentPositionParams): CompletionItem[] => {
    let text = documents.get(position.textDocument.uri).getText().split(/\r?\n/g);
    let line = text[position.position.line];
    let char = position.position.character;
    if (pagesPosition(line, char)) {
        return pagesHandler.getCompletion(line, position.position);
    }
    if (handleSteps()) {
        return stepsHandler.getCompletion(line, position.position);
    }
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    if (~item.data.indexOf('step')) {
        return stepsHandler.getCompletionResolve(item);
    }
    if (~item.data.indexOf('page')) {
        return pagesHandler.getCompletionResolve(item);
    }
    return item;
});

function validate(text: string): Diagnostic[] {
    return text.split(/\r?\n/g).reduce((res, line, i) => {
        let diagnostic;
        if (handleSteps() && (diagnostic = stepsHandler.validate(line, i))) {
            res.push(diagnostic);
        } else if (handlePages()) {
            let pagesDiagnosticArr = pagesHandler.validate(line, i);
            res = res.concat(pagesDiagnosticArr);
        }
        return res;
    }, []);
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
    if (pagesPosition(line, char)) {
        return pagesHandler.getDefinition(line, char);
    }
    if (handleSteps) {
        return stepsHandler.getDefinition(line, char);
    }
});

function getIndent(options: FormattingOptions): string {
    let { insertSpaces, tabSize } = options;
    return insertSpaces ? ' '.repeat(tabSize) : '\t';
}

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
    let text = documents.get(params.textDocument.uri).getText();
    let textArr = text.split(/\r?\n/g);
    let indent = getIndent(params.options);
    let range = Range.create(Position.create(0, 0), Position.create(textArr.length - 1, textArr[textArr.length - 1].length));
    return [TextEdit.replace(range, format(indent, text))];
});

connection.onDocumentRangeFormatting((params: DocumentRangeFormattingParams): TextEdit[] => {
    let text = documents.get(params.textDocument.uri).getText();
    let textArr = text.split(/\r?\n/g);
    let range = params.range;
    let indent = getIndent(params.options);
    range = Range.create(Position.create(range.start.line, 0), Position.create(range.end.line, textArr[range.end.line].length));
    text = textArr.splice(range.start.line, range.end.line - range.start.line + 1).join('\r\n');
    return [TextEdit.replace(range, format(indent, text))];
});

connection.listen();