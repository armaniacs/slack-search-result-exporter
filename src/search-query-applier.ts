/**
 * SearchQueryApplier
 * Applies date preset query to Slack search form
 */
export class SearchQueryApplier {
  /**
   * Apply date preset query to Slack search
   * @param query - Date query string (e.g., "after:2025-12-13")
   * @returns Success status and message
   */
  public async applyQuery(query: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Find Slack search input
      const searchInput = this.findSearchInput();

      if (!searchInput) {
        return {
          success: false,
          message: '検索フォームが見つかりませんでした。検索ページにいることを確認してください。'
        };
      }

      // Get current search query
      const currentQuery = searchInput.value || '';

      // Remove existing date filters (after:, before:, on:, during:)
      const cleanedQuery = this.removeDateFilters(currentQuery);

      // Add new date query
      const newQuery = cleanedQuery.trim() ? `${cleanedQuery} ${query}` : query;

      // Set new query value
      searchInput.value = newQuery;

      // Trigger input event to notify Slack of the change
      const inputEvent = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(inputEvent);

      // Trigger search (press Enter)
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      searchInput.dispatchEvent(keyEvent);

      // Wait for search to execute
      await this.waitMilliseconds(1000);

      return {
        success: true,
        message: `日付フィルタ「${query}」を適用しました`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '検索クエリの適用に失敗しました'
      };
    }
  }

  /**
   * Find Slack search input element
   * @returns Search input element or null
   */
  private findSearchInput(): HTMLInputElement | null {
    // Try multiple selectors for robustness
    const selectors = [
      'input[type="text"][data-qa="top_nav_search_input"]',
      'input[type="text"][placeholder*="検索"]',
      'input[type="text"][placeholder*="Search"]',
      'input[aria-label*="Search"]',
      'input[aria-label*="検索"]',
      '.p-search_modal__input input',
      '[data-qa="search_input"]'
    ];

    for (const selector of selectors) {
      const input = document.querySelector<HTMLInputElement>(selector);
      if (input) {
        return input;
      }
    }

    return null;
  }

  /**
   * Remove existing date filters from query
   * @param query - Original query string
   * @returns Cleaned query string
   */
  private removeDateFilters(query: string): string {
    // Remove after:, before:, on:, during: filters
    const dateFilterPattern = /\b(after|before|on|during):[^\s]+/gi;
    return query.replace(dateFilterPattern, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Wait for specified milliseconds
   * @param ms - Milliseconds to wait
   */
  private waitMilliseconds(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
