import { valueNoise } from './value-noise.js';

export const SYNTHETIC_STRATA = Object.freeze([
  Object.freeze({ id: 'tropical-moist-forest', name: 'Tropical moist forest', color: '#4a90c8', viirsDayRatio: 3.1, highConfidenceShare: 0.40, activity: 0.9 }),
  Object.freeze({ id: 'savanna-dry-forest', name: 'Savanna & tropical dry forest', color: '#d1a75a', viirsDayRatio: 2.9, highConfidenceShare: 0.36, activity: 2.2 }),
  Object.freeze({ id: 'grassland-shrubland', name: 'Grassland & shrubland', color: '#b98cc6', viirsDayRatio: 2.6, highConfidenceShare: 0.33, activity: 0.8 }),
  Object.freeze({ id: 'temperate-forest', name: 'Temperate forest', color: '#4db38a', viirsDayRatio: 2.4, highConfidenceShare: 0.42, activity: 0.35 }),
  Object.freeze({ id: 'boreal-forest', name: 'Boreal forest', color: '#7fa37a', viirsDayRatio: 2.2, highConfidenceShare: 0.45, activity: 0.3 }),
  Object.freeze({ id: 'cropland', name: 'Cropland', color: '#d9d36c', viirsDayRatio: 3.7, highConfidenceShare: 0.26, activity: 1.2 }),
  Object.freeze({ id: 'desert-sparse', name: 'Desert & sparse vegetation', color: '#c9b49a', viirsDayRatio: 2.6, highConfidenceShare: 0.33, activity: 0.03 }),
]);

const STRATUM = Object.fromEntries(SYNTHETIC_STRATA.map((stratum) => [stratum.id, stratum]));
const NOISE_SCALE_DEGREES = 4;
const CROPLAND_THRESHOLD = 0.7;
const LATITUDE_BANDS = Object.freeze([
  { maxLatitude: 8, stratumId: 'tropical-moist-forest' },
  { maxLatitude: 22, stratumId: 'savanna-dry-forest' },
  { maxLatitude: 35, stratumId: 'grassland-shrubland' },
  { maxLatitude: 52, stratumId: 'temperate-forest' },
  { maxLatitude: 90, stratumId: 'boreal-forest' },
]);
const BAND_JITTER_DEGREES = 6;
const DRYLAND_LATITUDES = Object.freeze({ min: 15, max: 35 });
const ARIDITY_SCALE_DEGREES = 6;
const ARIDITY_THRESHOLD = 0.5;

export function stratumAt(latitude, longitude, seed) {
  if (isArid(latitude, longitude, seed)) {
    return STRATUM['desert-sparse'];
  }
  if (Math.abs(latitude) < 55 && valueNoise(latitude, longitude, NOISE_SCALE_DEGREES, seed + 1) > CROPLAND_THRESHOLD) {
    return STRATUM.cropland;
  }
  const jitter = (valueNoise(latitude, longitude, NOISE_SCALE_DEGREES, seed + 2) - 0.5) * 2 * BAND_JITTER_DEGREES;
  const effectiveLatitude = Math.abs(latitude) + jitter;
  return STRATUM[LATITUDE_BANDS.find(({ maxLatitude }) => effectiveLatitude < maxLatitude).stratumId];
}

function isArid(latitude, longitude, seed) {
  const absoluteLatitude = Math.abs(latitude);
  return absoluteLatitude >= DRYLAND_LATITUDES.min && absoluteLatitude <= DRYLAND_LATITUDES.max
    && valueNoise(latitude, longitude, ARIDITY_SCALE_DEGREES, seed + 5) > ARIDITY_THRESHOLD;
}
