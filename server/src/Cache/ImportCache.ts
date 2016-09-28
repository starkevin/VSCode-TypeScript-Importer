import ICacheFile = require('../../src/Cache/ICacheFile');
import IFramework = require('./IFramework');
import { CompletionItem, CompletionItemKind, TextEdit } from 'vscode-languageserver';
import OS = require('os');

class ImportCache {
    
    
    /// ======================
    /// Properties
    /// ======================
    
    
    /**
     * Cache
     */
    private _namespaceCache: ICacheFile[][] = [];
    
    
    /**
     * Temp
     */
    private _frameworkList: ICacheFile[][] = [];
    
    
    /**
     * Cache
     */
    private _cache: ICacheFile[][];
    
    
    /**
     * Show namespace
     */
    public showNamespace: boolean = true;
    
    
    /**
     * URI
     */
    public uri: string;
    
    
    /**
     * Workspace root
     */
    public root: string;
    
    
    /// ======================
    /// Methods
    /// ======================
    
    
    /**
     * Resets everything
     */
    public reset():void{
        this._frameworkList = [];
        this._namespaceCache = [];
        this._cache = null;
    }
    
    
    /**
     * Registers a framework
     */
    public registerFramework(framework: IFramework):void {
        /// Validate
        if(!this._frameworkList[framework.name]){
            this._frameworkList[framework.name] = [];
        }
        
        /// Register the dependancies
        if(framework.dependancies){
            for(let element of framework.dependancies){
                /// We're just reading arbitrerily, so make sure that we have something to hit
                if(!this._frameworkList[element]){
                    this._frameworkList[element] = [];
                }
                
                /// We add the array reference, rather than individual files
                this._frameworkList[framework.name].push(this._frameworkList[element]);
            }
        }
    }
    
    
    /**
     * Registers a namespace and method list
     */
    public register(file: ICacheFile): void{
        /// Ensure the namespace exists
        if(!this._namespaceCache[file.namespace]){
            this._namespaceCache[file.namespace] = [];
        };
        
        var cacheFile: ICacheFile = {  
            namespace: file.namespace,
            method: file.methods[0],
            path: file.path.replace(/(\.ts|\.js)/, ""),
            commonJS: file.commonJS
        };
        
        /// file.path = "/e:/2016/Web/JS/SnowStorm/src/SnowStormLauncher/src/AvatarBuilder/Events/ProgressEvent.ts"
        /// Here we add the namespace to our framework path
        for(let element in this._frameworkList){
            if(file.path.indexOf(element) > -1){
                this._frameworkList[element].push(cacheFile);
                break;
            }
        }
        
        /// Store the info in a namespace cache
        this._namespaceCache[file.namespace].push(cacheFile);
        
        /// Last element has been added
        file.methods.shift();
        
        /// If we still have any left, repeat this process. Internal exports need to be included
        if(file.methods.length > 0){
            this.register(file);
        }
    }
    
    
    /**
     * Gets items for when we're typing "import"
     */
    public getOnImport(): CompletionItem[] {
        var fullList = this.getAll();
        
        if(!fullList){
            return [];
        }
        
        /// TODO: This blows
        /// We're looking to find our framework to see if it's common or not
        for(let element in this._frameworkList){
            if(~~this.uri.indexOf(element)){
                let target = this._frameworkList[element][this._frameworkList[element].length - 1];
                method = target.commonJS ? this.getItemCommonJS : this.getItem;
                break;
            }
        }
        
        var list: CompletionItem[] = [];
        var method: (inner: ICacheFile) => CompletionItem;
        
        for(let element of fullList){
            /// Don't show hints for the current file, otherwise we end up importing into ourselves
            if(~~this.uri.indexOf(element.path)) {
                list.push(method.call(this, element));
            }
        }
        
        return list;
    }
    
    
    /**
     * Gets item for when we're typing "let/var element: "
     */
    public getOnTypeHint(): CompletionItem[] {
        var fullList = this.getAll();
        
        if(!fullList){
            return [];
        }
        
        for(let element in this._frameworkList){
            if(this.uri.indexOf(element) > -1){
                let target = this._frameworkList[element][this._frameworkList[element].length - 1];
                method = target.commonJS ? this.getSpecialItemCommonJS : this.getSpecialItem;
                break;
            }
        }
        
        var list: CompletionItem[] = [];
        var method: (inner: ICacheFile) => CompletionItem;
        
        for(let element of fullList){
            list.push(method.call(this, element));
        }
        
        return list;
    }
    
    
    /**
     * Gets a cacheFile from method name
     */
    public getFromMethodName(name: string): ICacheFile {
        var fullList = this.getAll();
        
        /// Find our target, then link it up as required
        for(var element of fullList){
            if(element.method === name || element.namespace === name){
                if(element.commonJS){
                    return {
                        commonJS: true,
                        namespace: element.namespace,
                        path: `{ ${element.method} } from "${this.getCommonJSPath(element)}";`,
                        method: ""
                    }
                }
                
                return element;
            }
        }
        
        /// Not found
        return null;
    }
    
    
    /**
     * Returns all entries, including those from the framework
     * TODO: Need to cache this, getting it each time is wasteful
     */
    private getAll(): ICacheFile[] {
        var limit = 0;
        var list: ICacheFile[] = [];
        var target: ICacheFile[][];
        
        /// file.path = "/e:/2016/Web/JS/SnowStorm/src/SnowStormLauncher/src/AvatarBuilder/Events/ProgressEvent.ts"
        /// Here we add the namespace to our framework path
        for(var element in this._frameworkList){
            if(this.uri.indexOf(element) > -1){
                target = this._frameworkList[element] as any;
                list = this._frameworkList[element].clone();
                
                /// Try to return a cached value, can't do this any sooner
                if(this._cache && this._cache[element]){
                    return this._cache[element];
                }
                
                break;
            }
        }
        
        /// We now loop over what's available
        for(var i = 0; i < target.length - 1; i++){
            /// If it's an array
            if(target[i].length){
                 list.splice(i,1);
                 
                 /// Concat into each other
                 list = list.concat(target[i]);
            }
        }
        
        /// Cache
        if(!this._cache){
            this._cache = [];
        }
        this._cache[element] = list;
        
        /// Pass across
        return list;
    }
    
    
    /**
     * Gets an item
     */
    private getItem(inner: ICacheFile):CompletionItem {
        return {
            label: inner.method + (this.showNamespace ? " (" + inner.namespace + ")" : ""),
            kind: CompletionItemKind.Function,
            insertText: inner.method + " = " + inner.namespace + "." + inner.method + ";"
        }
    }
    
    
    /**
     * Gets an item, including an import at the top if required
     */
    private getSpecialItem(inner: ICacheFile): CompletionItem {
        return {
            label: inner.method + (this.showNamespace ? " (" + inner.namespace + ")" : ""),
            kind: CompletionItemKind.Function,
            insertText: inner.method + "\u200B\u200B"
        }
    }
    
    
    /**
     * Gets a cmmon JS implementation of an import
     */
    private getItemCommonJS(inner: ICacheFile):CompletionItem {
        return {
            label: inner.method + (this.showNamespace ? " (" + inner.namespace + ")" : ""),
            kind: CompletionItemKind.Function,
            insertText: `{ ${inner.method} } from "${this.getCommonJSPath(inner)}";`
        }
    }
    
    
    /**
     * Gets a cmmon JS implementation of an import
     */
    private getSpecialItemCommonJS(inner: ICacheFile):CompletionItem {
        return {
            label: inner.method,
            kind: CompletionItemKind.Function,
            insertText: inner.method + "\u200B\u200B"
        }
    }
    
    
    /**
     * Gets the path to a commonJS file
     */
    private getCommonJSPath(inner: ICacheFile): string {
        const relativeTargetPath = inner.path.replace(this.root, "");
        const relativeUriPath = this.uri.replace(this.root, "");
        const relativeTargetSplit = relativeTargetPath.split("/");
        const relativeUriSplit = relativeUriPath.split("/");
        relativeUriSplit.pop();
        
        const length = Math.max(relativeTargetSplit.length, relativeUriSplit.length);
        
        let path = "";
        let spacer = "";
        
        /// This is madness
        for(let i = 0; i < length; i++) {
            /// If we're equal, do nothing
            if(relativeUriSplit[i] && relativeTargetSplit[i] && relativeUriSplit[i] === relativeTargetSplit[i]) {
                continue;
            /// If we don't match on the side of the target, then go backwards
            } else if(relativeUriSplit[i] && relativeTargetSplit[i] && relativeUriSplit[i] !== relativeTargetSplit[i]) {
                path += "../" + relativeTargetSplit[i];
            /// Otherwise if we both exist, go forwards
            } else if (relativeUriSplit[i] && relativeTargetSplit[i]) {
                path += spacer + relativeUriSplit[i];
            /// If only the uri exists, take that
            } else if (relativeUriSplit[i]) {
                path += spacer + relativeUriSplit[i];
            /// If only the target exists, take that
            } else if (relativeTargetSplit[i]) {
                path += spacer + relativeTargetSplit[i];
            }
            /// Not possible to fail both
            
            /// First element doesn't need a slash
            if(path.length > 0){
                spacer = "/";
            }
        }
        
        /// CommonJS path is relative to where we are
        return "./" + path;
    }
    
}

export = ImportCache;