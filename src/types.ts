export type DatePreset = "today" | "yesterday" | "week" | "month";

export interface UserSettings {
  selectedPreset: DatePreset;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface StorageError {
  code: "STORAGE_QUOTA_EXCEEDED" | "STORAGE_READ_ERROR" | "STORAGE_WRITE_ERROR";
  message: string;
}

export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

export type PageType = "search_result" | "channel" | "unknown";

export interface ExportOptions {
  datePreset?: DatePreset;
}

export interface ExportResult {
  messages: string[]; // TSV形式の行配列
  messageCount: number;
  pageCount: number;
}

export interface ExportError {
  code: "DOM_STRUCTURE_MISMATCH" | "PAGINATION_ERROR" | "EXTRACTION_ERROR" | "UNSUPPORTED_PAGE" | "EXPORT_ERROR" | "CLIPBOARD_ERROR";
  message: string;
  partialData?: string[];
}

export interface ExtractionError {
  code: "DOM_STRUCTURE_MISMATCH" | "NO_MESSAGES_FOUND";
  message: string;
}

export interface RawMessage {
  timestamp: string;
  channel: string;
  sender: string;
  content: string;
}

export interface MessagePack {
  messages: string[];
  messageSet: Set<string>;
  messagePushed: boolean;
  hasNextPage: boolean;
}

export type PopupToServiceWorkerMessage =
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; payload: UserSettings }
  | { type: "CLEAR_SETTINGS" };

export type ServiceWorkerToPopupMessage =
  | { type: "SETTINGS_LOADED"; payload: UserSettings }
  | { type: "SETTINGS_SAVED" }
  | { type: "SETTINGS_ERROR"; error: StorageError }
  | { type: "settings_changed" };

export type PopupToContentScriptMessage =
  | { type: "START_EXPORT"; options: ExportOptions }
  | { type: "APPLY_DATE_PRESET"; preset: DatePreset; query: string };

export type ContentScriptToPopupMessage =
  | { type: "EXPORT_PROGRESS"; payload: { currentPage: number; messageCount: number } }
  | { type: "EXPORT_COMPLETE"; payload: ExportResult }
  | { type: "EXPORT_ERROR"; error: ExportError }
  | { type: "PRESET_APPLIED"; success: boolean; message?: string };
