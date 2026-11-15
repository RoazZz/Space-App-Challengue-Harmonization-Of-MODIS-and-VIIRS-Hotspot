import { valueNoise } from './value-noise.js';

const HALF_YEAR_MONTHS = 6;
const MONTHS_PER_YEAR = 12;
const SEASON_WIDTH_MONTHS = 1.6;
const OFF_SEASON_FLOOR = 0.03;
const FIRE_LATITUDE_RANGE = Object.freeze({ south: -56, north: 72 });
const BASE_DENSITY_PER_SQUARE_KM = 0.006;
const CLUSTER_SCALE_DEGREES = 3;
const CLUSTER_GAIN = 3;
const PEAK_JITTER_MONTHS = 1.5;
const DRY_SEASON_PEAK_MONTH = 3.2;
const SUMMER_PEAK_MONTH = 7;
const SEASON_TRANSITION_LATITUDES = Object.freeze({ start: 30, end: 42 });
const WETNESS = Object.freeze({ dry: 0.12, wet: 0.45, onsetMonths: 2.5, widthMonths: 2 });

export function activityDensity(latitude, longitude, stratum, seed) {
  if (latitude < FIRE_LATITUDE_RANGE.south || latitude > FIRE_LATITUDE_RANGE.north) {
    return 0;
  }
  const cluster = valueNoise(latitude, longitude, CLUSTER_SCALE_DEGREES, seed + 3);
  return BASE_DENSITY_PER_SQUARE_KM * stratum.activity * CLUSTER_GAIN * cluster ** 3;
}

export function seasonPeakMonth(latitude, longitude, seed) {
  const transition = smoothStep((Math.abs(latitude) - SEASON_TRANSITION_LATITUDES.start) / (SEASON_TRANSITION_LATITUDES.end - SEASON_TRANSITION_LATITUDES.start));
  const northernPeak = DRY_SEASON_PEAK_MONTH + (SUMMER_PEAK_MONTH - DRY_SEASON_PEAK_MONTH) * transition;
  const hemispherePeak = latitude >= 0 ? northernPeak : northernPeak + HALF_YEAR_MONTHS;
  const jitter = (valueNoise(latitude, longitude, CLUSTER_SCALE_DEGREES, seed + 4) - 0.5) * 2 * PEAK_JITTER_MONTHS;
  return (hemispherePeak + jitter + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
}

export function seasonalWeight(peakMonth, monthOfYear) {
  const distance = circularMonthDistance(peakMonth, monthOfYear);
  return Math.exp(-0.5 * (distance / SEASON_WIDTH_MONTHS) ** 2) + OFF_SEASON_FLOOR;
}

export function circularMonthDistance(firstMonth, secondMonth) {
  const distance = Math.abs(firstMonth - secondMonth) % MONTHS_PER_YEAR;
  return Math.min(distance, MONTHS_PER_YEAR - distance);
}

export function seasonalObservationCoverage(peakMonth, monthOfYear) {
  const wetSeasonProgress = smoothStep((circularMonthDistance(peakMonth, monthOfYear) - WETNESS.onsetMonths) / WETNESS.widthMonths);
  return 1 - (WETNESS.dry + (WETNESS.wet - WETNESS.dry) * wetSeasonProgress);
}

function smoothStep(value) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}
