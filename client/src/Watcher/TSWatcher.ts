import { workspace, Uri, TextDocument, WorkspaceEdit, Position, Range } from 'vscode';
import CommunicationMethods = require('../Methods/CommunicationMethods');
import ApplicationGlobals = require('../Application/ApplicationGlobals');
import TSFormatter = require('./TSFormatter');
import IFramework = require('./IFramework');
import ITSFile = require('./ITSFile');
import OS = require("os");
import fs = require("fs");
import glob = require("glob");

/**
 * TS Watcher class, communicates with the server when things change
 */
class TSWatcher {
    
    
    /// ===========================
    /// Properties
    /// ===========================
    
    
    /// ===========================
    /// Methods
    /// ===========================
    
    
    /**
     * Find all TSConfig's
     */
    constructor() {
        /// VS-Code workspace can not follow symlinks
        glob(workspace.rootPath + "/**/tsconfig.json", {ignore: "**/node_modules/**", follow: true}, (err: Error, matches: string[]) => {
            if(!err){
                this.onTSConfigComplete(matches);
            }
        });
        
        /**
         * Resync every 15 seconds
         * This NEEDS to be improved to only look at changes, on massive projects it's going to bottleneck
         * Bet365 use case is hitting ~75% CPU briefly
         */
        setInterval(() => {
            /// VS-Code workspace can not follow symlinks
            glob(workspace.rootPath + "/**/tsconfig.json", {ignore: "**/node_modules/**", follow: true}, (err: Error, matches: string[]) => {
                if(!err){
                    ApplicationGlobals.Client.sendNotification({method: CommunicationMethods.RESYNC});
                    
                    /// Resync command after setting up to go and get the files 
                    this.onTSConfigComplete(matches);
                }
            });
        }, (workspace.getConfiguration("TypeScriptImporter").get("SyncInterval") as number) * 1000);
        
        /// save requests from the server
        ApplicationGlobals.Client.onNotification({ method: CommunicationMethods.SAVE_REQUEST },
            (params: string[]) => { 
                this.onSaveRequest(params);
            }
        );
    }
    
    
    /**
     * Once we have the TSConfig files, we can go off and get the TS files
     * NOTE: We exclude node_modules here to avoid I/O overflow
     */
    private onTSConfigComplete(list: string[]):void{
        let count = list.length;
        let scope = this;
        let exclusionList = (workspace.getConfiguration("TypeScriptImporter").get("IgnoreListedFolders") as string).split(",");
        
        list.forEach((item) => {
            for(let element of exclusionList){
                if(item.toLowerCase().indexOf(element.toLowerCase()) > -1){
                    count--;
                    
                    /// Once we have ready them all, then go fetch the files and lets try this
                    if(count === 0){
                        scope.findTSFiles.call(scope);
                    }
                    
                    return;
                }
            }
            
            let framework = item.match(/(\w+)(.tsconfig)/);
            /// If we get a match, then assume this is a framework
            if(framework){
                workspace.openTextDocument(item).then((document: TextDocument) => {
                    count--;
                    
                    /// TSConfig
                    let content: {
                        workflowFiles?,
                        compilerOptions: {
                            module
                        }
                    }
                    
                    try {
                        content = JSON.parse(document.getText());
                    } catch (e) {
                        /// warn maybe?
                    }
                    
                    let response: IFramework = { name: framework[1], dependancies: [] };
                    
                    /// If the TSConfig has JSON
                    if(content){
                        /// if we have a workflowFiles section, we need to do specific logic. Otherwise, look for the config item
                        if (content.workflowFiles){
                            content.workflowFiles.forEach((item) => {
                                /// {!example}
                                if(item.indexOf("!{") > -1){
                                    response.dependancies.push(item.match(/(\w+)/)[1]);
                                }
                            })
                        } else {
                            /// If we have a frameworks section
                            /// This does already return a string, but the compound seems to be confusing the compiler
                            response.dependancies = content[<string>(workspace.getConfiguration("TypeScriptImporter").get("TSConfigFrameworkName"))];
                        }
                        
                        if(content.compilerOptions && content.compilerOptions.module && content.compilerOptions.module.toLowerCase() === "commonjs"){
                            TSFormatter.CommonJS.push(framework[1]);
                        }
                    }
                    
                    /// Register with the server
                    ApplicationGlobals.Client.sendNotification({
                        method: CommunicationMethods.TSCONFIG_UPDATE},
                        response
                    )
                    
                    /// Once we have ready them all, then go fetch the files and lets try this
                    if(count === 0){
                        scope.findTSFiles.call(scope);
                    }
                })
            }
        })
    }
    
    
    /**
     * Find all TS files
     */
    private findTSFiles():void {
        /// VS-Code workspace can not follow symlinks
        glob(workspace.rootPath + "/**/*.ts", {ignore: "**/node_modules/**", follow: true}, (err: Error, matches: string[]) => {
            if(!err){
                this.onTSComplete(matches);
            }
        });
    }
    
    
    /**
     * Once we complete finding the TS files, loop over them and format them for the server
     * We're doing heavy lifting on the client here as we don't want to have to loop over hundreds of files on the server
     * When we aleady have access to them here
     */
    private onTSComplete(list: string[]):void {
        list.forEach((item) => {
            if(item.indexOf(".d.ts") === -1){
                // workspace.openTextDocument(item.path).then((document: TextDocument) => {
                //     ApplicationGlobals.Client.sendNotification({
                //         method: CommunicationMethods.NAMESPACE_UPDATE}, 
                //         TSFormatter.Format(document.getText(), item.path)
                //     );
                // })
                
                /// Workspace crashes, so we're going to use native node
                fs.readFile(item, "utf8", (err, data) => {
                    if(!err){
                        ApplicationGlobals.Client.sendNotification({
                            method: CommunicationMethods.NAMESPACE_UPDATE}, 
                            TSFormatter.Format(data, item)
                        );
                    }
                })
            }
        });
    }
    
    
    /**
     * When we request a save
     */
    private onSaveRequest(params: any[]){
        const edit = new WorkspaceEdit();
        const target: ITSFile = params[1];
        const line: number = params[2];
        var input: string;
        
        if(!target.commonJS){
            input = "    import " + target.method + " = " + target.namespace + "." + target.method + ";" + OS.EOL;
        } else {
            input = "import " + target.path + OS.EOL;
        }
        
        workspace.openTextDocument(Uri.file(params[0])).then((doc: TextDocument) => {
            const common = target.commonJS;
            const split = doc.getText().split(OS.EOL);
            const textTarget = split[line];
            /// Remove the hidden character
            edit.replace(Uri.file(params[0]), new Range(new Position(line, textTarget.indexOf("\u200B\u200B")), new Position(line, textTarget.indexOf("\u200B\u200B") + 2)), "");
            
            if(doc.getText().indexOf(input) === -1){
                if(common) {
                    edit.insert(Uri.file(params[0]), new Position(1, 0), input);
                } else {
                    /// Check if we have a namespace or module
                    if(doc.getText().match(/(^namespace|^module)\s(\w+)/)) {
                        /// Find it
                        for(let i = 0, len = split.length; i < len; i++){
                            if(split[i].match(/(^namespace|^module)\s(\w+)/)) {
                                /// Insert here
                                edit.insert(Uri.file(params[0]), new Position(i + 1, 0), input);
                                break;
                            }
                        }
                    } else {
                        /// Otherwise put it at the top
                        edit.insert(Uri.file(params[0]), new Position(0, 0), input);
                    }
                }
            }
            
            workspace.applyEdit(edit);
        })
    }
    
}

export = TSWatcher;