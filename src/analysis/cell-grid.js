import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';

const SQUARE_KM_PER_DENSITY_UNIT = 100;

export function createCellGrid(units, predictionsByUnit, coverageByTile) {
  const coveredCells = units.flatMap((unit, unitIndex) => {
    const fractions = coverageByTile.get(unit.tileCounts.tileId);
    return unit.cellIndexes
      .filter((cellIndex) => fractions[cellIndex] > 0)
      .map((cellIndex) => ({ unit, unitIndex, cellIndex, cell: unit.tileCounts.cells[cellIndex] }));
  });

  function cellsForMonth(monthIndex) {
    return coveredCells.map(({ unit, unitIndex, cellIndex, cell }) => {
      const { counts, monthCount } = unit.tileCounts;
      const index = cellIndex * monthCount + monthIndex;
      const modis = counts.modisDay[index] + counts.modisNight[index];
      const value = monthIndex >= SENSOR_MILESTONES.viirsNoaa20Start
        ? counts.viirsDay[index] + counts.viirsNight[index]
        : modis * modisToHarmonizedRatio(unit, predictionsByUnit[unitIndex], monthIndex);
      return { cell, modis, value, density: (value / cell.areaSquareKm) * SQUARE_KM_PER_DENSITY_UNIT };
    });
  }

  return {
    cellsForMonth,
    coveredCells: coveredCells.map(({ cell }) => cell),
    coveredCellReferences: coveredCells.map(({ unit, cellIndex }) => ({ tileId: unit.tileCounts.tileId, cellIndex })),
  };
}

function modisToHarmonizedRatio(unit, predictions, monthIndex) {
  const totals = unit.monthlyTotals[monthIndex];
  const unitModis = totals.modisDay + totals.modisNight;
  return unitModis > 0 ? predictions[monthIndex] / unitModis : 0;
}
