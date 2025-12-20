"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chromeMock = exports.store = void 0;
exports.resetMock = resetMock;
exports.store = {};
exports.chromeMock = {
    storage: {
        sync: {
            get: (keys, callback) => {
                if (exports.chromeMock.runtime.lastError) {
                    callback({});
                    return;
                }
                let result = {};
                if (typeof keys === 'string') {
                    result[keys] = exports.store[keys];
                }
                else if (Array.isArray(keys)) {
                    keys.forEach(k => {
                        result[k] = exports.store[k];
                    });
                }
                else if (typeof keys === 'object' && keys !== null) {
                    // defaults
                    for (const k in keys) {
                        result[k] = exports.store[k] !== undefined ? exports.store[k] : keys[k];
                    }
                }
                else {
                    // null means all
                    result = { ...exports.store };
                }
                callback(result);
            },
            set: (items, callback) => {
                if (exports.chromeMock.runtime.lastError) {
                    if (callback)
                        callback();
                    return;
                }
                Object.assign(exports.store, items);
                if (callback)
                    callback();
            },
            clear: (callback) => {
                if (exports.chromeMock.runtime.lastError) {
                    if (callback)
                        callback();
                    return;
                }
                for (const key in exports.store)
                    delete exports.store[key];
                if (callback)
                    callback();
            }
        },
        onChanged: {
            listeners: [],
            addListener: (listener) => {
                exports.chromeMock.storage.onChanged.listeners.push(listener);
            },
            // Helper to trigger events
            dispatch: (changes, areaName) => {
                exports.chromeMock.storage.onChanged.listeners.forEach(l => l(changes, areaName));
            }
        }
    },
    runtime: {
        lastError: undefined,
        onMessage: {
            listeners: [],
            addListener: (listener) => {
                exports.chromeMock.runtime.onMessage.listeners.push(listener);
            },
            // Helper to trigger events
            dispatch: (message, sender, sendResponse) => {
                // Return true if any listener returns true (async response)
                return exports.chromeMock.runtime.onMessage.listeners.some(l => l(message, sender, sendResponse) === true);
            }
        },
        sendMessage: (_message, callback) => {
            // Mock sendMessage if needed, currently just a placeholder
            if (callback)
                callback({ success: true });
        }
    }
};
// Reset helper
function resetMock() {
    for (const key in exports.store)
        delete exports.store[key];
    exports.chromeMock.runtime.lastError = undefined;
    exports.chromeMock.runtime.onMessage.listeners = [];
    exports.chromeMock.storage.onChanged.listeners = [];
}
// Global scope injection if needed, but better to use dependency injection or just global.chrome assignment in test setup
// (global as any).chrome = chromeMock;
//# sourceMappingURL=chrome_mock.js.map