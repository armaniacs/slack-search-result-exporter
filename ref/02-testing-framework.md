# Testing Framework Reference

## Overview

This document provides a comprehensive reference for the automated testing framework used in the Slack Search Result Exporter project. The framework uses Playwright for cross-browser end-to-end testing.

## Framework Architecture

### Technology Stack

- **Test Framework**: Playwright Test (`@playwright/test@^1.57.0`)
- **Test Runner**: Playwright Test Runner
- **Browsers**: Chromium, Firefox, WebKit (Safari)
- **Language**: JavaScript (Node.js)
- **Fixtures**: Static HTML mock files

### Project Structure

```
slack-search-result-exporter/
├── tests/
│   ├── e2e/
│   │   ├── browser-compatibility.spec.js    # Task 9.1 tests
│   │   └── security-validation.spec.js      # Task 10.1 tests
│   └── fixtures/
│       └── slack-search-mock.html           # Mock Slack search page
├── playwright.config.js                     # Playwright configuration
├── package.json                            # Dependencies and scripts
└── ref/
    └── 02-testing-framework.md             # This document
```

## Configuration

### Playwright Config (`playwright.config.js`)

**Location**: `playwright.config.js:1-52`

```javascript
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**Key Settings**:
- **Test Directory**: `./tests/e2e`
- **Parallel Execution**: Enabled (`fullyParallel: true`)
- **CI Retries**: 2 retries on CI, 0 locally
- **Reporter**: HTML report (`playwright-report/index.html`)
- **Trace Collection**: On first retry only (for debugging failures)

### NPM Scripts (`package.json`)

**Location**: `package.json:6-15`

```json
{
  "scripts": {
    "test": "playwright test",
    "test:chromium": "playwright test --project=chromium",
    "test:firefox": "playwright test --project=firefox",
    "test:webkit": "playwright test --project=webkit",
    "test:browser-compat": "playwright test browser-compatibility",
    "test:security": "playwright test security-validation",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report"
  }
}
```

**Usage**:
- `npm test` - Run all tests across all browsers
- `npm run test:chromium` - Chromium only
- `npm run test:firefox` - Firefox only
- `npm run test:webkit` - Safari/WebKit only
- `npm run test:browser-compat` - Browser compatibility suite only
- `npm run test:security` - Security validation suite only
- `npm run test:ui` - Interactive UI mode
- `npm run test:report` - View HTML report

## Test Suites

### Suite 1: Browser Compatibility Tests (Task 9.1)

**File**: `tests/e2e/browser-compatibility.spec.js`

**Purpose**: Validates bookmarklet functionality across Chrome, Firefox, and Safari.

#### Test Setup

**Location**: `browser-compatibility.spec.js:13-26`

```javascript
test.describe('Task 9.1: Browser Compatibility Tests', () => {
  let bookmarkletCode;

  test.beforeAll(() => {
    const bookmarkletPath = path.join(__dirname, '../../slack-search-result-exporter.js');
    bookmarkletCode = fs.readFileSync(bookmarkletPath, 'utf-8');
  });

  test.beforeEach(async ({ page }) => {
    const mockPagePath = path.join(__dirname, '../fixtures/slack-search-mock.html');
    await page.goto(`file://${mockPagePath}`);
  });
});
```

**Key Points**:
- Loads bookmarklet source code once for all tests
- Each test starts with a fresh mock Slack page
- Uses `file://` protocol for local HTML fixture

#### Test 1.1: Basic Operation

**Location**: `browser-compatibility.spec.js:28-58`

**Validates**:
1. Bookmarklet executes without errors
2. Popup window opens
3. Textarea element exists in popup
4. TSV content has correct format (4 tab-separated columns)

**Implementation**:
```javascript
test('Step 1.1: Basic operation - Bookmarklet executes without errors', async ({ page }) => {
  await page.evaluate(bookmarkletCode);

  const popupPromise = page.waitForEvent('popup');
  const popup = await popupPromise;

  expect(popup).toBeTruthy();

  const textarea = await popup.locator('textarea');
  await expect(textarea).toBeVisible();

  const tsvContent = await textarea.inputValue();
  const lines = tsvContent.trim().split('\n');
  const columns = lines[0].split('\t');

  expect(columns.length).toBe(4);
});
```

**Key Techniques**:
- `page.evaluate()` - Execute bookmarklet in page context
- `page.waitForEvent('popup')` - Wait for new window
- `textarea.inputValue()` - Extract TSV content
- Console logging for debugging

#### Test 1.2: Markdown URL Conversion (Single URL)

**Location**: `browser-compatibility.spec.js:60-91`

**Validates**:
1. Single external URL converted to Markdown format
2. Markdown format: `[github.com](https://github.com)` or with trailing slash
3. Console logs show link extraction

**Implementation**:
```javascript
test('Step 1.2: Markdown URL conversion - Single URL', async ({ page }) => {
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'log') {
      consoleLogs.push(msg.text());
    }
  });

  await page.evaluate(bookmarkletCode);
  const popup = await page.waitForEvent('popup');
  const textarea = await popup.locator('textarea');
  const tsvContent = await textarea.inputValue();

  const lines = tsvContent.split('\n');
  const githubLine = lines.find(line => line.includes('Check out'));

  expect(githubLine).toMatch(/\[github\.com\]\(https:\/\/github\.com\/?\)/);

  const extractionLogs = consoleLogs.filter(log =>
    log.includes('Extracted') && log.includes('external links')
  );
  expect(extractionLogs.length).toBeGreaterThan(0);
});
```

**Key Techniques**:
- Console log capture via `page.on('console')`
- Regex matching with optional trailing slash: `/\/?\)/`
- Line filtering with `Array.find()`

#### Test 1.3: Multiple URLs and Filtering

**Location**: `browser-compatibility.spec.js:93-120`

**Validates**:
1. Multiple external URLs converted to Markdown
2. Both `google.com` and `github.com` appear in Markdown format

**Test Data**: Message with 2 URLs (Test Case 3 in mock fixture)

#### Test 1.4: Internal Link Filtering

**Location**: Continues after 1.3

**Validates**:
1. Slack channel links (e.g., `#general`) remain unchanged
2. External URLs converted to Markdown
3. Slack workspace URLs (`*.slack.com`) excluded

**Test Data**: Message with `#general` and `https://example.com`

#### Test 1.5: Special Characters in URLs

**Validates**:
1. URLs with query parameters preserved
2. Special characters in link text escaped correctly

**Test Data**: URLs with `?q=search&foo=bar` parameters

#### Test 1.6: Special Characters in Link Text

**Validates**:
1. Link text like `"C++ Guide (2024)"` properly escaped
2. Regex meta characters don't break replacement

#### Test 1.7: Tab Character Handling

**Validates**:
1. Tab characters in messages preserved as spaces
2. TSV column structure maintained (4 columns)

#### Test 1.8: Multi-line Message Handling

**Validates**:
1. Newlines converted to `<br>` string
2. Message remains single line in TSV
3. Format: `Line 1<br>Line 2<br>Line 3`

**Test Data**: Message with 3 lines (Test Case 8 in fixture)

#### Test 1.9: Link Preview Exclusion

**Validates**:
1. Slack link preview text excluded from export
2. Unfurl content (`.c-search_message__attachments`) removed
3. Only original message URL preserved

**Test Data**: Message with link preview (Test Case 9 in fixture)

#### Test 1.10: Performance

**Validates**:
1. Bookmarklet completes execution within 5 seconds
2. Measures total time from start to popup display

**Implementation**:
```javascript
test('Step 1.10: Performance - Execution within 5 seconds', async ({ page }) => {
  const startTime = Date.now();

  await page.evaluate(bookmarkletCode);
  const popup = await page.waitForEvent('popup', { timeout: 5000 });

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  expect(executionTime).toBeLessThan(5000);
  console.log(`Execution time: ${executionTime}ms`);
});
```

**Acceptance Criteria**: < 5000ms (5 seconds)

### Suite 2: Security and Data Integrity Validation (Task 10.1)

**File**: `tests/e2e/security-validation.spec.js`

**Purpose**: Validates XSS protection, TSV data integrity, and special character handling.

#### Test Setup

**Location**: `security-validation.spec.js:12-25`

Same as browser compatibility tests (loads bookmarklet and mock fixture).

#### Test 4.1: XSS Protection - .textContent Usage Verification

**Location**: `security-validation.spec.js:27-57`

**Validates**:
1. Console logs show link filtering
2. "Found X total links" log exists
3. "Filtered to X external links" log exists

**Purpose**: Verifies that link extraction process uses `.textContent` (not `.innerHTML`).

**Implementation**:
```javascript
test('Step 4.1: XSS Protection - .textContent usage verification', async ({ page }) => {
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'log') {
      consoleLogs.push(msg.text());
    }
  });

  await page.evaluate(bookmarkletCode);
  const popup = await page.waitForEvent('popup');

  const extractionLog = consoleLogs.find(log =>
    log.includes('Found') && log.includes('total links')
  );
  const filteredLog = consoleLogs.find(log =>
    log.includes('Filtered to') && log.includes('external links')
  );

  expect(extractionLog).toBeTruthy();
  expect(filteredLog).toBeTruthy();
});
```

#### Test 4.1b: XSS Protection - Dangerous Protocols Excluded

**Location**: `security-validation.spec.js:59-88`

**Validates**:
1. `javascript:` protocol URLs NOT converted to Markdown
2. `data:` protocol URLs NOT converted to Markdown
3. Safe `https://` URLs converted to Markdown
4. Original text preserved (e.g., "javascript link" text remains)

**Test Data**: Message with 3 links (Test Case 10):
- `https://safe.com` (safe)
- `javascript:alert('XSS')` (dangerous)
- `data:text/html,<script>alert('XSS')</script>` (dangerous)

**Implementation**:
```javascript
test('Step 4.1b: XSS Protection - Dangerous protocols excluded', async ({ page }) => {
  await page.evaluate(bookmarkletCode);
  const popup = await page.waitForEvent('popup');
  const tsvContent = await popup.locator('textarea').inputValue();

  const xssLine = tsvContent.split('\n').find(line =>
    line.includes('Safe:') || line.includes('security')
  );

  // Safe link converted to Markdown
  expect(xssLine).toMatch(/\[safe\.com\]\(https:\/\/safe\.com\/?\)/);

  // Dangerous protocols NOT converted
  expect(xssLine).not.toContain('[javascript link](javascript:');
  expect(xssLine).not.toContain('[data link](data:');

  // Original text preserved
  expect(xssLine).toContain('javascript link');
  expect(xssLine).toContain('data link');
});
```

**Security Principle**: Only `http://` and `https://` protocols allowed for Markdown conversion.

#### Test 4.1c: Code Review - Verify .textContent Usage in Source

**Location**: `security-validation.spec.js:90-105`

**Validates**:
1. Source code uses `.textContent` for text extraction
2. Source code does NOT read `.innerHTML` or `.outerHTML`
3. Static code analysis (file read + regex)

**Implementation**:
```javascript
test('Step 4.1c: Code review - Verify .textContent usage in source', async () => {
  const sourceCode = fs.readFileSync('slack-search-result-exporter.js', 'utf-8');

  expect(sourceCode).toMatch(/\.textContent/);
  expect(sourceCode).not.toMatch(/\.innerHTML(?!\s*=)/); // Allow assignment but not reading
  expect(sourceCode).not.toContain('.outerHTML');

  console.log('XSS Protection - Source code verification passed');
});
```

**Key Regex**: `/\.innerHTML(?!\s*=)/` - Allows `innerHTML =` (assignment) but blocks `innerHTML` reading.

#### Test 4.2: Slack Internal Link Filtering

**Validates**:
1. `*.slack.com` URLs excluded from Markdown conversion
2. External URLs converted normally

**Test Data**: Message with both Slack and external URLs

#### Test 4.3: TSV Data Integrity

**Validates**:
1. All messages have exactly 4 columns
2. No extra tabs or newlines in TSV structure

**Implementation**:
```javascript
test('Step 4.3: TSV Data Integrity - Column count validation', async ({ page }) => {
  await page.evaluate(bookmarkletCode);
  const popup = await page.waitForEvent('popup');
  const tsvContent = await popup.locator('textarea').inputValue();

  const lines = tsvContent.trim().split('\n');

  lines.forEach((line, index) => {
    const columns = line.split('\t');
    expect(columns.length).toBe(4); // DateTime, Channel, Sender, Message
  });
});
```

#### Test 4.4: Newline/Tab Character Handling

**Validates**:
1. Newlines converted to `<br>` string
2. Tabs preserved as spaces
3. No actual tab characters in message column

**Test Data**: Message with newlines and tabs (Test Case 11)

## Mock Fixture Structure

### Slack Search Mock HTML

**File**: `tests/fixtures/slack-search-mock.html`

**Purpose**: Simulates Slack's search result page DOM structure with test data.

**Key Components**:

#### 1. Message Group Structure
```html
<div role="document">
  <span class="c-timestamp" data-ts="1702831597">
    <span class="c-timestamp__label">8:00 PM</span>
  </span>
  <div class="c-search_message__content">
    <button class="c-message__sender_button">John Doe</button>
    <span data-qa="inline_channel_entity__name">test_channel</span>
    <div class="c-message__body">
      Message content with <a href="https://github.com">github.com</a>
    </div>
  </div>
</div>
```

#### 2. Test Cases Included

1. **Basic Message** - Plain text message
2. **Single URL** - "Check out https://github.com"
3. **Multiple URLs** - "Visit https://google.com and https://github.com"
4. **Internal Links** - "#general channel and https://example.com"
5. **Special Char URLs** - Query parameters
6. **Special Char Link Text** - "C++ Guide (2024)"
7. **Tab Characters** - Message with tabs
8. **Multi-line Message** - 3 lines with `<br>` tags
9. **Link Preview** - With `.c-search_message__attachments`
10. **XSS Test** - Safe, javascript:, and data: protocols
11. **Newline/Tab Mix** - Combined special characters

#### 3. Pagination Elements
```html
<button class="c-pagination__arrow_btn" aria-label="Next page" aria-disabled="false">
  Next
</button>
```

**Purpose**: Tests pagination logic (though mock only has 1 page).

## Test Execution Flow

### 1. Test Initialization
```
npm test
  ↓
Playwright Test Runner starts
  ↓
Load playwright.config.js
  ↓
Create browser instances (Chromium, Firefox, WebKit)
```

### 2. Per-Test Flow
```
beforeAll hook
  ↓ Load bookmarklet source code
beforeEach hook
  ↓ Navigate to mock HTML fixture
Test execution
  ↓ Execute bookmarklet via page.evaluate()
  ↓ Wait for popup window
  ↓ Extract TSV content
  ↓ Run assertions
  ↓ Log results to console
Test completion
```

### 3. Report Generation
```
All tests complete
  ↓
Generate HTML report (playwright-report/index.html)
  ↓
View with: npm run test:report
```

## Assertion Patterns

### 1. TSV Format Validation
```javascript
const columns = line.split('\t');
expect(columns.length).toBe(4);
```

### 2. Markdown Format Validation
```javascript
expect(line).toMatch(/\[text\]\(https:\/\/url\.com\/?\)/);
```

### 3. Exclusion Validation
```javascript
expect(line).not.toContain('[dangerous](javascript:');
```

### 4. Console Log Validation
```javascript
const extractionLog = consoleLogs.find(log => log.includes('Extracted'));
expect(extractionLog).toBeTruthy();
```

### 5. Performance Validation
```javascript
const executionTime = Date.now() - startTime;
expect(executionTime).toBeLessThan(5000);
```

## Known Limitations

### 1. Mock HTML Limitations

**Issue**: Mock HTML cannot fully replicate Slack's dynamic DOM behavior.

**Impact**:
- Async loading not tested
- Real pagination not tested (only 1 page in mock)
- Actual Slack API responses not captured

**Mitigation**: Manual testing in real Slack environment documented in [MANUAL-TEST-EXECUTION-GUIDE.md](../MANUAL-TEST-EXECUTION-GUIDE.md).

### 2. Test Data Coverage

**Coverage**:
- ✅ URL conversion
- ✅ Link filtering
- ✅ Special characters
- ✅ Multi-line messages
- ✅ Link previews
- ✅ XSS protection
- ❌ Real Slack network requests
- ❌ Real Slack authentication
- ❌ Real multi-page pagination

### 3. Browser Version Drift

**Issue**: Playwright's browser binaries may differ from actual user browsers.

**Mitigation**: Regular updates of `@playwright/test` package.

## Debugging Tests

### 1. Interactive UI Mode
```bash
npm run test:ui
```

**Features**:
- Watch tests run in real-time
- Pause and step through tests
- Inspect DOM at each step
- View console logs

### 2. Trace Viewer
```bash
# Run test with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### 3. Console Logging

**In Tests**:
```javascript
console.log('Debug info:', value);
```

**In Bookmarklet** (captured):
```javascript
page.on('console', msg => console.log(msg.text()));
```

### 4. Headed Mode
```bash
npx playwright test --headed
```

**Purpose**: See browser window during test execution.

### 5. Debug Specific Test
```bash
npx playwright test --debug -g "Step 1.2"
```

## Test Maintenance

### Adding New Test Cases

**Step 1**: Add test data to `tests/fixtures/slack-search-mock.html`

```html
<div role="document">
  <!-- New test case HTML -->
</div>
```

**Step 2**: Add test in appropriate spec file

```javascript
test('New feature test', async ({ page }) => {
  await page.evaluate(bookmarkletCode);
  const popup = await page.waitForEvent('popup');
  const tsvContent = await popup.locator('textarea').inputValue();

  // Assertions
  expect(tsvContent).toContain('expected content');
});
```

### Updating for DOM Changes

If Slack updates their DOM selectors, update both:
1. `slack-search-result-exporter.js` selectors
2. `tests/fixtures/slack-search-mock.html` structure

## CI/CD Integration

### GitHub Actions (Example)

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run tests
  run: npm test

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## File References

### Test Files
- [`tests/e2e/browser-compatibility.spec.js`](../tests/e2e/browser-compatibility.spec.js) - Browser compatibility tests
- [`tests/e2e/security-validation.spec.js`](../tests/e2e/security-validation.spec.js) - Security validation tests
- [`tests/fixtures/slack-search-mock.html`](../tests/fixtures/slack-search-mock.html) - Mock Slack page

### Configuration
- [`playwright.config.js`](../playwright.config.js) - Playwright configuration
- [`package.json`](../package.json) - Dependencies and scripts

### Documentation
- [TESTING.md](../TESTING.md) - Testing overview
- [TEST-RESULTS.md](../TEST-RESULTS.md) - Test execution results
- [MANUAL-TEST-EXECUTION-GUIDE.md](../MANUAL-TEST-EXECUTION-GUIDE.md) - Manual testing guide
- [01-core-implementation.md](./01-core-implementation.md) - Core implementation details
