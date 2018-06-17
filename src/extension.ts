'use strict';

import * as vscode from 'vscode';
import { I18nHoverProvider } from './i18nHoverProvider';
import { I18nResolver } from './i18nResolver';

export let i18nResolver = new I18nResolver();

export function activate(context: vscode.ExtensionContext) {

    i18nResolver.load();

    const HAML = { language: 'haml', scheme: 'file' };
    const ERB = { language: 'erb', scheme: 'file' };

    context.subscriptions.push(vscode.languages.registerHoverProvider(HAML, new I18nHoverProvider()));
    context.subscriptions.push(vscode.languages.registerHoverProvider(ERB, new I18nHoverProvider()));
}

export function deactivate() {
    i18nResolver.dispose();
}