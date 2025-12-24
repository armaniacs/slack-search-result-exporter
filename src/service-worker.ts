import { SettingsManager } from './settings-manager.js';
import { PopupToServiceWorkerMessage, ServiceWorkerToPopupMessage } from './types.js';

const settingsManager = new SettingsManager();

function handleMessage(
  message: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: ServiceWorkerToPopupMessage) => void
): boolean | undefined {

  if (!message || typeof message !== 'object' || !('type' in message)) {
    console.warn('Invalid message received in service worker');
    return false;
  }

  const msg = message as PopupToServiceWorkerMessage;

  (async () => {
    try {
      switch (msg.type) {
        case 'GET_SETTINGS': {
          const result = await settingsManager.getAll();
          if (result.success) {
            sendResponse({ type: 'SETTINGS_LOADED', payload: result.value });
          } else {
            sendResponse({ type: 'SETTINGS_ERROR', error: result.error });
          }
          break;
        }
        case 'SAVE_SETTINGS': {
          if (!msg.payload) {
            // Runtime check for payload
            return;
          }
          const result = await settingsManager.setAll(msg.payload);
          if (result.success) {
            sendResponse({ type: 'SETTINGS_SAVED' });
          } else {
            sendResponse({ type: 'SETTINGS_ERROR', error: result.error });
          }
          break;
        }
        case 'CLEAR_SETTINGS': {
          const result = await settingsManager.clear();
          if (result.success) {
            sendResponse({ type: 'SETTINGS_SAVED' });
          } else {
            sendResponse({ type: 'SETTINGS_ERROR', error: result.error });
          }
          break;
        }
      }
    } catch (error) {
      console.error("Service Worker Error:", error);
      // Optional: send error response if possible
    }
  })();

  return true; // Keep channel open for async response
}

function handleStorageChange(_changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
  if (areaName === 'sync') {
    // Notify Popup or other parts. Suppress error if no receivers.
    chrome.runtime.sendMessage({ type: 'settings_changed' }, () => {
      // Just check lastError to avoid "Unchecked runtime.lastError"
      if (chrome.runtime.lastError) {
        // No receivers, ignore
      }
    });
  }
}

export function setupListeners() {
  chrome.runtime.onMessage.addListener(handleMessage);
  chrome.storage.onChanged.addListener(handleStorageChange);
}

// Initialize
setupListeners();
