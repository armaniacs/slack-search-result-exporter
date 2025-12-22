# Technology Stack

## Architecture

**Dual Implementation Strategy**:
1. **Chrome Extension (Primary)**: Manifest V3 architecture with TypeScript, esbuild bundling, layered design (Content Script + Service Worker + Popup UI)
2. **Bookmarklet (Alternative)**: Vanilla JavaScript IIFE pattern, zero-dependency, single-file distribution

## Chrome Extension (Recommended Implementation)

### Core Technologies
- **Language**: TypeScript 5.9+ (strict mode)
- **Runtime**: Chrome Extension Manifest V3
- **Build System**: esbuild 0.27+ for bundling and optimization
- **Distribution**: Compiled JavaScript in `dist/` folder

### Architecture Layers
1. **Content Script** (`src/content-script.ts`)
   - Injected into Slack pages
   - DOM manipulation and message extraction
   - Communicates with Popup UI via chrome.runtime messaging

2. **Service Worker** (`src/service-worker.ts`)
   - Background event processing
   - Extension lifecycle management
   - Future: Settings management, background tasks

3. **Popup UI** (`src/popup.ts`, `popup.html`, `popup.css`)
   - User interaction layer
   - Date preset selection
   - Export triggering and result display
   - Progress indicators and status updates

### Key Libraries
- `@types/chrome`: Chrome Extension API type definitions
- **No runtime dependencies** - vanilla TypeScript/DOM APIs only

### Development Standards

#### Code Style
- TypeScript strict mode enabled
- Async/await for asynchronous operations
- Message passing for cross-context communication
- Type safety for all public interfaces

#### DOM Interaction
- Modern selector APIs (`querySelector`, `querySelectorAll`)
- MutationObserver for dynamic content detection
- Role-based and CSS selectors for element targeting
- Same selectors as bookmarklet for consistency

#### Storage
- chrome.storage.sync for user preferences
- Type-safe storage operations
- Cross-device synchronization

#### Security
- Content Security Policy enforcement
- XSS protection via proper escaping
- Minimal permissions (activeTab, storage, scripting)
- Host permissions limited to *.slack.com

## Bookmarklet (Alternative Implementation)

### Core Technologies
- **Language**: JavaScript (ES6+)
- **Runtime**: Browser-native (runs in user's browser context)
- **Distribution**: Single-file bookmarklet (slack-search-result-exporter.js)

### Key Libraries
None - pure vanilla JavaScript implementation to minimize complexity and maximize compatibility.

### Development Standards

#### Code Style
- Use strict mode (`"use strict"`)
- IIFE pattern for encapsulation
- Async/await for asynchronous operations
- Promise-based control flow

#### DOM Interaction
- Modern selector APIs (`querySelector`, `querySelectorAll`)
- MutationObserver for dynamic content detection
- Role-based and CSS selectors for element targeting

#### Error Handling
- Graceful degradation when elements not found
- Null checks before DOM operations
- Pagination boundary detection

## Development Environment

### Required Tools
- **Extension Development**:
  - Node.js 18+ and npm
  - TypeScript compiler
  - Chrome browser for testing
  - esbuild for bundling

- **Bookmarklet Development**:
  - Modern web browser (Chrome, Firefox, Safari)
  - Text editor for JavaScript
  - No build process required

### Common Commands
```bash
# Extension development
npm install                # Install dependencies
npm run build             # Build extension to dist/
npm run watch             # Watch mode for development
npm run test:integration  # Run integration tests
npm run test:integration:e2e  # Run E2E tests

# Bookmarklet testing
npm run test:browser-compat  # Browser compatibility
npm run test:security        # Security validation

# All tests
npm test                  # Run all Playwright tests
```

## Key Technical Decisions

### Chrome Extension Architecture
**Manifest V3 Adoption**: Chosen for future-proofing and alignment with Chrome's direction. Requires Service Worker (not background page) and declarative approaches.

**TypeScript with Strict Mode**: Ensures type safety, better IDE support, and catches errors at compile time. Build step adds minimal complexity while providing significant benefits.

**Layered Design**: Content Script (DOM), Service Worker (logic), Popup UI (presentation) separation ensures maintainability and testability.

**esbuild Bundling**: Fast build times, tree-shaking for optimal bundle size, sourcemap support for debugging.

### Shared Technical Decisions (Both Implementations)

**Vanilla JavaScript/TypeScript**: No framework dependencies ensure maximum compatibility and minimal maintenance burden.

**MutationObserver Pattern**: Used to detect when Slack's dynamic search results finish loading before extracting data.

**Pagination Strategy**: Recursive async pattern (`getMessage` → `createPromiseGetMessages` → `createPromiseClickNextButton` → `getMessage`) handles multi-page results automatically.

**TSV Format**: Tab-separated values chosen for easy import into spreadsheets and data analysis tools.

**Set-based Deduplication**: Uses `messageSet` to prevent duplicate messages when pagination overlaps.

**Security First**: XSS protection via textContent, protocol filtering (http/https only), proper escaping.

## Implementation Consistency

Both implementations share:
- DOM selectors for Slack page elements
- Message extraction logic
- TSV formatting algorithm
- Security measures (XSS protection, protocol filtering)
- Export data structure

This ensures users get identical output regardless of implementation choice.

---
_Document standards and patterns, not every dependency_
