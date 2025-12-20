"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const message_formatter_js_1 = require("../../src/message-formatter.js");
(0, node_test_1.describe)('MessageFormatter', () => {
    (0, node_test_1.beforeEach)(() => {
        // Mock document for escapeXSS
        global.document = {
            createElement: (tag) => {
                if (tag === 'div') {
                    return {
                        _textContent: '',
                        set textContent(val) { this._textContent = val; },
                        get textContent() { return this._textContent; },
                        get innerHTML() {
                            // Simple mock for textContent to innerHTML escaping
                            return this._textContent
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/'/g, '&#39;')
                                .replace(/"/g, '&quot;');
                        }
                    };
                }
                return {};
            }
        };
    });
    (0, node_test_1.describe)('formatToTSV', () => {
        (0, node_test_1.it)('should format message to TSV string', () => {
            const message = {
                timestamp: '2025-01-01 12:00:00',
                channel: 'general',
                sender: 'Alice',
                content: 'Hello World'
            };
            const result = message_formatter_js_1.MessageFormatter.formatToTSV(message);
            node_assert_1.default.strictEqual(result, '2025-01-01 12:00:00\tgeneral\tAlice\tHello World');
        });
        (0, node_test_1.it)('should escape newlines as <br>', () => {
            const message = {
                timestamp: '2025-01-01 12:00:00',
                channel: 'general',
                sender: 'Alice',
                content: 'Line 1\nLine 2'
            };
            const result = message_formatter_js_1.MessageFormatter.formatToTSV(message);
            node_assert_1.default.ok(result.includes('Line 1<br>Line 2'));
            node_assert_1.default.doesNotMatch(result, /\n/); // No literal newlines in output
        });
        (0, node_test_1.it)('should handle tabs in content', () => {
            const message = {
                timestamp: '2025-01-01 12:00:00',
                channel: 'general',
                sender: 'Alice',
                content: 'Col1\tCol2'
            };
            // Should probably escape tabs too, otherwise it breaks TSV.
            // Design doesn't explicitly say how to handle tabs in content, but standard is usually space or \t
            // Let's assume replacement with space or escaped \t.
            // Existing implementation doesn't handle it yet.
            // Let's expect it to be handled (e.g. replaced by space or escaped).
            const result = message_formatter_js_1.MessageFormatter.formatToTSV(message);
            const tabCount = (result.match(/\t/g) || []).length;
            node_assert_1.default.strictEqual(tabCount, 3); // Only the 3 separators
        });
    });
    (0, node_test_1.describe)('convertLinksToMarkdown', () => {
        (0, node_test_1.it)('should convert anchor tags to markdown links', () => {
            const input = 'Check <a href="https://example.com">this link</a> out.';
            const expected = 'Check [this link](https://example.com) out.';
            node_assert_1.default.strictEqual(message_formatter_js_1.MessageFormatter.convertLinksToMarkdown(input), expected);
        });
        (0, node_test_1.it)('should handle multiple links', () => {
            const input = 'Link 1: <a href="http://a.com">A</a>, Link 2: <a href="http://b.com">B</a>';
            const expected = 'Link 1: [A](http://a.com), Link 2: [B](http://b.com)';
            node_assert_1.default.strictEqual(message_formatter_js_1.MessageFormatter.convertLinksToMarkdown(input), expected);
        });
        (0, node_test_1.it)('should ignore non-link tags', () => {
            const input = '<b>Bold</b> and <a href="http://a.com">Link</a>';
            const expected = '<b>Bold</b> and [Link](http://a.com)';
            node_assert_1.default.strictEqual(message_formatter_js_1.MessageFormatter.convertLinksToMarkdown(input), expected);
        });
    });
    (0, node_test_1.describe)('escapeXSS', () => {
        (0, node_test_1.it)('should escape HTML special characters', () => {
            const input = '<script>alert(1)</script>';
            const expected = '&lt;script&gt;alert(1)&lt;/script&gt;';
            node_assert_1.default.strictEqual(message_formatter_js_1.MessageFormatter.escapeXSS(input), expected);
        });
    });
    (0, node_test_1.describe)('security', () => {
        (0, node_test_1.it)('should filter javascript: protocols in links', () => {
            const input = '<a href="javascript:alert(1)">Click me</a>';
            // Should probably remove the link or the href.
            // Requirement: "filter javascript: etc"
            // Let\'s assume it converts to text or removes the link wrapper.
            const result = message_formatter_js_1.MessageFormatter.convertLinksToMarkdown(input);
            // If filtering happens during markdown conversion:
            node_assert_1.default.ok(!result.includes('javascript:'));
        });
    });
});
//# sourceMappingURL=message-formatter.test.js.map