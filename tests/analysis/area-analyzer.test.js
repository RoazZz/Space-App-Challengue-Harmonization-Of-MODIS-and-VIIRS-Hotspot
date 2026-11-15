import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAreaAnalyzer } from '../../src/analysis/area-analyzer.js';
import { createSimulatedFireDataSource } from '../../src/data/simulated/simulated-fire-data-source.js';
import { SENSOR_MILESTONES } from '../../src/data/sensor-catalog.js';
import { createCircleArea, createPolygonArea } from '../../src/geo/area-of-interest.js';
import { CONFIDENCE } from '../../src/harmonization/harmonization-confidence.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'));
const landArea = createPolygonArea('Land', readJson('data/land-mask.json').polygons);
const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const analyzer = createAreaAnalyzer(createSimulatedFireDataSource({ landArea, recordWindow }));
const countryArea = (countryId) => {
  const country = readJson(`data/countries/${countryId}.json`);
  return createPolygonArea(country.name, country.polygons);
};
const total = (series, first, last) => series.slice(first, last + 1).reduce((sum, value) => sum + value, 0);

test('a large region gets high confidence and a continuous series', async () => {
  const result = await analyzer.analyze(countryArea('mexico'));
  const start = SENSOR_MILESTONES.viirsNoaa20Start;
  assert.equal(result.harmonization.level, CONFIDENCE.HIGH);
  assert.equal(result.harmonized[start + 5], result.viirs[start + 5]);
  const before = total(result.harmonized, start - 24, start - 1) / 24;
  const after = total(result.harmonized, start, start + 23) / 24;
  const rawJump = total(result.viirs, start, start + 23) / total(result.modis, start - 24, start - 1);
  assert.ok(after / before < 1.6 && rawJump > 2, `${after / before} vs ${rawJump}`);
});

test('estimated months carry an uncertainty band and observed months do not', async () => {
  const result = await analyzer.analyze(countryArea('mexico'));
  const estimatedMonth = 100;
  const observedMonth = SENSOR_MILESTONES.viirsNoaa20Start + 10;
  assert.ok(result.lower[estimatedMonth] < result.harmonized[estimatedMonth] && result.upper[estimatedMonth] > result.harmonized[estimatedMonth]);
  assert.equal(result.lower[observedMonth], result.upper[observedMonth]);
});

test('a tiny area gets low confidence', async () => {
  const result = await analyzer.analyze(createCircleArea('Tiny', { latitude: 19.5, longitude: -96.9 }, 20));
  assert.ok([CONFIDENCE.LOW, CONFIDENCE.NONE].includes(result.harmonization.level));
});

test('a continental area is analysed on the coarse grid in reasonable time', async () => {
  const start = performance.now();
  const result = await analyzer.analyze(countryArea('brazil'));
  assert.equal(result.gridLevel.name, 'coarse');
  assert.ok(performance.now() - start < 2000);
});
