import { contains } from '../time/date-range.js';

export const LOW_COVERAGE_THRESHOLD = 0.6;

export function monthFlags(result, range, monthIndex) {
  return Object.freeze({
    isPartial: monthIndex === result.recordWindow.lastMonthIndex,
    hasNoData: !Number.isFinite(result.harmonized[monthIndex]),
    hasLowCoverage: result.observationCoverage[monthIndex] < LOW_COVERAGE_THRESHOLD,
    isOutOfRange: !contains(range, monthIndex),
  });
}
