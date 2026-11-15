import { normalizeLongitude } from '../geo/longitude.js';
import { formatCoordinate } from './number-format.js';

export function trackCursorCoordinates(map, element) {
  map.on('mousemove', ({ latlng }) => {
    const latitude = formatCoordinate(latlng.lat);
    const longitude = formatCoordinate(normalizeLongitude(latlng.lng));
    element.textContent = `Lat ${latitude}°  ·  Lon ${longitude}°`;
  });
}
