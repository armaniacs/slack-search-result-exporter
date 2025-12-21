import { MessageExtractor } from './message-extractor.js';
import { ChannelExtractor } from './channel-extractor.js';
import { PaginationController } from './pagination-controller.js';
import { PageDetector } from './page-detector.js';
import { SearchQueryApplier } from './search-query-applier.js';
import {
  MessagePack,
  ExportOptions,
  ExportResult,
  ExportError,
  Result,
  PopupToContentScriptMessage,
  ContentScriptToPopupMessage
} from './types.js';

/**
 * Content Script main controller
 * Integrates message extraction, pagination, and messaging with Popup UI
 */
export class ContentScript {
  private messageExtractor: MessageExtractor;
  private paginationController: PaginationController;
  private pageDetector: PageDetector;
  private searchQueryApplier: SearchQueryApplier;
  // Reserved for future channel page support (Task 3.3/3.4)
  // @ts-ignore - Will be used when channel page export is implemented
  private _channelExtractor: ChannelExtractor;

  constructor() {
    this.messageExtractor = new MessageExtractor();
    this.paginationController = new PaginationController();
    this.pageDetector = new PageDetector(window.location.href, document);
    this.searchQueryApplier = new SearchQueryApplier();
    // Reserved for future channel page support (Task 3.3/3.4)
    this._channelExtractor = new ChannelExtractor();
  }

  /**
   * Set up chrome.runtime.onMessage listener
   * Handles START_EXPORT and APPLY_DATE_PRESET messages from Popup UI
   */
  setupMessageListener(): void {
    // @ts-ignore - Explicitly access chrome from window object
    const chromeAPI = window.chrome || chrome;
    chromeAPI.runtime.onMessage.addListener(
      (message: PopupToContentScriptMessage, _sender, sendResponse) => {
        if (message.type === 'START_EXPORT') {
          // Execute export asynchronously and send response via sendResponse callback
          this.executeExport(message.options)
            .then(result => {
              if (result.success) {
                const response: ContentScriptToPopupMessage = {
                  type: 'EXPORT_COMPLETE',
                  payload: result.value
                };
                sendResponse(response);
              } else {
                const response: ContentScriptToPopupMessage = {
                  type: 'EXPORT_ERROR',
                  error: result.error
                };
                sendResponse(response);
              }
            })
            .catch(error => {
              const response: ContentScriptToPopupMessage = {
                type: 'EXPORT_ERROR',
                error: {
                  code: 'EXTRACTION_ERROR',
                  message: error.message || 'Unknown error occurred',
                  partialData: []
                }
              };
              sendResponse(response);
            });

          // Return true to indicate async response
          return true;
        }

        if (message.type === 'APPLY_DATE_PRESET') {
          // Apply date preset query asynchronously
          this.searchQueryApplier.applyQuery(message.query)
            .then(result => {
              const response: ContentScriptToPopupMessage = {
                type: 'PRESET_APPLIED',
                success: result.success,
                message: result.message
              };
              sendResponse(response);
            })
            .catch(error => {
              const response: ContentScriptToPopupMessage = {
                type: 'PRESET_APPLIED',
                success: false,
                message: error instanceof Error ? error.message : 'プリセット適用に失敗しました'
              };
              sendResponse(response);
            });

          // Return true to indicate async response
          return true;
        }

        return false;
      }
    );
  }

  /**
   * Execute export operation
   * Extracts messages from current Slack page with pagination
   * @param options - Export options (e.g., date preset)
   * @returns Result containing exported messages or error
   */
  async executeExport(_options: ExportOptions): Promise<Result<ExportResult, ExportError>> {
    // Initialize message pack outside try block to preserve partial data on error
    const messagePack: MessagePack = {
      messages: [],
      messageSet: new Set<string>(),
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

    } catch (error: any) {
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

}

// Initialize Content Script when loaded in browser environment
if (typeof window !== 'undefined') {
  const contentScript = new ContentScript();
  contentScript.setupMessageListener();
}
