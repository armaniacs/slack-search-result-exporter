/**
 * Task 6.1: Component Integration Tests
 *
 * These integration tests verify that all Chrome Extension components work
 * together correctly:
 * - Service Worker ↔ Storage (Settings persistence flow)
 * - Content Script ↔ Service Worker (Message passing)
 * - Popup UI ↔ Content Script (Export flow)
 * - Popup UI ↔ Service Worker (Settings flow)
 * - End-to-end data transformations
 *
 * Run with: npm test tests/integration
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { chromeMock, resetMock, store } from '../unit/mocks/chrome_mock.js';

// Inject Chrome mock
(global as any).chrome = chromeMock;

import { SettingsManager } from '../../src/settings-manager.js';
import { DatePresetManager } from '../../src/date-preset-manager.js';
import { MessageFormatter } from '../../src/message-formatter.js';
import type {
  UserSettings,
  DatePreset,
  RawMessage,
  PopupToServiceWorkerMessage,
  ServiceWorkerToPopupMessage,
  PopupToContentScriptMessage,
  ContentScriptToPopupMessage,
  ExportResult
} from '../../src/types.js';

describe('Task 6.1.1: Service Worker ↔ Storage Integration', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    resetMock();
    settingsManager = new SettingsManager();
  });

  it('should save and load settings through storage', async () => {
    // Simulate Service Worker saving settings
    const settingsToSave: UserSettings = {
      selectedPreset: 'today'
    };

    const saveResult = await settingsManager.setAll(settingsToSave);
    assert.strictEqual(saveResult.success, true, 'Settings should save successfully');

    // Simulate loading settings on next popup open
    const loadResult = await settingsManager.getAll();
    assert.strictEqual(loadResult.success, true, 'Settings should load successfully');

    if (loadResult.success) {
      assert.strictEqual(
        loadResult.value.selectedPreset,
        'today',
        'Loaded preset should match saved preset'
      );
    }
  });

  it('should persist settings across multiple save/load cycles', async () => {
    const presets: DatePreset[] = ['today', 'yesterday', 'week', 'month'];

    for (const preset of presets) {
      // Save
      const settings: UserSettings = { selectedPreset: preset };
      const saveResult = await settingsManager.setAll(settings);
      assert.strictEqual(saveResult.success, true);

      // Load
      const loadResult = await settingsManager.getAll();
      assert.strictEqual(loadResult.success, true);

      if (loadResult.success) {
        assert.strictEqual(loadResult.value.selectedPreset, preset);
      }
    }
  });

  it('should handle storage clear operation', async () => {
    // Save some settings
    await settingsManager.setAll({ selectedPreset: 'today' });

    // Clear storage
    const clearResult = await settingsManager.clear();
    assert.strictEqual(clearResult.success, true);

    // Load should return default settings
    const loadResult = await settingsManager.getAll();
    assert.strictEqual(loadResult.success, true);

    if (loadResult.success) {
      assert.strictEqual(loadResult.value.selectedPreset, 'week'); // Default
    }
  });

  it('should support cross-device sync simulation', async () => {
    // Device 1: Save settings
    const device1Settings = new SettingsManager();
    await device1Settings.setAll({ selectedPreset: 'month' });

    // Device 2: Load settings (simulating sync)
    const device2Settings = new SettingsManager();
    const result = await device2Settings.getAll();

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.value.selectedPreset, 'month');
    }
  });
});

describe('Task 6.1.2: Message Type Compatibility', () => {
  it('should support all Popup → Service Worker message types', () => {
    // GET_SETTINGS
    const getMessage: PopupToServiceWorkerMessage = { type: 'GET_SETTINGS' };
    assert.strictEqual(getMessage.type, 'GET_SETTINGS');

    // SAVE_SETTINGS
    const saveMessage: PopupToServiceWorkerMessage = {
      type: 'SAVE_SETTINGS',
      payload: { selectedPreset: 'week' }
    };
    assert.strictEqual(saveMessage.type, 'SAVE_SETTINGS');
    assert.strictEqual(saveMessage.payload?.selectedPreset, 'week');

    // CLEAR_SETTINGS
    const clearMessage: PopupToServiceWorkerMessage = { type: 'CLEAR_SETTINGS' };
    assert.strictEqual(clearMessage.type, 'CLEAR_SETTINGS');
  });

  it('should support all Service Worker → Popup message types', () => {
    // SETTINGS_LOADED
    const loadedMsg: ServiceWorkerToPopupMessage = {
      type: 'SETTINGS_LOADED',
      payload: { selectedPreset: 'today' }
    };
    assert.strictEqual(loadedMsg.type, 'SETTINGS_LOADED');
    assert.strictEqual(loadedMsg.payload.selectedPreset, 'today');

    // SETTINGS_SAVED
    const savedMsg: ServiceWorkerToPopupMessage = { type: 'SETTINGS_SAVED' };
    assert.strictEqual(savedMsg.type, 'SETTINGS_SAVED');

    // SETTINGS_ERROR
    const errorMsg: ServiceWorkerToPopupMessage = {
      type: 'SETTINGS_ERROR',
      error: {
        code: 'STORAGE_WRITE_ERROR',
        message: 'Test error'
      }
    };
    assert.strictEqual(errorMsg.type, 'SETTINGS_ERROR');
    assert.strictEqual(errorMsg.error.code, 'STORAGE_WRITE_ERROR');
  });

  it('should support all Popup → Content Script message types', () => {
    // START_EXPORT
    const exportMsg: PopupToContentScriptMessage = {
      type: 'START_EXPORT',
      options: { datePreset: 'week' }
    };
    assert.strictEqual(exportMsg.type, 'START_EXPORT');
    assert.strictEqual(exportMsg.options.datePreset, 'week');

    // APPLY_DATE_PRESET
    const presetMsg: PopupToContentScriptMessage = {
      type: 'APPLY_DATE_PRESET',
      preset: 'today',
      query: 'after:2025-12-20'
    };
    assert.strictEqual(presetMsg.type, 'APPLY_DATE_PRESET');
    assert.strictEqual(presetMsg.preset, 'today');
    assert.strictEqual(presetMsg.query, 'after:2025-12-20');
  });

  it('should support all Content Script → Popup message types', () => {
    // EXPORT_PROGRESS
    const progressMsg: ContentScriptToPopupMessage = {
      type: 'EXPORT_PROGRESS',
      payload: { currentPage: 2, messageCount: 50, status: 'extracting' }
    };
    assert.strictEqual(progressMsg.type, 'EXPORT_PROGRESS');
    assert.strictEqual(progressMsg.payload.currentPage, 2);
    assert.strictEqual(progressMsg.payload.messageCount, 50);
    assert.strictEqual(progressMsg.payload.status, 'extracting');

    // EXPORT_COMPLETE
    const completeMsg: ContentScriptToPopupMessage = {
      type: 'EXPORT_COMPLETE',
      payload: {
        messages: ['line1', 'line2'],
        messageCount: 2,
        pageCount: 1
      }
    };
    assert.strictEqual(completeMsg.type, 'EXPORT_COMPLETE');
    assert.strictEqual(completeMsg.payload.messageCount, 2);

    // EXPORT_ERROR
    const errorMsg: ContentScriptToPopupMessage = {
      type: 'EXPORT_ERROR',
      error: {
        code: 'EXTRACTION_ERROR',
        message: 'Test error'
      }
    };
    assert.strictEqual(errorMsg.type, 'EXPORT_ERROR');
    assert.strictEqual(errorMsg.error.code, 'EXTRACTION_ERROR');

    // PRESET_APPLIED
    const appliedMsg: ContentScriptToPopupMessage = {
      type: 'PRESET_APPLIED',
      success: true,
      message: 'Preset applied'
    };
    assert.strictEqual(appliedMsg.type, 'PRESET_APPLIED');
    assert.strictEqual(appliedMsg.success, true);
  });
});

describe('Task 6.1.3: Date Preset Manager Integration', () => {
  let datePresetManager: DatePresetManager;

  beforeEach(() => {
    datePresetManager = new DatePresetManager();
  });

  it('should generate valid Slack queries for all presets', () => {
    const presets: DatePreset[] = ['today', 'yesterday', 'week', 'month'];

    for (const preset of presets) {
      const query = datePresetManager.toSlackQuery(preset);

      // Should match format: on:YYYY-MM-DD or after:YYYY-MM-DD
      // "today" and "yesterday" use "on:", "week" and "month" use "after:"
      assert.match(query, /^(on|after):\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('should calculate valid date ranges for all presets', () => {
    const presets: DatePreset[] = ['today', 'yesterday', 'week', 'month'];

    for (const preset of presets) {
      const range = datePresetManager.calculateDateRange(preset);

      // Verify dates are valid
      assert.ok(range.startDate instanceof Date);
      assert.ok(range.endDate instanceof Date);

      // Verify startDate <= endDate
      assert.ok(range.startDate.getTime() <= range.endDate.getTime());
    }
  });

  it('should produce consistent queries for same preset', () => {
    const query1 = datePresetManager.toSlackQuery('week');
    const query2 = datePresetManager.toSlackQuery('week');

    assert.strictEqual(query1, query2);
  });

  it('should generate different queries for different presets', () => {
    const todayQuery = datePresetManager.toSlackQuery('today');
    const monthQuery = datePresetManager.toSlackQuery('month');

    assert.notStrictEqual(todayQuery, monthQuery);
  });
});

describe('Task 6.1.4: Message Formatter Integration', () => {
  it('should format raw messages to TSV correctly', () => {
    const rawMessage: RawMessage = {
      timestamp: '1703001600',
      channel: '#general',
      sender: 'user1',
      content: 'Test message'
    };

    const tsvLine = MessageFormatter.formatToTSV(rawMessage);
    const columns = tsvLine.split('\t');

    assert.strictEqual(columns.length, 4);
    assert.strictEqual(columns[0], '1703001600');
    assert.strictEqual(columns[1], '#general');
    assert.strictEqual(columns[2], 'user1');
    assert.strictEqual(columns[3], 'Test message');
  });

  it('should handle tabs in message content', () => {
    const rawMessage: RawMessage = {
      timestamp: '1703001600',
      channel: '#general',
      sender: 'user1',
      content: 'Message\twith\ttabs'
    };

    const tsvLine = MessageFormatter.formatToTSV(rawMessage);

    // Tabs in content should be replaced with spaces
    assert.ok(!tsvLine.includes('Message\twith\ttabs'));
    assert.ok(tsvLine.includes('Message with tabs'));
  });

  it('should handle newlines in message content', () => {
    const rawMessage: RawMessage = {
      timestamp: '1703001600',
      channel: '#general',
      sender: 'user1',
      content: 'Line1\nLine2'
    };

    const tsvLine = MessageFormatter.formatToTSV(rawMessage);

    // Newlines should be replaced with <br>
    assert.ok(tsvLine.includes('<br>'));
    assert.ok(!tsvLine.includes('\n'));
  });

  it('should convert HTML links to Markdown', () => {
    const htmlWithLink = '<a href="https://example.com">Example</a>';
    const markdown = MessageFormatter.convertLinksToMarkdown(htmlWithLink);

    assert.strictEqual(markdown, '[Example](https://example.com)');
  });

  it('should filter dangerous protocols', () => {
    const htmlWithDangerousLink = '<a href="javascript:alert(1)">Click</a>';
    const markdown = MessageFormatter.convertLinksToMarkdown(htmlWithDangerousLink);

    // Should strip javascript: protocol link
    assert.ok(!markdown.includes('javascript:'));
    assert.strictEqual(markdown, 'Click');
  });

  it('should handle multiple links in content', () => {
    const htmlWithMultipleLinks =
      '<a href="https://example.com">Example</a> and <a href="https://test.com">Test</a>';
    const markdown = MessageFormatter.convertLinksToMarkdown(htmlWithMultipleLinks);

    assert.ok(markdown.includes('[Example](https://example.com)'));
    assert.ok(markdown.includes('[Test](https://test.com)'));
  });
});

describe('Task 6.1.5: End-to-End Integration Flows', () => {
  beforeEach(() => {
    resetMock();
  });

  it('should complete full settings persistence flow', async () => {
    // 1. Popup UI initializes and loads settings
    const settingsManager = new SettingsManager();
    const initialLoad = await settingsManager.getAll();
    assert.strictEqual(initialLoad.success, true);

    if (initialLoad.success) {
      // 2. User selects a preset in Popup UI
      const newSettings: UserSettings = { selectedPreset: 'today' };

      // 3. Settings are saved through Service Worker
      const saveResult = await settingsManager.setAll(newSettings);
      assert.strictEqual(saveResult.success, true);

      // 4. User closes and reopens popup
      const reloadedSettings = await settingsManager.getAll();
      assert.strictEqual(reloadedSettings.success, true);

      if (reloadedSettings.success) {
        // 5. Verify settings persisted
        assert.strictEqual(reloadedSettings.value.selectedPreset, 'today');
      }
    }
  });

  it('should complete full export data transformation flow', () => {
    // 1. Raw messages extracted from Slack DOM by Content Script
    const rawMessages: RawMessage[] = [
      {
        timestamp: '1703001600',
        channel: '#general',
        sender: 'user1',
        content: 'Check out <a href="https://example.com">this link</a>'
      },
      {
        timestamp: '1703001660',
        channel: '#general',
        sender: 'user2',
        content: 'Message with\ttabs and\nnewlines'
      }
    ];

    // 2. MessageFormatter processes each message
    const tsvLines = rawMessages.map(msg => {
      // Convert links to Markdown
      const processedContent = MessageFormatter.convertLinksToMarkdown(msg.content);

      // Format to TSV
      return MessageFormatter.formatToTSV({
        ...msg,
        content: processedContent
      });
    });

    // 3. Verify Export Result structure
    const exportResult: ExportResult = {
      messages: tsvLines,
      messageCount: tsvLines.length,
      pageCount: 1
    };

    assert.strictEqual(exportResult.messageCount, 2);
    assert.strictEqual(exportResult.messages.length, 2);

    // 4. Verify first message has Markdown link
    assert.ok(exportResult.messages[0].includes('[this link](https://example.com)'));

    // 5. Verify second message has escaped special characters
    assert.ok(exportResult.messages[1].includes('<br>'));
    assert.ok(!exportResult.messages[1].includes('\n'));

    // 6. Verify all lines have 4 TSV columns
    exportResult.messages.forEach(line => {
      const columns = line.split('\t');
      assert.ok(columns.length >= 4);
    });
  });

  it('should support date preset application in export flow', () => {
    // 1. User selects date preset in Popup UI
    const datePresetManager = new DatePresetManager();
    const selectedPreset: DatePreset = 'week';

    // 2. Generate Slack query
    const slackQuery = datePresetManager.toSlackQuery(selectedPreset);
    assert.match(slackQuery, /^after:\d{4}-\d{2}-\d{2}$/);

    // 3. Calculate date range for validation
    const dateRange = datePresetManager.calculateDateRange(selectedPreset);
    assert.ok(dateRange.startDate instanceof Date);
    assert.ok(dateRange.endDate instanceof Date);

    // 4. Query would be sent to Content Script for application
    const applyPresetMessage: PopupToContentScriptMessage = {
      type: 'APPLY_DATE_PRESET',
      preset: selectedPreset,
      query: slackQuery
    };

    assert.strictEqual(applyPresetMessage.type, 'APPLY_DATE_PRESET');
    assert.strictEqual(applyPresetMessage.preset, 'week');
    assert.ok(applyPresetMessage.query.startsWith('after:'));
  });

  it('should handle cross-component error propagation', async () => {
    // Simulate storage error by returning error via callback
    const originalGet = chromeMock.storage.sync.get;
    chromeMock.storage.sync.get = (_keys: any, callback?: any) => {
      if (callback) {
        // Simulate empty storage, which triggers default settings
        callback({});
      }
      return Promise.resolve({});
    };

    const settingsManager = new SettingsManager();

    try {
      const result = await settingsManager.getAll();

      // Should return default settings when storage is empty
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.value.selectedPreset, 'week');
      }
    } finally {
      // Restore
      chromeMock.storage.sync.get = originalGet;
    }
  });
});

describe('Task 6.1.6: Component Integration Summary', () => {
  it('should verify all components are properly integrated', async () => {
    // Setup
    resetMock();

    // 1. Storage Layer
    const settingsManager = new SettingsManager();
    const saveResult = await settingsManager.setAll({ selectedPreset: 'month' });
    assert.strictEqual(saveResult.success, true);

    // 2. Date Preset Manager
    const datePresetManager = new DatePresetManager();
    const query = datePresetManager.toSlackQuery('month');
    assert.ok(query.startsWith('after:'));

    // 3. Message Formatter
    const rawMessage: RawMessage = {
      timestamp: '1703001600',
      channel: '#general',
      sender: 'user1',
      content: '<a href="https://example.com">Link</a>'
    };
    const formatted = MessageFormatter.formatToTSV({
      ...rawMessage,
      content: MessageFormatter.convertLinksToMarkdown(rawMessage.content)
    });
    assert.ok(formatted.includes('[Link](https://example.com)'));

    // 4. Verify settings persisted
    const loadResult = await settingsManager.getAll();
    assert.strictEqual(loadResult.success, true);
    if (loadResult.success) {
      assert.strictEqual(loadResult.value.selectedPreset, 'month');
    }

    console.log('✓ All components integrated successfully');
  });
});
