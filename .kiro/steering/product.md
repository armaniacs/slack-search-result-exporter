# Product Overview

A dual-implementation solution for exporting Slack messages to TSV format: a feature-rich Chrome Extension (recommended) and a lightweight bookmarklet alternative.

## Core Capabilities

### Chrome Extension (Primary Implementation)
- **One-Click Export**: Toolbar icon activation for instant export from search results or channel pages
- **Intelligent Page Detection**: Auto-detects Slack page type (search results vs. channel) and applies appropriate extraction logic
- **Date Filter Presets**: Quick filters (Today, Yesterday, Week, Month) with persistent user preferences
- **Dual Export Modes**:
  - Search results with automatic pagination
  - Channel page message extraction
- **Enhanced UX**: Modern popup UI with progress indicators, status updates, and clipboard copy
- **Settings Persistence**: chrome.storage.sync for cross-device preference synchronization

### Bookmarklet (Alternative Implementation)
- **Zero-Installation**: Runs as browser bookmark, no extension installation required
- **Core Export Features**: TSV export from search results with Markdown URL conversion
- **Lightweight**: Single JavaScript file, portable across browsers

## Target Use Cases

### Primary (Extension)
- **Power Users**: Frequent Slack exporters who benefit from date presets and saved settings
- **Channel Archiving**: Users needing to export channel conversations (Extension-only feature)
- **Cross-Device Users**: Chrome users who want settings synchronized across devices
- **UX-Focused Users**: Those preferring modern UI with progress indicators and one-click operations

### Secondary (Bookmarklet)
- **Minimal Setup Users**: Users who cannot or prefer not to install browser extensions
- **Portability Seekers**: Users who want the same tool across different browsers or machines
- **Simple Export Needs**: Users who only need basic search result export without advanced features

## Value Proposition

**Chrome Extension**: Provides a modern, feature-rich experience with persistent settings, date presets, channel export, and superior UX - the recommended solution for regular Slack exporters.

**Bookmarklet**: Offers a lightweight, zero-installation alternative maintaining core export functionality for users prioritizing simplicity and portability.

Both implementations share the same TSV export format, ensuring consistency and allowing users to switch between implementations without workflow disruption.

---
_Focus on patterns and purpose, not exhaustive feature lists_
