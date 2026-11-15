export const FULL_TURN_DEGREES = 360;
const HALF_TURN_DEGREES = 180;

export function normalizeLongitude(longitude) {
  if (longitude >= -HALF_TURN_DEGREES && longitude < HALF_TURN_DEGREES) {
    return longitude;
  }
  const shifted = (longitude + HALF_TURN_DEGREES) % FULL_TURN_DEGREES;
  return ((shifted + FULL_TURN_DEGREES) % FULL_TURN_DEGREES) - HALF_TURN_DEGREES;
}

export function shiftLongitudeIntoWindow(longitude, windowWest) {
  return windowWest + normalizeLongitude(longitude - windowWest - HALF_TURN_DEGREES) + HALF_TURN_DEGREES;
}

export function unwrapRing(ring) {
  const unwrapped = [ring[0]];
  for (let index = 1; index < ring.length; index += 1) {
    const [previousLongitude] = unwrapped[index - 1];
    const [longitude, latitude] = ring[index];
    unwrapped.push([previousLongitude + normalizeLongitude(longitude - previousLongitude), latitude]);
  }
  return unwrapped;
}

export function shiftRing(ring, longitudeOffset) {
  return ring.map(([longitude, latitude]) => [longitude + longitudeOffset, latitude]);
}
