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
            insertText: `${inner.method} = ${inner.namespace}.${inner.method};`
        }
    }
    
    
    /**
     * Gets an item, including an import at the top if required
     */
    public static getInlineItem(inner: ICacheFile): CompletionItem {
        return {
            label: inner.method + (this.ShowNamespace ? " (" + inner.namespace + ")" : ""),
            kind: CompletionItemKind.Function,
            insertText: `${inner.method}\u200B\u200B`
        }
    }
    
    
    /**
     * Gets a cmmon JS implementation of an import
     */
    public static getItemCommonJS(inner: ICacheFile):CompletionItem {
        return {
            label: inner.method + (this.ShowNamespace ? " (" + inner.namespace + ")" : ""),
            kind: CompletionItemKind.Function,
            insertText: `{ ${inner.method} } from "${GetCommonJSPath(inner)}";`
        }
    }
    
    
    /**
     * Gets a cmmon JS implementation of an import
     */
    public static getInlineItemCommonJS(inner: ICacheFile):CompletionItem {
        return {
            label: inner.method,
            kind: CompletionItemKind.Function,
            insertText: `${inner.method}\u200B\u200B`
        }
    }
}