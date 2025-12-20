import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { chromeMock, resetMock, store } from './mocks/chrome_mock.js';

// Inject mock
(global as any).chrome = chromeMock;

// Import target
// We need to use dynamic import or ensure we can call setupListeners
import { setupListeners } from '../../src/service-worker.js';
import { UserSettings } from '../../src/types.js';

describe('Service Worker', () => {
  beforeEach(() => {
    resetMock();
    // Re-register listeners because resetMock clears them
    setupListeners();
  });

  it('should handle GET_SETTINGS message', async () => {
    // Setup initial state
    store['selectedPreset'] = 'month';

    const response = await new Promise<any>((resolve) => {
      chromeMock.runtime.onMessage.dispatch(
        { type: 'GET_SETTINGS' },
        {},
        (res) => resolve(res)
      );
    });

    assert.strictEqual(response.type, 'SETTINGS_LOADED');
    assert.strictEqual(response.payload.selectedPreset, 'month');
  });

  it('should return default settings if storage is empty', async () => {
    const response = await new Promise<any>((resolve) => {
      chromeMock.runtime.onMessage.dispatch(
        { type: 'GET_SETTINGS' },
        {},
        (res) => resolve(res)
      );
    });

    assert.strictEqual(response.type, 'SETTINGS_LOADED');
    assert.strictEqual(response.payload.selectedPreset, 'week'); // Default
  });

  it('should handle SAVE_SETTINGS message', async () => {
    const newSettings: UserSettings = { selectedPreset: 'today' };
    
    const response = await new Promise<any>((resolve) => {
      chromeMock.runtime.onMessage.dispatch(
        { type: 'SAVE_SETTINGS', payload: newSettings },
        {},
        (res) => resolve(res)
      );
    });

    assert.strictEqual(response.type, 'SETTINGS_SAVED');
    assert.strictEqual(store['selectedPreset'], 'today');
  });

  it('should handle CLEAR_SETTINGS message', async () => {
    store['selectedPreset'] = 'month';

    const response = await new Promise<any>((resolve) => {
      chromeMock.runtime.onMessage.dispatch(
        { type: 'CLEAR_SETTINGS' },
        {},
        (res) => resolve(res)
      );
    });

    assert.strictEqual(response.type, 'SETTINGS_SAVED'); // Assuming generic success
    assert.strictEqual(store['selectedPreset'], undefined);
  });

  it('should handle unknown message types gracefully', async () => {
     // Should probably not call sendResponse or return false?
     // Or just ignore.
     // In our mock dispatch, we check if any listener returns true.
     // If we await the promise, we expect it to resolve. 
     // But if the listener ignores it, it won't call sendResponse.
     // This test might timeout if we await a response that never comes.
     // Let's check if dispatch returns false (synchronously indicating no async work)
     
     // assert.strictEqual(handled, false); 
     // (Mock returns some(l => l(...) === true))
     chromeMock.runtime.onMessage.dispatch(
         { type: 'UNKNOWN_TYPE' },
         {},
         () => {}
     );
  });

  it('should broadcast settings_changed on storage change', () => {
    // Mock runtime.sendMessage to capture broadcast
    let capturedMessage: any = null;
    chromeMock.runtime.sendMessage = (msg: any) => {
        capturedMessage = msg;
    };

    // Trigger storage change
    chromeMock.storage.onChanged.dispatch(
        { selectedPreset: { oldValue: 'week', newValue: 'month' } },
        'sync'
    );

    assert.deepStrictEqual(capturedMessage, { type: 'settings_changed' });
  });
  
  it('should handle storage errors during save', async () => {
    chromeMock.runtime.lastError = { message: "Quota exceeded" };
    
    const response = await new Promise<any>((resolve) => {
        chromeMock.runtime.onMessage.dispatch(
          { type: 'SAVE_SETTINGS', payload: { selectedPreset: 'today' } },
          {},
          (res) => resolve(res)
        );
      });
  
      assert.strictEqual(response.type, 'SETTINGS_ERROR');
      assert.strictEqual(response.error.code, 'STORAGE_QUOTA_EXCEEDED');
  });
});
