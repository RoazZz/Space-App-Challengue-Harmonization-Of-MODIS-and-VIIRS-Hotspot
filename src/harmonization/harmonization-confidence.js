import { median, standardDeviation } from '../analysis/statistics.js';
import { TEST_WINDOW_START } from './harmonization-windows.js';

export const CONFIDENCE = Object.freeze({ HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low', NONE: 'None' });

const MIN_UNCERTAINTY = 0.05;
const RULES = Object.freeze([
  { level: CONFIDENCE.HIGH, maxTypicalLogError: 0.22, minOverlapDetections: 3000 },
  { level: CONFIDENCE.MODERATE, maxTypicalLogError: 0.45, minOverlapDetections: 400 },
]);

export function assessHarmonization(overlapMonths) {
  const logErrors = overlapMonths
    .filter(({ observed, estimated }) => observed + estimated > 0)
    .map(({ monthIndex, observed, estimated }) => ({ monthIndex, error: Math.log1p(observed) - Math.log1p(estimated) }));
  const testErrors = logErrors.filter(({ monthIndex }) => monthIndex >= TEST_WINDOW_START).map(({ error }) => Math.abs(error));
  const typicalLogError = median(testErrors);
  const overlapDetections = overlapMonths.reduce((total, { observed }) => total + observed, 0);
  return Object.freeze({
    level: confidenceLevel(typicalLogError, overlapDetections),
    typicalErrorPercent: Number.isFinite(typicalLogError) ? (Math.exp(typicalLogError) - 1) * 100 : Number.NaN,
    overlapDetections,
    logUncertainty: uncertaintyOf(logErrors.map(({ error }) => error)),
  });
}

function uncertaintyOf(errors) {
  const spread = standardDeviation(errors);
  return Number.isFinite(spread) ? Math.max(MIN_UNCERTAINTY, spread) : 1;
}

function confidenceLevel(typicalLogError, overlapDetections) {
  if (overlapDetections < 1) {
    return CONFIDENCE.NONE;
  }
  const rule = RULES.find(({ maxTypicalLogError, minOverlapDetections }) =>
    typicalLogError < maxTypicalLogError && overlapDetections >= minOverlapDetections);
  return rule ? rule.level : CONFIDENCE.LOW;
}
