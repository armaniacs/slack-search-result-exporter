export const store: Record<string, any> = {};

type MessageListener = (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void;
type StorageChangeListener = (changes: { [key: string]: any }, areaName: string) => void;

export const chromeMock = {
  storage: {
    sync: {
      get: (keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void) => {
        if (chromeMock.runtime.lastError) {
             callback({});
             return;
        }

        let result: Record<string, any> = {};
        if (typeof keys === 'string') {
          result[keys] = store[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(k => {
            result[k] = store[k];
          });
        } else if (typeof keys === 'object' && keys !== null) {
             // defaults
             for (const k in keys) {
                 result[k] = store[k] !== undefined ? store[k] : (keys as any)[k];
             }
        } else {
            // null means all
            result = {...store};
        }
        callback(result);
      },
      set: (items: object, callback?: () => void) => {
        if (chromeMock.runtime.lastError) {
            if (callback) callback();
            return;
        }
        Object.assign(store, items);
        if (callback) callback();
      },
      clear: (callback?: () => void) => {
         if (chromeMock.runtime.lastError) {
             if (callback) callback();
             return;
         }
         for (const key in store) delete store[key];
         if (callback) callback();
      }
    },
    onChanged: {
      listeners: [] as StorageChangeListener[],
      addListener: (listener: StorageChangeListener) => {
        chromeMock.storage.onChanged.listeners.push(listener);
      },
      // Helper to trigger events
      dispatch: (changes: { [key: string]: any }, areaName: string) => {
        chromeMock.storage.onChanged.listeners.forEach(l => l(changes, areaName));
      }
    }
  },
  runtime: {
    lastError: undefined as { message: string } | undefined,
    onMessage: {
      listeners: [] as MessageListener[],
      addListener: (listener: MessageListener) => {
        chromeMock.runtime.onMessage.listeners.push(listener);
      },
      // Helper to trigger events
      dispatch: (message: any, sender: any, sendResponse: (response?: any) => void) => {
        // Return true if any listener returns true (async response)
        return chromeMock.runtime.onMessage.listeners.some(l => l(message, sender, sendResponse) === true);
      }
    },
    sendMessage: (_message: any, callback?: (response: any) => void) => {
        // Mock sendMessage if needed, currently just a placeholder
        if (callback) callback({ success: true });
    }
  }
};

// Reset helper
export function resetMock() {
    for (const key in store) delete store[key];
    chromeMock.runtime.lastError = undefined;
    chromeMock.runtime.onMessage.listeners = [];
    chromeMock.storage.onChanged.listeners = [];
}

// Global scope injection if needed, but better to use dependency injection or just global.chrome assignment in test setup
// (global as any).chrome = chromeMock;
