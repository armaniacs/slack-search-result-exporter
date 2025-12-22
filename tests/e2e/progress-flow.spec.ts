import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Task 6.4 & 6.5: Progress Display & Regression Tests', () => {
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

  test('6.4.1: Multi-page progress flow - Verify status updates', async () => {
    const page = await context.newPage();

    // Navigate to Mock SPA Page
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search-mock-spa.html');
    await page.goto(`file://${mockPagePath}`);

    // Open extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Click export button
    await page.click('#export-btn');

    // 1. Check for initial state or extracting on Page 1
    // It might happen fast, but we expect at least to see the progress section
    const progress = page.locator('#progress');
    await expect(progress).toBeVisible();
    
    const progressText = page.locator('#progress-text');

    // 2. Check for "waiting_for_dom" during the 1s delay for Page 2
    // The mock clears DOM and waits 1s. Content script sends "waiting_for_dom" before waiting.
    // So we should see "Page 2" and "DOM"
    await expect(progressText).toContainText(/ページ 2.*DOM/);

    // 3. Wait for completion
    const resultSection = page.locator('#result-section');
    await expect(resultSection).toBeVisible({ timeout: 15000 });

    // 4. Verify completion state
    await expect(progress).not.toBeVisible();
    
    // Verify total messages: 2 from Page 1 + 2 from Page 2 = 4
    const messageCount = page.locator('#message-count');
    await expect(messageCount).toHaveText('4');

    await page.close();
  });

  test('6.5.1: Regression - EXPORT_COMPLETE and TSV content', async () => {
    const page = await context.newPage();
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search-mock-spa.html');
    await page.goto(`file://${mockPagePath}`);
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.click('#export-btn');
    await expect(page.locator('#result-section')).toBeVisible({ timeout: 15000 });

    const resultText = await page.locator('#result-text').inputValue();
    const lines = resultText.split('\n').filter(line => line.trim());

    // Header is not included in this implementation (raw messages only based on types.ts),
    // but let's check the content.
    // 4 messages.
    expect(lines.length).toBe(4);

    // Check content of first message
    expect(lines[0]).toContain('Page 1 Message 1');
    expect(lines[0]).toContain('User1');
    expect(lines[0]).toContain('general');

    // Check content of last message
    expect(lines[3]).toContain('Page 2 Message 2');
    expect(lines[3]).toContain('User4');
    expect(lines[3]).toContain('support');

    await page.close();
  });

  test('6.5.2: Regression - APPLY_DATE_PRESET', async () => {
    const page = await context.newPage();
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search.mock.html');
    await page.goto(`file://${mockPagePath}`);
    
    // The mock page doesn't have a real search input to verify the value change visually,
    // but the extension sends a message. 
    // In a real integration test, we can check if the extension attempts to apply it.
    // The popup logic: "APPLY_DATE_PRESET" -> Content Script -> applyQuery -> "PRESET_APPLIED" -> auto start export.
    
    // We can spy on the popup's logic or check if export starts automatically after clicking a preset.
    
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Click "Yesterday" preset
    await page.click('[data-preset="yesterday"]');

    // It should trigger export automatically
    const progress = page.locator('#progress');
    await expect(progress).toBeVisible();

    await expect(page.locator('#result-section')).toBeVisible();

    await page.close();
  });

  test('6.5.3: Regression - Domain Detection (Slack vs Non-Slack)', async () => {
    const page = await context.newPage();
    
    // 1. Non-Slack page should show error
    await page.goto('https://example.com');
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.click('#export-btn');
    let errorMsg = page.locator('#error-message');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('Slack');

    // 2. Specific Slack URL provided by user should be recognized as Slack
    // Note: It might still show an error if not logged in, but it should not be "Unsupported Page"
    const slackUrl = 'https://app.slack.com/client/T04JTC862/search';
    await page.goto(slackUrl);
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.click('#export-btn');
    
    // Check that it doesn't show the "Unsupported page" error related to non-Slack domains
    // Instead, it might show "DOM_STRUCTURE_MISMATCH" or "EXTRACTION_ERROR" because we are not logged in,
    // which is the expected behavior for a recognized Slack page in a test environment.
    errorMsg = page.locator('#error-message');
    await expect(errorMsg).toBeVisible();
    const errorText = await errorMsg.textContent();
    expect(errorText).not.toContain('Slackの検索結果ページ...に移動してください');

    await page.close();
  });
});
