import { hashIntegers } from './seeded-random.js';

const UINT32_RANGE = 4294967296;

export function valueNoise(latitude, longitude, scaleDegrees, seed) {
  const columnsAroundGlobe = Math.round(360 / scaleDegrees);
  const row = (latitude + 90) / scaleDegrees;
  const column = (longitude + 180) / scaleDegrees;
  const baseRow = Math.floor(row);
  const baseColumn = Math.floor(column);
  const latticeValue = (rowOffset, columnOffset) => {
    const wrappedColumn = (((baseColumn + columnOffset) % columnsAroundGlobe) + columnsAroundGlobe) % columnsAroundGlobe;
    return hashIntegers(seed, baseRow + rowOffset, wrappedColumn) / UINT32_RANGE;
  };
  const rowWeight = smoothStep(row - baseRow);
  const columnWeight = smoothStep(column - baseColumn);
  const south = mix(latticeValue(0, 0), latticeValue(0, 1), columnWeight);
  const north = mix(latticeValue(1, 0), latticeValue(1, 1), columnWeight);
  return mix(south, north, rowWeight);
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function mix(from, to, weight) {
  return from + (to - from) * weight;
}
