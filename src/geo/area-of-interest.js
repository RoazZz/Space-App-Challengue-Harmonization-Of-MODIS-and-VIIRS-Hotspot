import { alignPolygons } from './aligned-polygons.js';
import { EARTH_RADIUS_KM, polygonAreaSquareKm, sphericalCapAreaSquareKm } from './geodesic-area.js';
import { normalizeLongitude } from './longitude.js';
import { WHOLE_WORLD_SPAN } from './longitude-span.js';

export const AREA_SHAPE = Object.freeze({ POLYGONS: 'polygons', CIRCLE: 'circle' });

const toDegrees = (radians) => (radians * 180) / Math.PI;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function createPolygonArea(name, polygons) {
  const { polygons: alignedPolygons, longitudeSpan } = alignPolygons(polygons);
  const latitudes = alignedPolygons.flatMap(([outerRing]) => outerRing.map(([, latitude]) => latitude));
  return Object.freeze({
    name,
    shape: { type: AREA_SHAPE.POLYGONS, polygons: alignedPolygons },
    areaSquareKm: alignedPolygons.reduce((total, polygon) => total + polygonAreaSquareKm(polygon), 0),
    bounds: { south: Math.min(...latitudes), north: Math.max(...latitudes), ...longitudeSpan },
  });
}

export function createRectangleArea(name, { south, north, west, east }) {
  const corners = [[west, south], [east, south], [east, north], [west, north]];
  return createPolygonArea(name, [[corners]]);
}

export function createCircleArea(name, { latitude, longitude }, radiusKm) {
  const center = { latitude, longitude: normalizeLongitude(longitude) };
  return Object.freeze({
    name,
    shape: { type: AREA_SHAPE.CIRCLE, center, radiusKm },
    areaSquareKm: sphericalCapAreaSquareKm(radiusKm),
    bounds: circleBounds(center, radiusKm),
  });
}

function circleBounds({ latitude, longitude }, radiusKm) {
  const angularRadius = radiusKm / EARTH_RADIUS_KM;
  const latitudeReach = toDegrees(angularRadius);
  const south = Math.max(-90, latitude - latitudeReach);
  const north = Math.min(90, latitude + latitudeReach);
  if (south === -90 || north === 90) {
    return { south, north, ...WHOLE_WORLD_SPAN };
  }
  const longitudeReach = toDegrees(Math.asin(Math.sin(angularRadius) / Math.cos(toRadians(latitude))));
  return { south, north, west: longitude - longitudeReach, east: longitude + longitudeReach };
}
