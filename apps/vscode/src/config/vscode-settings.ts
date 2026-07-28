import * as vscode from "vscode";
import type { ExtensionConfig } from "../../shared/types";

declare const __EXTENSION_VERSION__: string;
const EXTENSION_VERSION = typeof __EXTENSION_VERSION__ !== "undefined" ? __EXTENSION_VERSION__ : "0.0.0";

const CONFIG_NAMESPACES = ["echadron", "kimi"] as const;

function getConfigValue<T>(key: string, fallback: T): T {
  const modern = vscode.workspace.getConfiguration(CONFIG_NAMESPACES[0]);
  const legacy = vscode.workspace.getConfiguration(CONFIG_NAMESPACES[1]);
  // Prefer explicitly configured Echadron values, then explicitly configured
  // legacy Kimi values. This keeps existing settings working even though the
  // manifest now exposes the Echadron namespace as the primary one.
  for (const config of [modern, legacy]) {
    // Test doubles and older VS Code hosts may only implement `get`; use it
    // when the richer inspection API is unavailable.
    const inspected = typeof config.inspect === "function" ? config.inspect<T>(key) : undefined;
    for (const value of [
      inspected?.workspaceFolderValue,
      inspected?.workspaceValue,
      inspected?.globalValue,
    ]) {
      if (value !== undefined) return value;
    }
  }
  return modern.get<T>(key, legacy.get<T>(key, fallback));
}

export const VSCodeSettings = {
  get yoloMode(): boolean {
    return getConfigValue("yoloMode", false);
  },

  get autosave(): boolean {
    return getConfigValue("autosave", true);
  },

  get enableNewConversationShortcut(): boolean {
    return getConfigValue("enableNewConversationShortcut", false);
  },

  get useCtrlEnterToSend(): boolean {
    return getConfigValue("useCtrlEnterToSend", false);
  },

  get showThinkingContent(): boolean {
    return getConfigValue("showThinkingContent", true);
  },

  get showThinkingExpanded(): boolean {
    return getConfigValue("showThinkingExpanded", false);
  },

  get editorContext(): "never" | "onConversationStart" | "onFileChange" {
    return getConfigValue<"never" | "onConversationStart" | "onFileChange">("editorContext", "never");
  },

  getExtensionConfig(): ExtensionConfig {
    return {
      yoloMode: this.yoloMode,
      autosave: this.autosave,
      useCtrlEnterToSend: this.useCtrlEnterToSend,
      enableNewConversationShortcut: this.enableNewConversationShortcut,
      showThinkingContent: this.showThinkingContent,
      showThinkingExpanded: this.showThinkingExpanded,
      version: EXTENSION_VERSION,
    };
  },
};

export function onSettingsChange(callback: (changedKeys: string[]) => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration("echadron") && !e.affectsConfiguration("kimi")) {
      return;
    }
    const keys = ["yoloMode", "autosave", "enableNewConversationShortcut", "useCtrlEnterToSend", "showThinkingContent", "showThinkingExpanded", "editorContext"];
    const changedKeys = keys.filter(
      (key) => e.affectsConfiguration(`echadron.${key}`) || e.affectsConfiguration(`kimi.${key}`),
    );
    if (changedKeys.length > 0) {
      callback(changedKeys);
    }
  });
}
