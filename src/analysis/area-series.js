export function aggregateUnitIntoArea(unit, coverageFractions, predictions, series) {
  const { tileCounts, cellIndexes, monthlyTotals } = unit;
  const { counts, monthCount, cells } = tileCounts;
  const coveredCells = cellIndexes.filter((cellIndex) => coverageFractions[cellIndex] > 0);
  if (coveredCells.length === 0) {
    return;
  }
  const landShare = coveredLandShare(cells, cellIndexes, coveredCells, coverageFractions);
  for (let month = 0; month < monthCount; month += 1) {
    let areaModis = 0;
    let areaViirs = 0;
    coveredCells.forEach((cellIndex) => {
      const index = cellIndex * monthCount + month;
      areaModis += coverageFractions[cellIndex] * (counts.modisDay[index] + counts.modisNight[index]);
      areaViirs += coverageFractions[cellIndex] * (counts.viirsDay[index] + counts.viirsNight[index]);
    });
    const unitModis = monthlyTotals[month].modisDay + monthlyTotals[month].modisNight;
    const share = unitModis > 0 ? areaModis / unitModis : landShare;
    series.modis[month] += areaModis;
    series.viirs[month] += areaViirs;
    series.estimated[month] += share * predictions[month];
  }
}

export function createEmptySeries(monthCount) {
  return { modis: new Float64Array(monthCount), viirs: new Float64Array(monthCount), estimated: new Float64Array(monthCount) };
}

function coveredLandShare(cells, cellIndexes, coveredCells, coverageFractions) {
  const landAreaOf = (cellIndex) => cells[cellIndex].areaSquareKm * cells[cellIndex].landFraction;
  const unitLand = cellIndexes.reduce((total, cellIndex) => total + landAreaOf(cellIndex), 0);
  const coveredLand = coveredCells.reduce((total, cellIndex) => total + coverageFractions[cellIndex] * landAreaOf(cellIndex), 0);
  return unitLand > 0 ? coveredLand / unitLand : 0;
}
