import { logger } from "./logger";
import { LookupMapGenerator } from "./lookupMapGenerator";
import * as merge from "merge";

export type Translations = { [key: string]: string | Translations }
export type LookupMap = { [key: string]: string }

export class I18nTree {
    private translations: Translations = {};
    private lookupMap: LookupMap = {};

    public init() {
        this.translations = {};
        this.lookupMap = {};
    }

    public mergeIntoI18nTree(i18nTreePart: object, workspaceFolderName: string) {
        // TODO: detect removed keys and remove them from i18nTree
        this.translations = merge.recursive(
            false,
            this.translations,
            {
                [workspaceFolderName]: i18nTreePart
            }
        );
        this.lookupMap = new LookupMapGenerator(this.translations).generateLookupMap();
    }

    public getKeysStartingWith(keyPart: string): string[] {
        return Object.keys(this.lookupMap).filter(lookupKey => {
            return lookupKey.startsWith(keyPart);
        });
    }

    public translationsForLocaleExist(locale: string, workspaceFolderName: string): boolean {
        if (!this.translations[workspaceFolderName]) {
            return false;
        }
        return !!Object.keys(this.translations[workspaceFolderName]).find(key => key === locale);
    }

    public getFallbackLocale(workspaceFolderName: string): string {
        const workspaceTranslations = this.translations[workspaceFolderName];
        if (workspaceTranslations && Object.keys(workspaceTranslations).length > 0) {
            return Object.keys(workspaceTranslations)[0];
        }
        return 'en';
    }

    /**
     * resolve text value for i18n key in default locale
     * @param key i18n key (e.g. "hello.world")
     */
    public getTranslation(key: string, locale: string, workspaceFolderName: string): any {
        if (!key) {
            return null;
        }

        let keyParts = this.makeKeyParts(key, locale, workspaceFolderName);
        let fullKey = keyParts.join(".");

        let simpleLookupResult = this.lookupMap[fullKey];
        if (typeof simpleLookupResult === "string") {
            logger.debug('key:', key, 'fullKey:', fullKey, 'simpleLookupResult:', simpleLookupResult);
            return simpleLookupResult;
        }

        let lookupResult = this.traverseThroughMap(keyParts);
        logger.debug('key:', key, 'fullKey:', fullKey, 'lookupResult:', lookupResult);
        if (lookupResult !== null && typeof lookupResult === "object") {
            return this.transformMultiResultIntoText(lookupResult);
        }

        return lookupResult;
    }

    public getWorkspaceFolderNames(): string[] {
        return Object.keys(this.translations);
    }

    public lookupKey(key: string): any {
        return this.lookupMap[key];
    }

    private makeKeyParts(key: string, locale: string, workspaceFolderName: string): string[] {
        let keys = key.split(".");
        keys.unshift(locale);
        keys.unshift(workspaceFolderName);
        keys = keys.filter(key => key.length > 0);
        return keys;
    }

    private traverseThroughMap(keyParts: string[]): string | Translations {
        let result: any = this.translations;
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
}

export const i18nTree = new I18nTree();
