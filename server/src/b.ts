/// =============================
/// Array 
/// =============================

interface Array<T> {
    clone(): Array<T>;
}

/**
 * Fixes Typings wrong implementation
 */
interface TextDocumentIdentifier {
    /**
     * The text document's uri.
     */
    uri: string;
    
    /**
     * Text doc position
     */
    position: {
        character: number,
        line: number
    }
}