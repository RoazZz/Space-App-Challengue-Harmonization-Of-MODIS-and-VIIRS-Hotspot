import { MONTH_ABBREVIATIONS, MONTHS_PER_YEAR, monthIndexOf, yearOf, monthOfYearOf, RECORD_START_YEAR } from '../time/month-index.js';
import { isComparableMonth } from './baseline.js';
import { mean, median, quantile, sum } from './statistics.js';

export const CRITICAL_YEAR_PERCENTILE = 0.9;
export const CRITICAL_SEASON_SHARE = 0.75;
const WELL_ABOVE_NORMAL_RATIO = 2;

export function seasonalProfile(series, recordWindow, baseline) {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, monthOfYear) => {
    const values = baseline.years
      .map((year) => monthIndexOf(year, monthOfYear))
      .filter((monthIndex) => isComparableMonth(series, recordWindow, monthIndex))
      .map((monthIndex) => series[monthIndex]);
    return values.length ? mean(values) : 0;
  });
}

export function criticalSeason(profile) {
  const total = sum(profile);
  if (!(total > 0)) {
    return null;
  }
  for (let length = 1; length <= MONTHS_PER_YEAR; length += 1) {
    const best = bestBlockOfLength(profile, length, total);
    if (best) {
      return best;
    }
  }
  return null;
}

export function isInSeason(season, monthOfYear) {
  return Boolean(season) && (monthOfYear - season.startMonth + MONTHS_PER_YEAR) % MONTHS_PER_YEAR < season.length;
}

export function seasonLabel(season) {
  if (!season) {
    return '—';
  }
  const start = MONTH_ABBREVIATIONS[season.startMonth];
  const end = MONTH_ABBREVIATIONS[(season.startMonth + season.length - 1) % MONTHS_PER_YEAR];
  return season.length > 1 ? `${start}–${end}` : start;
}

export function assessYears(series, recordWindow, baseline) {
  const partialYear = yearOf(recordWindow.lastMonthIndex);
  const lastCompleteMonthOfPartialYear = monthOfYearOf(recordWindow.lastMonthIndex - 1);
  const referenceTotals = (lastMonthOfYear) => baseline.years
    .map((year) => yearTotal(series, recordWindow, year, lastMonthOfYear))
    .filter(Number.isFinite);
  const fullYearTotals = referenceTotals(MONTHS_PER_YEAR - 1);
  const yearToDateTotals = referenceTotals(lastCompleteMonthOfPartialYear);
  const references = {
    full: { threshold: quantile(fullYearTotals, CRITICAL_YEAR_PERCENTILE), median: median(fullYearTotals) },
    yearToDate: { threshold: quantile(yearToDateTotals, CRITICAL_YEAR_PERCENTILE), median: median(yearToDateTotals) },
  };
  const ranked = [...fullYearTotals].sort((first, second) => second - first);
  const years = new Map();
  for (let year = RECORD_START_YEAR; year <= partialYear; year += 1) {
    const isPartial = year === partialYear;
    const lastMonthOfYear = isPartial ? lastCompleteMonthOfPartialYear : MONTHS_PER_YEAR - 1;
    const reference = isPartial ? references.yearToDate : references.full;
    years.set(year, describeYear({ series, recordWindow, baseline, year, isPartial, lastMonthOfYear, reference, ranked }));
  }
  return Object.freeze({ years, fullYearThreshold: references.full.threshold, referenceCount: ranked.length });
}

function describeYear({ series, recordWindow, baseline, year, isPartial, lastMonthOfYear, reference, ranked }) {
  const total = yearTotal(series, recordWindow, year, lastMonthOfYear);
  const months = monthsOfYear(year, lastMonthOfYear).filter((monthIndex) => isComparableMonth(series, recordWindow, monthIndex));
  const peakMonth = months.reduce((peak, monthIndex) => (peak === null || series[monthIndex] > series[peak] ? monthIndex : peak), null);
  return Object.freeze({
    year,
    total,
    isPartial,
    lastMonthOfYear,
    threshold: reference.threshold,
    median: reference.median,
    isCritical: Number.isFinite(total) && total > reference.threshold,
    monthsWellAboveNormal: months.filter((monthIndex) => {
      const normal = baseline.values[monthOfYearOf(monthIndex)];
      return normal > 0 && series[monthIndex] / normal >= WELL_ABOVE_NORMAL_RATIO;
    }).length,
    peakMonthOfYear: peakMonth === null ? null : monthOfYearOf(peakMonth),
    rank: isPartial || !Number.isFinite(total) ? null : ranked.filter((value) => value > total).length + 1,
  });
}

function yearTotal(series, recordWindow, year, lastMonthOfYear) {
  const months = monthsOfYear(year, lastMonthOfYear);
  return months.every((monthIndex) => isComparableMonth(series, recordWindow, monthIndex))
    ? sum(months.map((monthIndex) => series[monthIndex]))
    : Number.NaN;
}

function monthsOfYear(year, lastMonthOfYear) {
  return Array.from({ length: lastMonthOfYear + 1 }, (_, monthOfYear) => monthIndexOf(year, monthOfYear));
}

function bestBlockOfLength(profile, length, total) {
  let best = null;
  for (let startMonth = 0; startMonth < MONTHS_PER_YEAR; startMonth += 1) {
    let blockTotal = 0;
    for (let offset = 0; offset < length; offset += 1) {
      blockTotal += profile[(startMonth + offset) % MONTHS_PER_YEAR];
    }
    const share = blockTotal / total;
    if (share >= CRITICAL_SEASON_SHARE && (!best || share > best.share)) {
      best = { startMonth, length, share };
    }
  }
  return best;
}
