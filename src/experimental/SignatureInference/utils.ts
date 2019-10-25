/**
 * Built from:
 * https://github.com/yunabe/tsapi-completions/blob/a8020c20d5d2235c2443f34688d30c56eb9d5aad/src/completions.spec.ts
 */
import * as fs from "fs";
import * as ts from "typescript";

export class Source {
    // fields
    private srcContent: string;
    private srcName: string;
    private service: ts.LanguageService;
    
    // constructor
    constructor(srcContent) {
        this.srcContent = srcContent;
        this.srcName = 'example.ts';
        this.service = ts.createLanguageService(this._createLanguageServiceHost(), ts.createDocumentRegistry());
    }

    // internal methods
    private _getScriptSnapshot(fileName: string): ts.IScriptSnapshot {
        if (fileName === this.srcName) {
            return ts.ScriptSnapshot.fromString(this.srcContent);
        }
        return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
    }
    private _createLanguageServiceHost(): ts.LanguageServiceHost {
        const files = [this.srcName];

        function readDirectory(
            path: string,
            extensions?: ReadonlyArray<string>,
            exclude?: ReadonlyArray<string>,
            include?: ReadonlyArray<string>,
            depth?: number
        ): string[] {
            console.log("readDirectory:", path);
            return ts.sys.readDirectory(path, extensions, exclude, include, depth);
        }

        return {
            getScriptFileNames: () => files,
            getScriptVersion: () => "0",
            getScriptSnapshot: this._getScriptSnapshot.bind(this),
            getCurrentDirectory: () => process.cwd(),
            getCompilationSettings: () => ({ target: ts.ScriptTarget.ES2017, declaration: true }),
            getDefaultLibFileName: (options: ts.CompilerOptions) => ts.getDefaultLibFilePath(options),
            fileExists: (path: string) => ts.sys.fileExists(path),
            readFile: (path: string, encoding?: string) => { throw new Error("readFile is not implemented") },
            readDirectory
        };
    }

    // external methods
    getSignatureInfo(): ts.SignatureHelpItems {
        return this.service.getSignatureHelpItems(this.srcName, this.srcContent.length-1, {});
    }
}


