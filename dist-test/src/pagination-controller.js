"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationController = void 0;
/**
 * Handles pagination control for Slack search results
 * Manages next page button detection, clicking, and page limit checking
 *
 * This class provides utilities for navigating through multi-page Slack search results
 * by detecting and clicking pagination buttons, checking page limits, and timing delays.
 */
class PaginationController {
    constructor() {
        this.paginationButtonSelector = '.c-pagination__arrow_btn';
        this.searchContentSelector = '.c-search_message__content';
        this.nextPageLabels = ['Next page', '次のページ'];
    }
    /**
     * Click the next page button if available and enabled
     * Supports both English ("Next page") and Japanese ("次のページ") button labels
     * @param messagePack - Message pack containing hasNextPage flag to update
     */
    async clickNextButton(messagePack) {
        const arrowBtnElements = document.querySelectorAll(this.paginationButtonSelector);
        // Default: no next page
        messagePack.hasNextPage = false;
        // No pagination buttons found
        if (arrowBtnElements.length === 0) {
            return;
        }
        // Find the "Next page" button
        let nextButton;
        arrowBtnElements.forEach((element) => {
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel && this.nextPageLabels.includes(ariaLabel)) {
                nextButton = element;
            }
        });
        // Next button not found
        if (!nextButton) {
            return;
        }
        // Check if button is enabled
        const ariaDisabled = nextButton.getAttribute('aria-disabled');
        const isEnabled = ariaDisabled === 'false';
        if (!isEnabled) {
            return;
        }
        // Button is enabled, update flag and click
        messagePack.hasNextPage = true;
        nextButton.click();
    }
    /**
     * Check if the current page has reached the page limit
     * Sets hasNextPage to false if no search content is found (indicates end of results)
     * @param messagePack - Message pack containing hasNextPage flag to update
     */
    async checkOutOfPageLimit(messagePack) {
        const searchContent = document.querySelector(this.searchContentSelector);
        // If no search content found, we're out of page limit
        if (searchContent === null) {
            messagePack.hasNextPage = false;
        }
    }
    /**
     * Wait for specified milliseconds
     * Used for timing delays between pagination operations to allow DOM to update
     * @param ms - Number of milliseconds to wait
     */
    async waitMilliseconds(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.PaginationController = PaginationController;
//# sourceMappingURL=pagination-controller.js.map