import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ChannelExtractor } from '../../src/channel-extractor.js';

describe('ChannelExtractor', () => {
  let extractor: ChannelExtractor;

  beforeEach(() => {
    extractor = new ChannelExtractor();
  });

  it('should extract messages from mock DOM', async () => {
    // Mock DOM elements
    const mockChannelName = { textContent: '#general' };
    
    const mockTimestamp = { 
        getAttribute: (attr: string) => attr === 'data-ts' ? '1608375600.000000' : null,
        textContent: '10:00 AM'
    };
    
    const mockSenderLink = { textContent: 'User A' };
    
    const mockMessageBody = { 
        cloneNode: () => ({
            querySelectorAll: () => [],
            textContent: 'Hello world',
            replaceWith: () => {}
        })
    };

    const mockMessageItem = {
        querySelector: (selector: string) => {
            if (selector === '.c-timestamp') return mockTimestamp;
            if (selector === '.c-message__sender_link') return mockSenderLink;
            if (selector === '.c-message__sender_button') return null; // Fallback
            if (selector === '.c-message_kit__blocks') return mockMessageBody;
            return null;
        }
    };

    const mockDoc = {
        querySelector: (selector: string) => {
            if (selector === '[data-qa="channel_name"]') return mockChannelName;
            return null;
        },
        querySelectorAll: (selector: string) => {
            if (selector === '[role="listitem"]') return [mockMessageItem];
            return [];
        },
        createElement: (_tag: string) => ({ textContent: '', innerHTML: '' }) // For MessageFormatter
    };

    (global as any).document = mockDoc;

    // Mock MessageFormatter to avoid dependency on its implementation details
    // But since it's static, we might just rely on it if it's simple. 
    // However, MessageFormatter.escapeXSS uses document.createElement which we mocked above.

    const result = await extractor.extractChannelMessages();

    assert.ok(result.success);
    if (result.success) {
        assert.strictEqual(result.value.length, 1);
        // Expecting TSV format: timestamp 	 channel 	 sender 	 content
        // Note: Formatting timestamp logic might be in Extractor or Formatter. 
        // Legacy used timestampToTime in Extractor logic. 
        // Let's assume Extractor handles timestamp conversion or passes raw.
        // If Extractor uses MessageFormatter, check the output.
        // The mock timestamp is 1608375600.000000 (2020-12-19 20:00:00 UTC approx)
        const row = result.value[0];
        assert.ok(row.includes('#general'));
        assert.ok(row.includes('User A'));
        assert.ok(row.includes('Hello world'));
    }
  });

  it('should return error if no messages found', async () => {
      const mockDoc = {
          querySelector: () => ({ textContent: '#general' }),
          querySelectorAll: () => [],
          createElement: () => ({})
      };
      (global as any).document = mockDoc;

      const result = await extractor.extractChannelMessages();
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
          assert.strictEqual(result.error.code, 'NO_MESSAGES_FOUND');
      }
  });

  it('should use fallback for sender selector', async () => {
    const mockChannelName = { textContent: '#general' };
    const mockTimestamp = { getAttribute: () => '1234567890.000000' };
    const mockSenderButton = { textContent: 'User B' }; // Button instead of link
    const mockMessageBody = { cloneNode: () => ({ querySelectorAll: () => [], textContent: 'Test' }) };

    const mockMessageItem = {
        querySelector: (selector: string) => {
            if (selector === '.c-timestamp') return mockTimestamp;
            if (selector === '.c-message__sender_link') return null;
            if (selector === '.c-message__sender_button') return mockSenderButton;
            if (selector === '.c-message_kit__blocks') return mockMessageBody;
            return null;
        }
    };

    const mockDoc = {
        querySelector: () => mockChannelName,
        querySelectorAll: () => [mockMessageItem],
        createElement: () => ({})
    };
    (global as any).document = mockDoc;

    const result = await extractor.extractChannelMessages();

    assert.ok(result.success);
    if (result.success) {
        assert.ok(result.value[0].includes('User B'));
    }
  });
});
