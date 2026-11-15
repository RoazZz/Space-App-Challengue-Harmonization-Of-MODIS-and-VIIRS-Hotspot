import { AREA_SHAPE } from '../geo/area-of-interest.js';
import { formatCoordinate, formatInteger } from './number-format.js';

export function createAreaSummary(element) {
  function show(area) {
    const title = document.createElement('strong');
    title.textContent = area.name;
    const details = document.createElement('span');
    details.className = 'area-summary-details';
    details.textContent = describe(area);
    element.replaceChildren(title, details);
  }

  return { show };
}

function describe(area) {
  const surface = `${formatInteger(area.areaSquareKm)} km²`;
  if (area.shape.type !== AREA_SHAPE.CIRCLE) {
    return surface;
  }
  const { center, radiusKm } = area.shape;
  return `${surface} · center ${formatCoordinate(center.latitude)}, ${formatCoordinate(center.longitude)} · radius ${radiusKm} km`;
}
