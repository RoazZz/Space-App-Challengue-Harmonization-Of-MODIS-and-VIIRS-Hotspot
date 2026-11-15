import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { cellCoverageFractions } from '../geo/cell-coverage.js';
import { gridLevelFor, tilesCovering } from '../geo/global-grid.js';
import { assessHarmonization } from '../harmonization/harmonization-confidence.js';
import { createFeatureEncoder } from '../harmonization/harmonization-features.js';
import { trainHarmonizationModel } from '../harmonization/harmonization-model.js';
import { aggregateUnitIntoArea, createEmptySeries } from './area-series.js';
import { groupIntoStratumUnits, unitSamples } from './stratum-units.js';

export function createAreaAnalyzer(dataSource) {
  const encodeFeatures = createFeatureEncoder(dataSource.strata);
  const { recordWindow } = dataSource;

  async function analyze(area) {
    const level = gridLevelFor(area);
    const tileCountsList = await Promise.all(tilesCovering(area.bounds, level).map(dataSource.loadTileCounts));
    const units = tileCountsList.flatMap(groupIntoStratumUnits);
    const samplesByUnit = units.map(unitSamples);
    const model = trainHarmonizationModel(samplesByUnit.flat(), encodeFeatures);
    const series = createEmptySeries(recordWindow.monthCount);
    const coverageByTile = new Map(tileCountsList.map((tileCounts) => [tileCounts.tileId, cellCoverageFractions(tileCounts.cells, area)]));
    units.forEach((unit, index) => {
      const predictions = samplesByUnit[index].map(model.predict);
      aggregateUnitIntoArea(unit, coverageByTile.get(unit.tileCounts.tileId), predictions, series);
    });
    const observationCoverage = areaObservationCoverage(tileCountsList, coverageByTile, recordWindow.monthCount);
    return describeAreaSeries(area, level, series, observationCoverage);
  }

  function describeAreaSeries(area, level, { modis, viirs, estimated }, observationCoverage) {
    const lastCompleteMonth = recordWindow.lastMonthIndex - 1;
    const overlapMonths = [];
    for (let month = SENSOR_MILESTONES.viirsNoaa20Start; month <= lastCompleteMonth; month += 1) {
      overlapMonths.push({ monthIndex: month, observed: viirs[month], estimated: estimated[month] });
    }
    const harmonization = assessHarmonization(overlapMonths);
    return Object.freeze({
      area,
      gridLevel: level,
      recordWindow,
      modis,
      viirs,
      observationCoverage,
      harmonization,
      ...harmonizedSeries(viirs, estimated, harmonization.logUncertainty),
    });
  }

  return { analyze };
}

function areaObservationCoverage(tileCountsList, coverageByTile, monthCount) {
  const weighted = new Float64Array(monthCount);
  let totalWeight = 0;
  tileCountsList.forEach((tileCounts) => {
    const fractions = coverageByTile.get(tileCounts.tileId);
    const weight = tileCounts.cells.reduce((total, cell, index) => total + fractions[index] * cell.areaSquareKm * cell.landFraction, 0);
    totalWeight += weight;
    tileCounts.observationCoverage.forEach((coverage, month) => { weighted[month] += weight * coverage; });
  });
  return weighted.map((value) => (totalWeight > 0 ? value / totalWeight : 1));
}

function harmonizedSeries(viirs, estimated, logUncertainty) {
  const isEstimated = (month) => month < SENSOR_MILESTONES.viirsNoaa20Start;
  const harmonized = estimated.map((value, month) => (isEstimated(month) ? value : viirs[month]));
  const lower = harmonized.map((value, month) => (isEstimated(month) ? Math.max(0, Math.expm1(Math.log1p(value) - logUncertainty)) : value));
  const upper = harmonized.map((value, month) => (isEstimated(month) ? Math.expm1(Math.log1p(value) + logUncertainty) : value));
  return { harmonized, lower, upper };
}
