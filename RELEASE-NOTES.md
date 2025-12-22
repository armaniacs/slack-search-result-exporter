# Release Notes

## v2.0.0 - 2025-12-22

### 🎉 Chrome Extension Release

Major release introducing Chrome Extension as the primary implementation with enhanced features while maintaining full bookmarklet support.

### ✨ New Features

#### Chrome Extension (NEW - Recommended)
- **One-Click Export**: Toolbar icon click to export from search results or channel pages
- **Auto Page Detection**: Automatically detects search results vs. channel pages
- **Date Filter Presets**: Quick filters for Today, Yesterday, Week, Month
- **Persistent Settings**: User preferences saved via chrome.storage.sync
- **Channel Export**: Export messages from channel pages (Extension-only)
- **Enhanced UI**: Modern popup with progress indicators and status updates
- **Clipboard Copy**: One-click copy to clipboard
- **Settings Sync**: Preferences synchronized across Chrome browsers

#### Technical Implementation
- **Architecture**: Manifest V3 with Content Script + Service Worker + Popup UI
- **TypeScript**: Full TypeScript implementation with strict mode
- **Build System**: esbuild for bundling and optimization
- **Testing**: Integration and E2E tests for Extension workflows

### 🔄 Bookmarklet (Maintained)
- All v1.0.0 features maintained
- Continues to work for users who prefer zero-installation
- Same export format and security features
- Recommended as lightweight alternative

### 📚 Documentation Updates
- **README**: Restructured with Extension-first approach
- **Installation**: Separate guides for Extension vs. Bookmarklet
- **Comparison Table**: Clear feature differentiation
- **Migration Guide**: Guidance for existing bookmarklet users
- **Chrome Web Store**: Request banner for future publication

### 🔧 Repository Updates
- **Repository**: Moved to armaniacs organization
- **URLs**: All GitHub links updated to armaniacs
- **Demo Video**: TBD (coming soon with Extension demonstration)

### 🛠️ Breaking Changes
None - bookmarklet continues to work exactly as before.

### 📦 Installation

#### Chrome Extension (Recommended)
See [Installation Guide - Chrome Extension](README.md#chrome-extension-recommended)

#### Bookmarklet (Alternative)
See [Installation Guide - Bookmarklet](README.md#bookmarklet-alternative)

---

## v1.0.0 - 2025-12-18

### 🎉 Initial Release

First stable release of Slack Search Result Exporter with comprehensive Markdown URL support and automated testing framework.

### ✨ Key Features

#### Markdown URL Conversion
- **External URL Conversion**: Automatically converts external URLs to Markdown `[text](url)` format
- **Internal Link Preservation**: Keeps Slack channel references (e.g., `#general`) unchanged
- **Smart Link Filtering**: Excludes `*.slack.com` workspace internal links from conversion
- **Example**: `Visit https://github.com` → `Visit [https://github.com](https://github.com/)`

#### Link Preview Management
- **Automatic Unfurl Removal**: Removes Slack's link preview text to prevent duplicate URLs
- **Clean Export**: Excludes `.c-search_message__attachments` and related preview elements
- **Original Content Only**: Exports only the actual message content, not generated previews

#### Multi-line Message Support
- **TSV Compatibility**: Converts newlines to `<br>` tags for single-line TSV format
- **Line Structure Preservation**: Maintains original message structure
- **Example**: Multi-line message → `Line 1<br>Line 2<br>Line 3`

#### Data Format
- **TSV Export**: Tab-separated values with 4 columns (DateTime | Channel | Sender | Message)
- **Timestamp Format**: `YYYY-MM-DD DDD HH:MM:SS` (e.g., `2025-12-17 Wed 19:46:37`)
- **Special Character Handling**: Proper escaping for tabs, newlines, and regex characters
- **Direct Messages**: Labeled as `DirectMessage` when no channel exists

#### Security Features
- **XSS Protection**: Uses `.textContent` for text extraction (never `.innerHTML`)
- **Protocol Filtering**: Only allows `http://` and `https://` protocols
- **Dangerous Protocol Blocking**: Filters out `javascript:` and `data:` protocols
- **Regex Escaping**: Special characters in link text properly escaped

### 🧪 Testing Framework

#### Automated Tests (Playwright)
- **Browser Compatibility**: Tests across Chrome, Firefox, and Safari/WebKit
- **54 Total Tests**: 39 passing (72%) with comprehensive coverage
- **Test Suites**:
  - Task 9.1: Browser compatibility tests (10 tests)
  - Task 10.1: Security validation tests (6 tests)

#### Test Coverage
- ✅ Bookmarklet execution without errors
- ✅ Markdown URL conversion (single and multiple URLs)
- ✅ Special characters in URLs and link text
- ✅ Link preview exclusion
- ✅ Multi-line message handling
- ✅ XSS protection verification
- ✅ Dangerous protocol filtering
- ✅ TSV data integrity
- ✅ Performance (< 5 seconds execution time)

#### Manual Testing
- Real Slack environment validation (8 test cases)
- All test cases passed in production environment
- Documented in `MANUAL-TEST-EXECUTION-GUIDE.md`

### 📚 Documentation

#### User Documentation
- **README.md**: Complete user guide with installation, usage, and examples
- **README-ja.md**: Japanese translation of user documentation
- **4 Usage Examples**: Real-world examples with before/after TSV output

#### Technical Documentation
- **ref/01-core-implementation.md**: Complete technical reference
  - Architecture and design patterns
  - Function-by-function implementation details
  - DOM selectors and data extraction logic
  - Security features and performance characteristics
- **ref/02-testing-framework.md**: Testing framework documentation
  - Playwright configuration and setup
  - Test suite details and debugging procedures
  - CI/CD integration guidelines

#### Testing Documentation
- **TESTING.md**: Testing overview and framework description
- **TEST-RESULTS.md**: Detailed test execution results
- **MANUAL-TEST-EXECUTION-GUIDE.md**: Step-by-step manual testing guide
- **BROWSER-COMPATIBILITY-TEST.md**: Browser compatibility test details
- **SECURITY-VALIDATION.md**: Security validation procedures
- **E2E-TESTING.md**: End-to-end testing documentation

### 🛠️ Technical Details

#### Implementation
- **Language**: Pure JavaScript (ES6)
- **Architecture**: Promise-based async flow with recursive pagination
- **DOM Observation**: MutationObserver for async content handling
- **Browser Compatibility**: Chrome, Firefox, Safari (ES6 required)
- **File Size**: 421 lines of well-documented code

#### Utilities
- **Timestamp Conversion**: Unix timestamp → human-readable format
- **Regex Escaping**: Safe pattern matching for link text replacement
- **Deduplication**: Set-based O(1) lookup for duplicate prevention
- **Async Waiting**: Configurable delays for DOM stabilization

#### Performance
- **Time Complexity**: O(n × m) where n = messages, m = avg links per message
- **Space Complexity**: O(n) for message storage and deduplication
- **Execution Time**: < 5 seconds for typical search results

### 📦 Package Details

#### Files
- **slack-search-result-exporter.js** (421 lines) - Source code
- **slack-search-result-exporter.user.js** - Minified bookmarklet
- **package.json** - NPM dependencies (Playwright test framework)
- **playwright.config.js** - Test configuration

#### Dependencies
- `@playwright/test: ^1.57.0` (dev dependency for testing)

### 🔧 Installation

#### Quick Install (Recommended)
1. Open [slack-search-result-exporter.user.js](https://github.com/armaniacs/slack-search-result-exporter/blob/main/slack-search-result-exporter.user.js)
2. Copy entire file contents
3. Create browser bookmark with copied code as URL

#### Manual Install
1. Copy `slack-search-result-exporter.js` contents
2. Wrap with `javascript:(` at start and `);` at end
3. Create browser bookmark with wrapped code as URL

### 🎯 Usage

1. Open slack.com
2. Search messages and wait for results
3. Click the bookmarklet
4. Copy TSV data from popup window

### 🐛 Known Limitations

- **Memory**: All messages loaded in memory before export
- **Pagination**: Slack may cap search results (handled automatically)
- **Popup**: Fixed 500×300px window size
- **Mock Tests**: Cannot fully replicate Slack's dynamic behavior (requires manual testing)

### 🔗 Links

- **Repository**: https://github.com/armaniacs/slack-search-result-exporter
- **Documentation**: See README.md
- **Technical Reference**: See ref/ directory
- **Issue Tracker**: GitHub Issues

### 🙏 Acknowledgments

- Original bookmarklet concept and implementation
- Playwright testing framework
- Community feedback and testing

### 📄 License

MIT License - See LICENSE file for details

---

**Note**: This is the first stable release with comprehensive Markdown URL support. Future versions may include additional features based on user feedback.
