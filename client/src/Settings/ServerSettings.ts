import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

/**
 * Settings for the server
 */
class ServerSettings {
    public static getServerSettings(serverModule: string):ServerOptions {
        return {
            run : { module: serverModule, transport: TransportKind.ipc },
            debug: { module: serverModule, transport: TransportKind.ipc, options: debugSettings }
        }
    }
}

let debugSettings:IDebugSettings = {
     execArgv: ["--nolazy", "--debug=6004"]
}

interface IDebugSettings {
    execArgv: string[]
}

export = ServerSettings;