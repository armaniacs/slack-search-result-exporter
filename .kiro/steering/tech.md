# Technology Stack

## Architecture

Browser-based bookmarklet using vanilla JavaScript - no build process, no dependencies. Pure client-side execution within Slack's web interface.

## Core Technologies

- **Language**: JavaScript (ES6+)
- **Runtime**: Browser-native (runs in user's browser context)
- **Distribution**: Single-file bookmarklet (slack-search-result-exporter.js)

## Key Libraries

None - pure vanilla JavaScript implementation to minimize complexity and maximize compatibility.

## Development Standards

### Code Style
- Use strict mode (`"use strict"`)
- IIFE pattern for encapsulation
- Async/await for asynchronous operations
- Promise-based control flow

### DOM Interaction
- Modern selector APIs (`querySelector`, `querySelectorAll`)
- MutationObserver for dynamic content detection
- Role-based and CSS selectors for element targeting

### Error Handling
- Graceful degradation when elements not found
- Null checks before DOM operations
- Pagination boundary detection

## Development Environment

### Required Tools
- Modern web browser (Chrome, Firefox, Safari)
- Text editor for JavaScript

### Common Commands
```bash
# No build process - direct JavaScript file
# Deploy: Copy to bookmarklet with javascript: prefix
```

## Key Technical Decisions

**Bookmarklet Architecture**: Chosen for zero-installation deployment - users can add functionality without browser extensions or OAuth apps.

**Vanilla JavaScript**: No framework dependencies ensure maximum compatibility and minimal maintenance burden.

**MutationObserver Pattern**: Used to detect when Slack's dynamic search results finish loading before extracting data.

**Pagination Strategy**: Recursive async pattern (`getMessage` → `createPromiseGetMessages` → `createPromiseClickNextButton` → `getMessage`) handles multi-page results automatically.

**TSV Format**: Tab-separated values chosen for easy import into spreadsheets and data analysis tools.

**Set-based Deduplication**: Uses `messageSet` to prevent duplicate messages when pagination overlaps.

---
_Document standards and patterns, not every dependency_
