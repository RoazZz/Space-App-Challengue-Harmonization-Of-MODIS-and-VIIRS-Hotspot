import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthIndexOf, monthLabel, monthOfYearOf, yearOf } from '../../src/time/month-index.js';
import { createRecordWindow } from '../../src/time/record-window.js';

test('month indexes start in January 2001 and round-trip', () => {
  assert.equal(monthIndexOf(2001, 0), 0);
  assert.equal(monthIndexOf(2018, 3), 207);
  assert.equal(yearOf(207), 2018);
  assert.equal(monthOfYearOf(207), 3);
  assert.equal(monthLabel(207), 'Apr 2018');
});

test('the record window ends in the current UTC month', () => {
  const window = createRecordWindow(new Date(Date.UTC(2026, 10, 15, 12)));
  assert.equal(window.lastMonthIndex, monthIndexOf(2026, 10));
  assert.equal(window.monthCount, window.lastMonthIndex + 1);
  assert.ok(Math.abs(window.lastMonthFraction - 14.5 / 30) < 1e-9);
});

test('the month follows UTC, not local time', () => {
  const window = createRecordWindow(new Date('2026-12-01T03:00:00Z'));
  assert.equal(window.lastMonthIndex, monthIndexOf(2026, 11));
  assert.ok(window.lastMonthFraction < 0.01);
});
