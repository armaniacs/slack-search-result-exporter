import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageFormatter } from '../../src/message-formatter.js';
import { RawMessage } from '../../src/types.js';

describe('MessageFormatter', () => {
  beforeEach(() => {
    // Mock document for escapeXSS
    (global as any).document = {
      createElement: (tag: string) => {
        if (tag === 'div') {
          return {
            _textContent: '',
            set textContent(val: string) { this._textContent = val; },
            get textContent() { return this._textContent; },
            get innerHTML() { 
                // Simple mock for textContent to innerHTML escaping
                return this._textContent
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/'/g, '&#39;')
                    .replace(/"/g, '&quot;');
            }
          };
        }
        return {};
      }
    };
  });

  describe('formatToTSV', () => {
    it('should format message to TSV string', () => {
      const message: RawMessage = {
        timestamp: '2025-01-01 12:00:00',
        channel: 'general',
        sender: 'Alice',
        content: 'Hello World'
      };
      
      const result = MessageFormatter.formatToTSV(message);
      assert.strictEqual(result, '2025-01-01 12:00:00\tgeneral\tAlice\tHello World');
    });

    it('should escape newlines as <br>', () => {
      const message: RawMessage = {
        timestamp: '2025-01-01 12:00:00',
        channel: 'general',
        sender: 'Alice',
        content: 'Line 1\nLine 2'
      };

      const result = MessageFormatter.formatToTSV(message);
      assert.ok(result.includes('Line 1<br>Line 2'));
      assert.doesNotMatch(result, /\n/); // No literal newlines in output
    });

    it('should handle tabs in content', () => {
        const message: RawMessage = {
            timestamp: '2025-01-01 12:00:00',
            channel: 'general',
            sender: 'Alice',
            content: 'Col1\tCol2'
        };
        // Should probably escape tabs too, otherwise it breaks TSV.
        // Design doesn't explicitly say how to handle tabs in content, but standard is usually space or \t
        // Let's assume replacement with space or escaped \t.
        // Existing implementation doesn't handle it yet.
        // Let's expect it to be handled (e.g. replaced by space or escaped).
        const result = MessageFormatter.formatToTSV(message);
        const tabCount = (result.match(/\t/g) || []).length;
        assert.strictEqual(tabCount, 3); // Only the 3 separators
    });
  });

  describe('convertLinksToMarkdown', () => {
    it('should convert anchor tags to markdown links', () => {
      const input = 'Check <a href="https://example.com">this link</a> out.';
      const expected = 'Check [this link](https://example.com) out.';
      assert.strictEqual(MessageFormatter.convertLinksToMarkdown(input), expected);
    });

    it('should handle multiple links', () => {
      const input = 'Link 1: <a href="http://a.com">A</a>, Link 2: <a href="http://b.com">B</a>';
      const expected = 'Link 1: [A](http://a.com), Link 2: [B](http://b.com)';
      assert.strictEqual(MessageFormatter.convertLinksToMarkdown(input), expected);
    });

    it('should ignore non-link tags', () => {
      const input = '<b>Bold</b> and <a href="http://a.com">Link</a>';
      const expected = '<b>Bold</b> and [Link](http://a.com)';
      assert.strictEqual(MessageFormatter.convertLinksToMarkdown(input), expected);
    });
  });

  describe('escapeXSS', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert(1)</script>';
      const expected = '&lt;script&gt;alert(1)&lt;/script&gt;';
      assert.strictEqual(MessageFormatter.escapeXSS(input), expected);
    });
  });
  
  describe('security', () => {
      it('should filter javascript: protocols in links', () => {
          const input = '<a href="javascript:alert(1)">Click me</a>';
          // Should probably remove the link or the href.
          // Requirement: "filter javascript: etc"
          // Let\'s assume it converts to text or removes the link wrapper.
          const result = MessageFormatter.convertLinksToMarkdown(input);
          // If filtering happens during markdown conversion:
          assert.ok(!result.includes('javascript:'));
      });
  });
});
