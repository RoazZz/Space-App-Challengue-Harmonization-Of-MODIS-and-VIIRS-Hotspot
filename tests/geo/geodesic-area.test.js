import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_RADIUS_KM, polygonAreaSquareKm, ringAreaSquareKm, sphericalCapAreaSquareKm } from '../../src/geo/geodesic-area.js';

const toRadians = (degrees) => (degrees * Math.PI) / 180;

function exactBoxAreaSquareKm(south, north, longitudeWidth) {
  return EARTH_RADIUS_KM ** 2 * toRadians(longitudeWidth) * (Math.sin(toRadians(north)) - Math.sin(toRadians(south)));
}

function boxRing(west, south, east, north) {
  return [[west, south], [east, south], [east, north], [west, north]];
}

test('a one-degree box at the equator matches the exact spherical area', () => {
  const area = ringAreaSquareKm(boxRing(0, 0, 1, 1));
  assert.ok(Math.abs(area - exactBoxAreaSquareKm(0, 1, 1)) < 0.01);
  assert.ok(Math.abs(area - 12363.7) < 1);
});

test('a one-degree box near 60 degrees is about half of the equatorial one', () => {
  const ratio = ringAreaSquareKm(boxRing(10, 60, 11, 61)) / ringAreaSquareKm(boxRing(10, 0, 11, 1));
  assert.ok(Math.abs(ratio - 0.4925) < 0.001);
});

test('southern hemisphere boxes have the same area as their northern mirror', () => {
  const north = ringAreaSquareKm(boxRing(130, 10, 140, 20));
  const south = ringAreaSquareKm(boxRing(130, -20, 140, -10));
  assert.ok(Math.abs(north - south) < 0.001);
});

test('ring area ignores the closing position and the winding direction', () => {
  const open = boxRing(0, 0, 2, 2);
  const closedReversed = [...open, open[0]].reverse();
  assert.ok(Math.abs(ringAreaSquareKm(open) - ringAreaSquareKm(closedReversed)) < 1e-6);
});

test('holes are subtracted from the outer ring', () => {
  const area = polygonAreaSquareKm([boxRing(0, 0, 4, 4), boxRing(1, 1, 2, 2)]);
  assert.ok(Math.abs(area - (ringAreaSquareKm(boxRing(0, 0, 4, 4)) - ringAreaSquareKm(boxRing(1, 1, 2, 2)))) < 1e-6);
});

test('a spherical cap of 100 km is close to the planar circle', () => {
  const area = sphericalCapAreaSquareKm(100);
  assert.ok(Math.abs(area - Math.PI * 100 * 100) / (Math.PI * 100 * 100) < 0.001);
});

test('a ring that circles a pole encloses the polar cap', () => {
  const ring = Array.from({ length: 36 }, (_, index) => [-180 + index * 10, -80]);
  const capArea = 2 * Math.PI * EARTH_RADIUS_KM ** 2 * (1 - Math.sin(toRadians(80)));
  assert.ok(Math.abs(ringAreaSquareKm(ring) - capArea) / capArea < 1e-9);
});
