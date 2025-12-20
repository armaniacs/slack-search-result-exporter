"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = {
    selectedPreset: "week"
};
function isDatePreset(value) {
    return ["today", "yesterday", "week", "month"].includes(value);
}
class SettingsManager {
    async get(key) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(key, (items) => {
                if (chrome.runtime.lastError) {
                    resolve({
                        success: false,
                        error: {
                            code: "STORAGE_READ_ERROR",
                            message: chrome.runtime.lastError.message || "Unknown error"
                        }
                    });
                    return;
                }
                const value = items[key];
                // Validation and fallback
                if (key === 'selectedPreset') {
                    if (isDatePreset(value)) {
                        resolve({ success: true, value: value });
                    }
                    else {
                        resolve({ success: true, value: exports.DEFAULT_SETTINGS.selectedPreset });
                    }
                }
                else {
                    // For unknown keys (should not happen with types), return undefined or handle gracefully
                    resolve({ success: true, value: value });
                }
            });
        });
    }
    async set(key, value) {
        return new Promise((resolve) => {
            const items = { [key]: value };
            chrome.storage.sync.set(items, () => {
                if (chrome.runtime.lastError) {
                    const message = chrome.runtime.lastError.message || "";
                    const code = message.includes("Quota") ? "STORAGE_QUOTA_EXCEEDED" : "STORAGE_WRITE_ERROR";
                    resolve({
                        success: false,
                        error: {
                            code,
                            message: message || "Unknown error"
                        }
                    });
                    return;
                }
                resolve({ success: true, value: undefined });
            });
        });
    }
    async setAll(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(settings, () => {
                if (chrome.runtime.lastError) {
                    const message = chrome.runtime.lastError.message || "";
                    const code = message.includes("Quota") ? "STORAGE_QUOTA_EXCEEDED" : "STORAGE_WRITE_ERROR";
                    resolve({
                        success: false,
                        error: {
                            code,
                            message: message || "Unknown error"
                        }
                    });
                    return;
                }
                resolve({ success: true, value: undefined });
            });
        });
    }
    async getAll() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(null, (items) => {
                if (chrome.runtime.lastError) {
                    resolve({
                        success: false,
                        error: {
                            code: "STORAGE_READ_ERROR",
                            message: chrome.runtime.lastError.message || "Unknown error"
                        }
                    });
                    return;
                }
                const settings = { ...exports.DEFAULT_SETTINGS };
                if (items) {
                    if (isDatePreset(items.selectedPreset)) {
                        settings.selectedPreset = items.selectedPreset;
                    }
                }
                resolve({ success: true, value: settings });
            });
        });
    }
    async clear() {
        return new Promise((resolve) => {
            chrome.storage.sync.clear(() => {
                if (chrome.runtime.lastError) {
                    resolve({
                        success: false,
                        error: {
                            code: "STORAGE_WRITE_ERROR",
                            message: chrome.runtime.lastError.message || "Unknown error"
                        }
                    });
                    return;
                }
                resolve({ success: true, value: undefined });
            });
        });
    }
}
exports.SettingsManager = SettingsManager;
//# sourceMappingURL=settings-manager.js.map