import { cellCoverageFractions } from '../../geo/cell-coverage.js';
import { cellsOfTile, GRID_LEVEL, TILE_DEGREES } from '../../geo/global-grid.js';
import { MONTHS_PER_YEAR } from '../../time/month-index.js';
import { activityDensity, circularMonthDistance, seasonPeakMonth } from './fire-activity-model.js';
import { createRandom, approximateGaussian, hashIntegers } from './seeded-random.js';
import { createCountArrays, writeCellCounts } from './simulated-cell-counts.js';
import { stratumAt, SYNTHETIC_STRATA } from './synthetic-strata.js';

const DEFAULT_SEED = 20261114;
const COARSE_SAMPLES_PER_SIDE = 5;
const WET_SEASON_DISTANCE_MONTHS = 4;
const LEVEL_CODES = Object.freeze({ [GRID_LEVEL.FINE.name]: 1, [GRID_LEVEL.COARSE.name]: 2 });

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function createSimulatedFireDataSource({ landArea, recordWindow, seed = DEFAULT_SEED }) {
  const yearCount = Math.ceil(recordWindow.monthCount / MONTHS_PER_YEAR);
  const globalYearFactors = createGlobalYearFactors(createRandom(seed), yearCount);
  const tileCache = new Map();

  function loadTileCounts(tile) {
    if (!tileCache.has(tile.id)) {
      tileCache.set(tile.id, Promise.resolve(buildTileCounts(tile)));
    }
    return tileCache.get(tile.id);
  }

  function buildTileCounts(tile) {
    const cells = landCellsOf(tile, landArea).map((cell) => describeCell(cell, tile.level, seed));
    const observationCoverage = tileObservationCoverage(tile, recordWindow.monthCount, seed);
    const context = {
      monthCount: recordWindow.monthCount,
      lastMonthFraction: recordWindow.lastMonthFraction,
      yearFactors: regionalYearFactors(tile, globalYearFactors, seed),
      observationCoverage,
    };
    const counts = createCountArrays(cells.length * recordWindow.monthCount);
    cells.forEach((cell, index) => {
      const random = createRandom(hashIntegers(seed, LEVEL_CODES[tile.level.name], cell.south * 100, cell.west * 100));
      writeCellCounts(counts, index * recordWindow.monthCount, cell, context, random);
    });
    return Object.freeze({ tileId: tile.id, monthCount: recordWindow.monthCount, cells: cells.map(toPublicCell), counts, observationCoverage });
  }

  return { recordWindow, strata: SYNTHETIC_STRATA, loadTileCounts };
}

function landCellsOf(tile, landArea) {
  const cells = cellsOfTile(tile);
  const landFractions = cellCoverageFractions(cells, landArea);
  return cells
    .map((cell, index) => ({ ...cell, landFraction: landFractions[index] }))
    .filter(({ landFraction }) => landFraction > 0);
}

function describeCell(cell, level, seed) {
  const stratum = stratumAt(cell.centerLatitude, cell.centerLongitude, seed);
  return {
    ...cell,
    stratum,
    peakMonth: seasonPeakMonth(cell.centerLatitude, cell.centerLongitude, seed),
    expectedPeakDetections: meanDensity(cell, level, seed) * cell.areaSquareKm * cell.landFraction,
  };
}

function meanDensity(cell, level, seed) {
  if (level === GRID_LEVEL.FINE) {
    return activityDensity(cell.centerLatitude, cell.centerLongitude, stratumAt(cell.centerLatitude, cell.centerLongitude, seed), seed);
  }
  const step = cell.sizeDegrees / COARSE_SAMPLES_PER_SIDE;
  let total = 0;
  for (let row = 0; row < COARSE_SAMPLES_PER_SIDE; row += 1) {
    for (let column = 0; column < COARSE_SAMPLES_PER_SIDE; column += 1) {
      const latitude = cell.south + (row + 0.5) * step;
      const longitude = cell.west + (column + 0.5) * step;
      total += activityDensity(latitude, longitude, stratumAt(latitude, longitude, seed), seed);
    }
  }
  return total / COARSE_SAMPLES_PER_SIDE ** 2;
}

function toPublicCell({ id, south, west, sizeDegrees, centerLatitude, centerLongitude, areaSquareKm, landFraction, stratum }) {
  return Object.freeze({ id, south, west, sizeDegrees, centerLatitude, centerLongitude, areaSquareKm, landFraction, stratumId: stratum.id });
}

function createGlobalYearFactors(random, yearCount) {
  return Float64Array.from({ length: yearCount }, (_, year) => Math.exp(0.3 * approximateGaussian(random)) * (0.92 + 0.006 * year));
}

function regionalYearFactors(tile, globalYearFactors, seed) {
  const random = createRandom(hashIntegers(seed, tile.row, tile.column, 99));
  return globalYearFactors.map((factor) => factor * Math.exp(0.22 * approximateGaussian(random)));
}

function tileObservationCoverage(tile, monthCount, seed) {
  const centerLatitude = tile.south + TILE_DEGREES / 2;
  const peakMonth = seasonPeakMonth(centerLatitude, tile.west + TILE_DEGREES / 2, seed);
  const random = createRandom(hashIntegers(seed, tile.row, tile.column, 77));
  return Float32Array.from({ length: monthCount }, (_, month) => {
    const isWetSeason = circularMonthDistance(peakMonth, month % MONTHS_PER_YEAR) >= WET_SEASON_DISTANCE_MONTHS;
    const wetness = isWetSeason ? 0.45 : 0.12;
    return clamp(1 - wetness + 0.08 * approximateGaussian(random), 0.2, 1);
  });
}
