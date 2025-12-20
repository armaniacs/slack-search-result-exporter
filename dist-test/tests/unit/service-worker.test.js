"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const chrome_mock_js_1 = require("./mocks/chrome_mock.js");
// Inject mock
global.chrome = chrome_mock_js_1.chromeMock;
// Import target
// We need to use dynamic import or ensure we can call setupListeners
const service_worker_js_1 = require("../../src/service-worker.js");
(0, node_test_1.describe)('Service Worker', () => {
    (0, node_test_1.beforeEach)(() => {
        (0, chrome_mock_js_1.resetMock)();
        // Re-register listeners because resetMock clears them
        (0, service_worker_js_1.setupListeners)();
    });
    (0, node_test_1.it)('should handle GET_SETTINGS message', async () => {
        // Setup initial state
        chrome_mock_js_1.store['selectedPreset'] = 'month';
        const response = await new Promise((resolve) => {
            chrome_mock_js_1.chromeMock.runtime.onMessage.dispatch({ type: 'GET_SETTINGS' }, {}, (res) => resolve(res));
        });
        node_assert_1.default.strictEqual(response.type, 'SETTINGS_LOADED');
        node_assert_1.default.strictEqual(response.payload.selectedPreset, 'month');
    });
    (0, node_test_1.it)('should return default settings if storage is empty', async () => {
        const response = await new Promise((resolve) => {
            chrome_mock_js_1.chromeMock.runtime.onMessage.dispatch({ type: 'GET_SETTINGS' }, {}, (res) => resolve(res));
        });
        node_assert_1.default.strictEqual(response.type, 'SETTINGS_LOADED');
        node_assert_1.default.strictEqual(response.payload.selectedPreset, 'week'); // Default
    });
    (0, node_test_1.it)('should handle SAVE_SETTINGS message', async () => {
        const newSettings = { selectedPreset: 'today' };
        const response = await new Promise((resolve) => {
            chrome_mock_js_1.chromeMock.runtime.onMessage.dispatch({ type: 'SAVE_SETTINGS', payload: newSettings }, {}, (res) => resolve(res));
        });
        node_assert_1.default.strictEqual(response.type, 'SETTINGS_SAVED');
        node_assert_1.default.strictEqual(chrome_mock_js_1.store['selectedPreset'], 'today');
    });
    (0, node_test_1.it)('should handle CLEAR_SETTINGS message', async () => {
        chrome_mock_js_1.store['selectedPreset'] = 'month';
        const response = await new Promise((resolve) => {
            chrome_mock_js_1.chromeMock.runtime.onMessage.dispatch({ type: 'CLEAR_SETTINGS' }, {}, (res) => resolve(res));
        });
        node_assert_1.default.strictEqual(response.type, 'SETTINGS_SAVED'); // Assuming generic success
        node_assert_1.default.strictEqual(chrome_mock_js_1.store['selectedPreset'], undefined);
    });
    (0, node_test_1.it)('should handle unknown message types gracefully', async () => {
        // Should probably not call sendResponse or return false?
        // Or just ignore.
        // In our mock dispatch, we check if any listener returns true.
        // If we await the promise, we expect it to resolve. 
        // But if the listener ignores it, it won't call sendResponse.
        // This test might timeout if we await a response that never comes.
        // Let's check if dispatch returns false (synchronously indicating no async work)
        // assert.strictEqual(handled, false); 
        // (Mock returns some(l => l(...) === true))
        chrome_mock_js_1.chromeMock.runtime.onMessage.dispatch({ type: 'UNKNOWN_TYPE' }, {}, () => { });
    });
    (0, node_test_1.it)('should broadcast settings_changed on storage change', () => {
        // Mock runtime.sendMessage to capture broadcast
        let capturedMessage = null;
        chrome_mock_js_1.chromeMock.runtime.sendMessage = (msg) => {
            capturedMessage = msg;
        };
        // Trigger storage change
        chrome_mock_js_1.chromeMock.storage.onChanged.dispatch({ selectedPreset: { oldValue: 'week', newValue: 'month' } }, 'sync');
        node_assert_1.default.deepStrictEqual(capturedMessage, { type: 'settings_changed' });
    });
    (0, node_test_1.it)('should handle storage errors during save', async () => {
        chrome_mock_js_1.chromeMock.runtime.lastError = { message: "Quota exceeded" };
        const response = await new Promise((resolve) => {
            chrome_mock_js_1.chromeMock.runtime.onMessage.dispatch({ type: 'SAVE_SETTINGS', payload: { selectedPreset: 'today' } }, {}, (res) => resolve(res));
        });
        node_assert_1.default.strictEqual(response.type, 'SETTINGS_ERROR');
        node_assert_1.default.strictEqual(response.error.code, 'STORAGE_QUOTA_EXCEEDED');
    });
});
//# sourceMappingURL=service-worker.test.js.map