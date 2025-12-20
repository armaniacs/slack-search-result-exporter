"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentScript = void 0;
const message_extractor_js_1 = require("./message-extractor.js");
const channel_extractor_js_1 = require("./channel-extractor.js");
const pagination_controller_js_1 = require("./pagination-controller.js");
const page_detector_js_1 = require("./page-detector.js");
/**
 * Content Script main controller
 * Integrates message extraction, pagination, and messaging with Popup UI
 */
class ContentScript {
    constructor() {
        this.messageExtractor = new message_extractor_js_1.MessageExtractor();
        this.paginationController = new pagination_controller_js_1.PaginationController();
        this.pageDetector = new page_detector_js_1.PageDetector(window.location.href, document);
        // Reserved for future channel page support (Task 3.3/3.4)
        this._channelExtractor = new channel_extractor_js_1.ChannelExtractor();
    }
    /**
     * Set up chrome.runtime.onMessage listener
     * Handles START_EXPORT messages from Popup UI
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
            if (message.type === 'START_EXPORT') {
                // Execute export asynchronously
                this.executeExport(message.options)
                    .then(result => {
                    if (result.success) {
                        this.sendComplete(result.value);
                    }
                    else {
                        this.sendError(result.error);
                    }
                })
                    .catch(error => {
                    this.sendError({
                        code: 'EXTRACTION_ERROR',
                        message: error.message || 'Unknown error occurred',
                        partialData: []
                    });
                });
                // Return true to indicate async response
                return true;
            }
            return false;
        });
    }
    /**
     * Execute export operation
     * Extracts messages from current Slack page with pagination
     * @param options - Export options (e.g., date preset)
     * @returns Result containing exported messages or error
     */
    async executeExport(_options) {
        // Initialize message pack outside try block to preserve partial data on error
        const messagePack = {
            messages: [],
            messageSet: new Set(),
            messagePushed: false,
            hasNextPage: true
        };
        try {
            // 1. Detect page type
            const pageType = this.pageDetector.detect();
            if (pageType === 'unknown') {
                return {
                    success: false,
                    error: {
                        code: 'UNSUPPORTED_PAGE',
                        message: 'This page is not supported. Please navigate to a Slack search results or channel page.'
                    }
                };
            }
            let pageCount = 0;
            // 2. Pagination loop (instead of recursion for memory efficiency)
            while (messagePack.hasNextPage) {
                // Wait for DOM to be ready
                await this.messageExtractor.waitForSearchResult();
                // Extract messages until no more new messages on current page
                do {
                    await this.paginationController.waitMilliseconds(800);
                    await this.messageExtractor.extractMessages(messagePack);
                } while (messagePack.messagePushed === true);
                pageCount++;
                // Send progress update
                this.sendProgress(pageCount, messagePack.messages.length);
                // Move to next page
                await this.paginationController.clickNextButton(messagePack);
                await this.paginationController.waitMilliseconds(600);
                await this.paginationController.checkOutOfPageLimit(messagePack);
            }
            // 3. Return success result
            return {
                success: true,
                value: {
                    messages: messagePack.messages,
                    messageCount: messagePack.messages.length,
                    pageCount
                }
            };
        }
        catch (error) {
            // 4. Error handling with partial data preservation
            return {
                success: false,
                error: {
                    code: 'EXTRACTION_ERROR',
                    message: error.message || 'An error occurred during message extraction',
                    partialData: messagePack.messages
                }
            };
        }
    }
    /**
     * Send progress update to Popup UI
     * @param currentPage - Current page number
     * @param messageCount - Total messages extracted so far
     */
    sendProgress(currentPage, messageCount) {
        const message = {
            type: 'EXPORT_PROGRESS',
            payload: {
                currentPage,
                messageCount
            }
        };
        chrome.runtime.sendMessage(message);
    }
    /**
     * Send export complete message to Popup UI
     * @param result - Export result data
     */
    sendComplete(result) {
        const message = {
            type: 'EXPORT_COMPLETE',
            payload: result
        };
        chrome.runtime.sendMessage(message);
    }
    /**
     * Send error message to Popup UI
     * @param error - Export error details
     */
    sendError(error) {
        const message = {
            type: 'EXPORT_ERROR',
            error
        };
        chrome.runtime.sendMessage(message);
    }
}
exports.ContentScript = ContentScript;
// Initialize Content Script when loaded in browser environment
if (typeof window !== 'undefined') {
    const contentScript = new ContentScript();
    contentScript.setupMessageListener();
}
//# sourceMappingURL=content-script.js.map