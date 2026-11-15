import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { contains } from '../time/date-range.js';
import { MONTHS_PER_YEAR, monthIndexOf, monthLabel, yearOf } from '../time/month-index.js';

export const TIME_SERIES_MODE = Object.freeze({ RAW: 'raw', HARMONIZED: 'harmonized' });
export const TIME_SERIES_AGGREGATION = Object.freeze({ MONTHLY: 'monthly', ANNUAL: 'annual' });

const LINE_STYLES = Object.freeze({
  modis: { name: 'MODIS raw', color: '#E69F00', width: 1.6 },
  modisReference: { name: 'MODIS raw (reference)', color: '#E69F00', width: 1, opacity: 0.45 },
  viirs: { name: 'VIIRS NOAA-20 raw', color: '#56B4E9', width: 1.6 },
  naiveJoin: { name: 'Naive join (MODIS → VIIRS)', color: '#e8eef4', width: 1.4, dash: '4 3' },
  harmonized: { name: 'Harmonized (VIIRS-equivalent)', color: '#F0E442', width: 2, dashBeforeOverlap: true },
});

export function buildTimeSeries(result, range, { mode, aggregation }) {
  const points = aggregation === TIME_SERIES_AGGREGATION.ANNUAL ? annualPoints(range) : monthlyPoints(range);
  const valuesOf = (series) => points.map(({ months }) => sumOf(series, months, result));
  const viirsStart = SENSOR_MILESTONES.viirsNoaa20Start;
  const naiveJoin = result.modis.map((value, monthIndex) => (monthIndex < viirsStart ? value : result.viirs[monthIndex]));
  const viirs = result.viirs.map((value, monthIndex) => (monthIndex < viirsStart ? Number.NaN : value));
  const lines = mode === TIME_SERIES_MODE.RAW
    ? [line(LINE_STYLES.modis, valuesOf(result.modis)), line(LINE_STYLES.viirs, valuesOf(viirs)), line(LINE_STYLES.naiveJoin, valuesOf(naiveJoin))]
    : [line(LINE_STYLES.modisReference, valuesOf(result.modis)), line(LINE_STYLES.harmonized, valuesOf(result.harmonized))];
  const isEstimated = points.map(({ months }) => months.some((monthIndex) => monthIndex < viirsStart));
  return {
    points,
    lines,
    isEstimated,
    band: mode === TIME_SERIES_MODE.HARMONIZED ? { lower: valuesOf(result.lower), upper: valuesOf(result.upper) } : null,
    overlapIndex: points.findIndex(({ months }) => months.every((monthIndex) => monthIndex >= viirsStart)),
  };
}

export function overlapRatio(result) {
  let viirs = 0;
  let modis = 0;
  for (let monthIndex = SENSOR_MILESTONES.viirsNoaa20Start; monthIndex < result.recordWindow.lastMonthIndex; monthIndex += 1) {
    viirs += result.viirs[monthIndex];
    modis += result.modis[monthIndex];
  }
  return modis > 0 ? viirs / modis : Number.NaN;
}

function monthlyPoints(range) {
  const points = [];
  for (let monthIndex = range.firstMonthIndex; monthIndex <= range.lastMonthIndex; monthIndex += 1) {
    points.push({ label: monthLabel(monthIndex), year: yearOf(monthIndex), isYearStart: monthIndex % MONTHS_PER_YEAR === 0, months: [monthIndex] });
  }
  return points;
}

function annualPoints(range) {
  const points = [];
  for (let year = yearOf(range.firstMonthIndex); year <= yearOf(range.lastMonthIndex); year += 1) {
    const months = Array.from({ length: MONTHS_PER_YEAR }, (_, monthOfYear) => monthIndexOf(year, monthOfYear)).filter((monthIndex) => contains(range, monthIndex));
    points.push({ label: String(year), year, isYearStart: true, months });
  }
  return points;
}

function sumOf(series, months, result) {
  const values = months.filter((monthIndex) => monthIndex <= result.recordWindow.lastMonthIndex).map((monthIndex) => series[monthIndex]).filter(Number.isFinite);
  return values.length ? values.reduce((total, value) => total + value, 0) : Number.NaN;
}

function line(style, values) {
  return { ...style, values };
}
