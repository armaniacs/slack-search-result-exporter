# Chrome Extension Loading and Testing Guide (Task 7.2)

## Overview

This guide provides step-by-step instructions for loading and testing the Slack Search Result Exporter Chrome Extension in a local development environment.

## Prerequisites

- Chrome browser (version 90 or later)
- Access to a Slack workspace for testing
- Build completed successfully (Task 7.1)

## Part 1: Loading the Extension in Chrome

### Step 1: Enable Developer Mode

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Toggle "Developer mode" switch in the top-right corner

### Step 2: Load Unpacked Extension

1. Click "Load unpacked" button
2. Navigate to the project directory
3. Select the `dist/` folder
4. Click "Select" or "Open"

### Step 3: Verify Extension Installation

**Expected Results:**
- Extension card appears with name "Slack Search Result Exporter"
- Version shows "1.0.0"
- Extension icon (if visible) is displayed
- No errors in the extension card
- Service worker status shows "active"

**Test Checklist:**
- [ ] Extension card is visible in chrome://extensions
- [ ] Extension name matches "Slack Search Result Exporter"
- [ ] Version is "1.0.0"
- [ ] No error messages in extension card
- [ ] Extension icon appears in Chrome toolbar

## Part 2: Functional Testing on Slack

### Test 2.1: Search Results Export

**Setup:**
1. Navigate to your Slack workspace
2. Perform a search (e.g., search for "meeting")
3. Ensure search results page is loaded

**Test Steps:**
1. Click the extension icon in Chrome toolbar
2. Popup UI should open
3. Click the "Export" button (or select a date preset first)
4. Wait for export to complete

**Expected Results:**
- [ ] Extension icon is clickable when on Slack search results page
- [ ] Popup UI opens correctly
- [ ] Date preset buttons are displayed ("当日", "昨日", "一週間", "一ヶ月")
- [ ] Export button initiates message extraction
- [ ] Progress indicator shows during export
- [ ] TSV data appears in result text area
- [ ] TSV format is correct: `timestamp\tchannel\tsender\tcontent`
- [ ] No duplicate messages in export
- [ ] Copy button successfully copies data to clipboard

**Test Data Validation:**
- [ ] Timestamps are properly formatted
- [ ] Channel names are correct
- [ ] Sender names are extracted
- [ ] Message content includes text and links
- [ ] Links are converted to Markdown format `[text](url)`

### Test 2.2: Multi-Page Pagination

**Setup:**
1. Perform a search query that returns multiple pages of results (e.g., common keyword)

**Test Steps:**
1. Click extension icon
2. Click "Export" button
3. Observe pagination behavior

**Expected Results:**
- [ ] Extension automatically navigates through pages
- [ ] Progress updates are shown (e.g., "Page 2 of X")
- [ ] All messages from all pages are collected
- [ ] Export completes successfully
- [ ] No browser freeze during pagination
- [ ] Message count increases as pages are processed

### Test 2.3: Date Preset Functionality

**Test Steps:**
1. Click extension icon on Slack search page
2. Select "当日" (Today) preset
3. Verify search query is applied
4. Repeat for other presets: "昨日" (Yesterday), "一週間" (Week), "一ヶ月" (Month)

**Expected Results:**
- [ ] Date preset selection highlights the selected button
- [ ] Search query is updated with date range (e.g., `after:YYYY-MM-DD`)
- [ ] Search results are filtered by selected date range
- [ ] Export only includes messages within date range

### Test 2.4: Settings Persistence

**Test Steps:**
1. Select "一週間" (Week) preset
2. Close the popup
3. Reopen the popup

**Expected Results:**
- [ ] "一週間" preset is still selected (highlighted)
- [ ] Setting persists across popup open/close cycles
- [ ] Setting persists after browser restart (reload extension)

### Test 2.5: Error Handling

#### Test 2.5.1: Non-Slack Page
**Test Steps:**
1. Navigate to a non-Slack website (e.g., google.com)
2. Click extension icon

**Expected Results:**
- [ ] Error message displayed: "Slackページでのみ使用可能です" or similar
- [ ] No export operation is attempted
- [ ] Extension does not crash

#### Test 2.5.2: Empty Search Results
**Test Steps:**
1. Perform a search query with no results
2. Click extension icon and export

**Expected Results:**
- [ ] Export completes without errors
- [ ] Message: "メッセージが見つかりませんでした" or similar
- [ ] No crash or undefined behavior

#### Test 2.5.3: Network Interruption
**Test Steps:**
1. Start export on a page with many results
2. Simulate network interruption (disconnect WiFi briefly during pagination)

**Expected Results:**
- [ ] Error is gracefully handled
- [ ] Partial data is preserved
- [ ] Error message is displayed to user
- [ ] No crash or frozen UI

## Part 3: Security Testing

### Test 3.1: XSS Prevention

**Test Steps:**
1. Create a test message in Slack with HTML/script content: `<script>alert('XSS')</script>`
2. Search for and export this message

**Expected Results:**
- [ ] Script tag is escaped in TSV output
- [ ] No JavaScript execution in popup
- [ ] Content is safely displayed in text area
- [ ] No alert dialogs appear

### Test 3.2: Malicious Protocol Filtering

**Test Steps:**
1. Create a test message with `javascript:` protocol link
2. Export the message

**Expected Results:**
- [ ] `javascript:` links are filtered out
- [ ] Only `http`, `https`, and `mailto` links are preserved
- [ ] Filtered links are converted to plain text (not removed entirely)

### Test 3.3: Content Security Policy

**Test Steps:**
1. Open Chrome DevTools (F12)
2. Click on extension icon
3. Check Console tab for CSP violations

**Expected Results:**
- [ ] No CSP violations in console
- [ ] Popup loads without security warnings
- [ ] All scripts are from `self` origin

### Test 3.4: Permission Validation

**Test Steps:**
1. Go to `chrome://extensions/`
2. Click "Details" on the extension
3. Check "Permissions" section

**Expected Results:**
- [ ] Only "Read and change your data on slack.com" permission requested
- [ ] Only "activeTab" and "storage" permissions in manifest
- [ ] No excessive permissions (e.g., "tabs", "<all_urls>")

## Part 4: Browser Compatibility

### Test 4.1: Chrome Version Compatibility

**Test Steps:**
1. Check Chrome version: `chrome://version/`
2. Verify extension works on Chrome 90 or later

**Expected Results:**
- [ ] Extension loads on Chrome 90+
- [ ] All features work correctly
- [ ] No compatibility warnings

### Test 4.2: Performance Testing

**Test Steps:**
1. Export 100+ messages
2. Monitor browser performance

**Expected Results:**
- [ ] Browser remains responsive
- [ ] No UI freezing during export
- [ ] Memory usage is reasonable (<100MB)
- [ ] CPU usage is not excessive

## Part 5: Build Verification

### Test 5.1: ZIP Package Validation

**Test Steps:**
1. Extract `slack-search-result-exporter-v1.0.0.zip`
2. Verify contents

**Expected Results:**
- [ ] All JavaScript files are present
- [ ] `manifest.json` is included
- [ ] `popup.html` and `popup.css` are included
- [ ] Icons directory with icon16.png, icon48.png, icon128.png
- [ ] No TypeScript `.ts` files in package
- [ ] Source maps `.js.map` are present for debugging

### Test 5.2: Manual Install from ZIP

**Test Steps:**
1. Remove the extension from `chrome://extensions/`
2. Load the extracted ZIP contents as unpacked extension

**Expected Results:**
- [ ] Extension loads successfully from ZIP contents
- [ ] All functionality works identically to development build

## Test Summary

### Pass Criteria

- All functional tests pass
- No security vulnerabilities found
- Performance is acceptable (<2 seconds for 100 messages)
- Extension works on Chrome 90+
- No console errors or warnings
- Settings persistence works correctly

### Known Limitations

- Channel page export may not be implemented yet (Task 3.3/3.4)
- Limited to Chromium-based browsers only
- Requires manual testing (automated E2E tests in future tasks)

## Troubleshooting

### Issue: Extension won't load

**Solution:**
1. Check if `dist/` directory exists
2. Run `npm run build` to rebuild
3. Verify `manifest.json` is valid JSON
4. Check Chrome console for errors

### Issue: Popup doesn't open

**Solution:**
1. Check if on Slack website (`*.slack.com`)
2. Verify `popup.html` and `popup.js` are in `dist/`
3. Check browser console for errors
4. Reload extension

### Issue: Export doesn't work

**Solution:**
1. Verify you're on a Slack search results page
2. Check content script is injected (`chrome://extensions/` → Service worker → Console)
3. Look for errors in browser console
4. Verify DOM selectors match Slack's current structure

## Completion Checklist

- [ ] Extension loaded successfully in Chrome
- [ ] All functional tests pass
- [ ] All security tests pass
- [ ] Performance is acceptable
- [ ] No critical bugs found
- [ ] Manual testing checklist completed
- [ ] Task 7.2 marked as complete in tasks.md

---

**Date Completed:** _____________
**Tester:** _____________
**Chrome Version:** _____________
**Notes:** _____________
