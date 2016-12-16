'use strict';

import {IPCMessageReader, IPCMessageWriter, IConnection, createConnection} from 'vscode-languageserver';

let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

connection.listen();