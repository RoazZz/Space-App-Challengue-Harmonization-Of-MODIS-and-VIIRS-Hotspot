import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultMapMonth } from '../../src/analysis/map-month.js';
import { createDateRange, DATE_RANGE_SHORTCUTS } from '../../src/time/date-range.js';
import { monthIndexOf } from '../../src/time/month-index.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const result = {
  recordWindow,
  harmonized: Float64Array.from({ length: recordWindow.monthCount }, (_, monthIndex) => (monthIndex % 12 === 4 ? 100 : 10)),
};

test('the map opens on the busiest month of the last complete year in range', () => {
  assert.equal(defaultMapMonth(result, DATE_RANGE_SHORTCUTS.fullRecord(recordWindow)), monthIndexOf(2026, 4));
  assert.equal(defaultMapMonth(result, createDateRange(monthIndexOf(2010, 0), monthIndexOf(2012, 11), recordWindow)), monthIndexOf(2012, 4));
});
