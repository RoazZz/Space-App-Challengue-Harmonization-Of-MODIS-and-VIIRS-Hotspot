import { isInsideIntervals } from './interval-membership.js';

const DEFAULT_SAMPLES_PER_SIDE = 4;

export function cellCoverageFractions(cells, area, samplesPerSide = DEFAULT_SAMPLES_PER_SIDE) {
  const intervalsByLatitude = new Map();
  const intervalsAt = (latitude) => {
    if (!intervalsByLatitude.has(latitude)) {
      intervalsByLatitude.set(latitude, area.longitudeIntervalsAt(latitude));
    }
    return intervalsByLatitude.get(latitude);
  };
  return Float32Array.from(cells, (cell) => coverageOfCell(cell, intervalsAt, samplesPerSide));
}

function coverageOfCell({ south, west, sizeDegrees }, intervalsAt, samplesPerSide) {
  const step = sizeDegrees / samplesPerSide;
  let insideSamples = 0;
  for (let row = 0; row < samplesPerSide; row += 1) {
    const intervals = intervalsAt(south + (row + 0.5) * step);
    if (intervals.length === 0) {
      continue;
    }
    for (let column = 0; column < samplesPerSide; column += 1) {
      insideSamples += isInsideIntervals(west + (column + 0.5) * step, intervals) ? 1 : 0;
    }
  }
  return insideSamples / (samplesPerSide * samplesPerSide);
}
