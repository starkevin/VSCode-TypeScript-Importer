import { workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions } from 'vscode-languageclient';

// Options to control the language client
let clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: ['typescript', 'plaintext', 'ts', 'javascript', 'js'],
    synchronize: {
        // Synchronize the setting section 'languageServerExample' to the server
        configurationSection: 'TypeScriptImporter',
        // Notify the server about file changes to '.clientrc files contain in the workspace
        fileEvents: workspace.createFileSystemWatcher('**/.ts', false, true, true)
    }
}

export = clientOptions;