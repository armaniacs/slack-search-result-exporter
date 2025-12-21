/**
 * Centralized Error Messages for User-Friendly Feedback
 *
 * Requirements: 1.5, 2.6, 3.5, 5.4, 8.5
 *
 * All error messages are in Japanese and provide actionable guidance to users.
 */

export type ErrorCode =
  | 'DOM_STRUCTURE_MISMATCH'
  | 'PAGINATION_ERROR'
  | 'EXTRACTION_ERROR'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_READ_ERROR'
  | 'STORAGE_WRITE_ERROR'
  | 'UNSUPPORTED_PAGE'
  | 'EXPORT_ERROR'
  | 'CLIPBOARD_ERROR';

/**
 * User-friendly error messages (Japanese)
 * These messages are shown directly to users in the popup UI
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  DOM_STRUCTURE_MISMATCH: 'Slackページ構造が想定と異なります',
  PAGINATION_ERROR: '一部ページの取得に失敗しました',
  EXTRACTION_ERROR: 'メッセージの抽出に失敗しました',
  STORAGE_QUOTA_EXCEEDED: '設定の保存に失敗しました(容量不足)',
  STORAGE_READ_ERROR: '設定の読み込みに失敗しました',
  STORAGE_WRITE_ERROR: '設定の保存に失敗しました',
  UNSUPPORTED_PAGE: 'このページではエクスポートできません。Slack検索結果またはチャンネルページに移動してください',
  EXPORT_ERROR: 'エクスポートに失敗しました',
  CLIPBOARD_ERROR: 'クリップボードへのコピーに失敗しました'
};

/**
 * Get user-friendly error message for a given error code
 * @param code - Error code
 * @param fallbackMessage - Optional fallback message if code not found
 * @returns User-friendly error message in Japanese
 */
export function getUserErrorMessage(
  code: ErrorCode | string,
  fallbackMessage = 'エラーが発生しました'
): string {
  if (code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ErrorCode];
  }
  return fallbackMessage;
}

/**
 * Format error for user display
 * Hides technical details and shows user-friendly message
 * @param error - Error object or error code
 * @returns User-friendly error message
 */
export function formatUserError(error: Error | { code?: ErrorCode | string; message?: string } | string): string {
  // If error is a string, treat it as a message
  if (typeof error === 'string') {
    return error;
  }

  // If error has a code property, use it to get user-friendly message
  if (typeof error === 'object' && error !== null && 'code' in error && error.code) {
    return getUserErrorMessage(error.code, error.message);
  }

  // If error has a message property, use it
  if (typeof error === 'object' && error !== null && 'message' in error && error.message) {
    // Don't expose technical stack traces
    const message = error.message;
    if (message.includes('TypeError') || message.includes('ReferenceError') || message.includes('undefined')) {
      return 'エクスポートに失敗しました';
    }
    return message;
  }

  // Default fallback
  return 'エラーが発生しました';
}
