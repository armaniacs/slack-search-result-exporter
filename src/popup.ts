/// <reference types="chrome"/>

import type {
  DatePreset,
  ExportResult,
  ExportError,
  ExportProgress,
  PopupToServiceWorkerMessage,
  ServiceWorkerToPopupMessage,
  PopupToContentScriptMessage,
  ContentScriptToPopupMessage
} from './types';
import { DatePresetManager } from './date-preset-manager.js';
import { formatUserError } from './error-messages.js';

/**
 * Popup UI State
 */
export interface PopupUIState {
  selectedPreset: DatePreset;
  isExporting: boolean;
  exportResult: ExportResult | null;
  error: ExportError | null;
  exportProgress: ExportProgress | null;
}

/**
 * Popup UI Controller
 */
export class PopupUIController {
  private state: PopupUIState;
  private datePresetManager: DatePresetManager;
  private elements: {
    presetButtons: NodeListOf<HTMLButtonElement>;
    exportButton: HTMLButtonElement;
    progress: HTMLDivElement;
    progressText: HTMLSpanElement;
    resultSection: HTMLElement;
    resultText: HTMLTextAreaElement;
    messageCount: HTMLSpanElement;
    copyButton: HTMLButtonElement;
    errorMessage: HTMLDivElement;
  };

  constructor() {
    this.datePresetManager = new DatePresetManager();
    this.state = {
      selectedPreset: 'week', // Default preset
      isExporting: false,
      exportResult: null,
      error: null,
      exportProgress: null
    };

    // Get DOM elements
    this.elements = {
      presetButtons: document.querySelectorAll<HTMLButtonElement>('.preset-button'),
      exportButton: document.getElementById('export-btn') as HTMLButtonElement,
      progress: document.getElementById('progress') as HTMLDivElement,
      progressText: document.getElementById('progress-text') as HTMLSpanElement,
      resultSection: document.getElementById('result-section') as HTMLElement,
      resultText: document.getElementById('result-text') as HTMLTextAreaElement,
      messageCount: document.getElementById('message-count') as HTMLSpanElement,
      copyButton: document.getElementById('copy-btn') as HTMLButtonElement,
      errorMessage: document.getElementById('error-message') as HTMLDivElement
    };

    this.init();
    this.setupProgressListener();
  }

  /**
   * Initialize UI and load settings
   */
  private async init(): Promise<void> {
    await this.loadSettings();
    this.attachEventListeners();
  }

  /**
   * Set up listener for progress messages from content script
   */
  private setupProgressListener(): void {
    chrome.runtime.onMessage.addListener(
      (message: ContentScriptToPopupMessage) => {
        if (message.type === 'EXPORT_PROGRESS') {
          this.state.exportProgress = message.payload;
          this.updateUI();
        }
      }
    );
  }

  /**
   * Load settings from Service Worker
   */
  private async loadSettings(): Promise<void> {
    try {
      const message: PopupToServiceWorkerMessage = { type: 'GET_SETTINGS' };
      const response = await chrome.runtime.sendMessage(message);

      if (this.isServiceWorkerResponse(response)) {
        if (response.type === 'SETTINGS_LOADED') {
          this.state.selectedPreset = response.payload.selectedPreset;
          this.updatePresetButtons();
        } else if (response.type === 'SETTINGS_ERROR') {
          console.error('Settings load error:', response.error);
          // Use default preset
          this.updatePresetButtons();
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use default preset
      this.updatePresetButtons();
    }
  }

  /**
   * Type guard for Service Worker response
   */
  private isServiceWorkerResponse(response: unknown): response is ServiceWorkerToPopupMessage {
    return (
      typeof response === 'object' &&
      response !== null &&
      'type' in response
    );
  }

  /**
   * Type guard for Content Script response
   */
  private isContentScriptResponse(response: unknown): response is ContentScriptToPopupMessage {
    return (
      typeof response === 'object' &&
      response !== null &&
      'type' in response
    );
  }

  /**
   * Update preset button UI
   */
  private updatePresetButtons(): void {
    this.elements.presetButtons.forEach(button => {
      const preset = button.getAttribute('data-preset') as DatePreset;
      if (preset === this.state.selectedPreset) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Preset button click
    this.elements.presetButtons.forEach(button => {
      button.addEventListener('click', () => this.onPresetClick(button));
    });

    // Export button click
    this.elements.exportButton.addEventListener('click', () => this.onExportClick());

    // Copy button click
    this.elements.copyButton.addEventListener('click', () => this.onCopyClick());
  }

  /**
   * Handle preset button click
   * Applies date preset query and starts export
   */
  private async onPresetClick(button: HTMLButtonElement): Promise<void> {
    const preset = button.getAttribute('data-preset') as DatePreset;
    if (!preset) return;

    this.state.selectedPreset = preset;
    this.updatePresetButtons();

    // Save to Service Worker
    try {
      const message: PopupToServiceWorkerMessage = {
        type: 'SAVE_SETTINGS',
        payload: { selectedPreset: preset }
      };
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }

    // Apply date preset query to Slack search
    await this.applyDatePreset(preset);
  }

  /**
   * Apply date preset query to Slack search
   * Then automatically start export
   */
  private async applyDatePreset(preset: DatePreset): Promise<void> {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Inject Content Script dynamically (Manifest V3 approach)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js']
        });
      } catch (injectError) {
        console.warn('Content script injection failed (may already be injected):', injectError);
      }

      // Wait for Content Script to initialize
      await this.waitMilliseconds(500);

      // Generate date query string
      const query = this.datePresetManager.toSlackQuery(preset);

      // Send apply preset message to Content Script
      const message: PopupToContentScriptMessage = {
        type: 'APPLY_DATE_PRESET',
        preset,
        query
      };

      const response = await chrome.tabs.sendMessage(tab.id, message);

      if (this.isContentScriptResponse(response) && response.type === 'PRESET_APPLIED') {
        if (response.success) {
          // Wait for search to complete
          await this.waitMilliseconds(1500);

          // Automatically start export
          await this.onExportClick();
        } else {
          this.showError({
            code: 'EXPORT_ERROR',
            message: response.message || 'プリセット適用に失敗しました'
          });
        }
      }
    } catch (error) {
      console.error('Failed to apply date preset:', error);
      this.showError({
        code: 'EXPORT_ERROR',
        message: error instanceof Error ? error.message : 'プリセット適用に失敗しました'
      });
    }
  }

  /**
   * Wait for specified milliseconds
   */
  private waitMilliseconds(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle export button click
   */
  private async onExportClick(): Promise<void> {
    if (this.state.isExporting) return;

    this.state.isExporting = true;
    this.state.error = null;
    this.updateUI();

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Inject Content Script dynamically (Manifest V3 approach)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js']
        });
      } catch (injectError) {
        console.warn('Content script injection failed (may already be injected):', injectError);
        // Continue anyway - script might already be injected
      }

      // Wait for Content Script to initialize
      await this.waitMilliseconds(500);

      // Send export message to Content Script
      const message: PopupToContentScriptMessage = {
        type: 'START_EXPORT',
        options: {
          datePreset: this.state.selectedPreset
        }
      };

      const response = await chrome.tabs.sendMessage(tab.id, message);

      if (this.isContentScriptResponse(response)) {
        if (response.type === 'EXPORT_COMPLETE') {
          this.state.exportResult = response.payload;
          this.state.isExporting = false;
          this.updateUI();
        } else if (response.type === 'EXPORT_ERROR') {
          this.state.error = response.error;
          this.state.isExporting = false;
          this.updateUI();
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      this.state.error = {
        code: 'EXPORT_ERROR',
        message: error instanceof Error ? error.message : 'エクスポートに失敗しました'
      };
      this.state.isExporting = false;
      this.updateUI();
    }
  }

  /**
   * Handle copy button click
   */
  private async onCopyClick(): Promise<void> {
    if (!this.state.exportResult) return;

    try {
      const tsvText = this.state.exportResult.messages.join('\n');
      await navigator.clipboard.writeText(tsvText);

      // Show success feedback
      const originalText = this.elements.copyButton.textContent;
      this.elements.copyButton.textContent = 'コピーしました!';
      setTimeout(() => {
        this.elements.copyButton.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError({
        code: 'CLIPBOARD_ERROR',
        message: 'クリップボードへのコピーに失敗しました'
      });
    }
  }

  /**
   * Update UI based on state
   */
  private updateUI(): void {
    // Update export button
    this.elements.exportButton.disabled = this.state.isExporting;

    // Update progress indicator
    if (this.state.isExporting) {
      this.elements.progress.style.display = 'flex';

      if (this.state.exportProgress) {
        const { currentPage, messageCount, status } = this.state.exportProgress;
        let statusText = '';

        switch (status) {
          case 'waiting_for_dom':
            statusText = ' - DOM読み込み待機中...';
            break;
          case 'extracting':
            statusText = ' - メッセージ抽出中...';
            break;
          case 'navigating':
            statusText = ' - 次ページへ移動中...';
            break;
        }

        this.elements.progressText.textContent =
          `ページ ${currentPage} 処理中 (${messageCount} メッセージ)${statusText}`;
      } else {
        this.elements.progressText.textContent = 'エクスポート中...';
      }

      this.elements.resultSection.style.display = 'none';
      this.elements.errorMessage.style.display = 'none';
    } else {
      this.elements.progress.style.display = 'none';
      this.state.exportProgress = null; // Reset progress when done
    }

    // Update result section
    if (this.state.exportResult && !this.state.isExporting) {
      this.elements.resultSection.style.display = 'block';
      this.elements.messageCount.textContent = this.state.exportResult.messageCount.toString();
      this.elements.resultText.value = this.state.exportResult.messages.join('\n');
      this.elements.errorMessage.style.display = 'none';
    } else if (!this.state.isExporting) {
      this.elements.resultSection.style.display = 'none';
    }

    // Update error message
    if (this.state.error && !this.state.isExporting) {
      this.showError(this.state.error);
    }
  }

  /**
   * Show error message with user-friendly formatting
   */
  private showError(error: ExportError): void {
    // Format error for user display (hides technical details)
    const userMessage = formatUserError(error);
    this.elements.errorMessage.textContent = userMessage;
    this.elements.errorMessage.style.display = 'block';

    // Log detailed error for development/debugging (not shown to user)
    console.error('Error details:', error);
  }
}

// Initialize Popup UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupUIController();
});
