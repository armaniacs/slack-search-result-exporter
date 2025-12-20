"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageExtractor = void 0;
const message_formatter_js_1 = require("./message-formatter.js");
class MessageExtractor {
    constructor() {
        this.messageGroupSelector = '[role="document"]';
        this.messageContentSelector = ".c-search_message__content";
        this.messageTimestampSelector = ".c-timestamp";
        this.messageTimestampAttributeKey = "data-ts";
        this.channelNameSelector = '[data-qa="inline_channel_entity__name"]';
        this.messageSenderSelector = ".c-message__sender_button";
        this.timestampLabelSelector = ".c-timestamp__label";
    }
    /**
     * Extract messages from the current page and add them to messagePack
     */
    async extractMessages(messagePack) {
        messagePack.messagePushed = false;
        const messageGroups = document.querySelectorAll(this.messageGroupSelector);
        messageGroups.forEach((messageGroup) => {
            const timestampElm = messageGroup.querySelector(this.messageTimestampSelector);
            if (!timestampElm)
                return;
            const tsAttr = timestampElm.getAttribute(this.messageTimestampAttributeKey);
            if (!tsAttr)
                return;
            const datetime = message_formatter_js_1.MessageFormatter.formatTimestamp(tsAttr.split(".")[0]);
            const channelNameDom = messageGroup.querySelector(this.channelNameSelector);
            const channelName = channelNameDom == null ? "DirectMessage" : channelNameDom.textContent || "";
            const senderDom = messageGroup.querySelector(this.messageSenderSelector);
            const messageSender = senderDom ? senderDom.textContent || "" : "";
            const timestampLabelDom = messageGroup.querySelector(this.timestampLabelSelector);
            const timestampLabel = timestampLabelDom ? timestampLabelDom.textContent || "" : "";
            const messageElement = messageGroup.querySelector(this.messageContentSelector);
            if (!messageElement)
                return;
            /* Clone the element to avoid modifying the original DOM */
            const messageClone = messageElement.cloneNode(true);
            /* Remove common Slack link preview/unfurl elements */
            const previewSelectors = [
                '.c-link__label', '.c-message_attachment', '.c-search_message__attachments',
                '.c-search_message__attachment', '.c-message__unfurl', '.c-file_attachment',
                '.c-message__img_attachment', '[data-qa="message_attachment"]',
                '.c-message_kit__attachment', '.c-message_kit__file'
            ];
            previewSelectors.forEach(selector => {
                const elements = messageClone.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
            /* Convert <br> tags to newlines */
            const brTags = messageClone.querySelectorAll('br');
            brTags.forEach(br => {
                br.replaceWith(document.createTextNode('\n'));
            });
            const message = messageClone.textContent || "";
            // Note: Markdown link conversion and external link extraction will be added in Task 3.5
            // For now, we implement the basic cleanup and TSV formatting
            const removeMessageSender = new RegExp('^' + message_formatter_js_1.MessageFormatter.escapeRegExp(messageSender));
            const removeTimestampLabel = new RegExp('^.*?' + message_formatter_js_1.MessageFormatter.escapeRegExp(timestampLabel));
            let trimmedMessage = message.replace(removeMessageSender, '').replace(removeTimestampLabel, '').trim();
            const rawMessage = {
                timestamp: datetime,
                channel: channelName,
                sender: messageSender,
                content: trimmedMessage
            };
            const tsvRow = message_formatter_js_1.MessageFormatter.formatToTSV(rawMessage);
            if (!messagePack.messageSet.has(tsvRow)) {
                messagePack.messages.push(tsvRow);
                messagePack.messageSet.add(tsvRow);
                messagePack.messagePushed = true;
                messageGroup.scrollIntoView();
            }
        });
    }
    /**
     * Wait for search result to be displayed
     */
    async waitForSearchResult() {
        const selector = ".c-search_message__content";
        if (document.querySelector(selector)) {
            return;
        }
        return new Promise((resolve) => {
            const observer = new MutationObserver((_mutations, obs) => {
                if (document.querySelector(selector)) {
                    obs.disconnect();
                    resolve();
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
}
exports.MessageExtractor = MessageExtractor;
//# sourceMappingURL=message-extractor.js.map