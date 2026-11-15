import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anomalyClassOf, countAnomalyClasses } from '../../src/analysis/anomalies.js';
import { DEFAULT_BASELINE_SETTINGS } from '../../src/analysis/baseline.js';
import { summarizePeriod } from '../../src/analysis/period-summary.js';
import { DATE_RANGE_SHORTCUTS } from '../../src/time/date-range.js';
import { monthIndexOf } from '../../src/time/month-index.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const spikeMonth = monthIndexOf(2015, 3);
const dropMonth = monthIndexOf(2016, 7);
const result = {
  recordWindow,
  harmonized: Float64Array.from({ length: recordWindow.monthCount }, (_, monthIndex) => {
    if (monthIndex === spikeMonth) return 500;
    if (monthIndex === dropMonth) return 10;
    return 100;
  }),
  observationCoverage: new Float64Array(recordWindow.monthCount).fill(1),
};

test('months are classified against the same calendar month', () => {
  const summary = summarizePeriod(result, DATE_RANGE_SHORTCUTS.fullRecord(recordWindow), DEFAULT_BASELINE_SETTINGS);
  assert.equal(anomalyClassOf(result.harmonized, summary.baseline, spikeMonth), 6);
  assert.equal(anomalyClassOf(result.harmonized, summary.baseline, dropMonth), 0);
  assert.equal(anomalyClassOf(result.harmonized, summary.baseline, monthIndexOf(2020, 1)), 3);
});

test('only the unusual months are counted as well above or below normal', () => {
  const summary = summarizePeriod(result, DATE_RANGE_SHORTCUTS.fullRecord(recordWindow), DEFAULT_BASELINE_SETTINGS);
  const { wellAbove, wellBelow } = countAnomalyClasses(result, summary);
  assert.equal(wellAbove, 1);
  assert.equal(wellBelow, 1);
});
