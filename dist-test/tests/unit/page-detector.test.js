"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const page_detector_js_1 = require("../../src/page-detector.js");
(0, node_test_1.describe)('PageDetector', () => {
    (0, node_test_1.it)('should detect search result page from URL', () => {
        const url = 'https://app.slack.com/client/T01234567/search/search-results/after:2025-12-01';
        const detector = new page_detector_js_1.PageDetector(url);
        node_assert_1.default.strictEqual(detector.detect(), 'search_result');
    });
    (0, node_test_1.it)('should detect channel page from URL', () => {
        const url = 'https://app.slack.com/client/T01234567/C01234567';
        const detector = new page_detector_js_1.PageDetector(url);
        node_assert_1.default.strictEqual(detector.detect(), 'channel');
    });
    (0, node_test_1.it)('should return unknown for other URLs', () => {
        const url = 'https://app.slack.com/client/T01234567/help';
        const detector = new page_detector_js_1.PageDetector(url);
        node_assert_1.default.strictEqual(detector.detect(), 'unknown');
    });
    (0, node_test_1.it)('should detect search result from DOM even if URL is ambiguous', () => {
        const url = 'https://app.slack.com/client/T01234567/some-random-path';
        // Mock document with search-related role
        const mockDocument = {
            querySelector: (selector) => {
                if (selector === '[role="document"]')
                    return {};
                return null;
            }
        };
        const detector = new page_detector_js_1.PageDetector(url, mockDocument);
        node_assert_1.default.strictEqual(detector.detect(), 'search_result');
    });
    (0, node_test_1.it)('should detect channel from DOM', () => {
        const url = 'https://app.slack.com/client/T01234567/some-random-path';
        // Mock document with channel-related element
        const mockDocument = {
            querySelector: (selector) => {
                if (selector === '.c-message_list')
                    return {};
                return null;
            }
        };
        const detector = new page_detector_js_1.PageDetector(url, mockDocument);
        node_assert_1.default.strictEqual(detector.detect(), 'channel');
    });
});
//# sourceMappingURL=page-detector.test.js.map