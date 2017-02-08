import ICacheFile = require('../../src/Cache/ICacheFile');
import { GetCommonJSPath } from "./Helper/CommonPathFinder";
import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';

export class CompletionItemFactory {
    
    
    /**
     * Show namespace
     */
    public static ShowNamespace: boolean = true;
    
    
    /**
     * Gets an item
     */
    public static getItem(inner: ICacheFile):CompletionItem {
        return {
            label: inner.method + (this.ShowNamespace ? " (" + inner.namespace + ")" : ""),
            kind: CompletionItemKind.Function,
            insertText: `${inner.method} = ${inner.namespace}.${inner.method};`,
            data: 365
        }
    }
    
    
    /**
     * Gets an item, including an import at the top if required
     */
    public static getInlineItem(inner: ICacheFile): CompletionItem {
        return {
            label: inner.method + (this.ShowNamespace ? " (" + inner.namespace + ")" : ""),
            kind: CompletionItemKind.Function,
            insertText: `${inner.method}\u200B\u200B`,
            data: 365
        }
    }
    
    
    /**
     * Gets a cmmon JS implementation of an import
     */
    public static getItemCommonJS(inner: ICacheFile):CompletionItem {
        let label: string;
        let insertText: string;
        
        /// Need to deal with legacy and ES6
        if(inner.method){
            label = inner.method + (this.ShowNamespace ? " (" + inner.namespace + ")" : "");
            insertText = `{ ${inner.method} } from "${GetCommonJSPath(inner)}";`;
        } else {
            /// Ignore the flag otherwise we've got nothing to show
            label = inner.namespace;
            insertText = `${inner.namespace} = require("${GetCommonJSPath(inner)}")`;
        }
        
        return {
            label: label,
            kind: CompletionItemKind.Function,
            insertText: insertText 
        }
    }
    
    
    /**
     * Gets a cmmon JS implementation of an import
     */
    public static getInlineItemCommonJS(inner: ICacheFile):CompletionItem {
        let label: string;
        let insertText: string;
        
        /// Need to deal with legacy and ES6
        if(inner.method){
            label = inner.method + (this.ShowNamespace ? " (" + inner.namespace + ")" : "");
            insertText = `${inner.method}\u200B\u200B`;
        } else {
            /// Ignore the flag otherwise we've got nothing to show
            label = inner.namespace;
            insertText = `${inner.namespace}\u200B\u200B`;
        }
        
        return {
            label: label,
            kind: CompletionItemKind.Function,
            insertText: insertText
        }
    }
}