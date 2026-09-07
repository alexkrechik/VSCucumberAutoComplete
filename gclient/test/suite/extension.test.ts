import * as assert from 'node:assert';
import * as vscode from 'vscode';

import {
    applyTextEdits,
    definitionUri,
    getDefinitions,
    getExtension,
    getWorkspaceFolder,
    isWorkspaceRelativePath,
    openFixture,
    waitFor,
} from './helpers';

suite('Extension E2E', () => {
    test('activation', async () => {
        const extension = getExtension();
        assert.strictEqual(extension.isActive, false);

        await openFixture('completion.feature');
        await waitFor(
            'automatic extension activation',
            () => Promise.resolve(extension.isActive),
            Boolean
        );
    });

    test('completion and completion resolve', async () => {
        const document = await openFixture('completion.feature');
        const line = 2;
        const position = document.lineAt(line).range.end;
        const executeCompletions = (itemResolveCount?: number) =>
            vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider',
                document.uri,
                position,
                undefined,
                itemResolveCount
            );
        const unresolvedCompletions = await waitFor(
            'unresolved step completion',
            () => executeCompletions(),
            (result) =>
                result.items.some((item) => item.label === 'I complete an e2e step')
        );
        const unresolvedCompletion = unresolvedCompletions.items.find(
            (item) => item.label === 'I complete an e2e step'
        );
        assert.ok(unresolvedCompletion, 'Expected the unresolved step completion.');
        const originalSortText = unresolvedCompletion.sortText;
        assert.ok(originalSortText, 'Expected the completion to have sort text.');

        const resolvedCompletions = await waitFor(
            'resolved step completion',
            () => executeCompletions(10),
            (result) =>
                result.items.some((item) => item.label === 'I complete an e2e step')
        );

        const completion = resolvedCompletions.items.find(
            (item) => item.label === 'I complete an e2e step'
        );
        assert.ok(completion, 'Expected the resolved step completion.');
        assert.ok(completion.insertText instanceof vscode.SnippetString);
        assert.strictEqual(completion.insertText.value, 'e2e step');

        const reorderedCompletions = await waitFor(
            'completion usage ordering after resolve',
            () => executeCompletions(),
            (result) => {
                const reordered = result.items.find(
                    (item) => item.label === 'I complete an e2e step'
                );
                return Boolean(
                    reordered && reordered.sortText !== originalSortText
                );
            }
        );
        const reorderedCompletion = reorderedCompletions.items.find(
            (item) => item.label === 'I complete an e2e step'
        );
        assert.ok(reorderedCompletion);
        assert.notStrictEqual(reorderedCompletion.sortText, originalSortText);
    });

    test('diagnostics', async () => {
        const document = await openFixture('diagnostics.feature');
        const diagnostics = await waitFor(
            'missing-step diagnostics',
            () => Promise.resolve(vscode.languages.getDiagnostics(document.uri)),
            (items) =>
                items.some(
                    (item) =>
                        item.source === 'cucumberautocomplete' &&
                        item.message.includes('undefined e2e step')
                )
        );

        assert.ok(
            diagnostics.some(
                (item) => item.severity === vscode.DiagnosticSeverity.Warning
            )
        );
    });

    test('configuration reload and definition fallback', async () => {
        const document = await openFixture('definition.feature');
        const position = document.lineAt(2).range.end;
        const folder = getWorkspaceFolder();
        const configuration = vscode.workspace.getConfiguration(
            'cucumberautocomplete',
            folder.uri
        );
        const originalSteps = configuration.get<string | string[]>('steps');

        try {
            await configuration.update(
                'steps',
                [],
                vscode.ConfigurationTarget.Workspace
            );
            const definitions = await waitFor(
                'definition fallback after disabling steps',
                () => getDefinitions(document, position),
                (result) =>
                    result.some(
                        (definition) =>
                            definitionUri(definition).toString() ===
                            document.uri.toString()
                    )
            );

            assert.ok(
                definitions.some(
                    (definition) =>
                        definitionUri(definition).toString() ===
                        document.uri.toString()
                )
            );
        } finally {
            await configuration.update(
                'steps',
                originalSteps,
                vscode.ConfigurationTarget.Workspace
            );
        }

        await waitFor(
            'step definition after restoring configuration',
            () => getDefinitions(document, position),
            (result) =>
                result.some((definition) =>
                    isWorkspaceRelativePath(
                        definitionUri(definition),
                        'steps',
                        'steps.js'
                    )
                )
        );
    });

    test('go to definition', async () => {
        const document = await openFixture('definition.feature');
        const line = 2;
        const position = new vscode.Position(
            line,
            document.lineAt(line).text.length - 1
        );
        const definitions = await waitFor(
            'step definition',
            () => getDefinitions(document, position),
            (result) => Array.isArray(result) && result.length > 0
        );
        const [definition] = definitions;
        const targetUri = definitionUri(definition);

        assert.ok(targetUri, 'Definition result did not contain a target URI.');
        assert.ok(isWorkspaceRelativePath(targetUri, 'steps', 'steps.js'));
    });

    test('step configuration accepts a string', async () => {
        const document = await openFixture('definition.feature');
        const position = document.lineAt(2).range.end;
        const folder = getWorkspaceFolder();
        const configuration = vscode.workspace.getConfiguration(
            'cucumberautocomplete',
            folder.uri
        );
        const originalSteps = configuration.get<string | string[]>('steps');

        try {
            await configuration.update(
                'steps',
                [],
                vscode.ConfigurationTarget.Workspace
            );
            const fallbackDefinitions = await waitFor(
                'definition fallback before applying a string configuration',
                () => getDefinitions(document, position),
                (result) =>
                    result.some(
                        (definition) =>
                            definitionUri(definition).toString() ===
                            document.uri.toString()
                    )
            );
            assert.ok(
                fallbackDefinitions.some(
                    (definition) =>
                        definitionUri(definition).toString() ===
                        document.uri.toString()
                )
            );

            await configuration.update(
                'steps',
                'steps/**/*.js',
                vscode.ConfigurationTarget.Workspace
            );
            const definitions = await waitFor(
                'step definition with a string configuration',
                () => getDefinitions(document, position),
                (result) =>
                    result.some((definition) =>
                        isWorkspaceRelativePath(
                            definitionUri(definition),
                            'steps',
                            'steps.js'
                        )
                    )
            );

            assert.ok(
                definitions.some((definition) =>
                    isWorkspaceRelativePath(
                        definitionUri(definition),
                        'steps',
                        'steps.js'
                    )
                )
            );
        } finally {
            await configuration.update(
                'steps',
                originalSteps,
                vscode.ConfigurationTarget.Workspace
            );
        }
    });

    test('formatting', async () => {
        const document = await openFixture('formatting.feature');
        const edits = await waitFor(
            'document formatting edits',
            () =>
                vscode.commands.executeCommand<readonly vscode.TextEdit[]>(
                    'vscode.executeFormatDocumentProvider',
                    document.uri,
                    { insertSpaces: true, tabSize: 2 }
                ),
            (result) => Array.isArray(result) && result.length > 0
        );

        assert.ok(
            edits.some(
                (edit) => edit.range.start.line === 1 && edit.newText === '  '
            ),
            `Expected a Scenario indent edit, got: ${JSON.stringify(edits)}`
        );
        assert.ok(
            edits.some(
                (edit) => edit.range.start.line === 2 && edit.newText === '    '
            ),
            `Expected a step indent edit, got: ${JSON.stringify(edits)}`
        );
    });

    test('range formatting', async () => {
        const document = await openFixture('formatting.feature');
        const range = new vscode.Range(
            new vscode.Position(1, 0),
            document.lineAt(2).range.end
        );
        const edits = await vscode.commands.executeCommand<
            readonly vscode.TextEdit[]
        >(
            'vscode.executeFormatRangeProvider',
            document.uri,
            range,
            { insertSpaces: true, tabSize: 2 }
        );
        const formatted = applyTextEdits(document, edits).split(/\r?\n/);

        assert.strictEqual(formatted[0], 'Feature: E2E formatting');
        assert.strictEqual(formatted[1], '  Scenario: format a feature');
        assert.strictEqual(formatted[2], '    Given I complete an e2e step');
    });

    test('on-type formatting setting', async () => {
        const document = await openFixture('formatting.feature');
        const folder = getWorkspaceFolder();
        const configuration = vscode.workspace.getConfiguration(
            'cucumberautocomplete',
            folder.uri
        );
        const position = document.lineAt(2).range.end;
        const executeOnTypeFormatting = () =>
            vscode.commands.executeCommand<readonly vscode.TextEdit[] | undefined>(
                'vscode.executeFormatOnTypeProvider',
                document.uri,
                position,
                ' ',
                { insertSpaces: true, tabSize: 2 }
            );

        const disabledEdits = await executeOnTypeFormatting();
        assert.strictEqual(disabledEdits, undefined);

        try {
            await configuration.update(
                'onTypeFormat',
                true,
                vscode.ConfigurationTarget.Workspace
            );
            const enabledEdits = await waitFor(
                'enabled on-type formatting',
                executeOnTypeFormatting,
                (edits) => Boolean(edits?.length)
            );
            assert.ok(enabledEdits);
            const formatted = applyTextEdits(document, enabledEdits).split(
                /\r?\n/
            );

            assert.strictEqual(formatted[1], '  Scenario: format a feature');
            assert.strictEqual(
                formatted[2],
                '    Given I complete an e2e step'
            );
        } finally {
            await configuration.update(
                'onTypeFormat',
                false,
                vscode.ConfigurationTarget.Workspace
            );
        }
    });

    test('step file watcher reloads step definitions', async () => {
        const document = await openFixture('watcher.feature');
        const missingMessage = 'I watch a new e2e step';
        const position = document.lineAt(2).range.end;
        await waitFor(
            'missing watched step diagnostics',
            () => Promise.resolve(vscode.languages.getDiagnostics(document.uri)),
            (diagnostics) =>
                diagnostics.some((item) => item.message.includes(missingMessage))
        );

        const folder = getWorkspaceFolder();
        const stepsUri = vscode.Uri.joinPath(folder.uri, 'steps', 'steps.js');
        const originalSteps = await vscode.workspace.fs.readFile(stepsUri);
        const appendedSteps = Buffer.concat([
            Buffer.from(originalSteps),
            Buffer.from(
                '\nWhen(/^I watch a new e2e step$/, function () {});\n'
            ),
        ]);

        try {
            await vscode.workspace.fs.writeFile(stepsUri, appendedSteps);
            const definitions = await waitFor(
                'watched step definition reload',
                () => getDefinitions(document, position),
                (result) =>
                    result.some((definition) =>
                        isWorkspaceRelativePath(
                            definitionUri(definition),
                            'steps',
                            'steps.js'
                        )
                    )
            );
            assert.ok(
                definitions.some((definition) =>
                    isWorkspaceRelativePath(
                        definitionUri(definition),
                        'steps',
                        'steps.js'
                    )
                )
            );

            const diagnostics = await waitFor(
                'watched step diagnostic removal',
                () =>
                    Promise.resolve(
                        vscode.languages.getDiagnostics(document.uri)
                    ),
                (items) =>
                    !items.some((item) =>
                        item.message.includes(missingMessage)
                    )
            );
            assert.ok(
                !diagnostics.some((item) =>
                    item.message.includes(missingMessage)
                )
            );
        } finally {
            await vscode.workspace.fs.writeFile(stepsUri, originalSteps);
        }
    });
});
