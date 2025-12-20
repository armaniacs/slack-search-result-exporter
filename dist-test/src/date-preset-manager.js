"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatePresetManager = void 0;
class DatePresetManager {
    calculateDateRange(preset, referenceDate = new Date()) {
        // Clone reference date to avoid mutation
        const endDate = new Date(referenceDate);
        const startDate = new Date(referenceDate);
        switch (preset) {
            case 'today':
                // Start and end are today
                break;
            case 'yesterday':
                // Start and end are yesterday
                startDate.setDate(startDate.getDate() - 1);
                endDate.setDate(endDate.getDate() - 1);
                break;
            case 'week':
                // Last 7 days including today (today - 6 days)
                startDate.setDate(startDate.getDate() - 6);
                break;
            case 'month':
                // Last 30 days including today (today - 29 days)
                startDate.setDate(startDate.getDate() - 29);
                break;
        }
        return { startDate, endDate };
    }
    toSlackQuery(preset, referenceDate = new Date()) {
        const range = this.calculateDateRange(preset, referenceDate);
        if (preset === 'today' || preset === 'yesterday') {
            return `on:${this.formatDate(range.startDate)}`;
        }
        // For ranges, use "after:YYYY-MM-DD" (exclusive start)
        // To include startDate, we use "after:(startDate - 1)"
        const queryDate = new Date(range.startDate);
        queryDate.setDate(queryDate.getDate() - 1);
        return `after:${this.formatDate(queryDate)}`;
    }
    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
}
exports.DatePresetManager = DatePresetManager;
//# sourceMappingURL=date-preset-manager.js.map