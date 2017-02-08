/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext, Uri, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

import ServerSettings = require('./Settings/ServerSettings');
import ApplicationGlobals = require('./Application/ApplicationGlobals');
import ClientSettings = require('./Settings/ClientSettings');
import TSWatcher = require("./Watcher/TSWatcher");

/// ===================================
/// Can't namespace this function, so everything on the inside is just a variable
/// ===================================

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('server', 'Server.js'));
    
    ApplicationGlobals.Client = new LanguageClient('TypeScript Importer', ServerSettings.getServerSettings(serverModule), ClientSettings);
	ApplicationGlobals.Client.onReady().then(() => {
		new TSWatcher();
	})

	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	context.subscriptions.push(ApplicationGlobals.Client.start());
}