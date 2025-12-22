import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ContentScript } from '../../src/content-script.js';
import { performance } from 'node:perf_hooks';

describe('Performance: Progress Message Overhead', () => {
  let contentScript: ContentScript;

  beforeEach(() => {
    // Mock chrome.runtime API
    (global as any).chrome = {
      runtime: {
        sendMessage: (message: any) => {
          // Simulate some processing overhead if needed
          // JSON serialization is done by browser, but we can simulate it
          JSON.stringify(message);
        },
        onMessage: {
          addListener: () => {}
        }
      }
    };

    // Mock window object
    (global as any).window = {
      location: {
        href: 'https://app.slack.com/client/T123/search'
      }
    };

    // Mock document
    (global as any).document = {
      querySelectorAll: () => [],
      querySelector: () => ({ textContent: '' }),
      body: {}
    };

    contentScript = new ContentScript();
  });

  it('should have overhead < 10ms per sendProgress call', () => {
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      (contentScript as any).sendProgress(i, i * 10, 'extracting');
    }

    const end = performance.now();
    const totalTime = end - start;
    const averageTime = totalTime / iterations;

    console.log(`Average sendProgress overhead: ${averageTime.toFixed(4)}ms`);
    
    // Requirement 5.1: Overhead < 50ms/page (3 calls/page)
    // 50ms / 3 = 16.6ms per call.
    // We set a stricter target of 10ms for unit test environment.
    assert.ok(averageTime < 10, `Average time ${averageTime}ms should be less than 10ms`);
  });
});
