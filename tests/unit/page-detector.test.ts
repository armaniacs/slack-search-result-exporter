import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PageDetector } from '../../src/page-detector.js';

describe('PageDetector', () => {
  it('should detect search result page from URL', () => {
    const url = 'https://app.slack.com/client/T01234567/search/search-results/after:2025-12-01';
    const detector = new PageDetector(url);
    assert.strictEqual(detector.detect(), 'search_result');
  });

  it('should detect channel page from URL', () => {
    const url = 'https://app.slack.com/client/T01234567/C01234567';
    const detector = new PageDetector(url);
    assert.strictEqual(detector.detect(), 'channel');
  });

  it('should return unknown for other URLs', () => {
    const url = 'https://app.slack.com/client/T01234567/help';
    const detector = new PageDetector(url);
    assert.strictEqual(detector.detect(), 'unknown');
  });

  it('should detect search result from DOM even if URL is ambiguous', () => {
    const url = 'https://app.slack.com/client/T01234567/some-random-path';
    // Mock document with search-related role
    const mockDocument = {
      querySelector: (selector: string) => {
        if (selector === '[role="document"]') return {};
        return null;
      }
    };
    const detector = new PageDetector(url, mockDocument as any);
    assert.strictEqual(detector.detect(), 'search_result');
  });

  it('should detect channel from DOM', () => {
    const url = 'https://app.slack.com/client/T01234567/some-random-path';
    // Mock document with channel-related element
    const mockDocument = {
      querySelector: (selector: string) => {
        if (selector === '.c-message_list') return {};
        return null;
      }
    };
    const detector = new PageDetector(url, mockDocument as any);
    assert.strictEqual(detector.detect(), 'channel');
  });
});
