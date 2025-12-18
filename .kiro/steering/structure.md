# Project Structure

## Organization Philosophy

Single-file utility: All functionality contained in one JavaScript file designed to run as a bookmarklet. No modules, no build system - optimized for simplicity and direct browser execution.

## Directory Patterns

### Root Files
**Location**: `/`
**Purpose**: Single JavaScript file with supporting documentation
**Structure**:
```
/slack-search-result-exporter.js  # Main bookmarklet code
/README.md                         # Usage instructions
/LICENSE                           # License file
```

### Configuration Directories
**Location**: `/.kiro/`, `/.claude/`, etc.
**Purpose**: AI agent and development workflow configurations
**Note**: Not part of runtime codebase - metadata only

## Naming Conventions

- **Files**: kebab-case (e.g., `slack-search-result-exporter.js`)
- **Functions**: camelCase (e.g., `createPromiseWaitSearchResult`)
- **Constants**: camelCase with descriptive suffixes (e.g., `messageGroupSelector`)
- **Variables**: camelCase with semantic meaning (e.g., `messagePack`, `hasNextPage`)

## Code Organization

### Function Pattern
```javascript
// Descriptive function names indicate purpose
const createPromiseGetMessages = async (messagePack) => { ... }
const createPromiseWaitMillisecond = (millisecond) => { ... }
const timestampToTime = (timestamp) => { ... }
```

### Selector Pattern
```javascript
// Suffix 'Selector' for DOM query strings
const messageGroupSelector = '[role="document"]';
const messageTimestampSelector = ".c-timestamp";
```

### Promise Naming
Functions returning promises prefixed with `createPromise` (e.g., `createPromiseWaitSearchResult`, `createPromiseClickNextButton`)

## Code Organization Principles

**IIFE Encapsulation**: Entire script wrapped in immediately-invoked function expression to avoid global namespace pollution.

**Async Pipeline**: Chain of async operations for sequential page processing (wait → extract → paginate → recurse).

**State Object Pattern**: `messagePack` object passed through pipeline carrying accumulated messages and control flags.

**Logging Strategy**: Debug mode toggle with consistent `log()` wrapper for troubleshooting.

**DOM Selector Stability**: Uses multiple selector strategies (CSS classes, ARIA labels, role attributes) to handle Slack UI variations.

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
