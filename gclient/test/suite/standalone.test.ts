import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

import {
    definitionUri,
    getDefinitions,
    getExtension,
    waitFor,
} from './helpers';

suite('Standalone E2E', () => {
    let temporaryDirectory: string;
    let emptyFeatureUri: vscode.Uri;

    suiteSetup(async () => {
        temporaryDirectory = await fs.mkdtemp(
            path.join(os.tmpdir(), 'vscucumber-e2e-')
        );
        emptyFeatureUri = vscode.Uri.file(
            path.join(temporaryDirectory, 'empty.feature')
        );
        await fs.writeFile(emptyFeatureUri.fsPath, '');
    });

    suiteTeardown(async () => {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
    });

    test('empty feature without a workspace', async () => {
        assert.strictEqual(vscode.workspace.workspaceFolders, undefined);

        const configuration = vscode.workspace.getConfiguration(
            'cucumberautocomplete'
        );
        const originalOnTypeFormat = configuration.inspect<boolean>(
            'onTypeFormat'
        )?.globalValue;
        await configuration.update(
            'onTypeFormat',
            true,
            vscode.ConfigurationTarget.Global
        );

        try {
            const extension = getExtension();
            assert.strictEqual(extension.isActive, false);

            const document = await vscode.workspace.openTextDocument(
                emptyFeatureUri
            );
            await vscode.window.showTextDocument(document);
            await waitFor(
                'automatic standalone extension activation',
                () => Promise.resolve(extension.isActive),
                Boolean
            );
            assert.strictEqual(document.getText(), '');
            assert.strictEqual(document.languageId, 'feature');

            const position = new vscode.Position(0, 0);
            const definitions = await waitFor(
                'definition provider for an empty feature',
                () => getDefinitions(document, position),
                (result) => result.length > 0
            );
            assert.strictEqual(
                definitionUri(definitions[0]).toString(),
                document.uri.toString()
            );

            const completions = await vscode.commands.executeCommand<
                vscode.CompletionList
            >(
                'vscode.executeCompletionItemProvider',
                document.uri,
                position
            );
            assert.ok(Array.isArray(completions.items));

            const formattingEdits = await waitFor(
                'formatting provider for an empty feature',
                () =>
                    vscode.commands.executeCommand<readonly vscode.TextEdit[]>(
                        'vscode.executeFormatDocumentProvider',
                        document.uri,
                        { insertSpaces: true, tabSize: 2 }
                    ),
                Array.isArray
            );
            assert.ok(Array.isArray(formattingEdits));

            const emptyRange = new vscode.Range(position, position);
            const rangeEdits = await waitFor(
                'range formatting provider for an empty feature',
                () =>
                    vscode.commands.executeCommand<readonly vscode.TextEdit[]>(
                        'vscode.executeFormatRangeProvider',
                        document.uri,
                        emptyRange,
                        { insertSpaces: true, tabSize: 2 }
                    ),
                Array.isArray
            );
            assert.ok(Array.isArray(rangeEdits));

            const onTypeEdits = await waitFor(
                'on-type formatting provider for an empty feature',
                () =>
                    vscode.commands.executeCommand<readonly vscode.TextEdit[]>(
                        'vscode.executeFormatOnTypeProvider',
                        document.uri,
                        position,
                        ' ',
                        { insertSpaces: true, tabSize: 2 }
                    ),
                Array.isArray
            );
            assert.ok(Array.isArray(onTypeEdits));
        } finally {
            await configuration.update(
                'onTypeFormat',
                originalOnTypeFormat,
                vscode.ConfigurationTarget.Global
            );
        }
    });
});
