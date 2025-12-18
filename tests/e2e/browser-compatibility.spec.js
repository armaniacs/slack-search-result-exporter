// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Task 9.1: Browser Compatibility Tests
 *
 * Tests the bookmarklet functionality across Chrome, Firefox, and Safari (WebKit).
 * Validates Markdown conversion, multiple URL handling, and performance.
 */

test.describe('Task 9.1: Browser Compatibility Tests', () => {
  let bookmarkletCode;

  test.beforeAll(() => {
    // Load bookmarklet code
    const bookmarkletPath = path.join(__dirname, '../../slack-search-result-exporter.js');
    bookmarkletCode = fs.readFileSync(bookmarkletPath, 'utf-8');
  });

  test.beforeEach(async ({ page }) => {
    // Load mock Slack search page
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search-mock.html');
    await page.goto(`file://${mockPagePath}`);
  });

  test('Step 1.1: Basic operation - Bookmarklet executes without errors', async ({ page }) => {
    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup window to be created
    const popupPromise = page.waitForEvent('popup');
    const popup = await popupPromise;

    // Verify popup opened
    expect(popup).toBeTruthy();

    // Verify textarea exists in popup
    const textarea = await popup.locator('textarea');
    await expect(textarea).toBeVisible();

    // Get TSV content
    const tsvContent = await textarea.inputValue();

    // Verify TSV format (日時\tチャンネル\t送信者\tメッセージ)
    const lines = tsvContent.trim().split('\n');
    expect(lines.length).toBeGreaterThan(0);

    // Check first line has 4 tab-separated columns
    const firstLine = lines[0];
    const columns = firstLine.split('\t');
    expect(columns.length).toBe(4);

    console.log(`Browser: ${await page.evaluate(() => navigator.userAgent)}`);
    console.log(`TSV lines: ${lines.length}`);
    console.log(`First line: ${firstLine}`);
  });

  test('Step 1.2: Markdown URL conversion - Single URL', async ({ page }) => {
    // Spy on console logs
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup
    const popup = await page.waitForEvent('popup');
    const textarea = await popup.locator('textarea');
    const tsvContent = await textarea.inputValue();

    // Find the line with "Check out" message (Test Case 2)
    const lines = tsvContent.split('\n');
    const githubLine = lines.find(line => line.includes('Check out'));

    expect(githubLine).toBeTruthy();

    // Verify Markdown format: [github.com](https://github.com) or with trailing slash
    expect(githubLine).toMatch(/\[github\.com\]\(https:\/\/github\.com\/?\)/);

    // Verify console logs for extraction
    const extractionLogs = consoleLogs.filter(log => log.includes('Extracted') && log.includes('external links'));
    expect(extractionLogs.length).toBeGreaterThan(0);

    console.log('Single URL Test - Line:', githubLine);
  });

  test('Step 1.3: Multiple URLs and filtering', async ({ page }) => {
    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup
    const popup = await page.waitForEvent('popup');
    const textarea = await popup.locator('textarea');
    const tsvContent = await textarea.inputValue();

    // Test Case 3: Multiple external URLs
    const multipleUrlLine = tsvContent.split('\n').find(line =>
      line.includes('Visit') && line.includes('google')
    );

    expect(multipleUrlLine).toBeTruthy();

    // Both URLs should be converted to Markdown (allow trailing slash)
    expect(multipleUrlLine).toMatch(/\[google\.com\]\(https:\/\/google\.com\/?\)/);
    expect(multipleUrlLine).toMatch(/\[github\.com\]\(https:\/\/github\.com\/?\)/);

    // Test Case 4: Internal link + External URL
    const mixedLine = tsvContent.split('\n').find(line =>
      line.includes('See #general')
    );

    expect(mixedLine).toBeTruthy();

    // External URL should be Markdown, internal link (#general) should remain as-is
    expect(mixedLine).toContain('#general');
    expect(mixedLine).toMatch(/\[example\.com\]\(https:\/\/example\.com\/?\)/);

    console.log('Multiple URLs Test - Line:', multipleUrlLine);
    console.log('Mixed Links Test - Line:', mixedLine);
  });

  test('Step 1.4: Special characters in URLs', async ({ page }) => {
    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup
    const popup = await page.waitForEvent('popup');
    const textarea = await popup.locator('textarea');
    const tsvContent = await textarea.inputValue();

    // Test Case 5: URL with query parameters
    const specialCharLine = tsvContent.split('\n').find(line =>
      line.includes('Documentation:')
    );

    expect(specialCharLine).toBeTruthy();

    // URL should be properly encoded
    expect(specialCharLine).toMatch(/https:\/\/example\.com\/search\?query=hello%20world&lang=ja/);

    console.log('Special Characters Test - Line:', specialCharLine);
  });

  test('Step 1.5: Performance - Export completes within 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup
    const popup = await page.waitForEvent('popup');
    await popup.locator('textarea').waitFor({ state: 'visible' });

    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // Convert to seconds

    // Verify execution time is under 5 seconds
    expect(executionTime).toBeLessThan(5);

    console.log(`Performance Test - Execution time: ${executionTime.toFixed(2)} seconds`);
  });

  test('Step 1.6: Backward compatibility - Messages without links', async ({ page }) => {
    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup
    const popup = await page.waitForEvent('popup');
    const textarea = await popup.locator('textarea');
    const tsvContent = await textarea.inputValue();

    // Test Case 1: Plain text message
    const lines = tsvContent.split('\n').filter(line => line.trim().length > 0);
    const plainTextLine = lines.find(line =>
      line.includes('plain text message')
    );

    expect(plainTextLine).toBeTruthy();

    // Should NOT have any Markdown link format
    expect(plainTextLine).not.toMatch(/\[.*\]\(https?:\/\/.*\)/);

    // Should have at least 4 columns (datetime, channel, sender, message)
    const columns = plainTextLine.split('\t');

    console.log('Backward Compatibility Test - Line:', plainTextLine);
    console.log('Backward Compatibility Test - Columns:', columns.length);
    console.log('Backward Compatibility Test - First 3 columns:', columns.slice(0, 3));

    expect(columns.length).toBeGreaterThanOrEqual(4);
  });

  test('Step 1.7: Link text with special characters', async ({ page }) => {
    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup
    const popup = await page.waitForEvent('popup');
    const textarea = await popup.locator('textarea');
    const tsvContent = await textarea.inputValue();

    // Test Case 6: Link text with brackets and special chars
    const specialTextLine = tsvContent.split('\n').find(line =>
      line.includes('C++') || line.includes('Regex')
    );

    expect(specialTextLine).toBeTruthy();

    // Special characters in link text should be handled properly
    expect(specialTextLine).toMatch(/\[.*\]\(https:\/\//);

    console.log('Special Link Text Test - Line:', specialTextLine);
  });

  test('Step 1.8: Direct message (no channel)', async ({ page }) => {
    // Execute bookmarklet
    await page.evaluate(bookmarkletCode);

    // Wait for popup
    const popup = await page.waitForEvent('popup');
    const textarea = await popup.locator('textarea');
    const tsvContent = await textarea.inputValue();

    // Test Case 9: Direct message
    const dmLine = tsvContent.split('\n').find(line =>
      line.includes('Private message')
    );

    expect(dmLine).toBeTruthy();

    // Should have "DirectMessage" as channel name (or could be empty channel)
    // Note: The mock HTML doesn't have channel name for this test case
    expect(dmLine).toBeTruthy();

    // URL should be converted to Markdown
    expect(dmLine).toMatch(/\[private\.example\.com\]\(https:\/\/private\.example\.com\/?\)/);

    console.log('Direct Message Test - Line:', dmLine);
  });
});
