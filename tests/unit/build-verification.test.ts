import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Build Verification Tests for Task 7.1
 *
 * Requirements:
 * - TypeScript → JavaScript conversion
 * - All source files copied to dist/
 * - manifest.json, icons, HTML files in dist/
 * - Build validation
 *
 * Test Strategy (TDD - RED phase):
 * 1. Verify dist/ directory exists
 * 2. Verify manifest.json exists in dist/
 * 3. Verify all required JavaScript files exist
 * 4. Verify HTML and CSS files exist
 * 5. Verify icon files exist
 * 6. Verify no TypeScript files in dist/
 * 7. Verify source maps exist for debugging
 */

describe('Build Verification (Task 7.1)', () => {
  const distPath = path.resolve(process.cwd(), 'dist');

  describe('1. Directory Structure', () => {
    it('should have dist/ directory', () => {
      assert.ok(fs.existsSync(distPath), 'dist/ directory should exist');
      assert.ok(fs.statSync(distPath).isDirectory(), 'dist/ should be a directory');
    });
  });

  describe('2. Manifest and Configuration Files', () => {
    it('should have manifest.json in dist/', () => {
      const manifestPath = path.join(distPath, 'manifest.json');
      assert.ok(fs.existsSync(manifestPath), 'manifest.json should exist in dist/');

      // Verify manifest.json is valid JSON
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Verify required manifest fields
      assert.strictEqual(manifest.manifest_version, 3, 'Should use Manifest V3');
      assert.ok(manifest.name, 'Should have name field');
      assert.ok(manifest.version, 'Should have version field');
      assert.ok(Array.isArray(manifest.permissions), 'Should have permissions array');
      assert.ok(manifest.permissions.includes('activeTab'), 'Should request activeTab permission');
      assert.ok(manifest.permissions.includes('storage'), 'Should request storage permission');
    });
  });

  describe('3. Core JavaScript Files', () => {
    const requiredJsFiles = [
      'service-worker.js',
      'content-script.js',
      'popup.js',
      'settings-manager.js',
      'date-preset-manager.js',
      'message-extractor.js',
      'message-formatter.js',
      'pagination-controller.js',
      'page-detector.js',
      'channel-extractor.js',
      'search-query-applier.js',
      'types.js',
      'error-messages.js'
    ];

    requiredJsFiles.forEach(filename => {
      it(`should have ${filename} compiled from TypeScript`, () => {
        const jsPath = path.join(distPath, filename);
        assert.ok(fs.existsSync(jsPath), `${filename} should exist in dist/`);

        // Verify it's a JavaScript file (not TypeScript)
        const content = fs.readFileSync(jsPath, 'utf-8');
        assert.ok(!content.includes('export type'), `${filename} should not contain TypeScript type exports`);
      });

      it(`should have source map for ${filename}`, () => {
        const sourceMapPath = path.join(distPath, `${filename}.map`);
        assert.ok(fs.existsSync(sourceMapPath), `${filename}.map should exist for debugging`);
      });
    });

    it('should NOT have TypeScript source files in dist/', () => {
      const files = fs.readdirSync(distPath);
      const tsFiles = files.filter(f => f.endsWith('.ts'));
      assert.strictEqual(tsFiles.length, 0, 'dist/ should not contain .ts files');
    });
  });

  describe('4. UI Files', () => {
    it('should have popup.html in dist/', () => {
      const htmlPath = path.join(distPath, 'popup.html');
      assert.ok(fs.existsSync(htmlPath), 'popup.html should exist in dist/');

      // Verify HTML is valid and references correct scripts
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      assert.ok(htmlContent.includes('<script'), 'popup.html should include script tags');
      assert.ok(htmlContent.includes('popup.js'), 'popup.html should reference popup.js');
    });

    it('should have popup.css in dist/', () => {
      const cssPath = path.join(distPath, 'popup.css');
      assert.ok(fs.existsSync(cssPath), 'popup.css should exist in dist/');
    });
  });

  describe('5. Icon Assets', () => {
    const iconSizes = ['16', '48', '128'];

    it('should have icons/ directory in dist/', () => {
      const iconsPath = path.join(distPath, 'icons');
      assert.ok(fs.existsSync(iconsPath), 'icons/ directory should exist in dist/');
      assert.ok(fs.statSync(iconsPath).isDirectory(), 'icons/ should be a directory');
    });

    iconSizes.forEach(size => {
      it(`should have icon${size}.png in dist/icons/`, () => {
        const iconPath = path.join(distPath, 'icons', `icon${size}.png`);
        assert.ok(fs.existsSync(iconPath), `icon${size}.png should exist in dist/icons/`);

        // Verify it's a PNG file (basic check - starts with PNG magic bytes)
        const buffer = fs.readFileSync(iconPath);
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
        assert.ok(
          buffer.subarray(0, 4).equals(pngSignature),
          `icon${size}.png should be a valid PNG file`
        );
      });
    });
  });

  describe('6. Build Completeness', () => {
    it('should have all files referenced in manifest.json', () => {
      const manifestPath = path.join(distPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Check service worker
      const serviceWorkerPath = path.join(distPath, manifest.background.service_worker);
      assert.ok(fs.existsSync(serviceWorkerPath), 'Service worker file should exist');

      // Check content scripts
      manifest.content_scripts.forEach((cs: any) => {
        cs.js.forEach((jsFile: string) => {
          const jsPath = path.join(distPath, jsFile);
          assert.ok(fs.existsSync(jsPath), `Content script ${jsFile} should exist`);
        });
      });

      // Check popup
      const popupPath = path.join(distPath, manifest.action.default_popup);
      assert.ok(fs.existsSync(popupPath), 'Popup HTML should exist');

      // Check icons
      Object.values(manifest.action.default_icon).forEach((iconPath: any) => {
        const fullIconPath = path.join(distPath, iconPath);
        assert.ok(fs.existsSync(fullIconPath), `Icon ${iconPath} should exist`);
      });
    });
  });

  describe('7. Security Validation', () => {
    it('should have Content Security Policy in manifest', () => {
      const manifestPath = path.join(distPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      assert.ok(manifest.content_security_policy, 'Should have CSP defined');
      assert.ok(
        manifest.content_security_policy.extension_pages,
        'Should have CSP for extension pages'
      );
      assert.ok(
        manifest.content_security_policy.extension_pages.includes("script-src 'self'"),
        'Should restrict scripts to self origin'
      );
    });

    it('should only request minimum required permissions', () => {
      const manifestPath = path.join(distPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Should only have activeTab and storage
      assert.strictEqual(manifest.permissions.length, 2, 'Should only request 2 permissions');
      assert.ok(manifest.permissions.includes('activeTab'), 'Should include activeTab');
      assert.ok(manifest.permissions.includes('storage'), 'Should include storage');

      // Should NOT have broad permissions
      assert.ok(!manifest.permissions.includes('tabs'), 'Should not request tabs permission');
      assert.ok(!manifest.permissions.includes('<all_urls>'), 'Should not request all URLs');
    });

    it('should only have Slack domain in host_permissions', () => {
      const manifestPath = path.join(distPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      assert.ok(Array.isArray(manifest.host_permissions), 'Should have host_permissions array');
      assert.strictEqual(manifest.host_permissions.length, 1, 'Should only have 1 host permission');
      assert.ok(
        manifest.host_permissions[0].includes('slack.com'),
        'Should only request Slack domain'
      );
    });
  });
});
