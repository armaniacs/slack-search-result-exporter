"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
require("./mocks/dom_mock.js");
const message_extractor_js_1 = require("../../src/message-extractor.js");
(0, node_test_1.describe)('MessageExtractor', () => {
    let messagePack;
    let extractor;
    (0, node_test_1.beforeEach)(() => {
        messagePack = {
            messages: [],
            messageSet: new Set(),
            messagePushed: false,
            hasNextPage: true
        };
        extractor = new message_extractor_js_1.MessageExtractor();
    });
    (0, node_test_1.it)('should extract messages from mock DOM', async () => {
        // Mock document.querySelectorAll to return message groups
        const mockMessageGroup = {
            querySelector: (selector) => {
                if (selector === '.c-timestamp')
                    return { getAttribute: () => '1734685200.000000' };
                if (selector === '[data-qa="inline_channel_entity__name"]')
                    return { textContent: 'general' };
                if (selector === '.c-message__sender_button')
                    return { textContent: 'User A' };
                if (selector === '.c-timestamp__label')
                    return { textContent: '8:00 PM' };
                if (selector === '.c-search_message__content') {
                    return {
                        cloneNode: () => ({
                            querySelectorAll: () => [],
                            textContent: 'User A 8:00 PM Hello world',
                            replaceWith: () => { }
                        })
                    };
                }
                return null;
            },
            scrollIntoView: () => { }
        };
        const mockDoc = {
            querySelectorAll: (selector) => {
                if (selector === '[role="document"]')
                    return [mockMessageGroup];
                return [];
            },
            querySelector: () => null,
            createTextNode: (text) => ({ text })
        };
        // We need to inject this mockDoc into extractor or global
        global.document = mockDoc;
        await extractor.extractMessages(messagePack);
        node_assert_1.default.strictEqual(messagePack.messages.length, 1);
        node_assert_1.default.strictEqual(messagePack.messagePushed, true);
        node_assert_1.default.ok(messagePack.messages[0].includes('Hello world'));
    });
    (0, node_test_1.it)('should not add duplicate messages', async () => {
        const mockMessageGroup = {
            querySelector: (selector) => {
                if (selector === '.c-timestamp')
                    return { getAttribute: () => '1734685200.000000' };
                if (selector === '[data-qa="inline_channel_entity__name"]')
                    return { textContent: 'general' };
                if (selector === '.c-message__sender_button')
                    return { textContent: 'User A' };
                if (selector === '.c-timestamp__label')
                    return { textContent: '8:00 PM' };
                if (selector === '.c-search_message__content') {
                    return {
                        cloneNode: () => ({
                            querySelectorAll: () => [],
                            textContent: 'User A 8:00 PM Hello world',
                            replaceWith: () => { }
                        })
                    };
                }
                return null;
            },
            scrollIntoView: () => { }
        };
        const mockDoc = {
            querySelectorAll: (selector) => {
                if (selector === '[role="document"]')
                    return [mockMessageGroup, mockMessageGroup];
                return [];
            },
            querySelector: () => null,
            createTextNode: (text) => ({ text })
        };
        global.document = mockDoc;
        await extractor.extractMessages(messagePack);
        node_assert_1.default.strictEqual(messagePack.messages.length, 1); // Should be 1, not 2
        node_assert_1.default.strictEqual(messagePack.messagePushed, true);
    });
    (0, node_test_1.it)('should wait for search result', async () => {
        let queryCount = 0;
        const mockDoc = {
            querySelector: (selector) => {
                if (selector === '.c-search_message__content') {
                    queryCount++;
                    return queryCount > 1 ? {} : null;
                }
                return null;
            },
            body: {}
        };
        global.document = mockDoc;
        const promise = extractor.waitForSearchResult();
        // Trigger mutation observer mock
        setTimeout(() => {
            // The observer should be waiting now.
            // Trigger all observers
            global.MutationObserver.instances.forEach((obs) => {
                obs.trigger([], obs);
            });
        }, 10);
        await promise;
        node_assert_1.default.ok(queryCount > 1);
    });
});
//# sourceMappingURL=message-extractor.test.js.map