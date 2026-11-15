import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFirmsTileDataSource } from '../../src/data/firms/firms-tile-data-source.js';
import { GRID_LEVEL, tilesCovering } from '../../src/geo/global-grid.js';
import { monthIndexOf } from '../../src/time/month-index.js';
import { createRecordWindow } from '../../src/time/record-window.js';

const recordWindow = createRecordWindow(new Date(Date.UTC(2026, 10, 15)));
const [tile] = tilesCovering({ south: 19, north: 19.1, west: -97, east: -96.9 }, GRID_LEVEL.FINE);
const month = monthIndexOf(2026, 3);
const manifest = {
  regions: [{ name: 'demo', bounds: { west: -118.6, south: 14.4, east: -86.6, north: 32.8 } }],
  tiles: { fine: [tile.id], coarse: [] },
  pointTiles: [`${tile.row}-${tile.column}`],
  firstPointMonthIndex: month,
};
const files = {
  [`data/firms/tiles/fine-${tile.row}-${tile.column}.json`]: { cells: [[19, -97, 0.25, 0.9]], counts: [[0, month, 4, 1, 2, 12, 6]] },
  [`data/firms/points/${tile.row}-${tile.column}.json`]: [[19.1, -96.9, '2026-04-03', '0412', 'N20', 'VIIRS', 'n', 3.2, 'N'], [25, -100, '2026-04-03', '0412', 'N20', 'VIIRS', 'n', 3.2, 'N']],
};
const source = createFirmsTileDataSource({ basePath: 'data/firms', manifest, recordWindow }, async (url) => files[url]);

test('published tiles expand into dense monthly counts with real cell areas', async () => {
  const tileCounts = await source.loadTileCounts(tile);
  const index = month;
  assert.equal(tileCounts.cells.length, 1);
  assert.equal(tileCounts.counts.modisDay[index], 4);
  assert.equal(tileCounts.counts.viirsNight[index], 6);
  assert.ok(tileCounts.cells[0].areaSquareKm > 700 && tileCounts.cells[0].areaSquareKm < 760);
  assert.equal(source.isDemoData, false);
});

test('unpublished tiles are empty and coverage follows the downloaded regions', async () => {
  const [otherTile] = tilesCovering({ south: -20, north: -19.9, west: 130, east: 130.1 }, GRID_LEVEL.FINE);
  assert.equal((await source.loadTileCounts(otherTile)).cells.length, 0);
  assert.equal(source.covers({ south: 15, north: 30, west: -110, east: -90 }), true);
  assert.equal(source.covers({ south: -30, north: -10, west: 120, east: 150 }), false);
});

test('hotspots are listed only for their cell and month', async () => {
  await source.loadTileCounts(tile);
  const detections = await source.listDetections(tile.id, 0, month);
  assert.equal(detections.length, 1);
  assert.equal(detections[0].acq_time, '0412');
  assert.deepEqual(await source.listDetections(tile.id, 0, month - 1), []);
});
