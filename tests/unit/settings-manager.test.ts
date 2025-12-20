import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { chromeMock, resetMock, store } from './mocks/chrome_mock.js';

// Inject mock
(global as any).chrome = chromeMock;

// Import target (we will create this file next)
import { SettingsManager } from '../../src/settings-manager.js';

describe('SettingsManager', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    resetMock();
    settingsManager = new SettingsManager();
  });

  it('should get default settings if storage is empty', async () => {
    const result = await settingsManager.get('selectedPreset');
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.value, 'week');
    }
  });

  it('should save settings', async () => {
    const result = await settingsManager.set('selectedPreset', 'month');
    assert.strictEqual(result.success, true);
    assert.strictEqual(store['selectedPreset'], 'month');
  });

  it('should get saved settings', async () => {
    store['selectedPreset'] = 'yesterday';
    const result = await settingsManager.get('selectedPreset');
    assert.strictEqual(result.success, true);
    if (result.success) {
        assert.strictEqual(result.value, 'yesterday');
    }
  });

  it('should clear settings', async () => {
      store['selectedPreset'] = 'today';
      const result = await settingsManager.clear();
      assert.strictEqual(result.success, true);
      assert.strictEqual(store['selectedPreset'], undefined);
  });
  
  it('should handle quota exceeded error', async () => {
      chromeMock.runtime.lastError = { message: "Quota exceeded" };
      const result = await settingsManager.set('selectedPreset', 'today');
      assert.strictEqual(result.success, false);
      if (!result.success) {
          assert.strictEqual(result.error.code, 'STORAGE_QUOTA_EXCEEDED');
      }
  });

  it('should handle generic write errors', async () => {
      chromeMock.runtime.lastError = { message: "Generic error" };
      const result = await settingsManager.set('selectedPreset', 'today');
      assert.strictEqual(result.success, false);
      if (!result.success) {
          assert.strictEqual(result.error.code, 'STORAGE_WRITE_ERROR');
      }
  });
});
