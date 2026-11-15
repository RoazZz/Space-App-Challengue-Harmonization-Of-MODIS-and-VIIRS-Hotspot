import { monthIndexOf, monthOfYearOf, yearOf } from '../time/month-index.js';
import { isComparableMonth, summarize } from './baseline.js';
import { sum } from './statistics.js';

export function lastComparableMonth(range, recordWindow) {
  return Math.min(range.lastMonthIndex, recordWindow.lastMonthIndex - 1);
}

export function compareYearToDate(series, recordWindow, range, baseline, settings) {
  const endMonth = lastComparableMonth(range, recordWindow);
  const year = yearOf(endMonth);
  const lastMonthOfYear = monthOfYearOf(endMonth);
  const totalThrough = (targetYear) => {
    const months = Array.from({ length: lastMonthOfYear + 1 }, (_, monthOfYear) => monthIndexOf(targetYear, monthOfYear));
    return months.every((monthIndex) => isComparableMonth(series, recordWindow, monthIndex))
      ? sum(months.map((monthIndex) => series[monthIndex]))
      : Number.NaN;
  };
  const current = totalThrough(year);
  const referenceTotals = baseline.years.filter((referenceYear) => referenceYear < year).map(totalThrough).filter(Number.isFinite);
  const reference = referenceTotals.length ? summarize(referenceTotals, settings) : Number.NaN;
  return Object.freeze({
    year,
    lastMonthOfYear,
    current,
    reference,
    referenceYearCount: referenceTotals.length,
    change: Number.isFinite(current) && reference > 0 ? current / reference - 1 : Number.NaN,
  });
}

export function compareLastCompleteMonth(series, recordWindow, range, baseline) {
  const monthIndex = lastComparableMonth(range, recordWindow);
  const value = series[monthIndex];
  const reference = baseline.values[monthOfYearOf(monthIndex)];
  return Object.freeze({
    monthIndex,
    value,
    reference,
    change: Number.isFinite(value) && reference > 0 ? value / reference - 1 : Number.NaN,
  });
}
