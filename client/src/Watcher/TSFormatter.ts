import ITSFile = require("./ITSFile");
import { METHOD_TYPES } from "./../Helper/MethodTypes";

class TSFormatter {
    
    /**
     * Are we using commonJS
     */
    public static CommonJS: string[] = [];
    
    
    /**
     * Formats an input and path for use on the server
     */
    public static Format(input: string, path: string): ITSFile {
        /// Need to support multiple different formats in the same workspace
        /// Check if this file is commonJS (we pull down all TS files, so have no scope to know if this is the case)
        for(let element of this.CommonJS){
            /// TODO: Windows only?
            if(path.indexOf("/" + element + "/") > -1){
                return this.FormatCommonJS(input, path);
            }
        }
        
        var response: ITSFile = {methods: [], namespace: "", path: path, commonJS: false};
        var namespace: RegExpMatchArray;
        
        try {
            /// These files can be massive and cause instability in large projects, we shrink to avoid overflows
            /// Find the namespace
            /// (namespace )[ns_kevin]( {)
            if(input.indexOf("namespace") > -1){
                let shorten = input.substring(input.indexOf("namespace") - 1, input.indexOf("namespace") + 200);
                namespace = shorten.match(/(namespace\s?)(.*[^\s])(\s?{)/);
            } else if (input.indexOf("module") > -1) {
                let shorten = input.substring(input.indexOf("module") - 1, input.indexOf("module") + 200);
                namespace = shorten.match(/(module\s?)(.*[^\s])(\s?{)/);
            }
            
            /// If we're in namespaces and don't have one then the class probably isn't written yet
            if(!namespace){
                return null;
            }
        } catch(e){
            return null;
        }
        
        response.namespace = namespace[2];
        response.methods = this.GetMethods(input);
        
        /// Pass it back
        return response;
    }
    
    
    /**
     * Formats for commonJS
     */
    private static FormatCommonJS(input: string, path: string): ITSFile {
        const methods = this.GetMethods(input, true);
        
        return {methods: methods, namespace: path.match(/((\w+)(\.(ts|js)))/)[2], path: path, commonJS: true};
    }
    
    
    /**
     * Returns all possible methods from a class
     */
    private static GetMethods(input: string, commonJS: boolean = false): string[] {
        /// Find the class or interface
        const methods = [];
        
        /// (export )(class|interface|enum)[ns_kevin]( {)
        const regexp = /(export.)(\w*.)(\w*)/;
        let match: RegExpExecArray;
        let submatch: RegExpExecArray;
        
        while(match = regexp.exec(input)) {
            /// We are at risk of being edge-cased out of existance here
            /// There are many, many different ways of declaring things in TypeScript and here we attempt to filter down
            /// Odds are something is going to be missed here - Internal declaration files make this incredibly difficult
            
            /// export declare namespace {class}        (internal DTS)
            /// export class namespace                  (namespace being the class name)
            if(METHOD_TYPES.indexOf(match[3]) > -1 && (submatch = /(export.)(\w*.)(\w*.)(\w*)/.exec(input))[4]) {
                methods.push(submatch[4]);
                
                /// another way of doing internal declarations
                input = this.GetAdjustedInput(submatch[3], match, input);
            } else if(match[3].length > 0) {
                methods.push(match[3]);
                
                /// another way of doing internal declarations
                input = this.GetAdjustedInput(match[2], match, input);
            } else {
                /// non-ES6 commonJS will fall into here
                /// export = this
                /// export = {this: this}
                // if (commonJS) {
                //     methods.push()
                // }
                
                input = this.GetAdjustedInput(null, match, input);
            }
        }
        
        return methods;
    }
    
    
    /**
     * Adjusts the input based on the incoming, only works for "namespace" atm
     */
    private static GetAdjustedInput(value: string, match: RegExpExecArray, input: string): string {
        if(value !== METHOD_TYPES[0] + " ") {
            input = input.slice(match.index + match.length);
        } else {
            input = "";
        }
        
        return input;
    }
    
}

export = TSFormatter;