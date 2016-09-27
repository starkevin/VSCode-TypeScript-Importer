interface ICacheFile {
    namespace: string;
    methods?: string[];
    method: string;
    path?: string;
    commonJS?: boolean;
}

export = ICacheFile;