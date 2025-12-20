"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupListeners = setupListeners;
const settings_manager_js_1 = require("./settings-manager.js");
const settingsManager = new settings_manager_js_1.SettingsManager();
function handleMessage(message, _sender, sendResponse) {
    const msg = message;
    (async () => {
        try {
            switch (msg.type) {
                case 'GET_SETTINGS': {
                    const result = await settingsManager.getAll();
                    if (result.success) {
                        sendResponse({ type: 'SETTINGS_LOADED', payload: result.value });
                    }
                    else {
                        sendResponse({ type: 'SETTINGS_ERROR', error: result.error });
                    }
                    break;
                }
                case 'SAVE_SETTINGS': {
                    if (!msg.payload) {
                        // Runtime check for payload
                        return;
                    }
                    const result = await settingsManager.setAll(msg.payload);
                    if (result.success) {
                        sendResponse({ type: 'SETTINGS_SAVED' });
                    }
                    else {
                        sendResponse({ type: 'SETTINGS_ERROR', error: result.error });
                    }
                    break;
                }
                case 'CLEAR_SETTINGS': {
                    const result = await settingsManager.clear();
                    if (result.success) {
                        sendResponse({ type: 'SETTINGS_SAVED' });
                    }
                    else {
                        sendResponse({ type: 'SETTINGS_ERROR', error: result.error });
                    }
                    break;
                }
            }
        }
        catch (error) {
            console.error("Service Worker Error:", error);
            // Optional: send error response if possible
        }
    })();
    return true; // Keep channel open for async response
}
function handleStorageChange(_changes, areaName) {
    if (areaName === 'sync') {
        // Notify Popup or other parts. Suppress error if no receivers.
        chrome.runtime.sendMessage({ type: 'settings_changed' }, () => {
            // Just check lastError to avoid "Unchecked runtime.lastError"
            if (chrome.runtime.lastError) {
                // No receivers, ignore
            }
        });
    }
}
function setupListeners() {
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.storage.onChanged.addListener(handleStorageChange);
}
// Initialize
setupListeners();
//# sourceMappingURL=service-worker.js.map