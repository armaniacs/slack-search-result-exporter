import { MessagePack, RawMessage } from "./types.js";
import { MessageFormatter } from "./message-formatter.js";

/**
 * External link data structure
 */
interface ExternalLink {
  text: string;
  url: string;
}

export class MessageExtractor {
  private messageGroupSelector = '[role="document"]';
  private messageContentSelector = ".c-search_message__content";
  private messageTimestampSelector = ".c-timestamp";
  private messageTimestampAttributeKey = "data-ts";
  private channelNameSelector = '[data-qa="inline_channel_entity__name"]';
  private messageSenderSelector = ".c-message__sender_button";
  private timestampLabelSelector = ".c-timestamp__label";

  /**
   * Extract external URL links from DOM element (http/https only)
   * @param element - Message element
   * @returns Array of link text and URL pairs
   */
  private extractExternalLinks(element: HTMLElement): ExternalLink[] {
    if (!element) {
      return [];
    }

    const links = element.querySelectorAll<HTMLAnchorElement>('a');

    // Filter only external URLs (http/https) and exclude Slack internal links
    const externalLinks = Array.from(links)
      .filter(link => {
        // Check if URL starts with http/https
        if (!/^https?:\/\//.test(link.href)) {
          return false;
        }
        // Exclude Slack workspace URLs (e.g., https://xxx.slack.com/...)
        if (/^https?:\/\/[^/]+\.slack\.com\//.test(link.href)) {
          return false;
        }
        return true;
      })
      .map(link => {
        // Get only the direct text content of the link, excluding nested elements
        let linkText = '';
        for (let node of link.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            linkText += node.textContent;
          }
        }
        // If no direct text nodes, fall back to textContent (trimmed)
        if (!linkText.trim()) {
          linkText = link.textContent?.trim() || '';
        }
        return {
          text: linkText.trim(),
          url: link.href
        };
      });

    return externalLinks;
  }

  /**
   * Convert message with Markdown-formatted links
   * @param message - Original message text
   * @param links - Array of link objects
   * @returns Message with Markdown-formatted links
   */
  private convertMessageWithMarkdownLinks(message: string, links: ExternalLink[]): string {
    if (!links || links.length === 0) {
      return message;
    }

    let result = message;

    // Replace each link text with Markdown format [text](url)
    links.forEach(link => {
      if (!link.text || !link.url) {
        return;
      }

      const markdownLink = `[${link.text}](${link.url})`;
      // Escape special regex characters in link text for safe replacement
      const escapedText = MessageFormatter.escapeRegExp(link.text);
      const regex = new RegExp(escapedText, 'g');
      result = result.replace(regex, markdownLink);
    });

    return result;
  }

  /**
   * Extract messages from the current page and add them to messagePack
   */
  async extractMessages(messagePack: MessagePack): Promise<void> {
    messagePack.messagePushed = false;
    const messageGroups = document.querySelectorAll(this.messageGroupSelector);

    messageGroups.forEach((messageGroup) => {
      const timestampElm = messageGroup.querySelector(this.messageTimestampSelector);
      if (!timestampElm) return;

      const tsAttr = timestampElm.getAttribute(this.messageTimestampAttributeKey);
      if (!tsAttr) return;

      const datetime = MessageFormatter.formatTimestamp(tsAttr.split(".")[0]);
      
      const channelNameDom = messageGroup.querySelector(this.channelNameSelector);
      const channelName = channelNameDom == null ? "DirectMessage" : channelNameDom.textContent || "";
      
      const senderDom = messageGroup.querySelector(this.messageSenderSelector);
      const messageSender = senderDom ? senderDom.textContent || "" : "";
      
      const timestampLabelDom = messageGroup.querySelector(this.timestampLabelSelector);
      const timestampLabel = timestampLabelDom ? timestampLabelDom.textContent || "" : "";
      
      const messageElement = messageGroup.querySelector(this.messageContentSelector) as HTMLElement;
      if (!messageElement) return;

      /* Clone the element to avoid modifying the original DOM */
      const messageClone = messageElement.cloneNode(true) as HTMLElement;

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

      /* Extract external links from cleaned clone */
      const externalLinks = this.extractExternalLinks(messageClone);

      /* Convert message with Markdown-formatted links */
      const messageWithMarkdownLinks = this.convertMessageWithMarkdownLinks(message, externalLinks);

      const removeMessageSender = new RegExp('^' + MessageFormatter.escapeRegExp(messageSender));
      const removeTimestampLabel = new RegExp('^.*?' + MessageFormatter.escapeRegExp(timestampLabel));

      let trimmedMessage = messageWithMarkdownLinks.replace(removeMessageSender, '').replace(removeTimestampLabel, '').trim();

      const rawMessage: RawMessage = {
        timestamp: datetime,
        channel: channelName,
        sender: messageSender,
        content: trimmedMessage
      };

      const tsvRow = MessageFormatter.formatToTSV(rawMessage);

      if (!messagePack.messageSet.has(tsvRow)) {
        messagePack.messages.push(tsvRow);
        messagePack.messageSet.add(tsvRow);
        messagePack.messagePushed = true;
        (messageGroup as HTMLElement).scrollIntoView();
      }
    });
  }

  /**
   * Wait for search result to be displayed
   * @throws {Error} if search result is not found within timeout
   */
  async waitForSearchResult(): Promise<void> {
      const selector = ".c-search_message__content";
      const TIMEOUT_MS = 5000; // 5 seconds timeout

      if (document.querySelector(selector)) {
          return;
      }

      return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
              observer.disconnect();
              reject(new Error('Search results not found. This page may not be a Slack search results page.'));
          }, TIMEOUT_MS);

          const observer = new MutationObserver((_mutations, obs) => {
              if (document.querySelector(selector)) {
                  clearTimeout(timeoutId);
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
