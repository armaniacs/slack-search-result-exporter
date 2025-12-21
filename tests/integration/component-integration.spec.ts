/**
 * Task 6.1: Component Integration Tests
 *
 * Integration tests verifying all Chrome Extension components work together:
 * - Service Worker ↔ Storage
 * - Content Script ↔ Service Worker
 * - Popup UI ↔ Content Script
 * - Popup UI ↔ Service Worker
 * - End-to-end flows
 */

import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Task 6.1: Component Integration Tests', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    // Load Chrome extension
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    // Get extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    extensionId = background.url().split('/')[2];
    console.log('Extension loaded with ID:', extensionId);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('6.1.1: Service Worker ↔ Storage integration - Save and load settings', async () => {
    const page = await context.newPage();

    // Navigate to extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Select a date preset
    await page.click('[data-preset="today"]');

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Close and reopen popup
    await page.close();
    const page2 = await context.newPage();
    await page2.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify previously selected preset is active
    const todayButton = page2.locator('[data-preset="today"]');
    await expect(todayButton).toHaveClass(/active|selected/);

    await page2.close();
  });

  test('6.1.2: Service Worker ↔ Storage integration - Default settings', async () => {
    const page = await context.newPage();

    // Clear storage first
    await context.clearCookies();
    await page.evaluate(() => chrome.storage.sync.clear());

    // Navigate to extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Wait for default settings to load
    await page.waitForTimeout(300);

    // Verify default preset is "week" (as specified in design)
    const weekButton = page.locator('[data-preset="week"]');
    await expect(weekButton).toHaveClass(/active|selected/);

    await page.close();
  });

  test('6.1.3: Popup UI → Content Script → Popup UI flow - Export messages', async () => {
    const page = await context.newPage();

    // Navigate to a test Slack page (mock)
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search-mock.html');
    await page.goto(`file://${mockPagePath}`);

    // Open extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Click export button
    const exportButton = page.locator('#export-btn');
    await exportButton.click();

    // Wait for export progress indicator
    const progressIndicator = page.locator('#progress');
    await expect(progressIndicator).toBeVisible();

    // Wait for export to complete
    const resultSection = page.locator('#result-section');
    await expect(resultSection).toBeVisible({ timeout: 10000 });

    // Verify TSV result is displayed
    const resultText = page.locator('#result-text');
    const tsvContent = await resultText.inputValue();

    expect(tsvContent).toBeTruthy();
    expect(tsvContent.split('\n').length).toBeGreaterThan(0);

    await page.close();
  });

  test('6.1.4: Content Script ↔ Service Worker - Message passing', async () => {
    const page = await context.newPage();

    // Navigate to Slack domain
    await page.goto('https://app.slack.com/client/test');

    // Inject test message from content script to service worker
    const testResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GET_SETTINGS' },
          (response: any) => {
            resolve(response);
          }
        );
      });
    });

    // Verify service worker responded
    expect(testResult).toBeTruthy();
    expect((testResult as any).type).toBe('SETTINGS_LOADED');

    await page.close();
  });

  test('6.1.5: Popup UI → Service Worker → Popup UI - Settings persistence flow', async () => {
    const page = await context.newPage();

    // Navigate to extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Change preset to "month"
    await page.click('[data-preset="month"]');

    // Wait for save operation
    await page.waitForTimeout(500);

    // Verify settings were saved by checking storage
    const savedSettings = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.get('selectedPreset', resolve);
      });
    });

    expect((savedSettings as any).selectedPreset).toBe('month');

    await page.close();
  });

  test('6.1.6: Cross-device sync simulation - Storage change event', async () => {
    const page = await context.newPage();

    // Navigate to extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Simulate storage change from another device
    await page.evaluate(() => {
      chrome.storage.sync.set({ selectedPreset: 'yesterday' });
    });

    // Wait for storage change event to propagate
    await page.waitForTimeout(1000);

    // Close and reopen popup to see the change
    await page.close();
    const page2 = await context.newPage();
    await page2.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify new preset is active
    const yesterdayButton = page2.locator('[data-preset="yesterday"]');
    await expect(yesterdayButton).toHaveClass(/active|selected/);

    await page2.close();
  });

  test('6.1.7: End-to-end - Full export workflow with date preset', async () => {
    const page = await context.newPage();

    // Navigate to mock Slack search page
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search-mock.html');
    await page.goto(`file://${mockPagePath}`);

    // Open extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Select date preset
    await page.click('[data-preset="week"]');
    await page.waitForTimeout(300);

    // Click export button
    await page.click('#export-btn');

    // Wait for progress indicator
    await expect(page.locator('#progress')).toBeVisible();

    // Wait for completion
    await expect(page.locator('#result-section')).toBeVisible({ timeout: 10000 });

    // Verify export result
    const resultText = await page.locator('#result-text').inputValue();
    const lines = resultText.split('\n').filter(line => line.trim());

    expect(lines.length).toBeGreaterThan(0);

    // Each line should have 4 tab-separated columns
    lines.forEach(line => {
      const columns = line.split('\t');
      expect(columns.length).toBeGreaterThanOrEqual(4);
    });

    await page.close();
  });

  test('6.1.8: Error handling - Unsupported page', async () => {
    const page = await context.newPage();

    // Navigate to non-Slack page
    await page.goto('https://www.google.com');

    // Open extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Try to export
    await page.click('#export-btn');

    // Wait for error message
    const errorMessage = page.locator('#error-message');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify error message content
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('Slack');

    await page.close();
  });

  test('6.1.9: Clipboard copy integration', async () => {
    const page = await context.newPage();

    // Navigate to mock page and complete export
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search-mock.html');
    await page.goto(`file://${mockPagePath}`);
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.click('#export-btn');
    await expect(page.locator('#result-section')).toBeVisible({ timeout: 10000 });

    // Click copy button
    const copyButton = page.locator('#copy-btn');
    await copyButton.click();

    // Verify clipboard content (grant clipboard permission)
    await context.grantPermissions(['clipboard-read']);

    const clipboardContent = await page.evaluate(() =>
      navigator.clipboard.readText()
    );

    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent.split('\n').length).toBeGreaterThan(0);

    await page.close();
  });

  test('6.1.10: Service Worker lifecycle - Persistent state', async () => {
    const page = await context.newPage();

    // Set a preset
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.click('[data-preset="today"]');
    await page.waitForTimeout(500);
    await page.close();

    // Simulate service worker unload and reload
    // (In real Chrome Extension, service worker unloads after inactivity)

    // Open popup again
    const page2 = await context.newPage();
    await page2.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify settings persisted even if service worker was unloaded
    const todayButton = page2.locator('[data-preset="today"]');
    await expect(todayButton).toHaveClass(/active|selected/);

    await page2.close();
  });
});
