import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { contains } from '../time/date-range.js';
import { MONTHS_PER_YEAR, monthIndexOf } from '../time/month-index.js';
import { isComparableMonth, monthlyBaseline } from './baseline.js';
import { assessYears, criticalSeason, seasonalProfile } from './critical-periods.js';
import { compareLastCompleteMonth, compareYearToDate } from './period-comparison.js';
import { sum } from './statistics.js';

export function summarizePeriod(result, range, baselineSettings) {
  const { harmonized: series, recordWindow } = result;
  const baseline = monthlyBaseline(series, recordWindow, baselineSettings);
  const profile = seasonalProfile(series, recordWindow, baseline);
  const yearAssessment = assessYears(series, recordWindow, baseline);
  const monthsInRange = monthIndexesOf(range).filter((monthIndex) => Number.isFinite(series[monthIndex]));
  return Object.freeze({
    range,
    baseline,
    profile,
    season: criticalSeason(profile),
    yearAssessment,
    criticalYears: [...yearAssessment.years.values()]
      .filter(({ year, isCritical }) => isCritical && yearOverlapsRange(year, range))
      .map(({ year }) => year),
    total: sum(monthsInRange.map((monthIndex) => series[monthIndex])),
    includesEstimates: range.firstMonthIndex < SENSOR_MILESTONES.viirsNoaa20Start,
    yearToDate: compareYearToDate(series, recordWindow, range, baseline, baselineSettings),
    lastCompleteMonth: compareLastCompleteMonth(series, recordWindow, range, baseline),
    isComparable: (monthIndex) => isComparableMonth(series, recordWindow, monthIndex),
  });
}

function monthIndexesOf(range) {
  return Array.from({ length: range.lastMonthIndex - range.firstMonthIndex + 1 }, (_, offset) => range.firstMonthIndex + offset);
}

function yearOverlapsRange(year, range) {
  return contains(range, monthIndexOf(year, 0)) || contains(range, monthIndexOf(year, MONTHS_PER_YEAR - 1))
    || (monthIndexOf(year, 0) < range.firstMonthIndex && monthIndexOf(year, MONTHS_PER_YEAR - 1) > range.lastMonthIndex);
}
