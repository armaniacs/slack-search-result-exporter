# slack-search-result-exporter

Exports Slack messages as TSV from Search results.

[Demo Video](https://github.com/user-attachments/assets/95238129-c958-40c7-8fb0-63a151d1d45b)

## Features

✅ **Markdown URL Conversion**
- Converts external URLs to `[text](url)` format
- Preserves internal links (#channel references) unchanged
- Example: `Check out https://github.com` → `Check out [https://github.com](https://github.com/)`

✅ **Link Preview Exclusion**
- Automatically removes Slack's link preview text (unfurl content)
- Prevents duplicate URL text in exports
- Excludes `.c-search_message__attachments` elements

✅ **Multi-line Message Support**
- Converts newlines to `<br>` tags for TSV compatibility
- Maintains single-line TSV format
- Example: `Line 1\nLine 2` → `Line 1<br>Line 2`

✅ **Slack Internal Link Filtering**
- Excludes `*.slack.com` workspace internal links
- Only exports genuine external URLs

✅ **TSV Data Export**
- Tab-separated values format
- 4 columns: DateTime | Channel | Sender | Message
- Special character escaping for data integrity

## Output Format

Exported data is in TSV (Tab-Separated Values) format with 4 columns:

| Column | Example | Description |
|--------|---------|-------------|
| DateTime | `2025-12-17 Wed 19:46:37` | Message timestamp (YYYY-MM-DD DDD HH:MM:SS) |
| Channel | `test_yasuarak` | Channel name or `DirectMessage` |
| Sender | `Yasuhiro ARAKI` | Message sender's display name |
| Message | `Visit [https://google.com](...)` | Message text with Markdown URLs |

**Special Character Handling**:
- **Newlines**: Converted to `<br>` tags
- **Tabs**: Preserved as spaces in message content
- **URLs**: Converted to Markdown `[text](url)` format
- **Special chars**: Regex-escaped in link text


# How to use

## Installation

### Option 1: Quick Install (Recommended)
1. Open [slack-search-result-exporter.user.js](slack-search-result-exporter.user.js)
2. Copy the **entire file contents** (starts with `javascript:(function(){...`)
3. Create a new bookmark in your browser:
   - **Chrome**: Bookmarks → Add page (Cmd/Ctrl+D)
   - **Firefox**: Bookmarks → Add bookmark
   - **Safari**: Bookmarks → Add bookmark
4. Edit the bookmark:
   - **Name**: `Export Slack Search` (or any name you prefer)
   - **URL**: Paste the copied JavaScript code
5. Save the bookmark

### Option 2: Manual Copy
1. Open [slack-search-result-exporter.js](slack-search-result-exporter.js)
2. Copy entire contents
3. Wrap with `javascript:(` at start and `);` at end
4. Follow steps 3-5 above

**Note**: The `.user.js` file is pre-formatted for direct use. The `.js` file is the source code.

## Usage

1. Open slack.com
2. Search messages and wait for results
3. Click the bookmarklet

\* Please allow the popup window.

# Tips for Searching in Slack

```
# Search for messages containing my name between 2025/01/01 and 2025/01/31
xshoji -from:me after:2024-12-31 before:2025-02-01

# Search for messages from myself between 2025/01/01 and 2025/01/31
from:me after:2024-12-31 before:2025-02-01

# Search for messages from @example to me (excluding DMs)
from:@example xshoji -is:dm
```

## Usage Examples

### Example 1: Basic URL Conversion

**Slack Message**:
```
Check out https://github.com for code repositories.
```

**Exported TSV**:
```
2025-12-17 Wed 19:46:27	test_channel	John Doe	Check out [https://github.com](https://github.com/) for code repositories.
```

### Example 2: Multiple URLs

**Slack Message**:
```
Visit https://google.com for search and https://github.com for code.
```

**Exported TSV**:
```
2025-12-17 Wed 19:46:37	test_channel	John Doe	Visit [https://google.com](https://google.com/) for search and [https://github.com](https://github.com/) for code.
```

### Example 3: Multi-line Messages

**Slack Message**:
```
Line 1
Line 2
Line 3
```

**Exported TSV** (single line):
```
2025-12-17 Wed 19:48:00	test_channel	John Doe	Line 1<br>Line 2<br>Line 3
```

### Example 4: Mixed Content

**Slack Message**:
```
See #general channel and https://example.com
```

**Exported TSV**:
```
2025-12-17 Wed 19:46:51	test_channel	John Doe	See #general channel and [https://example.com](https://example.com/)
```
*Note: Internal #channel links are preserved, only external URLs are converted.*

# Testing

This project includes automated tests using Playwright to ensure browser compatibility and security.

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests (Chromium, Firefox, WebKit)
npm test

# Run tests for specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run specific test suites
npm run test:browser-compat   # Browser compatibility tests
npm run test:security          # Security validation tests

# Interactive UI mode
npm run test:ui

# View test report
npm run test:report
```

## Test Coverage

- ✅ **Browser Compatibility** (Chrome, Firefox, Safari)
  - Bookmarklet execution
  - Markdown URL conversion
  - Multiple URL handling
  - Special characters in URLs
  - Link preview exclusion
  - Multi-line message handling
  - Performance (< 5 seconds)

- ✅ **Security Validation**
  - XSS protection (.textContent usage)
  - Dangerous protocol filtering (javascript:, data:)
  - Special character escaping
  - Slack internal link filtering
  - TSV data integrity
  - Newline/tab character handling

For detailed test results, see [TEST-RESULTS.md](TEST-RESULTS.md).

## Manual Testing

For comprehensive testing on actual Slack environment, refer to [MANUAL-TEST-EXECUTION-GUIDE.md](MANUAL-TEST-EXECUTION-GUIDE.md).
