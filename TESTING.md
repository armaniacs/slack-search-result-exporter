# Testing Guide

## Testing Philosophy

This project is a bookmarklet (single-file JavaScript) with no build system or dependencies. Tests are implemented as a standalone HTML file that can be opened directly in a browser.

## Running Tests

```bash
# Open test runner in browser
open test-runner.html
```

Or simply double-click `test-runner.html` in your file manager.

## Test Coverage

### Task 5.1: extractExternalLinks Function Tests

Tests for URL extraction functionality:

1. **Empty Links Test**: Returns empty array when element has no links
2. **External URL Filtering**: Filters only external URLs (http/https)
3. **Internal Link Exclusion**: Excludes internal links (relative paths, anchors)
4. **Protocol Filtering**: Excludes mailto, tel, ftp, and other non-http(s) protocols
5. **Null Safety**: Handles null/undefined elements safely
6. **Data Extraction**: Correctly extracts link text and URL pairs

### Task 5.2: convertMessageWithMarkdownLinks Function Tests

Tests for Markdown conversion functionality:

1. **Single Link Conversion**: Replaces single link text with Markdown format
2. **Multiple Links**: Replaces multiple links in message
3. **Duplicate Text Handling**: Handles duplicate link text (global replacement)
4. **Special Characters**: Handles special characters in link text (regex escaping)
5. **Dots and Parentheses**: Handles link text with dots and parentheses
6. **Empty Array**: Returns original message when links array is empty
7. **Null Safety**: Returns original message when links is null/undefined
8. **Invalid Links**: Skips invalid links (missing text or url)
9. **Complex Messages**: Handles complex message with multiple occurrences

### Task 6.1: Integration Tests (DOM + Functions)

Tests for DOM operations and function integration:

1. **DOM to Markdown Integration**: Extract links from mock DOM and convert to Markdown
2. **External/Internal Filtering**: Filter and convert only external links
3. **Multiple Links Processing**: Process multiple links in complex messages
4. **No Links Handling**: Handle elements without links gracefully
5. **Mixed Protocols**: Handle mailto, tel, https correctly
6. **Slack-like Structure**: Handle Slack message structure with sender and timestamp

### Task 9.1 & 10.1: Manual Integration Tests (実環境テスト)

実際のSlack環境でのEnd-to-Endテスト:

1. **Link Preview Exclusion**: Slackのアンフリング機能で追加されるプレビューテキストの除外
2. **Newline Handling**: 複数行メッセージの`<br>`タグ変換
3. **Internal Link Filtering**: `*.slack.com`内部リンクの除外
4. **TSV Format Integrity**: タブ・改行を含むメッセージでのTSV形式維持

詳細は [MANUAL-TEST-EXECUTION-GUIDE.md](MANUAL-TEST-EXECUTION-GUIDE.md) 参照。

### Task 7.1: E2E Tests

Manual testing guide for actual Slack pages:

1. **Single External URL**: Export message with one external link
2. **Multiple External URLs**: Export message with multiple links
3. **Mixed Links**: Export message with internal and external links
4. **Backward Compatibility**: Export messages without URLs unchanged

See `E2E-TESTING.md` for detailed manual testing procedures.

### Task 8.1: Performance Tests

Automated performance benchmarks:

1. **100件のメッセージからリンク抽出**: Target < 2 seconds
2. **100件のメッセージをMarkdown変換**: Target < 5 seconds (Requirement 6)
3. **単一メッセージの処理性能**: Average performance across 100 messages
4. **複数リンク(5個)の処理**: 50 messages with 5 links each
5. **大量リンク(10個)の処理**: 20 messages with 10 links each
6. **リンクなしメッセージ**: 200 messages without links (baseline)
7. **長文メッセージ(500文字)**: 100 long messages
8. **特殊文字を含むリンク**: 100 messages with special characters

See `performance-test.html` for automated performance testing.

### Task 9.1: Browser Compatibility Tests

Manual browser compatibility testing guide:

1. **Chrome**: Latest stable version compatibility
2. **Firefox**: Latest stable version compatibility
3. **Safari**: Latest stable version compatibility

Tests verify:
- Basic export functionality
- Markdown URL conversion
- DOM API compatibility
- Pagination
- Special character handling

See `BROWSER-COMPATIBILITY-TEST.md` for detailed browser testing procedures.

### Task 10.1: Security and Data Integrity Validation

Security validation and data integrity checks:

1. **XSS Protection**: `.textContent` usage verification
2. **TSV Data Integrity**: Tab and newline character escaping
3. **URL Special Characters**: URL encoding and Markdown format handling

Tests verify:
- XSS attack prevention (javascript:, data: protocol exclusion)
- TSV format preservation
- Special character escaping (regex escaping, URL encoding)
- Markdown format integrity

See `SECURITY-VALIDATION.md` for detailed security validation procedures.

## Test Framework

Simple vanilla JavaScript test framework with:
- `describe()` - Test suite grouping
- `it()` - Individual test cases
- `assertEqual()` - Deep equality assertion
- `assertTrue()` - Boolean true assertion
- `assertFalse()` - Boolean false assertion

## TDD Workflow

1. **RED**: Tests written in `test-runner.html` (already failing before implementation)
2. **GREEN**: Functions implemented in `slack-search-result-exporter.js`
3. **REFACTOR**: Code cleaned up while tests still pass

## Continuous Testing

Tests are browser-based and can be re-run at any time by refreshing `test-runner.html`.

## Test Maintenance

- Tests are co-located in a single HTML file for simplicity
- Functions under test are copied into test file (no module system)
- Update test file when main implementation changes
