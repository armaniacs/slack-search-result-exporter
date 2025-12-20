"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFormatter = void 0;
class MessageFormatter {
    /**
     * Format message data to TSV row
     * Escapes tabs and newlines to maintain TSV format integrity
     */
    static formatToTSV(message) {
        // Replace newlines with <br> and tabs with spaces for TSV compatibility
        const content = message.content
            .replace(/\t/g, ' ') // Replace tabs with spaces
            .replace(/\n/g, '<br>'); // Replace newlines with <br>
        return `${message.timestamp}\t${message.channel}\t${message.sender}\t${content}`;
    }
    /**
     * Escape regex meta characters
     */
    static escapeRegExp(stringValue) {
        return stringValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Simple XSS escape (can be expanded)
     */
    static escapeXSS(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    /**
     * Convert HTML anchor tags to Markdown link format
     * Filters out javascript: and other malicious protocols (only allows http, https, mailto)
     * @param text - HTML text with <a> tags
     * @returns Text with Markdown links [text](url), dangerous links are stripped to plain text
     */
    static convertLinksToMarkdown(text) {
        // Regular expression to match <a href="url">text</a> tags
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*?>(.*?)<\/a>/gi;
        return text.replace(linkRegex, (_match, _quote, url, linkText) => {
            // Filter out dangerous protocols (only allow http, https, mailto)
            if (!this.ALLOWED_PROTOCOLS.test(url)) {
                // Remove the link wrapper, return just the text
                return linkText;
            }
            // Convert to Markdown format
            return `[${linkText}](${url})`;
        });
    }
    /**
     * Convert Unix timestamp to formatted date string
     * @param timestamp - Unix timestamp (seconds or milliseconds)
     * @returns Formatted date string in format: YYYY-MM-DD Day HH:MM:SS
     */
    static formatTimestamp(timestamp) {
        if (!timestamp || isNaN(Number(timestamp)))
            return timestamp;
        const d = new Date(Number(timestamp) * Math.pow(10, 13 - timestamp.length));
        const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const yyyy = d.getFullYear();
        const mm = ("0" + (d.getMonth() + 1)).slice(-2);
        const dd = ("0" + d.getDate()).slice(-2);
        const hh = ("0" + d.getHours()).slice(-2);
        const mi = ("0" + d.getMinutes()).slice(-2);
        const ss = ("0" + d.getSeconds()).slice(-2);
        const week = weekday[d.getDay()];
        return `${yyyy}-${mm}-${dd} ${week} ${hh}:${mi}:${ss}`;
    }
}
exports.MessageFormatter = MessageFormatter;
// Allowed URL protocols for security filtering
MessageFormatter.ALLOWED_PROTOCOLS = /^(https?|mailto):/;
//# sourceMappingURL=message-formatter.js.map