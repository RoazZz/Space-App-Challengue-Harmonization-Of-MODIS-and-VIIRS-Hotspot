import { MONTHS_PER_YEAR, monthIndexOf, RECORD_START_YEAR, yearOf } from '../time/month-index.js';
import { mean, median, quantile } from './statistics.js';

export const BASELINE_STATISTIC = Object.freeze({ MEDIAN: 'median', MEAN: 'mean' });
export const DEFAULT_BASELINE_SETTINGS = Object.freeze({ statistic: BASELINE_STATISTIC.MEDIAN, firstYear: RECORD_START_YEAR });

const STATISTICS = Object.freeze({ [BASELINE_STATISTIC.MEDIAN]: median, [BASELINE_STATISTIC.MEAN]: mean });

export function lastCompleteYear(recordWindow) {
  return yearOf(recordWindow.lastMonthIndex) - 1;
}

export function baselineYears(recordWindow, settings) {
  const years = [];
  for (let year = settings.firstYear; year <= lastCompleteYear(recordWindow); year += 1) {
    years.push(year);
  }
  return years;
}

export function isComparableMonth(series, recordWindow, monthIndex) {
  return monthIndex >= recordWindow.firstMonthIndex && monthIndex < recordWindow.lastMonthIndex && Number.isFinite(series[monthIndex]);
}

export function summarize(values, settings) {
  return STATISTICS[settings.statistic](values);
}

export function monthlyBaseline(series, recordWindow, settings) {
  const years = baselineYears(recordWindow, settings);
  const valuesByMonth = Array.from({ length: MONTHS_PER_YEAR }, (_, monthOfYear) => years
    .map((year) => monthIndexOf(year, monthOfYear))
    .filter((monthIndex) => isComparableMonth(series, recordWindow, monthIndex))
    .map((monthIndex) => series[monthIndex]));
  return Object.freeze({
    statistic: settings.statistic,
    firstYear: years[0],
    lastYear: years[years.length - 1],
    years,
    values: valuesByMonth.map((values) => (values.length ? summarize(values, settings) : Number.NaN)),
    lowerQuartiles: valuesByMonth.map((values) => quantile(values, 0.25)),
    upperQuartiles: valuesByMonth.map((values) => quantile(values, 0.75)),
  });
}
