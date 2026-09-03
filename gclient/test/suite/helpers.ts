import * as assert from 'node:assert';
import * as path from 'node:path';
import * as vscode from 'vscode';

const extensionId = 'alexkrechik.cucumberautocomplete';
type DefinitionResult = readonly (vscode.Location | vscode.LocationLink)[];

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitFor<T>(
    description: string,
    operation: () => Thenable<T>,
    predicate: (result: T) => boolean,
    timeoutMilliseconds = 15_000
): Promise<T> {
    const deadline = Date.now() + timeoutMilliseconds;
    let lastResult: T | undefined;
    let lastError: unknown;

    while (Date.now() < deadline) {
        try {
            lastResult = await operation();
            lastError = undefined;
        } catch (error) {
            lastError = error;
            await delay(100);
            continue;
        }
        if (predicate(lastResult)) {
            return lastResult;
        }
        await delay(100);
    }

    const detail = lastError instanceof Error
        ? ` Last error: ${lastError.message}`
        : ` Last result: ${JSON.stringify(lastResult)}`;
    throw new Error(`Timed out waiting for ${description}.${detail}`);
}

export function getExtension(): vscode.Extension<unknown> {
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `Extension ${extensionId} was not loaded.`);
    return extension;
}

export async function openFixture(name: string): Promise<vscode.TextDocument> {
    const folder = getWorkspaceFolder();
    const uri = vscode.Uri.joinPath(folder.uri, 'features', name);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    return document;
}

export function getWorkspaceFolder(): vscode.WorkspaceFolder {
    const [folder] = vscode.workspace.workspaceFolders || [];
    assert.ok(folder, 'The E2E fixture workspace must be open.');
    return folder;
}

export function isWorkspaceRelativePath(
    uri: vscode.Uri,
    ...segments: string[]
): boolean {
    const relativePath = path.relative(
        getWorkspaceFolder().uri.fsPath,
        uri.fsPath
    );
    return path.normalize(relativePath) === path.join(...segments);
}

export function applyTextEdits(
    document: vscode.TextDocument,
    edits: readonly vscode.TextEdit[]
): string {
    return [...edits]
        .sort(
            (left, right) =>
                document.offsetAt(right.range.start) -
                document.offsetAt(left.range.start)
        )
        .reduce((text, edit) => {
            const start = document.offsetAt(edit.range.start);
            const end = document.offsetAt(edit.range.end);
            return text.slice(0, start) + edit.newText + text.slice(end);
        }, document.getText());
}

export function definitionUri(
    definition: vscode.Location | vscode.LocationLink
): vscode.Uri {
    return 'targetUri' in definition ? definition.targetUri : definition.uri;
}

export async function getDefinitions(
    document: vscode.TextDocument,
    position: vscode.Position
): Promise<DefinitionResult> {
    return vscode.commands.executeCommand<DefinitionResult>(
        'vscode.executeDefinitionProvider',
        document.uri,
        position
    );
}
