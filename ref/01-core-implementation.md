# Core Implementation Reference

## Overview

This document provides a comprehensive reference for the core implementation of the Slack Search Result Exporter bookmarklet. The implementation is a single JavaScript file that runs in the browser to extract and export Slack search results as TSV (Tab-Separated Values) data.

## File Structure

- **Main Source**: `slack-search-result-exporter.js` (421 lines)
- **Bookmarklet**: `slack-search-result-exporter.user.js` (minified, wrapped with `javascript:()`)

## Architecture

The bookmarklet follows an event-driven, promise-based architecture with these key components:

### 1. Entry Point (`exportMessage`)

**Location**: `slack-search-result-exporter.js:406-416`

```javascript
const exportMessage = () => {
  const messagePack = {
    messages: [],
    messageSet: new Set(),
    messagePushed: false,
    hasNextPage: true,
  };
  getMessage(messagePack);
};
```

**Purpose**: Initializes the message collection process with an empty message pack.

**Data Structure**: `messagePack`
- `messages`: Array of TSV-formatted message strings
- `messageSet`: Set for deduplication
- `messagePushed`: Flag indicating if new messages were added in current iteration
- `hasNextPage`: Flag indicating if more pages exist

### 2. Main Orchestrator (`getMessage`)

**Location**: `slack-search-result-exporter.js:17-37`

**Flow**:
1. Check if next page exists → if not, show popup
2. Wait for search results to load (`createPromiseWaitSearchResult`)
3. Loop: Extract messages until no new messages are found
4. Click next page button
5. Check for page limit
6. Recursively call `getMessage` for next page

**Key Feature**: Recursive pagination handling with automatic next page navigation.

### 3. DOM Observation (`createPromiseWaitSearchResult`)

**Location**: `slack-search-result-exporter.js:42-92`

**Selectors**:
- `.c-search_message__content` - Message content container
- `.c-message_group` - Message group wrapper
- `.c-timestamp` - Timestamp element
- `data-ts` - Timestamp attribute

**Mechanism**: Uses `MutationObserver` to wait for DOM to be fully loaded with all timestamp attributes populated.

**Why This Matters**: Slack search results load asynchronously. Without waiting, partial data would be extracted.

### 4. Message Extraction (`createPromiseGetMessages`)

**Location**: `slack-search-result-exporter.js:97-189`

**Critical Selectors**:
```javascript
const messageGroupSelector = '[role="document"]';
const messageContentSelector = ".c-search_message__content";
const messageTimestampSelector = ".c-timestamp";
const channelNameSelector = '[data-qa="inline_channel_entity__name"]';
const messageSenderSelector = ".c-message__sender_button";
const timestampLabelSelector = ".c-timestamp__label";
```

**Extraction Flow**:

#### Step 1: Basic Data Extraction
- Timestamp from `data-ts` attribute
- Channel name (or "DirectMessage" if null)
- Sender name
- Timestamp label (for cleanup)

#### Step 2: Content Cloning and Cleanup
```javascript
const messageClone = messageElement.cloneNode(true);
```

**Why Clone?** Prevents modifying the actual DOM while manipulating elements.

#### Step 3: Link Preview Removal
**Location**: `slack-search-result-exporter.js:135-150`

Removes these Slack-specific preview elements:
```javascript
const previewSelectors = [
  '.c-link__label',
  '.c-message_attachment',
  '.c-search_message__attachments',  // ← Key for unfurl removal
  '.c-search_message__attachment',
  '.c-message__unfurl',
  '.c-file_attachment',
  '.c-message__img_attachment',
  '[data-qa="message_attachment"]',
  '.c-message_kit__attachment',
  '.c-message_kit__file'
];
```

**Critical Feature**: This prevents duplicate URL text when Slack shows link previews.

#### Step 4: Newline Handling
**Location**: `slack-search-result-exporter.js:152-156`

```javascript
const brTags = messageClone.querySelectorAll('br');
brTags.forEach(br => {
  br.replaceWith(document.createTextNode('\n'));
});
```

**Purpose**: Converts `<br>` tags to actual newline characters before text extraction.

#### Step 5: Text Extraction
```javascript
const message = messageClone.textContent;
```

**Security**: Uses `.textContent` instead of `.innerHTML` to prevent XSS attacks.

#### Step 6: Link Extraction and Markdown Conversion
```javascript
const externalLinks = extractExternalLinks(messageClone);
const messageWithMarkdownLinks = convertMessageWithMarkdownLinks(message, externalLinks);
```

**Details in Section 5 & 6 below.**

#### Step 7: Message Cleanup
**Location**: `slack-search-result-exporter.js:167-173`

```javascript
const removeMessageSender = new RegExp('^' + escapeRegExp(messageSender));
const removeTimestampLabel = new RegExp('^.*?' + timestampLabel);
let trimmedMessage = messageWithMarkdownLinks
  .replace(removeMessageSender, '')
  .replace(removeTimestampLabel, '');

trimmedMessage = trimmedMessage.replace(/\n/g, '<br>');
```

**Key Steps**:
1. Remove sender name prefix
2. Remove timestamp label prefix
3. Convert newlines to `<br>` string for TSV compatibility

#### Step 8: TSV Formatting
```javascript
const timeAndMessage = datetime + "\t" + channelName + "\t" + messageSender + "\t" + trimmedMessage;
```

**Format**: `DateTime\tChannel\tSender\tMessage`

#### Step 9: Deduplication
```javascript
if (messagePack.messageSet.has(timeAndMessage)) {
  return;
}
messagePack.messages.push(timeAndMessage);
messagePack.messageSet.add(timeAndMessage);
```

**Why?** Prevents duplicate entries when paginating or re-processing same messages.

### 5. Link Extraction (`extractExternalLinks`)

**Location**: `slack-search-result-exporter.js:290-336`

**Algorithm**:

#### Step 1: Find all `<a>` tags
```javascript
const links = element.querySelectorAll('a');
```

#### Step 2: Filter External URLs
```javascript
.filter(link => {
  // Must start with http/https
  if (!/^https?:\/\//.test(link.href)) {
    return false;
  }
  // Exclude Slack internal links
  if (/^https?:\/\/[^/]+\.slack\.com\//.test(link.href)) {
    return false;
  }
  return true;
})
```

**Critical**: `*.slack.com` links are excluded to avoid exporting workspace-internal links.

#### Step 3: Extract Link Text
```javascript
.map(link => {
  let linkText = '';
  for (let node of link.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      linkText += node.textContent;
    }
  }
  if (!linkText.trim()) {
    linkText = link.textContent.trim();
  }
  return {
    text: linkText.trim(),
    url: link.href
  };
});
```

**Why This Logic?** Extracts only direct text nodes to avoid nested element text pollution.

**Return Format**: `Array<{text: string, url: string}>`

### 6. Markdown Conversion (`convertMessageWithMarkdownLinks`)

**Location**: `slack-search-result-exporter.js:344-375`

**Algorithm**:

```javascript
links.forEach((link, index) => {
  if (!link.text || !link.url) {
    return;
  }

  const markdownLink = "[" + link.text + "](" + link.url + ")";
  const escapedText = escapeRegExp(link.text);
  const regex = new RegExp(escapedText, 'g');

  result = result.replace(regex, markdownLink);
});
```

**Key Steps**:
1. Create Markdown format: `[text](url)`
2. Escape regex special characters in link text using `escapeRegExp`
3. Global replacement to handle multiple occurrences

**Example**:
- Input: `"Check out github.com for code"` + `{text: "github.com", url: "https://github.com"}`
- Output: `"Check out [github.com](https://github.com) for code"`

### 7. Pagination (`createPromiseClickNextButton`)

**Location**: `slack-search-result-exporter.js:194-230`

**Selectors**:
```javascript
const arrowBtnElements = document.querySelectorAll(".c-pagination__arrow_btn");
```

**Button Detection**:
```javascript
arrowBtnElements.forEach((e) => {
  if (["Next page", "次のページ"].includes(e.getAttribute("aria-label"))) {
    nextArrowBtnElement = e;
  }
});
```

**Multi-language Support**: Handles both English ("Next page") and Japanese ("次のページ").

**Navigation Check**:
```javascript
messagePack.hasNextPage = nextArrowBtnElement.attributes["aria-disabled"].value === 'false';
```

**Why?** Slack disables the next button on the last page using `aria-disabled="true"`.

### 8. Popup Display (`showMessagesPopup`)

**Location**: `slack-search-result-exporter.js:385-404`

**Implementation**:
```javascript
const textareaElement = document.createElement("textarea");
textareaElement.rows = 10;
textareaElement.cols = 50;
textareaElement.textContent = massageAll;

const win = window.open("", "Slack messages",
  "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=500,height=300,top=" + (screen.height - 200) + ",left=" + (screen.width - 200));
win.document.body.appendChild(textareaElement);
```

**Why Popup?** Large TSV content cannot be copied automatically via JavaScript due to browser limitations.

**Window Position**: Opens at bottom-right corner (`screen.height - 200`, `screen.width - 200`).

## Utility Functions

### 1. Timestamp Conversion (`timestampToTime`)

**Location**: `slack-search-result-exporter.js:260-271`

**Input**: Unix timestamp (e.g., `1702831597`)

**Output**: `YYYY-MM-DD DDD HH:MM:SS` format (e.g., `2025-12-17 Wed 19:46:37`)

**Implementation**:
```javascript
const d = new Date(timestamp * Math.pow(10, 13 - timestamp.length));
const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const yyyy = d.getFullYear();
const mm = ("0" + (d.getMonth() + 1)).slice(-2);
const dd = ("0" + d.getDate()).slice(-2);
const hh = ("0" + d.getHours()).slice(-2);
const mi = ("0" + d.getMinutes()).slice(-2);
const ss = ("0" + d.getSeconds()).slice(-2);
const week = weekday[d.getDay()];
return `${yyyy}-${mm}-${dd} ${week} ${hh}:${mi}:${ss}`;
```

**Normalization**: `Math.pow(10, 13 - timestamp.length)` handles timestamps of varying precision.

### 2. Regex Escaping (`escapeRegExp`)

**Location**: `slack-search-result-exporter.js:280-283`

**Purpose**: Escape special regex characters for safe pattern matching.

**Characters Escaped**: `.*+?^${}()|[]\`

**Example**:
- Input: `"C++ Guide (2024)"`
- Output: `"C\\+\\+ Guide \\(2024\\)"`

### 3. Async Wait (`createPromiseWaitMillisecond`)

**Location**: `slack-search-result-exporter.js:251-253`

**Usage**: Introduces delays for DOM stabilization:
- 800ms after each message extraction iteration
- 600ms after clicking next page button

**Why These Delays?** Allows Slack's async DOM updates to complete.

### 4. Page Limit Check (`createPromiseCheckOutOfPageLimit`)

**Location**: `slack-search-result-exporter.js:235-245`

**Mechanism**: Checks if `.c-search_message__content` still exists after pagination.

**Why?** Slack may show an error page if pagination limit is exceeded.

## Debug Mode

**Location**: `slack-search-result-exporter.js:5-11`

```javascript
const enableDebugMode = true;

const log = (value) => {
  if (enableDebugMode === true) {
    console.log(value);
  }
};
```

**Usage**: Extensive logging throughout the codebase for troubleshooting.

**Key Log Points**:
- Function entry/exit
- Link extraction counts
- Message processing state
- Pagination events

## Critical Design Decisions

### 1. Clone Before Modify
**Why?** Prevents accidental DOM corruption visible to the user.

### 2. Set-Based Deduplication
**Why?** `O(1)` lookup prevents duplicate exports during pagination.

### 3. Promise-Based Flow
**Why?** Handles async DOM mutations and pagination without callback hell.

### 4. Recursive Pagination
**Why?** Simplifies multi-page handling compared to iterative approach.

### 5. .textContent Over .innerHTML
**Why?** Security - prevents XSS from injected script tags in messages.

### 6. Link Preview Removal First
**Why?** Prevents extracting duplicate URL text from Slack's unfurl feature.

### 7. BR → Newline → BR Conversion
**Why?** Preserves line structure while maintaining TSV single-line format.

## Security Features

### 1. XSS Protection
- Uses `.textContent` for text extraction (never `.innerHTML`)
- Filters dangerous protocols (`javascript:`, `data:`)
- Regex escaping prevents injection via link text

### 2. External Link Filtering
- Only `http://` and `https://` protocols
- Excludes `*.slack.com` internal links

### 3. TSV Format Escaping
- Newlines converted to `<br>` string
- Tabs preserved as spaces in message content

## Performance Characteristics

### Time Complexity
- Message extraction: `O(n × m)` where n = messages, m = average links per message
- Deduplication: `O(1)` per message using Set
- Pagination: `O(p)` where p = number of pages

### Space Complexity
- `O(n)` for storing all messages in memory
- `O(n)` for deduplication Set

### Known Limitations
1. **Memory**: All messages loaded in memory before export
2. **Pagination Limit**: Slack may cap search results (handled by `createPromiseCheckOutOfPageLimit`)
3. **Popup Size**: Fixed 500×300px window

## Browser Compatibility

**Tested Browsers**:
- Chrome/Chromium
- Firefox
- Safari/WebKit

**Required Features**:
- ES6 (arrow functions, template literals, Promises)
- MutationObserver API
- Set data structure
- window.open with feature string

## File References

### Main Implementation
- [`slack-search-result-exporter.js`](../slack-search-result-exporter.js) - Source code (421 lines)
- [`slack-search-result-exporter.user.js`](../slack-search-result-exporter.user.js) - Minified bookmarklet

### Testing
- See [02-testing-framework.md](./02-testing-framework.md) for test implementation details

### Documentation
- [README.md](../README.md) - User documentation
- [README-ja.md](../README-ja.md) - Japanese user documentation
- [TEST-RESULTS.md](../TEST-RESULTS.md) - Test execution results
