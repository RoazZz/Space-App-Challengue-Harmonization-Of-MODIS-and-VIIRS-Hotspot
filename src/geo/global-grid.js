import { EARTH_RADIUS_KM } from './geodesic-area.js';

export const TILE_DEGREES = 10;
export const GRID_LEVEL = Object.freeze({
  FINE: Object.freeze({ name: 'fine', cellDegrees: 0.25 }),
  COARSE: Object.freeze({ name: 'coarse', cellDegrees: 2.5 }),
});

const FINE_LEVEL_MAX_AREA_KM2 = 2500000;
const TILE_COLUMNS = 360 / TILE_DEGREES;
const TILE_ROWS = 180 / TILE_DEGREES;
const EDGE_TOLERANCE_DEGREES = 1e-9;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function gridLevelFor(area) {
  return area.areaSquareKm <= FINE_LEVEL_MAX_AREA_KM2 ? GRID_LEVEL.FINE : GRID_LEVEL.COARSE;
}

export function tilesCovering(bounds, level) {
  const firstRow = tileRowAt(bounds.south);
  const lastRow = tileRowAt(bounds.north - EDGE_TOLERANCE_DEGREES);
  const columns = tileColumnsBetween(bounds.west, bounds.east);
  const tiles = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    columns.forEach((column) => tiles.push(createTile(level, row, column)));
  }
  return tiles;
}

export function cellsOfTile(tile) {
  const { cellDegrees } = tile.level;
  const cellsPerSide = Math.round(TILE_DEGREES / cellDegrees);
  const cells = [];
  for (let localRow = 0; localRow < cellsPerSide; localRow += 1) {
    for (let localColumn = 0; localColumn < cellsPerSide; localColumn += 1) {
      cells.push(createCell(tile, localRow, localColumn));
    }
  }
  return cells;
}

export function cellAreaSquareKm(south, cellDegrees) {
  const north = south + cellDegrees;
  return EARTH_RADIUS_KM ** 2 * toRadians(cellDegrees) * (Math.sin(toRadians(north)) - Math.sin(toRadians(south)));
}

function tileRowAt(latitude) {
  return Math.min(TILE_ROWS - 1, Math.max(0, Math.floor((latitude + 90) / TILE_DEGREES)));
}

function tileColumnsBetween(west, east) {
  const first = Math.floor((west + 180) / TILE_DEGREES);
  const last = Math.floor((east + 180 - EDGE_TOLERANCE_DEGREES) / TILE_DEGREES);
  const count = Math.min(TILE_COLUMNS, last - first + 1);
  return Array.from({ length: count }, (_, offset) => (((first + offset) % TILE_COLUMNS) + TILE_COLUMNS) % TILE_COLUMNS);
}

function createTile(level, row, column) {
  return Object.freeze({
    id: `${level.name}:${row}:${column}`,
    level,
    row,
    column,
    south: row * TILE_DEGREES - 90,
    west: column * TILE_DEGREES - 180,
  });
}

function createCell(tile, localRow, localColumn) {
  const { cellDegrees } = tile.level;
  const south = tile.south + localRow * cellDegrees;
  const west = tile.west + localColumn * cellDegrees;
  return Object.freeze({
    id: `${tile.level.name}:${south}:${west}`,
    south,
    west,
    centerLatitude: south + cellDegrees / 2,
    centerLongitude: west + cellDegrees / 2,
    sizeDegrees: cellDegrees,
    areaSquareKm: cellAreaSquareKm(south, cellDegrees),
  });
}
