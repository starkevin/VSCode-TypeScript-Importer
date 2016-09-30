import ICacheFile = require('../../Cache/ICacheFile');
import { CompletionGlobals } from "./CompletionGlobals";

/**
 * Gets the path to a commonJS file
 */
export function GetCommonJSPath(inner: ICacheFile): string {
    const relativeTargetSplit = inner.path.replace(CompletionGlobals.Root, "").split("/");
    const relativeUriSplit = CompletionGlobals.Uri.replace(CompletionGlobals.Root, "").split("/");
    relativeUriSplit.pop();
    
    const length = Math.max(relativeTargetSplit.length, relativeUriSplit.length);
    let path = "";
    let spacer = "";
    
    /// This is madness, need to come up with a better way of resolving this
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
        
        /// First element doesn't need a slash (Nodev6)
        if(path.length > 0){
            spacer = "/";
        }
    }
    
    /// CommonJS path is relative to where we are
    return "./" + path;
}