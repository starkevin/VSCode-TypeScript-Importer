'use strict';

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection, TextDocumentSyncKind,
	TextDocuments, Diagnostic, DiagnosticSeverity, TextDocumentPositionParams,
	InitializeParams, InitializeResult,
	CompletionItem, CompletionItemKind, Files, Definition, CodeActionParams, Command, DidChangeTextDocumentParams
} from 'vscode-languageserver';
import { CompletionItemFactory } from "./Factory/CompletionItemFactory";
import { TypescriptImporter } from "./Settings/TypeScriptImporterSettings";
import ImportCache = require('./Cache/ImportCache');
import ICacheFile = require('./Cache/ICacheFile');
import CommunicationMethods = require('./Methods/CommunicationMethods');
import IFramework = require('./Cache/IFramework');
import { CompletionGlobals } from "./Factory/Helper/CompletionGlobals";
import { PrototypeAdditions } from "./d";
import OS = require('os');
import fs = require('fs');

/// Can't seem to get this to self instantiate in a node context and actually apply
PrototypeAdditions();

// Create a connection for the server. The connection uses 
// stdin / stdout for message passing
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
connection.onInitialize((params): InitializeResult => {
    CompletionGlobals.Root = params.rootPath.replace(/\\/g, '/');
	return {
		capabilities: {
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: true
			},
            /// Need full sync
            textDocumentSync: TextDocumentSyncKind.Full
		}
	}
});


// /// =================================
// /// Configuration
// /// =================================


/// Maximum amount of imports
let maxNumberOfImports: number;

/// Show namespace on imports
let showNamespaceOnImports: boolean;


// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	const settings = change.settings.TypeScriptImporter as TypescriptImporter;
    showNamespaceOnImports = settings.showNamespaceOnImports || true;
    
    CompletionItemFactory.ShowNamespace = showNamespaceOnImports;
});


/// =================================
/// Importer code
/// =================================


let _importCache = new ImportCache();
let _targetString: string;
let _targetLine: number;
let _fileArray: string[] = [];
let documents = new TextDocuments();
documents.listen(connection);


/// Listen for when we get a notification for a namespace update
connection.onNotification(CommunicationMethods.NAMESPACE_UPDATE, (params: ICacheFile) => {
    if(params){
        _importCache.register(params);
    }
});
3
/// Listen for when we get a notification for a tsconfig update
connection.onNotification(CommunicationMethods.TSCONFIG_UPDATE, (params: IFramework) => {
    if(params){
        _importCache.registerFramework(params);
    }
})

/// Listen for when we get a notification for a tsconfig update
connection.onNotification(CommunicationMethods.RESYNC, () => {
    _importCache.reset();
})


/**
 * When a completion is requested, see if it's an import
 */
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    try {
        // There's no quick way of getting this information without keeping the files permanently in memory...
        // TODO: Can we add some validation here so that we bomb out quicker?
        let text;
        
        /// documents doesn't automatically update
        if(_fileArray[textDocumentPosition.textDocument.uri]){
            text = _fileArray[textDocumentPosition.textDocument.uri];
        } else {
            /// Get this if we don't have anything in cache
            text = documents.get(textDocumentPosition.textDocument.uri).getText();
        }
        
        const input = text.split(OS.EOL);
        _targetLine = textDocumentPosition.position.line;
        _targetString = input[_targetLine];
        
        CompletionGlobals.Uri = decodeURIComponent(textDocumentPosition.textDocument.uri).replace("file:///", "");
        
        /// If we are not on an import, we don't care
        if(_targetString.indexOf("import") !== -1){
            return _importCache.getOnImport(CompletionItemFactory.getItemCommonJS, CompletionItemFactory.getItem);
        /// Make sure it's not a comment (i think?)
        } else if(!_targetString.match(/(\/\/|\*|\w\.$)/)) {
            return _importCache.getOnImport(CompletionItemFactory.getInlineItemCommonJS, CompletionItemFactory.getInlineItem);
        }
    } catch(e) {
        console.warn("Typescript Import: Unable to creation completion items");
        return [];
    }
});


/**
 * This is now mandatory
 */
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    if(item.data && item.data === 365) {
        item.detail = item.label;
    }
    
    return item;
});


/**
 * 
 */
connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
    /// We have to manually remember this on the server
    /// NOTE: don't query doucments if this isn't available
    _fileArray[params.textDocument.uri] = params.contentChanges[0].text;
    
    /// If we have no target, make sure the user hasn't tried to undo and left behind our hidden characters, otherwise the plugin appears to stop working
    if(!_targetString) {
        if(_fileArray[params.textDocument.uri].indexOf("\u200B\u200B") > -1) {
            /// Inform the client to do the change (faster than node FS)
            connection.sendNotification(
                CommunicationMethods.UNDO_SAVE_REQUEST,
                /// CompletionGlobals.Uri?
                [decodeURIComponent(params.textDocument.uri.replace("file:///", ""))]
            );
        }
    } else {
        const content = params.contentChanges[0].text;        
        const contentString = content.split(OS.EOL)[_targetLine];

        /// If there has been a change, aka the user has selected the option
        if(contentString && contentString !== _targetString && !contentString.match(/(\/\/|\*|\w\.$)/)) {
            /// Get the type if we're typing inline
            let result: RegExpExecArray;
            let subString = contentString;
            /// May be multiple results, loop over to see if any match
            while(result = /([:|=]\s*?)?(\w+)[\u200B\u200B]/.exec(subString)) {
                if(result.length >= 3) {
                    let target = _importCache.getFromMethodName(result[2]);
                
                    if(target){
                        /// Inform the client to do the change (faster than node FS)
                        connection.sendNotification(
                            CommunicationMethods.SAVE_REQUEST,
                            /// CompletionGlobals.Uri?
                            [decodeURIComponent(params.textDocument.uri.replace("file:///", "")),
                            target,
                            _targetLine]
                        );
                        
                        _targetString = null;
                        _targetLine = 0;
                        break;
                    }
                }
                
                /// shorten
                subString = subString.slice(result.index + result.length)
            }
            
            if(!contentString.match(/(\w+)[\)|\s]?/)) {
                _targetString = null;
                _targetLine = 0;
            }
        }
    }
});

// Listen on the connection
connection.listen();