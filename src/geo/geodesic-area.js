import { normalizeLongitude, unwrapRing } from './longitude.js';

export const EARTH_RADIUS_KM = 6371.0088;
const HALF_TURN_DEGREES = 180;
const POLE_LATITUDE = 90;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function ringAreaSquareKm(ring) {
  const openRing = closeAroundPole(unwrapRing(withoutClosingPosition(ring)));
  const count = openRing.length;
  if (count < 3) {
    return 0;
  }
  let sum = 0;
  for (let index = 0; index < count; index += 1) {
    const [previousLongitude] = openRing[(index + count - 1) % count];
    const [, latitude] = openRing[index];
    const [nextLongitude] = openRing[(index + 1) % count];
    sum += toRadians(nextLongitude - previousLongitude) * Math.sin(toRadians(latitude));
  }
  return Math.abs((sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

export function polygonAreaSquareKm([outerRing, ...holes]) {
  const holesArea = holes.reduce((total, hole) => total + ringAreaSquareKm(hole), 0);
  return Math.abs(ringAreaSquareKm(outerRing) - holesArea);
}

export function sphericalCapAreaSquareKm(radiusKm) {
  const angularRadius = radiusKm / EARTH_RADIUS_KM;
  return 2 * Math.PI * EARTH_RADIUS_KM * EARTH_RADIUS_KM * (1 - Math.cos(angularRadius));
}

function closeAroundPole(ring) {
  const [firstLongitude, firstLatitude] = ring[0];
  const [lastLongitude] = ring[ring.length - 1];
  const winding = lastLongitude + normalizeLongitude(firstLongitude - lastLongitude) - firstLongitude;
  if (Math.abs(winding) < HALF_TURN_DEGREES) {
    return ring;
  }
  const poleLatitude = averageLatitude(ring) < 0 ? -POLE_LATITUDE : POLE_LATITUDE;
  const closingLongitude = firstLongitude + winding;
  return [...ring, [closingLongitude, firstLatitude], [closingLongitude, poleLatitude], [firstLongitude, poleLatitude]];
}

function averageLatitude(ring) {
  return ring.reduce((total, [, latitude]) => total + latitude, 0) / ring.length;
}

function withoutClosingPosition(ring) {
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = ring.length > 1 && first[0] === last[0] && first[1] === last[1];
  return isClosed ? ring.slice(0, -1) : ring;
}
