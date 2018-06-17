import { safeLoad } from "js-yaml";
import * as merge from "merge";
import * as vscode from 'vscode';
import { workspace } from 'vscode';

export class I18nResolver implements vscode.Disposable {

    private localeMap = {};
    private defaultLocaleKey = "en";
    private fileSystemWatcher;
    private readonly yamlPattern = 'config/locales/**/*.yml';

    /**
     * load ressources
     */
    public load(): void {
        this.loadYamlFiles();
        this.loadDefaultLocale();
        this.registerFileWatcher();
    }

    /**
     * load yaml locale files and generate single map out of them
     * register file watcher and reload changed files into map
     */
    private loadYamlFiles(): void {
        workspace.findFiles(this.yamlPattern).then(files => {
            files.forEach(file => {
                this.loadDocumentIntoMap(file.path);
            });
        });
    }

    private registerFileWatcher(): void {
        this.fileSystemWatcher = workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace.rootPath, this.yamlPattern));
        this.fileSystemWatcher.onDidChange((e: vscode.Uri) => {
            this.loadDocumentIntoMap(e.fsPath);
        });
    }

    private loadDocumentIntoMap(filePath: string) {
        workspace.openTextDocument(filePath).then((document: vscode.TextDocument) => {
            this.localeMap = merge.recursive(false, this.localeMap, safeLoad(document.getText()));
        });
    }

    /**
     * load the default locale
     */
    private loadDefaultLocale(): void {
        this.getDefaultLocale().then(locale => { this.defaultLocaleKey = locale; });
    }

    /**
     * get the default locale configured in application.rb
     * @returns default locale key or 'en' as fallback if default cant be found
     */
    private getDefaultLocale(): Thenable<string> {
        return workspace.openTextDocument(`${workspace.rootPath}/config/application.rb`).then((document: vscode.TextDocument) => {
            let searchResult = document.getText().search(/i18n\.default_locale/g);
            if (!searchResult) {
                return "en";
            }
            let position = document.positionAt(searchResult);
            let lineText = document.lineAt(position.line).text;
            let locale = lineText.split("=")[1].replace(/\:|\ |\'|\"/g, "").trim();
            return locale;
        });
    }

    /**
     * resolve text value for i18n key in default locale
     * @param key i18n key (e.g. "hello.world")
     */
    public getTranslationForKey(key: string): any {
        if (!key) {
            return null;
        }

        let keyParts = this.makeKeyParts(key);
        let lookupResult = this.traverseThroughMap(keyParts);
        if (lookupResult !== null && typeof lookupResult === "object") {
            return this.transformMultiResultIntoText(lookupResult);
        }

        return lookupResult;
    }

    private makeKeyParts(key: string): string[] {
        let keys = key.split(".");
        keys.unshift(this.defaultLocaleKey);
        keys = keys.filter(key => key.length > 0);
        return keys;
    }

    private traverseThroughMap(keyParts: string[]): any {
        let result = this.localeMap;
        keyParts.forEach(keyPart => {
            if (result !== undefined) {
                result = result[keyPart];
            }
        });
        return result;
    }

    private transformMultiResultIntoText(result: object): string {
        // if last part of i18n key is missing (e.g. because its interpolated), 
        // we can still show a list of possible translations 
        let resultLines = [];
        Object.keys(result).forEach(key => {
            let text = result[key];
            if (typeof text === 'object') {
                // values are objects, meaning its not only the last part of the key which is missing
                return null;
            }
            resultLines.push(`${key}: ${text}`);
        });
        return resultLines.join("\n");
    }

    public dispose() {
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }
    }
}