import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Mock globals
const mockElements: any = {
  'export-btn': { disabled: false, addEventListener: () => {} },
  'progress': { style: { display: 'none' } },
  'progress-text': { textContent: '' },
  'result-section': { style: { display: 'none' } },
  'result-text': { value: '' },
  'message-count': { textContent: '' },
  'copy-btn': { addEventListener: () => {} },
  'error-message': { style: { display: 'none' }, textContent: '' }
};

(global as any).document = {
  querySelectorAll: () => [],
  getElementById: (id: string) => mockElements[id],
  addEventListener: () => {}
};

(global as any).chrome = {
  runtime: {
    sendMessage: async () => ({ type: 'SETTINGS_LOADED', payload: { selectedPreset: 'week' } }),
    onMessage: { addListener: () => {} }
  }
};

describe('PopupUIController Progress Display', async () => {
  // Dynamic import to ensure globals are set
  const { PopupUIController } = await import('../../src/popup.js');

  let mockChrome: any;
  let messageListener: any;
  let controller: any;

  beforeEach(() => {
    // Re-mock to capture listener
    messageListener = null;
    mockChrome = {
      runtime: {
        sendMessage: async () => ({ type: 'SETTINGS_LOADED', payload: { selectedPreset: 'week' } }),
        onMessage: {
          addListener: (callback: any) => {
            messageListener = callback;
          }
        }
      },
      tabs: {
        query: async () => [{ id: 123 }],
        sendMessage: async () => ({ type: 'EXPORT_COMPLETE', payload: { messages: [], messageCount: 0, pageCount: 0 } })
      },
      scripting: {
        executeScript: async () => {}
      }
    };
    (global as any).chrome = mockChrome;

    // Reset elements
    for (const key in mockElements) {
      if (mockElements[key].style) mockElements[key].style.display = 'none';
      if (mockElements[key].textContent !== undefined) mockElements[key].textContent = '';
      if (mockElements[key].value !== undefined) mockElements[key].value = '';
    }

    // Instantiate controller
    controller = new PopupUIController();
  });

  it('should register a message listener for progress updates (Task 3.1)', () => {
    assert.strictEqual(typeof messageListener, 'function', 'Message listener should be registered');
  });

  it('should update progress text when receiving EXPORT_PROGRESS (Task 3.1 & 3.2)', () => {
    // Set state to exporting so progress is visible
    controller.state.isExporting = true;
    
    // Simulate EXPORT_PROGRESS message
    const progressMessage = {
      type: 'EXPORT_PROGRESS',
      payload: {
        currentPage: 2,
        messageCount: 25,
        status: 'extracting'
      }
    };

    if (messageListener) {
      messageListener(progressMessage);
    } else {
      assert.fail('Message listener not registered');
    }

    // Verify state was updated
    assert.deepStrictEqual(controller.state.exportProgress, progressMessage.payload);

    // Verify DOM was updated (Task 3.2)
    const expectedText = 'ページ 2 処理中 (25 メッセージ) - メッセージ抽出中...';
    assert.strictEqual(mockElements['progress-text'].textContent, expectedText);
  });

  it('should show correct text for each status (Task 3.2)', () => {
    controller.state.isExporting = true;

    const statuses = [
      { status: 'waiting_for_dom', expected: 'ページ 1 処理中 (0 メッセージ) - DOM読み込み待機中...' },
      { status: 'extracting', expected: 'ページ 1 処理中 (0 メッセージ) - メッセージ抽出中...' },
      { status: 'navigating', expected: 'ページ 1 処理中 (0 メッセージ) - 次ページへ移動中...' }
    ];

    for (const { status, expected } of statuses) {
      messageListener({
        type: 'EXPORT_PROGRESS',
        payload: { currentPage: 1, messageCount: 0, status }
      });
      assert.strictEqual(mockElements['progress-text'].textContent, expected, `Failed for status: ${status}`);
    }
  });

  it('should fallback to default text if exportProgress is null (Task 3.2)', () => {
    controller.state.isExporting = true;
    controller.state.exportProgress = null;
    
    controller.updateUI();

    assert.strictEqual(mockElements['progress-text'].textContent, 'エクスポート中...');
  });
});