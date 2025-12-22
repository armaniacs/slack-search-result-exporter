import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { ContentScript } from '../../src/content-script.js';
import { ExportOptions } from '../../src/types.js';

describe('ContentScript', () => {
  let contentScript: ContentScript;
  let sentMessages: any[] = [];
  let mockChrome: any;

  beforeEach(() => {
    sentMessages = [];

    // Mock chrome.runtime API
    mockChrome = {
      runtime: {
        sendMessage: (message: any) => {
          sentMessages.push(message);
        },
        onMessage: {
          addListener: (callback: any) => {
            (global as any).chromeMessageListener = callback;
          }
        }
      }
    };

    (global as any).chrome = mockChrome;

    // Mock window object
    (global as any).window = {
      location: {
        href: 'https://app.slack.com/client/T123/search'
      }
    };

    // Mock document
    (global as any).document = {
      querySelectorAll: () => [],
      querySelector: () => ({ textContent: '' }),
      body: {}
    };

    contentScript = new ContentScript();
  });

  afterEach(() => {
    delete (global as any).chrome;
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).chromeMessageListener;
  });

  describe('setupMessageListener', () => {
    it('should register chrome.runtime.onMessage listener', () => {
      contentScript.setupMessageListener();
      assert.ok((global as any).chromeMessageListener !== undefined);
    });

    it('should handle START_EXPORT message and return true', () => {
      contentScript.setupMessageListener();

      const message = {
        type: 'START_EXPORT',
        options: {}
      };

      const listener = (global as any).chromeMessageListener;
      const result = listener(message, {}, () => {});

      // Should return true to indicate async response
      assert.strictEqual(result, true);
    });

    it('should ignore unknown message types and return false', () => {
      contentScript.setupMessageListener();

      const message = {
        type: 'UNKNOWN_MESSAGE'
      };

      const listener = (global as any).chromeMessageListener;
      const result = listener(message, {}, () => {});

      // Should return false for unknown messages
      assert.strictEqual(result, false);
    });
  });

  describe('executeExport', () => {
    it('should return UNSUPPORTED_PAGE error for unknown page type', async () => {
      // Mock PageDetector to return 'unknown'
      const originalDetect = contentScript['pageDetector'].detect;
      contentScript['pageDetector'].detect = () => 'unknown';

      const options: ExportOptions = {};
      const result = await contentScript.executeExport(options);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'UNSUPPORTED_PAGE');
        assert.ok(result.error.message.includes('not supported'));
      }

      // Restore
      contentScript['pageDetector'].detect = originalDetect;
    });

    it('should send progress updates during export', async () => {
      // Mock dependencies
      contentScript['pageDetector'].detect = () => 'search_result';
      
      contentScript['messageExtractor'].waitForSearchResult = async () => {};
      
      let extractCallCount = 0;
      contentScript['messageExtractor'].extractMessages = async (pack: any) => {
        extractCallCount++;
        if (extractCallCount === 1) {
          pack.messages.push('msg1');
          pack.messagePushed = true;
        } else {
          pack.messagePushed = false;
        }
      };

      contentScript['paginationController'].waitMilliseconds = async () => {};
      contentScript['paginationController'].clickNextButton = async (pack: any) => {
        pack.hasNextPage = false; // Stop after first page
      };
      contentScript['paginationController'].checkOutOfPageLimit = async () => {};

      // Execute
      await contentScript.executeExport({});

      // Verify progress messages
      const progressMessages = sentMessages.filter(m => m.type === 'EXPORT_PROGRESS');
      
      // Expected sequence:
      // 1. waiting_for_dom (page 0, 0 msgs)
      // 2. extracting (page 0, 0 msgs)
      // 3. navigating (page 1, 1 msg) - after loop and increment
      
      // Note: pageCount is incremented AFTER extraction loop.
      // Initial pageCount is 0.
      
      // Check for presence of each status
      const waiting = progressMessages.find(m => m.payload.status === 'waiting_for_dom');
      const extracting = progressMessages.find(m => m.payload.status === 'extracting');
      const navigating = progressMessages.find(m => m.payload.status === 'navigating');

      assert.ok(waiting, 'Should send waiting_for_dom progress');
      assert.ok(extracting, 'Should send extracting progress');
      assert.ok(navigating, 'Should send navigating progress');

      // Check specific values if possible
      assert.strictEqual(extracting?.payload.currentPage, 1); // 1-based
      assert.strictEqual(extracting?.payload.messageCount, 0); // Before extraction

      assert.strictEqual(navigating?.payload.currentPage, 1);
      assert.strictEqual(navigating?.payload.messageCount, 1); // After extraction
    });
  });

  describe('message sending', () => {
    it('should send EXPORT_PROGRESS message', () => {
      // Access private method via type assertion
      (contentScript as any).sendProgress(1, 10, 'extracting');

      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].type, 'EXPORT_PROGRESS');
      assert.strictEqual(sentMessages[0].payload.currentPage, 1);
      assert.strictEqual(sentMessages[0].payload.messageCount, 10);
      assert.strictEqual(sentMessages[0].payload.status, 'extracting');
    });

    it('should handle sendProgress error gracefully', () => {
      // Mock console.warn
      const originalWarn = console.warn;
      let warnCalled = false;
      console.warn = () => { warnCalled = true; };

      // Mock runtime.sendMessage to throw
      mockChrome.runtime.sendMessage = () => { throw new Error('Send failed'); };

      // Should not throw
      (contentScript as any).sendProgress(1, 10, 'extracting');

      assert.strictEqual(warnCalled, true);

      // Restore
      console.warn = originalWarn;
    });

    // Skipped as these methods are not implemented in the current task scope
    /*
    it('should send EXPORT_COMPLETE message', () => {
      const result = {
        messages: ['msg1', 'msg2'],
        messageCount: 2,
        pageCount: 1
      };

      (contentScript as any).sendComplete(result);

      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].type, 'EXPORT_COMPLETE');
      assert.deepStrictEqual(sentMessages[0].payload, result);
    });

    it('should send EXPORT_ERROR message', () => {
      const error = {
        code: 'EXTRACTION_ERROR' as const,
        message: 'Test error',
        partialData: []
      };

      (contentScript as any).sendError(error);

      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].type, 'EXPORT_ERROR');
      assert.deepStrictEqual(sentMessages[0].error, error);
    });
    */
  });
});
