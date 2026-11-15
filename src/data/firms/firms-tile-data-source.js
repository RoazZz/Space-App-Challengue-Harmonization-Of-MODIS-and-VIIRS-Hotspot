import { cellAreaSquareKm } from '../../geo/global-grid.js';
import { normalizeLongitude } from '../../geo/longitude.js';
import { yearOf, monthOfYearOf } from '../../time/month-index.js';

const ALL_LAND_STRATUM = Object.freeze({ id: 'all-land', name: 'All land (no biome strata)', color: '#7f8c99' });
const SERIES = Object.freeze(['modisDay', 'modisNight', 'modisHighConfidence', 'viirsDay', 'viirsNight']);
const MAX_STORED_COUNT = 65535;
const FULL_OBSERVATION_COVERAGE = 1;

export async function loadFirmsDataSource({ basePath, recordWindow }) {
  const response = await fetch(`${basePath}/manifest.json`);
  return response.ok ? createFirmsTileDataSource({ basePath, manifest: await response.json(), recordWindow }) : null;
}

export function createFirmsTileDataSource({ basePath, manifest, recordWindow }, fetchJson = fetchJsonOverHttp) {
  const tileCache = new Map();
  const pointCache = new Map();

  async function loadTileCounts(tile) {
    if (!tileCache.has(tile.id)) {
      tileCache.set(tile.id, buildTileCounts(tile));
    }
    return tileCache.get(tile.id);
  }

  async function buildTileCounts(tile) {
    const isPublished = (manifest.tiles[tile.level.name] ?? []).includes(tile.id);
    const payload = isPublished ? await fetchJson(`${basePath}/tiles/${tile.level.name}-${tile.row}-${tile.column}.json`) : { cells: [], counts: [] };
    return toTileCounts(tile, payload, recordWindow);
  }

  async function listDetections(tileId, cellIndex, monthIndex) {
    if (monthIndex < manifest.firstPointMonthIndex) {
      return [];
    }
    const tileCounts = await tileCache.get(tileId);
    const cell = tileCounts.cells[cellIndex];
    const points = await pointsNear(cell);
    const monthPrefix = `${yearOf(monthIndex)}-${String(monthOfYearOf(monthIndex) + 1).padStart(2, '0')}`;
    return points.filter((point) => point.acq_date.startsWith(monthPrefix) && isInsideCell(point, cell));
  }

  function pointsNear(cell) {
    const key = `${Math.floor((cell.centerLatitude + 90) / 10)}-${Math.floor((normalizeLongitude(cell.centerLongitude) + 180) / 10)}`;
    if (!manifest.pointTiles.includes(key)) {
      return Promise.resolve([]);
    }
    if (!pointCache.has(key)) {
      pointCache.set(key, fetchJson(`${basePath}/points/${key}.json`).then((rows) => rows.map(toDetection)));
    }
    return pointCache.get(key);
  }

  function covers(bounds) {
    return manifest.regions.some(({ bounds: region }) => bounds.south >= region.south && bounds.north <= region.north
      && normalizeLongitude(bounds.west) >= region.west && normalizeLongitude(bounds.west) + (bounds.east - bounds.west) <= region.east);
  }

  return { recordWindow, strata: [ALL_LAND_STRATUM], isDemoData: false, loadTileCounts, listDetections, covers };
}

function toTileCounts(tile, payload, recordWindow) {
  const { monthCount } = recordWindow;
  const cells = payload.cells.map(([south, west, sizeDegrees, landFraction]) => Object.freeze({
    id: `${tile.level.name}:${south}:${west}`,
    south,
    west,
    sizeDegrees,
    centerLatitude: south + sizeDegrees / 2,
    centerLongitude: west + sizeDegrees / 2,
    areaSquareKm: cellAreaSquareKm(south, sizeDegrees),
    landFraction,
    stratumId: ALL_LAND_STRATUM.id,
  }));
  const counts = Object.fromEntries(SERIES.map((series) => [series, new Uint16Array(cells.length * monthCount)]));
  payload.counts.forEach(([cellIndex, month, ...totals]) => {
    if (month < monthCount) {
      SERIES.forEach((series, seriesIndex) => { counts[series][cellIndex * monthCount + month] = Math.min(MAX_STORED_COUNT, totals[seriesIndex]); });
    }
  });
  return Object.freeze({
    tileId: tile.id,
    monthCount,
    cells,
    counts,
    observationCoverage: new Float32Array(monthCount).fill(FULL_OBSERVATION_COVERAGE),
  });
}

function toDetection([latitude, longitude, acqDate, acqTime, satellite, instrument, confidence, frp, daynight]) {
  return { latitude, longitude, acq_date: acqDate, acq_time: acqTime, satellite, instrument, confidence, frp, daynight };
}

function isInsideCell({ latitude, longitude }, cell) {
  const offset = normalizeLongitude(longitude - cell.west);
  return latitude >= cell.south && latitude < cell.south + cell.sizeDegrees && offset >= 0 && offset < cell.sizeDegrees;
}

async function fetchJsonOverHttp(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request for ${url} failed with status ${response.status}`);
  }
  return response.json();
}
