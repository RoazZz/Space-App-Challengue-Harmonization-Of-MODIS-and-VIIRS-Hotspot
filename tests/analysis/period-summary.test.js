import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BASELINE_SETTINGS, monthlyBaseline } from '../../src/analysis/baseline.js';
import { assessYears, criticalSeason, isInSeason, seasonLabel } from '../../src/analysis/critical-periods.js';
import { monthFlags } from '../../src/analysis/month-flags.js';
import { summarizePeriod } from '../../src/analysis/period-summary.js';
import { createDateRange, DATE_RANGE_SHORTCUTS } from '../../src/time/date-range.js';
import { monthIndexOf } from '../../src/time/month-index.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const SOUTHERN_SUMMER_PROFILE = [30, 20, 3, 1, 1, 1, 1, 1, 1, 2, 4, 35];

function seriesFrom(valueAt) {
  return { harmonized: Float64Array.from({ length: recordWindow.monthCount }, (_, monthIndex) => valueAt(monthIndex)), recordWindow };
}

test('a critical season can cross the end of the year', () => {
  const season = criticalSeason(SOUTHERN_SUMMER_PROFILE);
  assert.equal(seasonLabel(season), 'Dec–Feb');
  assert.ok(isInSeason(season, 0) && isInSeason(season, 11) && !isInSeason(season, 6));
});

test('a year far above the others is critical and ranked first', () => {
  const doubledYear = 2015;
  const { harmonized } = seriesFrom((monthIndex) => (monthIndex >= monthIndexOf(doubledYear, 0) && monthIndex <= monthIndexOf(doubledYear, 11) ? 200 : 100 + (monthIndex % 7)));
  const baseline = monthlyBaseline(harmonized, recordWindow, DEFAULT_BASELINE_SETTINGS);
  const assessment = assessYears(harmonized, recordWindow, baseline);
  assert.equal(assessment.years.get(doubledYear).isCritical, true);
  assert.equal(assessment.years.get(doubledYear).rank, 1);
  assert.equal(assessment.years.get(2010).isCritical, false);
});

test('the baseline ignores the partial month and ends with the last complete year', () => {
  const result = seriesFrom((monthIndex) => (monthIndex === recordWindow.lastMonthIndex ? 1e6 : 10));
  const baseline = monthlyBaseline(result.harmonized, recordWindow, DEFAULT_BASELINE_SETTINGS);
  assert.equal(baseline.lastYear, 2025);
  assert.ok(baseline.values.every((value) => value === 10));
});

test('a steady series is unchanged against its history', () => {
  const result = { ...seriesFrom(() => 50), observationCoverage: new Float64Array(recordWindow.monthCount).fill(1) };
  const summary = summarizePeriod(result, DATE_RANGE_SHORTCUTS.fullRecord(recordWindow), DEFAULT_BASELINE_SETTINGS);
  assert.equal(summary.yearToDate.change, 0);
  assert.equal(summary.lastCompleteMonth.change, 0);
  assert.equal(summary.lastCompleteMonth.monthIndex, recordWindow.lastMonthIndex - 1);
});

test('date ranges are ordered and clamped to the record', () => {
  const range = createDateRange(400, 10, recordWindow);
  assert.equal(range.firstMonthIndex, 10);
  assert.equal(range.lastMonthIndex, recordWindow.lastMonthIndex);
  assert.equal(DATE_RANGE_SHORTCUTS.lastFiveYears(recordWindow).firstMonthIndex, recordWindow.lastMonthIndex - 60);
});

test('month flags mark the partial month and months outside the range', () => {
  const result = { ...seriesFrom(() => 5), observationCoverage: new Float64Array(recordWindow.monthCount).fill(0.4) };
  const range = createDateRange(100, recordWindow.lastMonthIndex, recordWindow);
  const flags = monthFlags(result, range, recordWindow.lastMonthIndex);
  assert.ok(flags.isPartial && flags.hasLowCoverage && !flags.isOutOfRange);
  assert.equal(monthFlags(result, range, 50).isOutOfRange, true);
});
