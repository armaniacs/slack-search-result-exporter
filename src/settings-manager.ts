import { UserSettings, Result, StorageError, DatePreset } from './types.js';

export const DEFAULT_SETTINGS: UserSettings = {
  selectedPreset: "week"
};

function isDatePreset(value: any): value is DatePreset {
  return ["today", "yesterday", "week", "month"].includes(value);
}

export class SettingsManager {
  async get<K extends keyof UserSettings>(key: K): Promise<Result<UserSettings[K], StorageError>> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (items) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: {
              code: "STORAGE_READ_ERROR",
              message: chrome.runtime.lastError.message || "Unknown error"
            }
          });
          return;
        }

        const value = items[key];
        
        // Validation and fallback
        if (key === 'selectedPreset') {
            if (isDatePreset(value)) {
                resolve({ success: true, value: value as UserSettings[K] });
            } else {
                resolve({ success: true, value: DEFAULT_SETTINGS.selectedPreset as UserSettings[K] });
            }
        } else {
            // For unknown keys (should not happen with types), return undefined or handle gracefully
             resolve({ success: true, value: value as UserSettings[K] });
        }
      });
    });
  }

  async set<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<Result<void, StorageError>> {
    return new Promise((resolve) => {
      const items: Partial<UserSettings> = { [key]: value };
      chrome.storage.sync.set(items, () => {
        if (chrome.runtime.lastError) {
           const message = chrome.runtime.lastError.message || "";
           const code = message.includes("Quota") ? "STORAGE_QUOTA_EXCEEDED" : "STORAGE_WRITE_ERROR";
           resolve({
            success: false,
            error: {
              code,
              message: message || "Unknown error"
            }
          });
          return;
        }
        resolve({ success: true, value: undefined });
      });
    });
  }

  async setAll(settings: UserSettings): Promise<Result<void, StorageError>> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, () => {
        if (chrome.runtime.lastError) {
           const message = chrome.runtime.lastError.message || "";
           const code = message.includes("Quota") ? "STORAGE_QUOTA_EXCEEDED" : "STORAGE_WRITE_ERROR";
           resolve({
            success: false,
            error: {
              code,
              message: message || "Unknown error"
            }
          });
          return;
        }
        resolve({ success: true, value: undefined });
      });
    });
  }

  async getAll(): Promise<Result<UserSettings, StorageError>> {
     return new Promise((resolve) => {
      chrome.storage.sync.get(null, (items) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: {
              code: "STORAGE_READ_ERROR",
              message: chrome.runtime.lastError.message || "Unknown error"
            }
          });
          return;
        }
        
        const settings: UserSettings = { ...DEFAULT_SETTINGS };
        
        if (items) {
            if (isDatePreset(items.selectedPreset)) {
                settings.selectedPreset = items.selectedPreset;
            }
        }

        resolve({ success: true, value: settings });
      });
    });
  }

  async clear(): Promise<Result<void, StorageError>> {
     return new Promise((resolve) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: {
              code: "STORAGE_WRITE_ERROR",
              message: chrome.runtime.lastError.message || "Unknown error"
            }
          });
          return;
        }
        resolve({ success: true, value: undefined });
      });
    });
  }
}