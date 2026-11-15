import { createCircleArea } from '../geo/area-of-interest.js';
import { normalizeLongitude } from '../geo/longitude.js';
import { formatCoordinate } from './number-format.js';

const RADIUS_LIMITS_KM = Object.freeze({ min: 5, max: 600 });
const CIRCLE_AREA_NAME = 'Circle around a point';

export function createCircleForm({ latitudeInput, longitudeInput, radiusInput, applyButton, onAreaSelected, onInvalid }) {
  function apply() {
    const latitude = Number.parseFloat(latitudeInput.value);
    const longitude = Number.parseFloat(longitudeInput.value);
    if (!isValidCoordinate(latitude, longitude)) {
      onInvalid();
      return;
    }
    const radiusKm = clampRadius(Number.parseFloat(radiusInput.value));
    radiusInput.value = radiusKm;
    onAreaSelected(createCircleArea(CIRCLE_AREA_NAME, { latitude, longitude }, radiusKm));
  }

  function writeCenter({ latitude, longitude }) {
    latitudeInput.value = formatCoordinate(latitude);
    longitudeInput.value = formatCoordinate(normalizeLongitude(longitude));
  }

  function prefillCenter(center) {
    if (latitudeInput.value === '' || longitudeInput.value === '') {
      writeCenter(center);
    }
  }

  function pickCenter(center) {
    writeCenter(center);
    apply();
  }

  applyButton.addEventListener('click', apply);

  return { prefillCenter, pickCenter };
}

function isValidCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function clampRadius(radiusKm) {
  if (!Number.isFinite(radiusKm)) {
    return RADIUS_LIMITS_KM.min;
  }
  return Math.round(Math.min(RADIUS_LIMITS_KM.max, Math.max(RADIUS_LIMITS_KM.min, radiusKm)));
}
