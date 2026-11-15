import { monthOfYearOf } from '../time/month-index.js';

export function groupIntoStratumUnits(tileCounts) {
  const units = new Map();
  tileCounts.cells.forEach((cell, cellIndex) => {
    const key = `${tileCounts.tileId}|${cell.stratumId}`;
    if (!units.has(key)) {
      units.set(key, { key, stratumId: cell.stratumId, tileCounts, cellIndexes: [] });
    }
    units.get(key).cellIndexes.push(cellIndex);
  });
  return [...units.values()].map((unit) => ({ ...unit, monthlyTotals: sumMonthlyCounts(unit) }));
}

export function unitSamples(unit) {
  return unit.monthlyTotals.map((totals, monthIndex) => ({
    ...totals,
    monthIndex,
    monthOfYear: monthOfYearOf(monthIndex),
    stratumId: unit.stratumId,
  }));
}

function sumMonthlyCounts({ tileCounts, cellIndexes }) {
  const { counts, monthCount } = tileCounts;
  return Array.from({ length: monthCount }, (_, month) => {
    const totals = { modisDay: 0, modisNight: 0, modisHighConfidence: 0, viirs: 0 };
    cellIndexes.forEach((cellIndex) => {
      const index = cellIndex * monthCount + month;
      totals.modisDay += counts.modisDay[index];
      totals.modisNight += counts.modisNight[index];
      totals.modisHighConfidence += counts.modisHighConfidence[index];
      totals.viirs += counts.viirsDay[index] + counts.viirsNight[index];
    });
    return totals;
  });
}
