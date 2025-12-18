# E2E Testing Guide - Task 7.1

## Overview

End-to-End (E2E) testing for this bookmarklet requires manual testing on actual Slack pages. This guide provides step-by-step instructions for validating the URL export functionality in real-world scenarios.

## Prerequisites

1. Active Slack workspace with message history
2. Browser with bookmarklet support (Chrome, Firefox, Safari)
3. Bookmarklet installed from `slack-search-result-exporter.js`

## Test Environment Setup

### Installing the Bookmarklet

1. Copy the entire contents of `slack-search-result-exporter.js`
2. Create a new bookmark in your browser
3. Name it "Export Slack Search"
4. Set the URL to: `javascript:(function(){` + [paste code here] + `})()`
5. Save the bookmark

## E2E Test Cases

### Test Case 7.1.1: 単一外部URLリンクを含むメッセージのエクスポート

**Objective**: Verify single external URL link is converted to Markdown format

**Steps**:
1. Navigate to your Slack workspace
2. Search for messages containing a single external URL (e.g., "https://github.com")
3. Wait for search results to load
4. Click the bookmarklet
5. Wait for the popup window to appear
6. Review the exported message content

**Expected Result**:
- Message with URL should contain Markdown format: `[Link Text](https://url.com)`
- TSV format maintained: `DateTime\tChannel\tSender\tMessage`
- Debug log (if enabled) shows: "Extracted 1 external links"

**Example**:
```
Before: Check out GitHub for code
After:  Check out [GitHub](https://github.com) for code
```

---

### Test Case 7.1.2: 複数外部URLリンクを含むメッセージのエクスポート

**Objective**: Verify multiple external URLs are all converted to Markdown

**Steps**:
1. Search for messages with multiple URLs
2. Click the bookmarklet
3. Review exported content in popup

**Expected Result**:
- All external URLs converted to Markdown format
- Each link preserves its original text and URL
- Debug log shows correct count: "Extracted N external links"

**Example**:
```
Before: Resources: Google and GitHub
After:  Resources: [Google](https://google.com) and [GitHub](https://github.com)
```

---

### Test Case 7.1.3: 内部リンクと外部URLが混在するメッセージのエクスポート

**Objective**: Verify only external URLs are converted, internal links remain unchanged

**Steps**:
1. Search for messages containing both:
   - External URLs (http/https)
   - Internal Slack links (#channel, @user)
   - Internal links (relative paths)
2. Click the bookmarklet
3. Review exported content

**Expected Result**:
- Only external URLs (http/https) converted to Markdown
- Internal Slack references preserved as plain text
- Debug log shows only external links counted

**Example**:
```
Before: Check #general and https://example.com
After:  Check #general and [example.com](https://example.com)
```

---

### Test Case 7.1.4: URLリンクなしメッセージの後方互換性確認

**Objective**: Verify messages without URLs are unchanged (backward compatibility)

**Steps**:
1. Search for plain text messages without URLs
2. Click the bookmarklet
3. Compare exported content with original

**Expected Result**:
- Message content identical to original
- TSV format maintained
- Debug log shows: "Extracted 0 external links"
- No Markdown conversion applied

**Example**:
```
Before: This is a plain text message
After:  This is a plain text message
```

---

## Additional Manual Test Scenarios

### Edge Case Testing

#### Test: Special Characters in URLs
**Message**: `Visit [C++ Docs](https://cppreference.com)`
**Expected**: Link text with special chars properly escaped in Markdown

#### Test: Multiple Occurrences of Same Link
**Message**: `Google this, Google that, Google everything`
**Expected**: All occurrences of "Google" converted if linked

#### Test: Mixed Protocols
**Message**: Contains `mailto:`, `tel:`, `https://`, `ftp://`
**Expected**: Only `https://` and `http://` converted

#### Test: Empty Search Results
**Steps**: Search for non-existent term
**Expected**: Bookmarklet handles gracefully, shows empty results

#### Test: Large Result Set (Performance)
**Steps**: Search with 50+ results, export all pages
**Expected**: Completes without errors, all pages processed

## Validation Checklist

After running all test cases, verify:

- [ ] Single URL links converted to Markdown
- [ ] Multiple URL links all converted
- [ ] Internal links excluded from conversion
- [ ] Messages without URLs unchanged
- [ ] TSV format preserved: `DateTime\tChannel\tSender\tMessage`
- [ ] Debug logs show correct link counts
- [ ] No JavaScript errors in browser console
- [ ] Popup window displays all messages
- [ ] Pagination works correctly across multiple pages
- [ ] Message deduplication prevents duplicates

## Debug Mode

To enable detailed logging:

1. Open `slack-search-result-exporter.js`
2. Set `const enableDebugMode = true;` (line 5)
3. Reinstall the bookmarklet
4. Open browser DevTools Console (F12)
5. Run bookmarklet and observe logs

**Key Debug Logs**:
```
createPromiseGetMessages | Extracted N external links
createPromiseGetMessages | Message before conversion: ...
createPromiseGetMessages | Message after conversion: ...
```

## Browser Compatibility

Test on all target browsers:

- [ ] **Chrome** (latest): Full functionality
- [ ] **Firefox** (latest): Full functionality
- [ ] **Safari** (latest): Full functionality

## Troubleshooting

### Issue: Links not converting
- Check if `enableDebugMode` is enabled
- Verify links are `http://` or `https://`
- Check browser console for errors

### Issue: TSV format broken
- Verify no tab characters in message text
- Check timestamp format is correct

### Issue: Bookmarklet doesn't run
- Verify JavaScript is enabled
- Check for Content Security Policy restrictions
- Try reinstalling bookmarklet

## Test Report Template

After completing all tests, document results:

```
Date: YYYY-MM-DD
Browser: [Chrome/Firefox/Safari] Version: X.X
Slack Workspace: [workspace-name]

Test Case 7.1.1: ✅ PASS / ❌ FAIL
  Notes:

Test Case 7.1.2: ✅ PASS / ❌ FAIL
  Notes:

Test Case 7.1.3: ✅ PASS / ❌ FAIL
  Notes:

Test Case 7.1.4: ✅ PASS / ❌ FAIL
  Notes:

Overall: ✅ ALL TESTS PASSED / ❌ ISSUES FOUND
```

## Next Steps

After E2E testing:
- Document any issues found
- Update implementation if bugs discovered
- Proceed to Task 8.1 (Performance Testing)
- Proceed to Task 9.1 (Browser Compatibility)
- Proceed to Task 10.1 (Security Validation)
