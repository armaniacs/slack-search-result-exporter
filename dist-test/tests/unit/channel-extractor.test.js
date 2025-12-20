"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const channel_extractor_js_1 = require("../../src/channel-extractor.js");
(0, node_test_1.describe)('ChannelExtractor', () => {
    let extractor;
    (0, node_test_1.beforeEach)(() => {
        extractor = new channel_extractor_js_1.ChannelExtractor();
    });
    (0, node_test_1.it)('should extract messages from mock DOM', async () => {
        // Mock DOM elements
        const mockChannelName = { textContent: '#general' };
        const mockTimestamp = {
            getAttribute: (attr) => attr === 'data-ts' ? '1608375600.000000' : null,
            textContent: '10:00 AM'
        };
        const mockSenderLink = { textContent: 'User A' };
        const mockMessageBody = {
            cloneNode: () => ({
                querySelectorAll: () => [],
                textContent: 'Hello world',
                replaceWith: () => { }
            })
        };
        const mockMessageItem = {
            querySelector: (selector) => {
                if (selector === '.c-timestamp')
                    return mockTimestamp;
                if (selector === '.c-message__sender_link')
                    return mockSenderLink;
                if (selector === '.c-message__sender_button')
                    return null; // Fallback
                if (selector === '.c-message_kit__blocks')
                    return mockMessageBody;
                return null;
            }
        };
        const mockDoc = {
            querySelector: (selector) => {
                if (selector === '[data-qa="channel_name"]')
                    return mockChannelName;
                return null;
            },
            querySelectorAll: (selector) => {
                if (selector === '[role="listitem"]')
                    return [mockMessageItem];
                return [];
            },
            createElement: (_tag) => ({ textContent: '', innerHTML: '' }) // For MessageFormatter
        };
        global.document = mockDoc;
        // Mock MessageFormatter to avoid dependency on its implementation details
        // But since it's static, we might just rely on it if it's simple. 
        // However, MessageFormatter.escapeXSS uses document.createElement which we mocked above.
        const result = await extractor.extractChannelMessages();
        node_assert_1.default.ok(result.success);
        if (result.success) {
            node_assert_1.default.strictEqual(result.value.length, 1);
            // Expecting TSV format: timestamp 	 channel 	 sender 	 content
            // Note: Formatting timestamp logic might be in Extractor or Formatter. 
            // Legacy used timestampToTime in Extractor logic. 
            // Let's assume Extractor handles timestamp conversion or passes raw.
            // If Extractor uses MessageFormatter, check the output.
            // The mock timestamp is 1608375600.000000 (2020-12-19 20:00:00 UTC approx)
            const row = result.value[0];
            node_assert_1.default.ok(row.includes('#general'));
            node_assert_1.default.ok(row.includes('User A'));
            node_assert_1.default.ok(row.includes('Hello world'));
        }
    });
    (0, node_test_1.it)('should return error if no messages found', async () => {
        const mockDoc = {
            querySelector: () => ({ textContent: '#general' }),
            querySelectorAll: () => [],
            createElement: () => ({})
        };
        global.document = mockDoc;
        const result = await extractor.extractChannelMessages();
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.code, 'NO_MESSAGES_FOUND');
        }
    });
    (0, node_test_1.it)('should use fallback for sender selector', async () => {
        const mockChannelName = { textContent: '#general' };
        const mockTimestamp = { getAttribute: () => '1234567890.000000' };
        const mockSenderButton = { textContent: 'User B' }; // Button instead of link
        const mockMessageBody = { cloneNode: () => ({ querySelectorAll: () => [], textContent: 'Test' }) };
        const mockMessageItem = {
            querySelector: (selector) => {
                if (selector === '.c-timestamp')
                    return mockTimestamp;
                if (selector === '.c-message__sender_link')
                    return null;
                if (selector === '.c-message__sender_button')
                    return mockSenderButton;
                if (selector === '.c-message_kit__blocks')
                    return mockMessageBody;
                return null;
            }
        };
        const mockDoc = {
            querySelector: () => mockChannelName,
            querySelectorAll: () => [mockMessageItem],
            createElement: () => ({})
        };
        global.document = mockDoc;
        const result = await extractor.extractChannelMessages();
        node_assert_1.default.ok(result.success);
        if (result.success) {
            node_assert_1.default.ok(result.value[0].includes('User B'));
        }
    });
});
//# sourceMappingURL=channel-extractor.test.js.map