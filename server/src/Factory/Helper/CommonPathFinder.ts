import ICacheFile = require('../../Cache/ICacheFile');
import { CompletionGlobals } from "./CompletionGlobals";

/**
 * Gets the path to a commonJS file
 */
export function GetCommonJSPath(inner: ICacheFile): string {
    const relativeTargetSplit = inner.path.replace(CompletionGlobals.Root, "").split("/");
    const relativeUriSplit = CompletionGlobals.Uri.replace(CompletionGlobals.Root, "").split("/");
    relativeUriSplit.pop();
    
    let path = "";
    let spacer = "";
    
    if(relativeTargetSplit.length !== 1 && relativeUriSplit.length !== 1) {
        let text = "";
        let len = relativeUriSplit.length - 1;
        let tarlen = len > relativeTargetSplit.length ? relativeTargetSplit.length - 1 : len;
        while(len > tarlen || relativeUriSplit[len] !== relativeTargetSplit[tarlen]) {
            text += "../";
            len--;
            
            if(len <= tarlen) {
                tarlen--;
            }
        }
        
        tarlen++;
        for(let i = tarlen; i < relativeTargetSplit.length; i++) {
            text += relativeTargetSplit[i] + "/";
        }
        
        path = text.substring(0, text.length - 1);
    }
    
    /// CommonJS path is relative to where we are
    return "./" + path;
}