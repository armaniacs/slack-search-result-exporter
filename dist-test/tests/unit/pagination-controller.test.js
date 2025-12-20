"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const pagination_controller_js_1 = require("../../src/pagination-controller.js");
(0, node_test_1.describe)('PaginationController', () => {
    let messagePack;
    (0, node_test_1.beforeEach)(() => {
        // Initialize messagePack
        messagePack = {
            messages: [],
            messageSet: new Set(),
            messagePushed: false,
            hasNextPage: true
        };
        // Mock document
        global.document = {
            querySelectorAll: (selector) => {
                if (selector === '.c-pagination__arrow_btn') {
                    return mockPaginationButtons;
                }
                if (selector === '.c-search_message__content') {
                    return mockSearchMessages;
                }
                return [];
            },
            querySelector: (selector) => {
                if (selector === '.c-search_message__content') {
                    return mockSearchMessages[0] || null;
                }
                return null;
            }
        };
    });
    let mockPaginationButtons = [];
    let mockSearchMessages = [{}]; // Default: has search content
    (0, node_test_1.describe)('clickNextButton', () => {
        (0, node_test_1.it)('should detect and click next page button', async () => {
            let clicked = false;
            mockPaginationButtons = [{
                    getAttribute: (attr) => {
                        if (attr === 'aria-label')
                            return 'Next page';
                        if (attr === 'aria-disabled')
                            return 'false';
                        return null;
                    },
                    click: () => { clicked = true; }
                }];
            const controller = new pagination_controller_js_1.PaginationController();
            await controller.clickNextButton(messagePack);
            node_assert_1.default.strictEqual(clicked, true);
            node_assert_1.default.strictEqual(messagePack.hasNextPage, true);
        });
        (0, node_test_1.it)('should handle Japanese next page button label', async () => {
            let clicked = false;
            mockPaginationButtons = [{
                    getAttribute: (attr) => {
                        if (attr === 'aria-label')
                            return '次のページ';
                        if (attr === 'aria-disabled')
                            return 'false';
                        return null;
                    },
                    click: () => { clicked = true; }
                }];
            const controller = new pagination_controller_js_1.PaginationController();
            await controller.clickNextButton(messagePack);
            node_assert_1.default.strictEqual(clicked, true);
            node_assert_1.default.strictEqual(messagePack.hasNextPage, true);
        });
        (0, node_test_1.it)('should not click when next page button is disabled', async () => {
            let clicked = false;
            mockPaginationButtons = [{
                    getAttribute: (attr) => {
                        if (attr === 'aria-label')
                            return 'Next page';
                        if (attr === 'aria-disabled')
                            return 'true';
                        return null;
                    },
                    click: () => { clicked = true; }
                }];
            const controller = new pagination_controller_js_1.PaginationController();
            await controller.clickNextButton(messagePack);
            node_assert_1.default.strictEqual(clicked, false);
            node_assert_1.default.strictEqual(messagePack.hasNextPage, false);
        });
        (0, node_test_1.it)('should set hasNextPage to false when no pagination buttons found', async () => {
            mockPaginationButtons = [];
            const controller = new pagination_controller_js_1.PaginationController();
            await controller.clickNextButton(messagePack);
            node_assert_1.default.strictEqual(messagePack.hasNextPage, false);
        });
        (0, node_test_1.it)('should set hasNextPage to false when next button not found', async () => {
            mockPaginationButtons = [{
                    getAttribute: (attr) => attr === 'aria-label' ? 'Previous page' : null,
                    attributes: { 'aria-disabled': { value: 'false' } },
                    click: () => { }
                }];
            const controller = new pagination_controller_js_1.PaginationController();
            await controller.clickNextButton(messagePack);
            node_assert_1.default.strictEqual(messagePack.hasNextPage, false);
        });
    });
    (0, node_test_1.describe)('checkOutOfPageLimit', () => {
        (0, node_test_1.it)('should keep hasNextPage true when search content exists', async () => {
            mockSearchMessages = [{}]; // Has content
            messagePack.hasNextPage = true;
            const controller = new pagination_controller_js_1.PaginationController();
            await controller.checkOutOfPageLimit(messagePack);
            node_assert_1.default.strictEqual(messagePack.hasNextPage, true);
        });
        (0, node_test_1.it)('should set hasNextPage to false when search content is missing', async () => {
            mockSearchMessages = []; // No content
            messagePack.hasNextPage = true;
            const controller = new pagination_controller_js_1.PaginationController();
            await controller.checkOutOfPageLimit(messagePack);
            node_assert_1.default.strictEqual(messagePack.hasNextPage, false);
        });
    });
    (0, node_test_1.describe)('waitMilliseconds', () => {
        (0, node_test_1.it)('should wait for specified milliseconds', async () => {
            const controller = new pagination_controller_js_1.PaginationController();
            const start = Date.now();
            await controller.waitMilliseconds(100);
            const elapsed = Date.now() - start;
            node_assert_1.default.ok(elapsed >= 100);
            node_assert_1.default.ok(elapsed < 200); // Should not wait too long
        });
    });
});
//# sourceMappingURL=pagination-controller.test.js.map