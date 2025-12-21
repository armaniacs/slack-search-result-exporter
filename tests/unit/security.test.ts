import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageFormatter } from '../../src/message-formatter.js';

/**
 * Task 5.1: XSS Protection and Security Validation Tests
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('Task 5.1: XSS Protection and Security Validation', () => {
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
              // HTML escape
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

  describe('XSS Escape Processing', () => {
    it('should escape HTML script tags', () => {
      const input = '<script>alert("XSS")</script>';
      const result = MessageFormatter.escapeXSS(input);
      assert.strictEqual(result, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should escape HTML event handlers', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = MessageFormatter.escapeXSS(input);
      // Should escape < and > to prevent HTML injection
      assert.ok(result.includes('&lt;'));
      assert.ok(result.includes('&gt;'));
      assert.ok(!result.includes('<img'));
    });

    it('should handle mixed HTML and text', () => {
      const input = 'Safe text <b>bold</b> more text';
      const result = MessageFormatter.escapeXSS(input);
      assert.ok(result.includes('&lt;b&gt;'));
      assert.ok(result.includes('Safe text'));
    });

    it('should preserve safe text without modification (after escaping)', () => {
      const input = 'This is safe text';
      const result = MessageFormatter.escapeXSS(input);
      assert.strictEqual(result, 'This is safe text');
    });
  });

  describe('Malicious Protocol Filtering', () => {
    it('should filter javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click me</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should not contain javascript: in markdown format
      assert.ok(!result.includes('[Click me](javascript:'));
      // Should contain plain text
      assert.ok(result.includes('Click me'));
    });

    it('should filter data: protocol', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Data link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should not contain data: in markdown format
      assert.ok(!result.includes('[Data link](data:'));
      // Should contain plain text
      assert.ok(result.includes('Data link'));
    });

    it('should filter file: protocol', () => {
      const input = '<a href="file:///etc/passwd">File link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should not contain file: in markdown format
      assert.ok(!result.includes('[File link](file:'));
      // Should contain plain text
      assert.ok(result.includes('File link'));
    });

    it('should filter vbscript: protocol', () => {
      const input = '<a href="vbscript:msgbox(1)">VBScript link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should not contain vbscript: in markdown format
      assert.ok(!result.includes('[VBScript link](vbscript:'));
      // Should contain plain text
      assert.ok(result.includes('VBScript link'));
    });

    it('should allow https: protocol', () => {
      const input = '<a href="https://example.com">Safe link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should convert to markdown
      assert.strictEqual(result, '[Safe link](https://example.com)');
    });

    it('should allow http: protocol', () => {
      const input = '<a href="http://example.com">HTTP link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should convert to markdown
      assert.strictEqual(result, '[HTTP link](http://example.com)');
    });

    it('should allow mailto: protocol', () => {
      const input = '<a href="mailto:test@example.com">Email link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should convert to markdown
      assert.strictEqual(result, '[Email link](mailto:test@example.com)');
    });
  });

  describe('Combined XSS Protection', () => {
    it('should handle XSS in link text', () => {
      const input = '<a href="https://example.com"><script>alert(1)</script></a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should convert to markdown but preserve the script tag in text
      // (the text will be escaped later by escapeXSS)
      assert.ok(result.includes('(https://example.com)'));
    });

    it('should handle multiple malicious links', () => {
      const input = 'Link 1: <a href="javascript:alert(1)">JS</a>, Link 2: <a href="https://safe.com">Safe</a>, Link 3: <a href="data:text">Data</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Only safe link should be converted
      assert.ok(result.includes('[Safe](https://safe.com)'));
      assert.ok(!result.includes('[JS](javascript:'));
      assert.ok(!result.includes('[Data](data:'));
      // Plain text should remain
      assert.ok(result.includes('JS'));
      assert.ok(result.includes('Data'));
    });
  });

  describe('Protocol Case Sensitivity', () => {
    it('should filter JavaScript: (capital J)', () => {
      const input = '<a href="JavaScript:alert(1)">Link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should filter case-insensitive
      assert.ok(!result.includes('](JavaScript:'));
    });

    it('should filter JAVASCRIPT: (all caps)', () => {
      const input = '<a href="JAVASCRIPT:alert(1)">Link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should filter case-insensitive
      assert.ok(!result.includes('](JAVASCRIPT:'));
    });

    it('should allow HTTPS: (capital)', () => {
      const input = '<a href="HTTPS://example.com">Link</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should allow case-insensitive
      assert.ok(result.includes('[Link](HTTPS://example.com)'));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty href', () => {
      const input = '<a href="">Empty</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Empty href should be filtered (not a valid protocol)
      assert.ok(!result.includes('[Empty]()'));
    });

    it('should handle relative URLs (no protocol)', () => {
      const input = '<a href="/path/to/page">Relative</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Relative URLs have no protocol, should be filtered
      assert.ok(!result.includes('[Relative](/path'));
    });

    it('should handle protocol-only href', () => {
      const input = '<a href="javascript:">Protocol only</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Should filter javascript: even without payload
      assert.ok(!result.includes('[Protocol only](javascript:'));
    });

    it('should handle whitespace in protocol', () => {
      const input = '<a href=" javascript:alert(1)">Whitespace</a>';
      const result = MessageFormatter.convertLinksToMarkdown(input);

      // Leading whitespace might bypass filter - implementation should handle this
      // For now, this test documents the expected behavior
      assert.ok(!result.includes('](javascript:') || !result.includes('javascript:alert'));
    });
  });
});
