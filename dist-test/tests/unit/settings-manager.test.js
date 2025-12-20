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
// Import target (we will create this file next)
const settings_manager_js_1 = require("../../src/settings-manager.js");
(0, node_test_1.describe)('SettingsManager', () => {
    let settingsManager;
    (0, node_test_1.beforeEach)(() => {
        (0, chrome_mock_js_1.resetMock)();
        settingsManager = new settings_manager_js_1.SettingsManager();
    });
    (0, node_test_1.it)('should get default settings if storage is empty', async () => {
        const result = await settingsManager.get('selectedPreset');
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.value, 'week');
        }
    });
    (0, node_test_1.it)('should save settings', async () => {
        const result = await settingsManager.set('selectedPreset', 'month');
        node_assert_1.default.strictEqual(result.success, true);
        node_assert_1.default.strictEqual(chrome_mock_js_1.store['selectedPreset'], 'month');
    });
    (0, node_test_1.it)('should get saved settings', async () => {
        chrome_mock_js_1.store['selectedPreset'] = 'yesterday';
        const result = await settingsManager.get('selectedPreset');
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.value, 'yesterday');
        }
    });
    (0, node_test_1.it)('should clear settings', async () => {
        chrome_mock_js_1.store['selectedPreset'] = 'today';
        const result = await settingsManager.clear();
        node_assert_1.default.strictEqual(result.success, true);
        node_assert_1.default.strictEqual(chrome_mock_js_1.store['selectedPreset'], undefined);
    });
    (0, node_test_1.it)('should handle quota exceeded error', async () => {
        chrome_mock_js_1.chromeMock.runtime.lastError = { message: "Quota exceeded" };
        const result = await settingsManager.set('selectedPreset', 'today');
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.code, 'STORAGE_QUOTA_EXCEEDED');
        }
    });
    (0, node_test_1.it)('should handle generic write errors', async () => {
        chrome_mock_js_1.chromeMock.runtime.lastError = { message: "Generic error" };
        const result = await settingsManager.set('selectedPreset', 'today');
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.code, 'STORAGE_WRITE_ERROR');
        }
    });
});
//# sourceMappingURL=settings-manager.test.js.map