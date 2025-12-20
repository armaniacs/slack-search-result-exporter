import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DatePresetManager } from '../../src/date-preset-manager.js';

describe('DatePresetManager', () => {
  // Fixed reference date: 2025-12-20 (Saturday)
  // Month is 0-indexed in JS Date: 11 is December
  const mockToday = new Date(2025, 11, 20); 
  const manager = new DatePresetManager();

  it('should calculate correct date range for "today"', () => {
    const range = manager.calculateDateRange('today', mockToday);
    assert.strictEqual(range.startDate.getFullYear(), 2025);
    assert.strictEqual(range.startDate.getMonth(), 11);
    assert.strictEqual(range.startDate.getDate(), 20);
    
    assert.strictEqual(range.endDate.getFullYear(), 2025);
    assert.strictEqual(range.endDate.getMonth(), 11);
    assert.strictEqual(range.endDate.getDate(), 20);
  });

  it('should calculate correct date range for "yesterday"', () => {
    const range = manager.calculateDateRange('yesterday', mockToday);
    assert.strictEqual(range.startDate.getFullYear(), 2025);
    assert.strictEqual(range.startDate.getMonth(), 11);
    assert.strictEqual(range.startDate.getDate(), 19);
    
    assert.strictEqual(range.endDate.getFullYear(), 2025);
    assert.strictEqual(range.endDate.getMonth(), 11);
    assert.strictEqual(range.endDate.getDate(), 19);
  });

  it('should calculate correct date range for "week" (last 7 days)', () => {
    // 2025-12-20 minus 6 days = 2025-12-14. 
    // Requirement says "week" -> "after:2025-12-13" (example in design)
    // "after:YYYY-MM-DD" in Slack means EXCLUDING that date?
    // Let's assume "week" means the last 7 days including today.
    // 20, 19, 18, 17, 16, 15, 14.
    // Start date should be 14th.
    
    const range = manager.calculateDateRange('week', mockToday);
    assert.strictEqual(range.startDate.getFullYear(), 2025);
    assert.strictEqual(range.startDate.getMonth(), 11);
    assert.strictEqual(range.startDate.getDate(), 14); // 20 - 6
    
    assert.strictEqual(range.endDate.getFullYear(), 2025);
    assert.strictEqual(range.endDate.getMonth(), 11);
    assert.strictEqual(range.endDate.getDate(), 20);
  });

  it('should calculate correct date range for "month" (last 30 days)', () => {
    // 2025-12-20 minus 29 days = 2025-11-21 ?
    // Or just 1 month ago? 2025-11-20.
    // Let's assume 30 days for simplicity or 1 month back.
    // Standard "Last month" usually implies same day previous month or 30 days.
    // Let's use 30 days including today.
    // 2025-12-20 -> 2025-11-21 (since Nov has 30 days).
    
    const range = manager.calculateDateRange('month', mockToday);
    // 2025-11-21
    const expectedStart = new Date(2025, 10, 21); // Month 10 is Nov
    
    assert.strictEqual(range.startDate.getFullYear(), expectedStart.getFullYear());
    assert.strictEqual(range.startDate.getMonth(), expectedStart.getMonth());
    assert.strictEqual(range.startDate.getDate(), expectedStart.getDate());
    
    assert.strictEqual(range.endDate.getFullYear(), 2025);
    assert.strictEqual(range.endDate.getMonth(), 11);
    assert.strictEqual(range.endDate.getDate(), 20);
  });
  
  it('should generate correct Slack query for "today"', () => {
    // For "today", we probably want "on:2025-12-20" or "after:2025-12-19".
    // Design says `toSlackQuery(preset: DatePreset): string`.
    // Example: `toSlackQuery("week")` → `"after:2025-12-13"`
    // Slack query "after:2025-12-13" means from 2025-12-14 onwards.
    // So if start date is 2025-12-14, the query should be after:2025-12-13.
    
    // For today (2025-12-20), query could be "on:2025-12-20" or "after:2025-12-19".
    // "on:today" is also valid in Slack but we want absolute dates for consistency.
    // Let's use "after:YYYY-MM-DD" (start date - 1 day) or "on:YYYY-MM-DD" if single day.
    // Actually, "today" and "yesterday" are single days. "week" and "month" are ranges.
    
    // If I stick to "after:" format for ranges:
    // week (start 14th) -> after:2025-12-13
    
    // For "today" (20th), maybe "on:2025-12-20" is best.
    
    const query = manager.toSlackQuery('today', mockToday);
    assert.strictEqual(query, 'on:2025-12-20');
  });

  it('should generate correct Slack query for "yesterday"', () => {
    const query = manager.toSlackQuery('yesterday', mockToday);
    assert.strictEqual(query, 'on:2025-12-19');
  });

  it('should generate correct Slack query for "week"', () => {
    // Start date 2025-12-14 -> after 2025-12-13
    const query = manager.toSlackQuery('week', mockToday);
    assert.strictEqual(query, 'after:2025-12-13');
  });

  it('should generate correct Slack query for "month"', () => {
    // Start date 2025-11-21 -> after 2025-11-20
    const query = manager.toSlackQuery('month', mockToday);
    assert.strictEqual(query, 'after:2025-11-20');
  });
});
