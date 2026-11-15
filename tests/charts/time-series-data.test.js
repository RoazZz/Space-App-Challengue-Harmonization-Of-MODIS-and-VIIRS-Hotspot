import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeSeries, overlapRatio, TIME_SERIES_AGGREGATION, TIME_SERIES_MODE } from '../../src/charts/time-series-data.js';
import { SENSOR_MILESTONES } from '../../src/data/sensor-catalog.js';
import { DATE_RANGE_SHORTCUTS } from '../../src/time/date-range.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const filled = (valueAt) => Float64Array.from({ length: recordWindow.monthCount }, (_, monthIndex) => valueAt(monthIndex));
const start = SENSOR_MILESTONES.viirsNoaa20Start;
const result = {
  recordWindow,
  modis: filled(() => 10),
  viirs: filled((monthIndex) => (monthIndex >= start ? 30 : 0)),
  harmonized: filled(() => 30),
  lower: filled(() => 25),
  upper: filled(() => 35),
};

test('raw mode shows both sensors and their naive join', () => {
  const data = buildTimeSeries(result, DATE_RANGE_SHORTCUTS.fullRecord(recordWindow), { mode: TIME_SERIES_MODE.RAW, aggregation: TIME_SERIES_AGGREGATION.MONTHLY });
  assert.equal(data.lines.length, 3);
  assert.equal(data.band, null);
  const naiveJoin = data.lines[2].values;
  assert.equal(naiveJoin[start - 1], 10);
  assert.equal(naiveJoin[start], 30);
  assert.ok(Number.isNaN(data.lines[1].values[start - 1]));
});

test('annual harmonized mode sums each year and marks the estimated years', () => {
  const data = buildTimeSeries(result, DATE_RANGE_SHORTCUTS.fullRecord(recordWindow), { mode: TIME_SERIES_MODE.HARMONIZED, aggregation: TIME_SERIES_AGGREGATION.ANNUAL });
  assert.equal(data.points[0].label, '2001');
  assert.equal(data.lines[1].values[0], 360);
  assert.equal(data.isEstimated[0], true);
  assert.equal(data.points[data.overlapIndex].label, '2019');
});

test('the overlap ratio compares both sensors after April 2018', () => {
  assert.equal(overlapRatio(result), 3);
});
