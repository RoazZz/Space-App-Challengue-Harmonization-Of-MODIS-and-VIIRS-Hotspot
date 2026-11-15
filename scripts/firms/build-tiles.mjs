import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { createPolygonArea } from '../../src/geo/area-of-interest.js';
import { cellCoverageFractions } from '../../src/geo/cell-coverage.js';
import { cellsOfTile, GRID_LEVEL, tilesCovering } from '../../src/geo/global-grid.js';
import { monthIndexOf } from '../../src/time/month-index.js';

const OUTPUT_ROOT = join('data', 'firms');
const POINT_MONTHS = 12;
const MODIS_HIGH_CONFIDENCE = 80;
const SERIES = Object.freeze({ modisDay: 0, modisNight: 1, modisHighConfidence: 2, viirsDay: 3, viirsNight: 4 });
const LEVELS = Object.freeze([GRID_LEVEL.FINE, GRID_LEVEL.COARSE]);

const [regionName, boundingBox] = process.argv.slice(2);
if (!regionName || !boundingBox) {
  console.error('Usage: node scripts/firms/build-tiles.mjs <region-name> <west,south,east,north>');
  process.exit(1);
}
const [west, south, east, north] = boundingBox.split(',').map(Number);
const bounds = { west, south, east, north };
const inputDirectory = join('scripts', 'firms', 'output', regionName);
if (!existsSync(inputDirectory)) {
  console.error(`No downloads found in ${inputDirectory}`);
  process.exit(1);
}
const landArea = createPolygonArea('Land', JSON.parse(readFileSync(join('data', 'land-mask.json'), 'utf8')).polygons);

const files = readdirSync(inputDirectory).filter((name) => name.endsWith('.csv'));
const lastDetectionDate = await findLastDate(files);
const lastMonthIndex = monthIndexFromDate(lastDetectionDate);
const firstPointMonth = lastMonthIndex - POINT_MONTHS + 1;
const levelGrids = LEVELS.map(createLevelGrid);
const pointsByTile = new Map();

for (const fileName of files) {
  await readDetections(join(inputDirectory, fileName), fileName.startsWith('modis') ? 'modis' : 'viirs');
}
writeOutputs();
console.log(`Tiles written for ${regionName} up to ${lastDetectionDate}`);

function createLevelGrid(level) {
  const tiles = tilesCovering(bounds, level).map((tile) => {
    const cells = cellsOfTile(tile).filter(({ centerLatitude, centerLongitude }) => isInsideBounds(centerLatitude, centerLongitude));
    const landFractions = cellCoverageFractions(cells, landArea);
    return { tile, cells: cells.map((cell, index) => ({ ...cell, landFraction: landFractions[index] })), counts: new Map() };
  });
  const cellLookup = new Map();
  tiles.forEach((tileGrid) => tileGrid.cells.forEach((cell, cellIndex) => cellLookup.set(cellKey(cell.south, cell.west), { tileGrid, cellIndex })));
  return { level, tiles, cellLookup };
}

async function readDetections(path, sensor) {
  let columns = null;
  for await (const line of createInterface({ input: createReadStream(path) })) {
    if (!columns) {
      columns = Object.fromEntries(line.split(',').map((name, index) => [name, index]));
      continue;
    }
    const values = line.split(',');
    const detection = toDetection(values, columns, sensor);
    if (isInsideBounds(detection.latitude, detection.longitude)) {
      levelGrids.forEach((grid) => countDetection(grid, detection));
      keepRecentPoint(detection);
    }
  }
}

function toDetection(values, columns, sensor) {
  const confidence = values[columns.confidence];
  return {
    sensor,
    latitude: Number(values[columns.latitude]),
    longitude: Number(values[columns.longitude]),
    acqDate: values[columns.acq_date],
    acqTime: values[columns.acq_time].padStart(4, '0'),
    satellite: values[columns.satellite],
    instrument: values[columns.instrument],
    confidence,
    frp: Number(values[columns.frp]),
    isNight: values[columns.daynight] === 'N',
    isHighConfidence: sensor === 'modis' ? Number(confidence) >= MODIS_HIGH_CONFIDENCE : confidence === 'h',
    monthIndex: monthIndexFromDate(values[columns.acq_date]),
  };
}

function countDetection({ level, cellLookup }, detection) {
  const size = level.cellDegrees;
  const entry = cellLookup.get(cellKey(Math.floor(detection.latitude / size) * size, Math.floor(detection.longitude / size) * size));
  if (!entry || detection.monthIndex < 0) {
    return;
  }
  const monthly = entry.tileGrid.counts.get(entry.cellIndex) ?? new Map();
  entry.tileGrid.counts.set(entry.cellIndex, monthly);
  const totals = monthly.get(detection.monthIndex) ?? [0, 0, 0, 0, 0];
  monthly.set(detection.monthIndex, totals);
  if (detection.sensor === 'modis') {
    totals[detection.isNight ? SERIES.modisNight : SERIES.modisDay] += 1;
    totals[SERIES.modisHighConfidence] += detection.isHighConfidence ? 1 : 0;
  } else {
    totals[detection.isNight ? SERIES.viirsNight : SERIES.viirsDay] += 1;
  }
}

function keepRecentPoint(detection) {
  if (detection.monthIndex < firstPointMonth) {
    return;
  }
  const key = tileLocationKey(detection.latitude, detection.longitude);
  if (!pointsByTile.has(key)) {
    pointsByTile.set(key, []);
  }
  pointsByTile.get(key).push([detection.latitude, detection.longitude, detection.acqDate, detection.acqTime, detection.satellite,
    detection.instrument, detection.confidence, detection.frp, detection.isNight ? 'N' : 'D']);
}

function writeOutputs() {
  rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  mkdirSync(join(OUTPUT_ROOT, 'tiles'), { recursive: true });
  mkdirSync(join(OUTPUT_ROOT, 'points'), { recursive: true });
  const tileIds = Object.fromEntries(levelGrids.map(({ level, tiles }) => [level.name, tiles.map(writeTile)]));
  pointsByTile.forEach((points, key) => writeFileSync(join(OUTPUT_ROOT, 'points', `${key}.json`), JSON.stringify(points)));
  writeFileSync(join(OUTPUT_ROOT, 'manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    lastDetectionDate,
    lastMonthIndex,
    firstPointMonthIndex: firstPointMonth,
    regions: [{ name: regionName, bounds }],
    tiles: tileIds,
    pointTiles: [...pointsByTile.keys()],
  }, null, 2));
}

function writeTile({ tile, cells, counts }) {
  const keptIndexes = cells.map((cell, index) => index).filter((index) => cells[index].landFraction > 0 || counts.has(index));
  const payload = {
    tileId: tile.id,
    cells: keptIndexes.map((index) => {
      const { south: cellSouth, west: cellWest, sizeDegrees, landFraction } = cells[index];
      return [cellSouth, cellWest, sizeDegrees, Math.max(landFraction, counts.has(index) ? 0.01 : 0)];
    }),
    counts: keptIndexes.flatMap((index, keptIndex) => [...(counts.get(index) ?? new Map())].map(([month, totals]) => [keptIndex, month, ...totals])),
  };
  writeFileSync(join(OUTPUT_ROOT, 'tiles', `${tileFileName(tile)}.json`), JSON.stringify(payload));
  return tile.id;
}

async function findLastDate(fileNames) {
  let lastDate = '';
  for (const fileName of fileNames) {
    let dateColumn = -1;
    for await (const line of createInterface({ input: createReadStream(join(inputDirectory, fileName)) })) {
      if (dateColumn < 0) {
        dateColumn = line.split(',').indexOf('acq_date');
        continue;
      }
      const date = line.split(',')[dateColumn];
      lastDate = date > lastDate ? date : lastDate;
    }
  }
  return lastDate;
}

function monthIndexFromDate(date) {
  return monthIndexOf(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1);
}

function isInsideBounds(latitude, longitude) {
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

function cellKey(cellSouth, cellWest) {
  return `${cellSouth.toFixed(4)}|${cellWest.toFixed(4)}`;
}

function tileLocationKey(latitude, longitude) {
  return `${Math.floor((latitude + 90) / 10)}-${Math.floor((longitude + 180) / 10)}`;
}

function tileFileName(tile) {
  return `${tile.level.name}-${tile.row}-${tile.column}`;
}
