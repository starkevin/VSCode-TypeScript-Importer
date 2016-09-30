import ICacheFile = require('../../src/Cache/ICacheFile');
import IFramework = require('./IFramework');
import { CompletionItem, CompletionItemKind, TextEdit } from 'vscode-languageserver';
import { GetCommonJSPath } from "./../Factory/Helper/CommonPathFinder";
import { CompletionGlobals } from "./../Factory/Helper/CompletionGlobals";
import { CompletionItemFactory } from "./../Factory/CompletionItemFactory";
import OS = require('os');

type CompletionType = (inner: ICacheFile) => CompletionItem;

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
        
        const cacheFile: ICacheFile = {  
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
        if(~~file.methods.length){
            this.register(file);
        }
    }
    
    
    /**
     * Gets items for when we're typing "import"
     */
    public getOnImport(commonJsMethod: CompletionType, namespaceJsMethod: CompletionType): CompletionItem[] {
        const fullList = this.getAll();
        let method: CompletionType;
        
        if(!fullList){
            return [];
        }
        
        /// TODO: This blows, surely we can use CompletionGlobals here?
        /// We're looking to find our framework to see if it's common or not
        for(let element in this._frameworkList){
            if(~~CompletionGlobals.Uri.indexOf(element)){
                let target = this._frameworkList[element][this._frameworkList[element].length - 1];
                method = target.commonJS ? commonJsMethod : namespaceJsMethod;
                break;
            }
        }
        
        const list: CompletionItem[] = [];
        
        for(let element of fullList){
            /// Don't show hints for the current file, otherwise we end up importing into ourselves
            if(~~CompletionGlobals.Uri.indexOf(element.path)) {
                list.push(method.call(CompletionItemFactory, element));
            }
        }
        
        return list;
    }
    
    
    /**
     * Gets a cacheFile from method name
     */
    public getFromMethodName(name: string): ICacheFile {
        const fullList = this.getAll();
        
        /// Find our target, then link it up as required
        for(const element of fullList){
            if(element.method === name || element.namespace === name){
                /// Rewrite it for commonJS
                if(element.commonJS){
                    return {
                        commonJS: true,
                        namespace: element.namespace,
                        path: `{ ${element.method} } from "${GetCommonJSPath(element)}";`,
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
     */
    private getAll(): ICacheFile[] {
        let element: string;
        let list: ICacheFile[];
        let target: ICacheFile[] | ICacheFile[][];
        
        /// file.path = "/e:/2016/Web/JS/SnowStorm/src/SnowStormLauncher/src/AvatarBuilder/Events/ProgressEvent.ts"
        /// Here we add the namespace to our framework path
        for(element in this._frameworkList){
            if(CompletionGlobals.Uri.indexOf(element) > -1){
                /// Try to return a cached value, can't do this any sooner, need the framework name
                if(this._cache && this._cache[element]){
                    return this._cache[element];
                }
                
                /// Either an array or an individual file
                target = this._frameworkList[element];
                list = this._frameworkList[element].clone();
                
                break;
            }
        }
        
        /// Can't hit the cache
        /// We now loop over what's available
        for(let i = 0; i < target.length - 1; i++){
            /// If it's an array (framework dep)
            if((target[i] as ICacheFile[]).length){
                 list.splice(i,1);
                 
                 /// Concat into each other
                 list = list.concat((target[i] as ICacheFile[]));
            }
        }
        
        /// Setup the cache for this
        if(!this._cache){
            this._cache = [];
        }
        this._cache[element] = list;
        
        /// Pass across
        return list;
    }
    
}

export = ImportCache;