import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPolygonArea } from '../../src/geo/area-of-interest.js';
import { GRID_LEVEL, tilesCovering } from '../../src/geo/global-grid.js';
import { createSimulatedFireDataSource } from '../../src/data/simulated/simulated-fire-data-source.js';
import { SENSOR_MILESTONES } from '../../src/data/sensor-catalog.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const landMask = JSON.parse(readFileSync(new URL('../../data/land-mask.json', import.meta.url), 'utf8'));
const landArea = createPolygonArea('Land', landMask.polygons);
const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const createSource = () => createSimulatedFireDataSource({ landArea, recordWindow });
const tileAt = (latitude, longitude, level = GRID_LEVEL.FINE) =>
  tilesCovering({ south: latitude, north: latitude + 0.1, west: longitude, east: longitude + 0.1 }, level)[0];
const sum = (values) => values.reduce((total, value) => total + value, 0);

test('the same seed produces the same counts', async () => {
  const tile = tileAt(17, -95);
  const first = await createSource().loadTileCounts(tile);
  const second = await createSource().loadTileCounts(tile);
  assert.deepEqual(first.counts.modisDay, second.counts.modisDay);
  assert.deepEqual(first.counts.viirsNight, second.counts.viirsNight);
});

test('open ocean tiles have no cells and land tiles have fires', async () => {
  const source = createSource();
  assert.equal((await source.loadTileCounts(tileAt(-35, -140))).cells.length, 0);
  for (const [latitude, longitude] of [[-15, 130], [-10, -55], [10, 20], [60, 100]]) {
    const tile = await source.loadTileCounts(tileAt(latitude, longitude));
    assert.ok(tile.cells.length > 0 && sum(tile.counts.modisDay) > 0, `${latitude}, ${longitude}`);
  }
});

test('counts follow the shape of the contract', async () => {
  const tile = await createSource().loadTileCounts(tileAt(17, -95));
  const expectedLength = tile.cells.length * recordWindow.monthCount;
  for (const series of Object.values(tile.counts)) {
    assert.equal(series.length, expectedLength);
  }
  assert.equal(tile.observationCoverage.length, recordWindow.monthCount);
  const [cell] = tile.cells;
  assert.ok(cell.id && cell.stratumId && cell.landFraction > 0 && cell.areaSquareKm > 0);
});

test('VIIRS starts in April 2018 and records more detections than MODIS', async () => {
  const tile = await createSource().loadTileCounts(tileAt(-15, 130));
  const monthCount = recordWindow.monthCount;
  let viirsBefore = 0;
  let modisOverlap = 0;
  let viirsOverlap = 0;
  tile.cells.forEach((_, cellIndex) => {
    for (let month = 0; month < monthCount; month += 1) {
      const index = cellIndex * monthCount + month;
      const viirs = tile.counts.viirsDay[index] + tile.counts.viirsNight[index];
      if (month < SENSOR_MILESTONES.viirsNoaa20Start) {
        viirsBefore += viirs;
      } else {
        viirsOverlap += viirs;
        modisOverlap += tile.counts.modisDay[index] + tile.counts.modisNight[index];
      }
    }
  });
  assert.equal(viirsBefore, 0);
  assert.ok(viirsOverlap > 2 * modisOverlap);
});

test('a fine tile is generated quickly', async () => {
  const start = performance.now();
  await createSource().loadTileCounts(tileAt(17, -95));
  assert.ok(performance.now() - start < 1500);
});
