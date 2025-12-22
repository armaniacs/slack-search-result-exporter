# slack-search-result-exporter

Export Slack messages as TSV from search results and channels - available as a Chrome Extension or bookmarklet.

**🎯 Recommended: [Install Chrome Extension](#chrome-extension-recommended) for the best experience**

**Demo Video**: TBD (Coming soon with Chrome Extension demonstration)

## Features

### Chrome Extension (Recommended)

✅ **One-Click Export**
- Click toolbar icon to instantly export from any Slack page
- Auto-detects search results vs. channel pages
- No manual bookmark setup required

✅ **Date Filter Presets**
- Quick filters: Today, Yesterday, Week, Month
- Persistent settings across sessions
- Synchronized across Chrome browsers (chrome.storage.sync)

✅ **Enhanced Export Capabilities**
- Search result pages with automatic pagination
- Channel page message export (Extension-only feature)
- Progress indicators and loading states

✅ **Better User Experience**
- Modern popup UI with clear status updates
- One-click clipboard copy
- Visual feedback for all operations

✅ **All Core Features**
- Markdown URL conversion
- Link preview exclusion
- Multi-line message support
- TSV format export
- XSS protection and security

### Bookmarklet (Lightweight Alternative)

✅ **Core Export Features**
- Markdown URL conversion
- Link preview exclusion
- Multi-line message support
- TSV format export
- XSS protection

⚠️ **Limitations**
- Search results only (no channel export)
- No date presets
- No settings persistence
- Manual execution required

## Which Version Should I Use?

| Feature | Chrome Extension | Bookmarklet |
|---------|-----------------|-------------|
| One-click operation | ✅ | ❌ (manual click) |
| Date filter presets | ✅ | ❌ |
| Settings persistence | ✅ | ❌ |
| Channel page export | ✅ | ❌ |
| Search result export | ✅ | ✅ |
| Installation required | ✅ | ❌ |
| Progress indicators | ✅ | ⚠️ Basic |
| Clipboard copy button | ✅ | ❌ |
| Chrome Web Store install | 🔜 Coming if requested | - |
| **Recommended for** | Most users | Minimal setup, portability |

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

> 💡 **Want easier installation via Chrome Web Store?**
>
> We're considering publishing this extension to the Chrome Web Store for one-click installation.
> If you'd like this feature, please let us know by [creating an issue](https://github.com/armaniacs/slack-search-result-exporter/issues/new) or reacting with 👍
>
> **[Request Chrome Web Store Publication →](https://github.com/armaniacs/slack-search-result-exporter/issues/new?title=Request:%20Chrome%20Web%20Store%20Publication&body=I%20would%20like%20to%20install%20this%20extension%20from%20the%20Chrome%20Web%20Store%20for%20easier%20installation.)**
>
> _The more requests we receive, the higher priority this becomes!_

## Chrome Extension (Recommended)

### Option 1: Chrome Web Store (Coming Soon)
If we receive enough requests, we'll publish to the Chrome Web Store for one-click installation. Please use the banner above to request!

### Option 2: Developer Mode (Currently Available)
1. Download this repository
2. Run `npm run build` to build the extension
3. Open Chrome → Extensions (chrome://extensions/)
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select the `dist/` folder
7. Pin the extension icon to your toolbar

## Bookmarklet (Alternative)

Perfect if you prefer zero-installation or need portability.

### Quick Install
1. Open [slack-search-result-exporter.user.js](slack-search-result-exporter.user.js)
2. Copy the **entire file contents** (starts with `javascript:(function(){...`)
3. Create a new bookmark:
   - **Name**: `Export Slack Search` (or any name you prefer)
   - **URL**: Paste the copied JavaScript code
4. Save the bookmark

### Manual Install
1. Open [slack-search-result-exporter.js](slack-search-result-exporter.js)
2. Copy entire contents
3. Wrap with `javascript:(` at start and `);` at end
4. Follow steps 3-4 above

## Usage

### Using Chrome Extension

1. Navigate to Slack (slack.com)
2. Open a search results page OR channel page
3. Click the extension icon in your toolbar
4. (Optional) Select a date preset filter
5. Click "Export"
6. Copy results from the popup

**Pro Tip**: Use date presets for common searches. Your last selection is saved automatically.

### Using Bookmarklet

1. Open slack.com
2. Search messages and wait for results to load
3. Click the bookmarklet in your bookmarks bar
4. Allow popup window
5. Copy TSV data from popup

**Note**: Bookmarklet only works on search result pages, not channels.

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

## Migrating from Bookmarklet to Extension

Already using the bookmarklet? Here's why you should upgrade:

1. **Save Time**: No more manual bookmark clicks
2. **Better Features**: Date presets, channel export, persistent settings
3. **Same Export Format**: Your existing workflows still work

**Migration Steps**:
1. Install Chrome Extension using the steps above
2. (Optional) Keep bookmarklet as backup
3. Start using the extension - your exported data format is identical

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
