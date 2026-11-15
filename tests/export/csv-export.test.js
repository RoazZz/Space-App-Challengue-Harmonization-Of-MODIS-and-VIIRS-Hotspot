import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAreaAnalyzer } from '../../src/analysis/area-analyzer.js';
import { DEFAULT_BASELINE_SETTINGS } from '../../src/analysis/baseline.js';
import { summarizePeriod } from '../../src/analysis/period-summary.js';
import { createSimulatedFireDataSource } from '../../src/data/simulated/simulated-fire-data-source.js';
import { toCsv } from '../../src/export/csv-writer.js';
import { buildDetectionsCsv } from '../../src/export/detections-csv.js';
import { exportFileName } from '../../src/export/export-file-name.js';
import { buildMonthlySeriesCsv } from '../../src/export/monthly-series-csv.js';
import { createPolygonArea } from '../../src/geo/area-of-interest.js';
import { createDateRange, DATE_RANGE_SHORTCUTS } from '../../src/time/date-range.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'));
const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const landArea = createPolygonArea('Land', readJson('data/land-mask.json').polygons);
const analyzer = createAreaAnalyzer(createSimulatedFireDataSource({ landArea, recordWindow }));
const veracruz = readJson('data/subdivisions/mexico.json').subdivisions.find(({ id }) => id === 'veracruz');
const resultPromise = analyzer.analyze(createPolygonArea(`${veracruz.name}, Mexico`, veracruz.polygons));

test('csv values with commas or quotes are escaped', () => {
  assert.equal(toCsv(['a', 'b'], [{ a: 'x,y', b: 'say "hi"' }]), 'a,b\n"x,y","say ""hi"""');
});

test('hotspots follow the FIRMS columns, stay inside the area and are marked as demo data', async () => {
  const result = await resultPromise;
  const range = createDateRange(recordWindow.lastMonthIndex - 11, recordWindow.lastMonthIndex, recordWindow);
  const { text, rowCount } = buildDetectionsCsv(result, range);
  const [header, ...lines] = text.split('\n');
  assert.equal(header, 'latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp,daynight,demo_flag');
  assert.equal(lines.length, rowCount);
  assert.ok(rowCount > 0);
  lines.slice(0, 200).forEach((line) => {
    const [latitude, longitude, date, time] = line.split(',');
    assert.ok(result.area.contains(Number(latitude), Number(longitude)));
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(time, /^\d{4}$/);
  });
});

test('the monthly series has one row per month in range', async () => {
  const result = await resultPromise;
  const summary = summarizePeriod(result, DATE_RANGE_SHORTCUTS.overlap(recordWindow), DEFAULT_BASELINE_SETTINGS);
  const lines = buildMonthlySeriesCsv(result, summary).split('\n');
  assert.equal(lines.length - 1, recordWindow.lastMonthIndex - summary.range.firstMonthIndex + 1);
  assert.ok(lines[0].includes('baseline_median_harmonized'));
  assert.ok(lines[1].includes('observed_viirs_n20'));
});

test('file names carry the area, the range and the demo tag', async () => {
  const result = await resultPromise;
  assert.equal(exportFileName('hotspots', result, DATE_RANGE_SHORTCUTS.fullRecord(recordWindow)), 'emberspotter_DEMO_hotspots_veracruz-mexico_200101-202611.csv');
});
