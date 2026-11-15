import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AREA_SHAPE, createCircleArea, createPolygonArea, createRectangleArea } from '../../src/geo/area-of-interest.js';

function loadCountry(countryId) {
  const url = new URL(`../../data/countries/${countryId}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

function relativeError(actual, expected) {
  return Math.abs(actual - expected) / expected;
}

test('a rectangle across the antimeridian keeps its true width and area', () => {
  const crossing = createRectangleArea('Fiji box', { south: -20, north: -15, west: 175, east: 185 });
  const regular = createRectangleArea('Same size box', { south: -20, north: -15, west: 10, east: 20 });
  assert.ok(relativeError(crossing.areaSquareKm, regular.areaSquareKm) < 1e-9);
  assert.equal(crossing.bounds.west, 175);
  assert.equal(crossing.bounds.east, 185);
});

test('rectangles drawn on another copy of the world are normalized', () => {
  const area = createRectangleArea('Copy', { south: 0, north: 1, west: 360, east: 361 });
  assert.equal(area.bounds.west, 0);
  assert.equal(area.bounds.east, 1);
});

test('country areas match their reference surface within the map generalization', () => {
  const references = { mexico: 1964375, australia: 7692024, canada: 9984670, brazil: 8515767 };
  for (const [countryId, referenceSquareKm] of Object.entries(references)) {
    const country = loadCountry(countryId);
    const area = createPolygonArea(country.name, country.polygons);
    assert.ok(relativeError(area.areaSquareKm, referenceSquareKm) < 0.03, `${countryId}: ${area.areaSquareKm}`);
  }
});

test('countries split by the antimeridian get narrow bounds and aligned parts', () => {
  for (const countryId of ['fiji', 'russian-federation']) {
    const country = loadCountry(countryId);
    const area = createPolygonArea(country.name, country.polygons);
    assert.ok(area.bounds.east - area.bounds.west < 200, countryId);
    for (const [outerRing] of area.shape.polygons) {
      for (const [longitude] of outerRing) {
        assert.ok(longitude >= area.bounds.west - 1e-9 && longitude <= area.bounds.east + 1e-9, countryId);
      }
    }
  }
});

test('a circle reports its cap area and wraps its center longitude', () => {
  const area = createCircleArea('Circle', { latitude: 19.53, longitude: 263.08 }, 75);
  assert.equal(area.shape.type, AREA_SHAPE.CIRCLE);
  assert.ok(Math.abs(area.shape.center.longitude - -96.92) < 1e-9);
  assert.ok(relativeError(area.areaSquareKm, Math.PI * 75 * 75) < 0.001);
});

test('a circle that reaches a pole spans every longitude', () => {
  const area = createCircleArea('Polar', { latitude: 89, longitude: 0 }, 300);
  assert.equal(area.bounds.north, 90);
  assert.equal(area.bounds.east - area.bounds.west, 360);
});
