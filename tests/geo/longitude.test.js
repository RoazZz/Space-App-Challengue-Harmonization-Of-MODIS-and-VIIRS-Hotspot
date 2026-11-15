import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLongitude, shiftLongitudeIntoWindow, unwrapRing } from '../../src/geo/longitude.js';
import { coveringLongitudeSpan, WHOLE_WORLD_SPAN } from '../../src/geo/longitude-span.js';

test('longitudes are normalized to the range from -180 to 180', () => {
  assert.equal(normalizeLongitude(185), -175);
  assert.equal(normalizeLongitude(-190), 170);
  assert.equal(normalizeLongitude(180), -180);
  assert.equal(normalizeLongitude(-96.92), -96.92);
  assert.equal(normalizeLongitude(540), -180);
});

test('a longitude is shifted by whole turns into a window', () => {
  assert.equal(shiftLongitudeIntoWindow(-178, 175), 182);
  assert.equal(shiftLongitudeIntoWindow(176, 175), 176);
  assert.equal(shiftLongitudeIntoWindow(400, -180), 40);
});

test('a ring that crosses the antimeridian becomes continuous', () => {
  const ring = unwrapRing([[178, -16], [-179, -16], [-179, -18], [178, -18]]);
  assert.deepEqual(ring.map(([longitude]) => longitude), [178, 181, 181, 178]);
});

test('the covering span of parts on both sides of the antimeridian is narrow', () => {
  const span = coveringLongitudeSpan([{ west: 177, east: 180 }, { west: -180, east: -178 }]);
  assert.deepEqual(span, { west: 177, east: 182 });
});

test('the covering span of distant parts keeps the shortest side', () => {
  const span = coveringLongitudeSpan([{ west: -118, east: -86 }, { west: -112, east: -109 }]);
  assert.deepEqual(span, { west: -118, east: -86 });
});

test('parts spread around the globe cover the whole world', () => {
  const span = coveringLongitudeSpan([{ west: -180, east: -60 }, { west: -60, east: 60 }, { west: 60, east: 180 }]);
  assert.deepEqual(span, WHOLE_WORLD_SPAN);
});
