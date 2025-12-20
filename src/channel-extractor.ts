import { ExtractionError, Result, RawMessage } from './types.js';
import { MessageFormatter } from './message-formatter.js';

export class ChannelExtractor {
  async extractChannelMessages(): Promise<Result<string[], ExtractionError>> {
    // 1. Identify Channel Name
    const channelNameSelectors = [
      '[data-qa="channel_name"]',
      '.p-view_header__channel_title'
    ];
    let channelName = "Unknown Channel";
    for (const selector of channelNameSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        channelName = el.textContent.trim();
        break;
      }
    }

    // 2. Identify Messages
    const messageItemSelector = '[role="listitem"]';
    const messageItems = document.querySelectorAll(messageItemSelector);

    if (messageItems.length === 0) {
      return {
        success: false,
        error: {
          code: "NO_MESSAGES_FOUND",
          message: "No messages found in the current view."
        }
      };
    }

    const messages: string[] = [];
    const messageSet = new Set<string>(); // For deduplication within the view (though list shouldn't have dups normally)

    // 3. Extract Details
    messageItems.forEach((item) => {
      // Selectors
      const timestampSelector = ".c-timestamp";
      const senderLinkSelector = ".c-message__sender_link";
      const senderButtonSelector = ".c-message__sender_button";
      const contentSelector = ".c-message_kit__blocks";
      const contentBodySelector = ".c-message__body"; // Fallback

      // Timestamp
      const timestampEl = item.querySelector(timestampSelector);
      let timestamp = "";
      if (timestampEl) {
        const tsAttr = timestampEl.getAttribute("data-ts");
        if (tsAttr) {
          timestamp = MessageFormatter.formatTimestamp(tsAttr.split(".")[0]);
        } else if (timestampEl.textContent) {
             // Fallback to text content
             timestamp = timestampEl.textContent.trim();
        }
      }

      // Sender
      let sender = "Unknown";
      const senderEl = item.querySelector(senderLinkSelector) || item.querySelector(senderButtonSelector);
      if (senderEl && senderEl.textContent) {
        sender = senderEl.textContent.trim();
      }

      // Content
      let content = "";
      const contentEl = item.querySelector(contentSelector) || item.querySelector(contentBodySelector);
      if (contentEl) {
        // Clone to avoid modifying DOM
        const clone = contentEl.cloneNode(true) as HTMLElement;
        
        // Remove unwanted elements (preview, etc. - reused from legacy logic if possible)
        const previewSelectors = [
            '.c-link__label',
            '.c-message_attachment',
            '.c-message__unfurl',
            '.c-file_attachment',
            '.c-message__img_attachment',
            '.c-reaction_bar' // Reactions
        ];
        previewSelectors.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Replace <br> with newlines
        clone.querySelectorAll('br').forEach(br => {
            br.replaceWith(document.createTextNode('\n'));
        });

        content = clone.textContent || "";
      }

      if (!timestamp && !content) {
        // Skip invalid/empty items (e.g. date separators might correspond to listitems but have different structure)
        return;
      }

      const rawMessage: RawMessage = {
        timestamp,
        channel: channelName,
        sender,
        content
      };

      const tsvLine = MessageFormatter.formatToTSV(rawMessage);
      
      if (!messageSet.has(tsvLine)) {
        messages.push(tsvLine);
        messageSet.add(tsvLine);
      }
    });

    if (messages.length === 0) {
       // All items were skipped?
       return {
         success: false,
         error: {
           code: "NO_MESSAGES_FOUND",
           message: "Found list items but failed to extract valid messages."
         }
       };
    }

        return {

          success: true,

          value: messages

        };

      }

    }

    