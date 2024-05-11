import * as glob from 'glob';
import * as fs from 'fs';

import {
    createConnection,
    TextDocuments,
    InitializeResult,
    Diagnostic,
    TextDocumentPositionParams,
    CompletionItem,
    Range,
    Position,
    DocumentFormattingParams,
    TextEdit,
    DocumentRangeFormattingParams,
    FormattingOptions,
    Location,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    DocumentDiagnosticReportKind,
    DocumentDiagnosticReport,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { format, clearText } from './format';
import StepsHandler from './steps.handler';
import PagesHandler from './pages.handler';
import { getOSPath, clearGherkinComments } from './util';
import { Settings, BaseSettings } from './types';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

//Path to the root of our workspace
let workspaceRoot: string;
// Object, which contains current configuration
let globalSettings: Settings | undefined;
// Elements handlers
let stepsHandler: StepsHandler;
let pagesHandler: PagesHandler;

connection.onInitialize((params: InitializeParams) => {
    workspaceRoot = params.rootPath || '';

    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const result: InitializeResult = {
        capabilities: {
            // Full text sync mode
            textDocumentSync: TextDocumentSyncKind.Full,
            //Completion will be triggered after every character pressing
            completionProvider: {
                resolveProvider: true,
            },
            diagnosticProvider: {
                interFileDependencies: false,
                workspaceDiagnostics: false
            },
            definitionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            documentOnTypeFormattingProvider: {
                firstTriggerCharacter: ' ',
                moreTriggerCharacter: ['@', '#', ':'],
            },
        },
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

async function getSettings() {
    if (!globalSettings) {
        const baseSettings = await connection.workspace.getConfiguration({
            section: 'cucumberautocomplete'
        });
        globalSettings = getSettingsFromBase(baseSettings);
    }
    return globalSettings;
}

function shouldHandleSteps(settings: Settings) {
    const s = settings.steps;
    return s && s.length ? true : false;
}

function shouldHandlePages(settings: Settings) {
    const p = settings.pages;
    return p && Object.keys(p).length ? true : false;
}

function pagesPosition(line: string, char: number, settings: Settings) {
    if (
        shouldHandlePages(settings) &&
    pagesHandler &&
    pagesHandler.getFeaturePosition(line, char)
    ) {
        return true;
    } else {
        return false;
    }
}

async function watchFiles(stepsPathes: string[]) {
    const settings = await getSettings();
    stepsPathes.forEach((path) => {
        glob
            .sync(workspaceRoot + '/' + path, { ignore: '.gitignore' })
            .forEach((f) => {
                fs.watchFile(f, () => {
                    populateHandlers(settings);
                    documents.all().forEach((document) => {
                        const text = document.getText();
                        const diagnostics = validate(clearGherkinComments(text), settings);
                        connection.sendDiagnostics({ uri: document.uri, diagnostics });
                    });
                });
            });
    });
}

function getStepsArray(steps: BaseSettings['steps']) {
    // Set empty array as steps if they were not provided
    if (!steps) {
        return [];
    } 
    if (Array.isArray(steps)) {
        return steps;
    }
    return [steps];
}

function getSettingsFromBase(baseSettings: BaseSettings) {
    const settings: Settings = {
        ...baseSettings,
        steps: getStepsArray(baseSettings.steps),
        pages: baseSettings.pages || {},
    };
    return settings;
}

async function handleStepsAndPagesSetup(settings: Settings) {
    const { pages, steps } = settings;
    if (shouldHandleSteps(settings)) {
        watchFiles(steps);
        stepsHandler = new StepsHandler(workspaceRoot, settings);
        const sFile = '.vscode/settings.json';
        const diagnostics = stepsHandler.validateConfiguration(
            sFile,
            steps,
            workspaceRoot
        );
        connection.sendDiagnostics({
            uri: getOSPath(workspaceRoot + '/' + sFile),
            diagnostics,
        });
    }
    if (shouldHandlePages(settings)) {
        if (pages) {
            watchFiles(Object.keys(pages).map((key) => pages[key]));
        }
        pagesHandler = new PagesHandler(workspaceRoot, settings);
    }
}

connection.onDidChangeConfiguration((change) => {
    globalSettings = getSettingsFromBase(change.settings);
    const settings = globalSettings;
    handleStepsAndPagesSetup(settings);
});

function populateHandlers(settings: Settings) {
    shouldHandleSteps(settings) &&
    stepsHandler &&
    stepsHandler.populate(workspaceRoot, settings.steps);
    shouldHandlePages(settings) &&
    pagesHandler &&
    pagesHandler.populate(workspaceRoot, settings.pages);
}

documents.onDidOpen(async () => {
    const settings = await getSettings();
    handleStepsAndPagesSetup(settings);
    populateHandlers(settings);
});

connection.onCompletion(
    async (position: TextDocumentPositionParams) => {
        const settings = await getSettings();
        const textDocument = documents.get(position.textDocument.uri);
        const text = textDocument?.getText() || '';
        const line = text.split(/\r?\n/g)[position.position.line];
        const char = position.position.character;
        if (pagesPosition(line, char, settings) && pagesHandler) {
            return pagesHandler.getCompletion(line, position.position);
        }
        if (shouldHandleSteps(settings) && stepsHandler) {
            return stepsHandler.getCompletion(line, position.position.line, text);
        }
    }
);

connection.onCompletionResolve((item: CompletionItem) => {
    if (~item.data.indexOf('step')) {
        return stepsHandler.getCompletionResolve(item);
    }
    if (~item.data.indexOf('page')) {
        return pagesHandler.getCompletionResolve(item);
    }
    return item;
});

function validate(text: string, settings: Settings) {
    return text.split(/\r?\n/g).reduce((res, line, i) => {
        let diagnostic;
        if (
            shouldHandleSteps(settings) &&
      stepsHandler &&
      (diagnostic = stepsHandler.validate(line, i, text))
        ) {
            res.push(diagnostic);
        } else if (shouldHandlePages(settings) && pagesHandler) {
            const pagesDiagnosticArr = pagesHandler.validate(line, i);
            res = res.concat(pagesDiagnosticArr);
        }
        return res;
    }, [] as Diagnostic[]);
}

connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (document !== undefined) {
        const settings = await getSettings();
        const text = document.getText();
        const diagnostics = validate(clearGherkinComments(text), settings);
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: diagnostics,
        } satisfies DocumentDiagnosticReport;
    } else {
        // We don't know the document. We can either try to read it from disk
        // or we don't report problems for it.
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: []
        } satisfies DocumentDiagnosticReport;
    }
});

connection.onDefinition(async (position: TextDocumentPositionParams) => {
    const settings = await getSettings();
    const textDocument = documents.get(position.textDocument.uri);
    const text = textDocument?.getText() || '';
    const line = text.split(/\r?\n/g)[position.position.line];
    const char = position.position.character;
    const pos = position.position;
    const { uri } = position.textDocument;
    if (pagesPosition(line, char, settings) && pagesHandler) {
        return pagesHandler.getDefinition(line, char);
    }
    if (shouldHandleSteps(settings) && stepsHandler) {
        return stepsHandler.getDefinition(line, text);
    }
    return Location.create(uri, Range.create(pos, pos));
});

function getIndent(options: FormattingOptions) {
    const { insertSpaces, tabSize } = options;
    return insertSpaces ? ' '.repeat(tabSize) : '\t';
}

connection.onDocumentFormatting(
    async (params: DocumentFormattingParams) => {
        const settings = await getSettings();
        const textDocument = documents.get(params.textDocument.uri);
        const text = textDocument?.getText() || '';
        const textArr = text.split(/\r?\n/g);
        const indent = getIndent(params.options);
        const range = Range.create(
            Position.create(0, 0),
            Position.create(textArr.length - 1, textArr[textArr.length - 1].length)
        );
        const formattedText = format(indent, text, settings);
        const clearedText = clearText(formattedText);
        return [TextEdit.replace(range, clearedText)];
    }
);

connection.onDocumentRangeFormatting(
    async (params: DocumentRangeFormattingParams) => {
        const settings = await getSettings();
        const textDocument = documents.get(params.textDocument.uri);
        const text = textDocument?.getText() || '';
        const textArr = text.split(/\r?\n/g);
        const range = params.range;
        const indent = getIndent(params.options);
        const finalRange = Range.create(
            Position.create(range.start.line, 0),
            Position.create(range.end.line, textArr[range.end.line].length)
        );
        const finalText = textArr
            .splice(
                finalRange.start.line,
                finalRange.end.line - finalRange.start.line + 1
            )
            .join('\r\n');
        const formattedText = format(indent, finalText, settings);
        const clearedText = clearText(formattedText);
        return [TextEdit.replace(finalRange, clearedText)];
    }
);

connection.onDocumentOnTypeFormatting(
    async (params: DocumentFormattingParams) => {
        const settings = await getSettings();
        if (settings.onTypeFormat === true) {
            const textDocument = documents.get(params.textDocument.uri);
            const text = textDocument?.getText() || '';
            const textArr = text.split(/\r?\n/g);
            const indent = getIndent(params.options);
            const range = Range.create(
                Position.create(0, 0),
                Position.create(textArr.length - 1, textArr[textArr.length - 1].length)
            );
            const formattedText = format(indent, text, settings);
            return [TextEdit.replace(range, formattedText)];
        } else {
            return [];
        }
    }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
