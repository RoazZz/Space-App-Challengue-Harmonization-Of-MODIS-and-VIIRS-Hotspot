import { FULL_TURN_DEGREES, shiftLongitudeIntoWindow, shiftRing, unwrapRing } from './longitude.js';
import { coveringLongitudeSpan, longitudeExtent } from './longitude-span.js';

const LONGITUDE_TOLERANCE_DEGREES = 1e-9;

export function alignPolygons(polygons) {
  const continuousPolygons = polygons.map(toContinuousPolygon);
  const extents = continuousPolygons.map(([outerRing]) => longitudeExtent(outerRing));
  const longitudeSpan = coveringLongitudeSpan(extents);
  const windowWest = longitudeSpan.west - LONGITUDE_TOLERANCE_DEGREES;
  const alignedPolygons = continuousPolygons.map((polygon, index) =>
    shiftPolygon(polygon, shiftLongitudeIntoWindow(extents[index].west, windowWest) - extents[index].west));
  return { polygons: alignedPolygons, longitudeSpan };
}

function toContinuousPolygon([outerRing, ...holes]) {
  const continuousOuter = unwrapRing(outerRing);
  const referenceLongitude = continuousOuter[0][0];
  return [continuousOuter, ...holes.map((hole) => alignRingTo(unwrapRing(hole), referenceLongitude))];
}

function alignRingTo(ring, referenceLongitude) {
  const turns = Math.round((referenceLongitude - ring[0][0]) / FULL_TURN_DEGREES);
  return shiftRing(ring, turns * FULL_TURN_DEGREES);
}

function shiftPolygon(polygon, longitudeOffset) {
  return polygon.map((ring) => shiftRing(ring, longitudeOffset));
}
