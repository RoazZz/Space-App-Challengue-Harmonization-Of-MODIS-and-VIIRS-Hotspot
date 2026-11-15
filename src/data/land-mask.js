import { createPolygonArea } from '../geo/area-of-interest.js';

export async function loadLandArea(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request for ${path} failed with status ${response.status}`);
  }
  const { polygons } = await response.json();
  return createPolygonArea('Land', polygons);
}
