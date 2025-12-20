"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const content_script_js_1 = require("../../src/content-script.js");
(0, node_test_1.describe)('ContentScript', () => {
    let contentScript;
    let sentMessages = [];
    let mockChrome;
    (0, node_test_1.beforeEach)(() => {
        sentMessages = [];
        // Mock chrome.runtime API
        mockChrome = {
            runtime: {
                sendMessage: (message) => {
                    sentMessages.push(message);
                },
                onMessage: {
                    addListener: (callback) => {
                        global.chromeMessageListener = callback;
                    }
                }
            }
        };
        global.chrome = mockChrome;
        // Mock window object
        global.window = {
            location: {
                href: 'https://app.slack.com/client/T123/search'
            }
        };
        // Mock document
        global.document = {
            querySelectorAll: () => [],
            querySelector: () => ({ textContent: '' }),
            body: {}
        };
        contentScript = new content_script_js_1.ContentScript();
    });
    (0, node_test_1.afterEach)(() => {
        delete global.chrome;
        delete global.window;
        delete global.document;
        delete global.chromeMessageListener;
    });
    (0, node_test_1.describe)('setupMessageListener', () => {
        (0, node_test_1.it)('should register chrome.runtime.onMessage listener', () => {
            contentScript.setupMessageListener();
            node_assert_1.default.ok(global.chromeMessageListener !== undefined);
        });
        (0, node_test_1.it)('should handle START_EXPORT message and return true', () => {
            contentScript.setupMessageListener();
            const message = {
                type: 'START_EXPORT',
                options: {}
            };
            const listener = global.chromeMessageListener;
            const result = listener(message, {}, () => { });
            // Should return true to indicate async response
            node_assert_1.default.strictEqual(result, true);
        });
        (0, node_test_1.it)('should ignore unknown message types and return false', () => {
            contentScript.setupMessageListener();
            const message = {
                type: 'UNKNOWN_MESSAGE'
            };
            const listener = global.chromeMessageListener;
            const result = listener(message, {}, () => { });
            // Should return false for unknown messages
            node_assert_1.default.strictEqual(result, false);
        });
    });
    (0, node_test_1.describe)('executeExport', () => {
        (0, node_test_1.it)('should return UNSUPPORTED_PAGE error for unknown page type', async () => {
            // Mock PageDetector to return 'unknown'
            const originalDetect = contentScript['pageDetector'].detect;
            contentScript['pageDetector'].detect = () => 'unknown';
            const options = {};
            const result = await contentScript.executeExport(options);
            node_assert_1.default.strictEqual(result.success, false);
            if (!result.success) {
                node_assert_1.default.strictEqual(result.error.code, 'UNSUPPORTED_PAGE');
                node_assert_1.default.ok(result.error.message.includes('not supported'));
            }
            // Restore
            contentScript['pageDetector'].detect = originalDetect;
        });
    });
    (0, node_test_1.describe)('message sending', () => {
        (0, node_test_1.it)('should send EXPORT_PROGRESS message', () => {
            // Access private method via type assertion
            contentScript.sendProgress(1, 10);
            node_assert_1.default.strictEqual(sentMessages.length, 1);
            node_assert_1.default.strictEqual(sentMessages[0].type, 'EXPORT_PROGRESS');
            node_assert_1.default.strictEqual(sentMessages[0].payload.currentPage, 1);
            node_assert_1.default.strictEqual(sentMessages[0].payload.messageCount, 10);
        });
        (0, node_test_1.it)('should send EXPORT_COMPLETE message', () => {
            const result = {
                messages: ['msg1', 'msg2'],
                messageCount: 2,
                pageCount: 1
            };
            contentScript.sendComplete(result);
            node_assert_1.default.strictEqual(sentMessages.length, 1);
            node_assert_1.default.strictEqual(sentMessages[0].type, 'EXPORT_COMPLETE');
            node_assert_1.default.deepStrictEqual(sentMessages[0].payload, result);
        });
        (0, node_test_1.it)('should send EXPORT_ERROR message', () => {
            const error = {
                code: 'EXTRACTION_ERROR',
                message: 'Test error',
                partialData: []
            };
            contentScript.sendError(error);
            node_assert_1.default.strictEqual(sentMessages.length, 1);
            node_assert_1.default.strictEqual(sentMessages[0].type, 'EXPORT_ERROR');
            node_assert_1.default.deepStrictEqual(sentMessages[0].error, error);
        });
    });
});
//# sourceMappingURL=content-script.test.js.map