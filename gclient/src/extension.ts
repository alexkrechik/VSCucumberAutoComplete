/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {

	// Node server module
	let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
	
	//Use debug options for the debug mode
	let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}
	
	let clientOptions: LanguageClientOptions = {
		// Register the server for Cucumber feature files
		documentSelector: ['feature'],
		synchronize: {
			configurationSection: 'cucumberautocomplete-server',
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	}
	
	// Create the language client and start the client.
	let disposable = new LanguageClient('cucumberautocomplete-client', 'Cucumber auto complete plugin', serverOptions, clientOptions).start();
	
	//Client will be deactivate on extension deactivation
	context.subscriptions.push(disposable);
}
