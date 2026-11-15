import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCircleArea, createPolygonArea, createRectangleArea } from '../../src/geo/area-of-interest.js';
import { cellCoverageFractions } from '../../src/geo/cell-coverage.js';
import { cellsOfTile, GRID_LEVEL, gridLevelFor, tilesCovering } from '../../src/geo/global-grid.js';

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'));

function coveredAreaSquareKm(area) {
  const level = gridLevelFor(area);
  return tilesCovering(area.bounds, level).reduce((total, tile) => {
    const cells = cellsOfTile(tile);
    const fractions = cellCoverageFractions(cells, area);
    return total + cells.reduce((sum, cell, index) => sum + cell.areaSquareKm * fractions[index], 0);
  }, 0);
}

test('tiles across the antimeridian wrap to the first column', () => {
  const tiles = tilesCovering({ south: -20, north: -15, west: 175, east: 185 }, GRID_LEVEL.FINE);
  assert.deepEqual(tiles.map(({ column }) => column), [35, 0]);
});

test('a tile holds 1600 fine cells or 16 coarse cells whose areas add up', () => {
  const [fineTile] = tilesCovering({ south: 0, north: 5, west: 0, east: 5 }, GRID_LEVEL.FINE);
  const [coarseTile] = tilesCovering({ south: 0, north: 5, west: 0, east: 5 }, GRID_LEVEL.COARSE);
  const sum = (cells) => cells.reduce((total, { areaSquareKm }) => total + areaSquareKm, 0);
  assert.equal(cellsOfTile(fineTile).length, 1600);
  assert.equal(cellsOfTile(coarseTile).length, 16);
  assert.ok(Math.abs(sum(cellsOfTile(fineTile)) - sum(cellsOfTile(coarseTile))) < 1e-6);
});

test('large areas use the coarse level', () => {
  const brazil = readJson('data/countries/brazil.json');
  const mexico = readJson('data/countries/mexico.json');
  assert.equal(gridLevelFor(createPolygonArea(brazil.name, brazil.polygons)), GRID_LEVEL.COARSE);
  assert.equal(gridLevelFor(createPolygonArea(mexico.name, mexico.polygons)), GRID_LEVEL.FINE);
});

test('cell coverage reproduces the area of countries, rectangles and circles', () => {
  const mexico = readJson('data/countries/mexico.json');
  const fiji = readJson('data/countries/fiji.json');
  const areas = [
    createPolygonArea(mexico.name, mexico.polygons),
    createPolygonArea(fiji.name, fiji.polygons),
    createRectangleArea('Crossing box', { south: -20, north: -15, west: 175, east: 185 }),
    createCircleArea('Circle', { latitude: -33.86, longitude: 151.21 }, 300),
    createCircleArea('Crossing circle', { latitude: -17, longitude: 179.5 }, 250),
  ];
  for (const area of areas) {
    const relativeError = Math.abs(coveredAreaSquareKm(area) - area.areaSquareKm) / area.areaSquareKm;
    assert.ok(relativeError < 0.05, `${area.name}: ${relativeError}`);
  }
});
