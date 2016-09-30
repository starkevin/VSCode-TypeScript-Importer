'use strict';

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection, TextDocumentSyncKind,
	TextDocuments, ITextDocument, Diagnostic, DiagnosticSeverity,
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
import { PrototypalAdditions } from "./d";
import OS = require('os');
import fs = require('fs');

/// Can't seem to get this to self instantiate in a node context and actually apply
PrototypalAdditions();

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
connection.onNotification({method: CommunicationMethods.NAMESPACE_UPDATE}, (params: ICacheFile) => {
    if(params){
        _importCache.register(params);
    }
});
3
/// Listen for when we get a notification for a tsconfig update
connection.onNotification({method: CommunicationMethods.TSCONFIG_UPDATE}, (params: IFramework) => {
    if(params){
        _importCache.registerFramework(params);
    }
})

/// Listen for when we get a notification for a tsconfig update
connection.onNotification({method: CommunicationMethods.RESYNC}, () => {
    _importCache.reset();
})


/**
 * When a completion is requested, see if it's an import
 */
connection.onCompletion((textDocumentPosition: TextDocumentIdentifier): CompletionItem[] => {
    // There's no quick way of getting this information without keeping the files permanently in memory...
    // TODO: Can we add some validation here so that we bomb out quicker?
    let text;
    
    /// documents doesn't automatically update
    if(_fileArray[textDocumentPosition.uri]){
        text = _fileArray[textDocumentPosition.uri];
    } else {
        /// Get this if we don't have anything in cache
        text = documents.get(textDocumentPosition.uri).getText();
    }
    
    const input = text.split(OS.EOL);
    _targetLine = textDocumentPosition.position.line;
    _targetString = input[_targetLine];
    
    CompletionGlobals.Uri = decodeURIComponent(textDocumentPosition.uri).replace("file:///", "");
    
    /// If we are not on an import, we don't care
    if(_targetString.indexOf("import") !== -1){
        return _importCache.getOnImport(CompletionItemFactory.getItemCommonJS, CompletionItemFactory.getItem);
    /// Make sure it's not a comment (i think?)
    } else if(!_targetString.match(/(\/\/|\*|\w\.$)/)) {
        return _importCache.getOnImport(CompletionItemFactory.getInlineItemCommonJS, CompletionItemFactory.getInlineItem);
    }
});


/**
 * 
 */
connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
    /// We have to manually remember this on the server
    /// NOTE: don't query doucments if this isn't available
    _fileArray[params.uri] = params.contentChanges[0].text;
    
    if(_targetString){
        /// TODO: This is probably windows only
        const content = params.contentChanges[0].text;        
        const contentString = content.split(OS.EOL)[_targetLine];
        
        /// If there has been a change, aka the user has selected the option
        if(contentString !== _targetString && !contentString.match(/(\/\/|\*|\w\.$)/)) {
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
                            { method: CommunicationMethods.SAVE_REQUEST },
                            /// CompletionGlobals.Uri?
                            [decodeURIComponent(params.uri.replace("file:///", "")),
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