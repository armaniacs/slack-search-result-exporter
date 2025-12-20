import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import './mocks/dom_mock.js';
import { MessageExtractor } from '../../src/message-extractor.js';
import { MessagePack } from '../../src/types.js';

describe('MessageExtractor', () => {
  let messagePack: MessagePack;
  let extractor: MessageExtractor;

  beforeEach(() => {
    messagePack = {
      messages: [],
      messageSet: new Set(),
      messagePushed: false,
      hasNextPage: true
    };
    extractor = new MessageExtractor();
  });

  it('should extract messages from mock DOM', async () => {
    // Mock document.querySelectorAll to return message groups
    const mockMessageGroup = {
      querySelector: (selector: string) => {
        if (selector === '.c-timestamp') return { getAttribute: () => '1734685200.000000' };
        if (selector === '[data-qa="inline_channel_entity__name"]') return { textContent: 'general' };
        if (selector === '.c-message__sender_button') return { textContent: 'User A' };
        if (selector === '.c-timestamp__label') return { textContent: '8:00 PM' };
        if (selector === '.c-search_message__content') {
            return { 
                cloneNode: () => ({
                    querySelectorAll: () => [],
                    textContent: 'User A 8:00 PM Hello world',
                    replaceWith: () => {}
                }) 
            };
        }
        return null;
      },
      scrollIntoView: () => {}
    };

    const mockDoc = {
      querySelectorAll: (selector: string) => {
        if (selector === '[role="document"]') return [mockMessageGroup];
        return [];
      },
      querySelector: () => null,
      createTextNode: (text: string) => ({ text })
    };

    // We need to inject this mockDoc into extractor or global
    (global as any).document = mockDoc;

    await extractor.extractMessages(messagePack);

    assert.strictEqual(messagePack.messages.length, 1);
    assert.strictEqual(messagePack.messagePushed, true);
    assert.ok(messagePack.messages[0].includes('Hello world'));
  });

  it('should not add duplicate messages', async () => {
    const mockMessageGroup = {
      querySelector: (selector: string) => {
        if (selector === '.c-timestamp') return { getAttribute: () => '1734685200.000000' };
        if (selector === '[data-qa="inline_channel_entity__name"]') return { textContent: 'general' };
        if (selector === '.c-message__sender_button') return { textContent: 'User A' };
        if (selector === '.c-timestamp__label') return { textContent: '8:00 PM' };
        if (selector === '.c-search_message__content') {
            return { 
                cloneNode: () => ({
                    querySelectorAll: () => [],
                    textContent: 'User A 8:00 PM Hello world',
                    replaceWith: () => {}
                }) 
            };
        }
        return null;
      },
      scrollIntoView: () => {}
    };

    const mockDoc = {
      querySelectorAll: (selector: string) => {
        if (selector === '[role="document"]') return [mockMessageGroup, mockMessageGroup];
        return [];
      },
      querySelector: () => null,
      createTextNode: (text: string) => ({ text })
    };

    (global as any).document = mockDoc;

    await extractor.extractMessages(messagePack);

    assert.strictEqual(messagePack.messages.length, 1); // Should be 1, not 2
    assert.strictEqual(messagePack.messagePushed, true);
  });

  it('should wait for search result', async () => {
      let queryCount = 0;
      const mockDoc = {
          querySelector: (selector: string) => {
              if (selector === '.c-search_message__content') {
                  queryCount++;
                  return queryCount > 1 ? {} : null;
              }
              return null;
          },
          body: {}
      };

      (global as any).document = mockDoc;
      
      const promise = extractor.waitForSearchResult();
      
      // Trigger mutation observer mock
      setTimeout(() => {
          // The observer should be waiting now.
          // Trigger all observers
          (global as any).MutationObserver.instances.forEach((obs: any) => {
              obs.trigger([], obs);
          });
      }, 10);

      await promise;
      assert.ok(queryCount > 1);
  });
});
