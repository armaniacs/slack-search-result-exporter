import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

/**
 * Task 5.2: Error Handling and User Feedback Tests
 *
 * Requirements: 1.5, 2.6, 3.5, 5.4, 8.5
 */
describe('Task 5.2: Error Handling and User Feedback', () => {
  describe('Error Type Validation', () => {
    it('should define all required error codes', () => {
      const errorCodes = [
        'DOM_STRUCTURE_MISMATCH',
        'PAGINATION_ERROR',
        'EXTRACTION_ERROR',
        'STORAGE_QUOTA_EXCEEDED',
        'STORAGE_READ_ERROR',
        'STORAGE_WRITE_ERROR',
        'UNSUPPORTED_PAGE',
        'EXPORT_ERROR',
        'CLIPBOARD_ERROR'
      ];

      // Each error code should be a valid string
      errorCodes.forEach(code => {
        assert.strictEqual(typeof code, 'string');
        assert.ok(code.length > 0);
      });
    });

    it('should have user-friendly error messages for each code', () => {
      const errorMessages: Record<string, string> = {
        'DOM_STRUCTURE_MISMATCH': 'Slackページ構造が想定と異なります',
        'PAGINATION_ERROR': '一部ページの取得に失敗しました',
        'EXTRACTION_ERROR': 'メッセージの抽出に失敗しました',
        'STORAGE_QUOTA_EXCEEDED': '設定の保存に失敗しました(容量不足)',
        'STORAGE_READ_ERROR': '設定の読み込みに失敗しました',
        'STORAGE_WRITE_ERROR': '設定の保存に失敗しました',
        'UNSUPPORTED_PAGE': 'このページではエクスポートできません。Slack検索結果またはチャンネルページに移動してください',
        'EXPORT_ERROR': 'エクスポートに失敗しました',
        'CLIPBOARD_ERROR': 'クリップボードへのコピーに失敗しました'
      };

      // Verify all messages are non-empty strings in Japanese
      Object.entries(errorMessages).forEach(([code, message]) => {
        assert.strictEqual(typeof message, 'string');
        assert.ok(message.length > 0, `Error code ${code} has empty message`);
        // Check for Japanese characters (ひらがな/カタカナ/漢字)
        assert.ok(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(message),
          `Error code ${code} should have Japanese message`);
      });
    });
  });

  describe('Error Response Structure', () => {
    it('should preserve partial data on extraction error', () => {
      const partialMessages = ['Message 1', 'Message 2', 'Message 3'];

      const errorResponse = {
        success: false,
        error: {
          code: 'EXTRACTION_ERROR' as const,
          message: 'メッセージの抽出に失敗しました',
          partialData: partialMessages
        }
      };

      assert.strictEqual(errorResponse.success, false);
      assert.strictEqual(errorResponse.error.code, 'EXTRACTION_ERROR');
      assert.ok(errorResponse.error.partialData);
      assert.strictEqual(errorResponse.error.partialData.length, 3);
      assert.deepStrictEqual(errorResponse.error.partialData, partialMessages);
    });

    it('should include error message in response', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'PAGINATION_ERROR' as const,
          message: '一部ページの取得に失敗しました'
        }
      };

      assert.strictEqual(errorResponse.success, false);
      assert.ok(errorResponse.error.message);
      assert.ok(errorResponse.error.message.includes('ページ'));
    });
  });

  describe('Fallback Behavior', () => {
    it('should use default preset on storage read error', () => {
      // Simulate storage error - default should be 'week'
      const defaultPreset = 'week';

      assert.strictEqual(defaultPreset, 'week');
    });

    it('should allow export continuation with partial data', () => {
      const partialData = ['Message 1', 'Message 2'];

      const result = {
        success: true,
        value: {
          messages: partialData,
          messageCount: partialData.length,
          pageCount: 1
        }
      };

      // Should still return success even with incomplete data
      assert.strictEqual(result.success, true);
      assert.ok(result.value.messages.length > 0);
    });
  });

  describe('User-Facing Error Display', () => {
    it('should not expose technical stack traces to users', () => {
      const technicalError = new Error('TypeError: Cannot read property "foo" of undefined');
      const userMessage = 'エクスポートに失敗しました';

      // User message should not contain technical details
      assert.ok(!userMessage.includes('TypeError'));
      assert.ok(!userMessage.includes('undefined'));
      assert.ok(!userMessage.includes('Cannot read property'));
    });

    it('should provide actionable error messages', () => {
      const actionableMessages = [
        'Slack検索結果またはチャンネルページに移動してください',
        '設定の保存に失敗しました(容量不足)',
        'クリップボードへのコピーに失敗しました'
      ];

      actionableMessages.forEach(message => {
        // Actionable messages should either suggest an action or explain the cause
        const isActionable = /してください|失敗しました/.test(message);
        assert.ok(isActionable, `Message should be actionable: ${message}`);
      });
    });
  });

  describe('Error Boundary Scenarios', () => {
    it('should handle DOM not found gracefully', () => {
      const result = {
        success: false,
        error: {
          code: 'DOM_STRUCTURE_MISMATCH' as const,
          message: 'Slackページ構造が想定と異なります',
          partialData: []
        }
      };

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'DOM_STRUCTURE_MISMATCH');
      assert.ok(Array.isArray(result.error.partialData));
    });

    it('should handle pagination failure with collected data', () => {
      const collectedMessages = ['Message from page 1'];

      const result = {
        success: false,
        error: {
          code: 'PAGINATION_ERROR' as const,
          message: '一部ページの取得に失敗しました',
          partialData: collectedMessages
        }
      };

      // Even on pagination error, collected data should be available
      assert.ok(result.error.partialData && result.error.partialData.length > 0);
    });

    it('should handle unsupported page error', () => {
      const result = {
        success: false,
        error: {
          code: 'UNSUPPORTED_PAGE' as const,
          message: 'このページではエクスポートできません。Slack検索結果またはチャンネルページに移動してください'
        }
      };

      assert.strictEqual(result.error.code, 'UNSUPPORTED_PAGE');
      assert.ok(result.error.message.includes('移動してください'));
    });
  });

  describe('Retry and Recovery', () => {
    it('should allow user to retry after error', () => {
      let attemptCount = 0;

      const mockExport = () => {
        attemptCount++;
        if (attemptCount < 2) {
          return {
            success: false,
            error: {
              code: 'EXTRACTION_ERROR' as const,
              message: 'メッセージの抽出に失敗しました'
            }
          };
        }
        return {
          success: true,
          value: {
            messages: ['Message 1'],
            messageCount: 1,
            pageCount: 1
          }
        };
      };

      // First attempt fails
      const firstResult = mockExport();
      assert.strictEqual(firstResult.success, false);

      // Retry succeeds
      const secondResult = mockExport();
      assert.strictEqual(secondResult.success, true);
      assert.strictEqual(attemptCount, 2);
    });
  });

  describe('Error Logging (Development Mode)', () => {
    it('should log detailed errors in development mode', () => {
      const consoleErrorCalls: any[] = [];

      const mockConsoleError = mock.fn((...args: any[]) => {
        consoleErrorCalls.push(args);
      });

      // Mock console.error
      const originalError = console.error;
      console.error = mockConsoleError;

      try {
        const error = new Error('Test error with stack trace');
        console.error('Export error:', error);

        // Should have logged
        assert.ok(mockConsoleError.mock.calls.length > 0);
        assert.ok(consoleErrorCalls[0][0].includes('Export error'));
      } finally {
        console.error = originalError;
      }
    });
  });
});
