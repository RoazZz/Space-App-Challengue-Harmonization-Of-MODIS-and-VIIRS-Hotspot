import { SENSOR_MILESTONES } from '../sensor-catalog.js';
import { MONTHS_PER_YEAR, monthOfYearOf } from '../../time/month-index.js';
import { seasonalWeight } from './fire-activity-model.js';
import { approximateGaussian, poisson } from './seeded-random.js';

const TERRA_ONLY_FACTOR = 0.56;
const AQUA_OUTAGE_FACTOR = 0.78;
const VIIRS_NIGHT_RATIO = 9;
const MAX_STORED_COUNT = 65535;
const NEGLIGIBLE_EXPECTED_DETECTIONS = 0.002;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const COUNT_SERIES = Object.freeze(['modisDay', 'modisNight', 'modisHighConfidence', 'viirsDay', 'viirsNight']);

export function createCountArrays(length) {
  return Object.fromEntries(COUNT_SERIES.map((series) => [series, new Uint16Array(length)]));
}

export function writeCellCounts(counts, offset, cell, context, random) {
  for (let month = 0; month < context.monthCount; month += 1) {
    const season = seasonalWeight(cell.peakMonth, monthOfYearOf(month));
    const expected = monthlyExpectation(cell, context, month, season, random);
    if (expected < NEGLIGIBLE_EXPECTED_DETECTIONS) {
      continue;
    }
    const nightShare = clamp(0.07 + 0.05 * approximateGaussian(random) + 0.05 * season, 0.01, 0.3);
    const highConfidenceShare = clamp(cell.stratum.highConfidenceShare + 0.12 * season + 0.05 * approximateGaussian(random), 0.08, 0.85);
    const shares = { nightShare, highConfidenceShare, season };
    writeModisCounts(counts, offset + month, expected * modisSamplingFactor(month), shares, random);
    if (month >= SENSOR_MILESTONES.viirsNoaa20Start) {
      writeViirsCounts(counts, offset + month, expected, cell.stratum, shares, random);
    }
  }
}

function monthlyExpectation(cell, context, month, season, random) {
  const yearFactor = context.yearFactors[Math.floor(month / MONTHS_PER_YEAR)];
  const coverage = context.observationCoverage[month];
  const monthFraction = month === context.monthCount - 1 ? context.lastMonthFraction : 1;
  return cell.expectedPeakDetections * season * yearFactor * Math.exp(0.2 * approximateGaussian(random)) * (0.55 + 0.45 * coverage) * monthFraction;
}

function modisSamplingFactor(month) {
  const terraFactor = month < SENSOR_MILESTONES.aquaModisStart ? TERRA_ONLY_FACTOR : 1;
  const outageFactor = month === SENSOR_MILESTONES.aquaModisOutage ? AQUA_OUTAGE_FACTOR : 1;
  return terraFactor * outageFactor;
}

function writeModisCounts(counts, index, expected, { nightShare, highConfidenceShare }, random) {
  const day = poisson(random, expected * (1 - nightShare));
  const night = poisson(random, expected * nightShare);
  const total = day + night;
  const spread = Math.sqrt(total * highConfidenceShare * (1 - highConfidenceShare));
  counts.modisDay[index] = store(day);
  counts.modisNight[index] = store(night);
  counts.modisHighConfidence[index] = store(clamp(Math.round(total * highConfidenceShare + spread * approximateGaussian(random)), 0, total));
}

function writeViirsCounts(counts, index, expected, stratum, { nightShare, highConfidenceShare, season }, random) {
  const dayRatio = stratum.viirsDayRatio * Math.exp(-0.9 * (highConfidenceShare - 0.35)) * Math.exp(-0.25 * season);
  counts.viirsDay[index] = store(poisson(random, expected * (1 - nightShare) * dayRatio));
  counts.viirsNight[index] = store(poisson(random, expected * nightShare * VIIRS_NIGHT_RATIO));
}

function store(count) {
  return Math.min(MAX_STORED_COUNT, count);
}
