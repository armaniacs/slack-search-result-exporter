import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PaginationController } from '../../src/pagination-controller.js';
import { MessagePack } from '../../src/types.js';

describe('PaginationController', () => {
  let messagePack: MessagePack;

  beforeEach(() => {
    // Initialize messagePack
    messagePack = {
      messages: [],
      messageSet: new Set<string>(),
      messagePushed: false,
      hasNextPage: true
    };

    // Mock document
    (global as any).document = {
      querySelectorAll: (selector: string) => {
        if (selector === '.c-pagination__arrow_btn') {
          return mockPaginationButtons;
        }
        if (selector === '.c-search_message__content') {
          return mockSearchMessages;
        }
        return [];
      },
      querySelector: (selector: string) => {
        if (selector === '.c-search_message__content') {
          return mockSearchMessages[0] || null;
        }
        return null;
      }
    };
  });

  let mockPaginationButtons: any[] = [];
  let mockSearchMessages: any[] = [{}]; // Default: has search content

  describe('clickNextButton', () => {
    it('should detect and click next page button', async () => {
      let clicked = false;
      mockPaginationButtons = [{
        getAttribute: (attr: string) => {
          if (attr === 'aria-label') return 'Next page';
          if (attr === 'aria-disabled') return 'false';
          return null;
        },
        click: () => { clicked = true; }
      }];

      const controller = new PaginationController();
      await controller.clickNextButton(messagePack);

      assert.strictEqual(clicked, true);
      assert.strictEqual(messagePack.hasNextPage, true);
    });

    it('should handle Japanese next page button label', async () => {
      let clicked = false;
      mockPaginationButtons = [{
        getAttribute: (attr: string) => {
          if (attr === 'aria-label') return '次のページ';
          if (attr === 'aria-disabled') return 'false';
          return null;
        },
        click: () => { clicked = true; }
      }];

      const controller = new PaginationController();
      await controller.clickNextButton(messagePack);

      assert.strictEqual(clicked, true);
      assert.strictEqual(messagePack.hasNextPage, true);
    });

    it('should not click when next page button is disabled', async () => {
      let clicked = false;
      mockPaginationButtons = [{
        getAttribute: (attr: string) => {
          if (attr === 'aria-label') return 'Next page';
          if (attr === 'aria-disabled') return 'true';
          return null;
        },
        click: () => { clicked = true; }
      }];

      const controller = new PaginationController();
      await controller.clickNextButton(messagePack);

      assert.strictEqual(clicked, false);
      assert.strictEqual(messagePack.hasNextPage, false);
    });

    it('should set hasNextPage to false when no pagination buttons found', async () => {
      mockPaginationButtons = [];

      const controller = new PaginationController();
      await controller.clickNextButton(messagePack);

      assert.strictEqual(messagePack.hasNextPage, false);
    });

    it('should set hasNextPage to false when next button not found', async () => {
      mockPaginationButtons = [{
        getAttribute: (attr: string) => attr === 'aria-label' ? 'Previous page' : null,
        attributes: { 'aria-disabled': { value: 'false' } },
        click: () => {}
      }];

      const controller = new PaginationController();
      await controller.clickNextButton(messagePack);

      assert.strictEqual(messagePack.hasNextPage, false);
    });
  });

  describe('checkOutOfPageLimit', () => {
    it('should keep hasNextPage true when search content exists', async () => {
      mockSearchMessages = [{}]; // Has content
      messagePack.hasNextPage = true;

      const controller = new PaginationController();
      await controller.checkOutOfPageLimit(messagePack);

      assert.strictEqual(messagePack.hasNextPage, true);
    });

    it('should set hasNextPage to false when search content is missing', async () => {
      mockSearchMessages = []; // No content
      messagePack.hasNextPage = true;

      const controller = new PaginationController();
      await controller.checkOutOfPageLimit(messagePack);

      assert.strictEqual(messagePack.hasNextPage, false);
    });
  });

  describe('waitMilliseconds', () => {
    it('should wait for specified milliseconds', async () => {
      const controller = new PaginationController();
      const start = Date.now();

      await controller.waitMilliseconds(100);

      const elapsed = Date.now() - start;
      assert.ok(elapsed >= 100);
      assert.ok(elapsed < 200); // Should not wait too long
    });
  });
});
