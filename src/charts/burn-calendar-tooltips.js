import { isInSeason } from '../analysis/critical-periods.js';
import { LOW_COVERAGE_THRESHOLD } from '../analysis/month-flags.js';
import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { MONTH_ABBREVIATIONS, MONTH_NAMES, monthLabel, monthOfYearOf, yearOf } from '../time/month-index.js';
import { formatInteger, formatSignedPercent } from '../ui/number-format.js';

const viirsStartLabel = () => monthLabel(SENSOR_MILESTONES.viirsNoaa20Start);
const baselineLabel = ({ statistic, firstYear, lastYear }) => `${statistic} ${firstYear}–${lastYear}`;

export function monthCellTooltip(result, summary, monthIndex) {
  const title = `${MONTH_NAMES[monthOfYearOf(monthIndex)]} ${yearOf(monthIndex)}`;
  if (monthIndex > result.recordWindow.lastMonthIndex) {
    return { title, notes: ['No data yet'] };
  }
  const isEstimated = monthIndex < SENSOR_MILESTONES.viirsNoaa20Start;
  const rows = [
    ['MODIS (Terra + Aqua)', `${formatInteger(result.modis[monthIndex])}${modisNote(monthIndex)}`],
    ['VIIRS NOAA-20', isEstimated ? `n/a before ${viirsStartLabel()}` : formatInteger(result.viirs[monthIndex])],
    ['Harmonized', `${formatInteger(result.harmonized[monthIndex])}${isEstimated ? ` (${formatInteger(result.lower[monthIndex])}–${formatInteger(result.upper[monthIndex])})` : ''}`],
  ];
  if (summary.isComparable(monthIndex)) {
    const normal = summary.baseline.values[monthOfYearOf(monthIndex)];
    rows.push([`vs ${summary.baseline.statistic} ${MONTH_ABBREVIATIONS[monthOfYearOf(monthIndex)]} (${summary.baseline.firstYear}–${summary.baseline.lastYear})`,
      formatSignedPercent(normal > 0 ? result.harmonized[monthIndex] / normal - 1 : Number.NaN)]);
  }
  const coverage = result.observationCoverage[monthIndex];
  rows.push(['Observation coverage', `${coverage < LOW_COVERAGE_THRESHOLD ? 'low' : 'good'} (${Math.round(coverage * 100)}%)`]);
  return {
    title,
    badge: monthIndex === result.recordWindow.lastMonthIndex ? '· partial month' : '',
    rows,
    notes: [isEstimated ? 'Harmonized = modeled from MODIS (≈68% range)' : 'Harmonized = observed VIIRS NOAA-20'],
  };
}

export function yearTooltip(summary, year) {
  const info = summary.yearAssessment.years.get(year);
  const periodNote = info.isPartial ? ` (Jan–${MONTH_ABBREVIATIONS[info.lastMonthOfYear]}, same months)` : '';
  const rows = [
    ['Harmonized total', formatInteger(info.total)],
    [`Median of ${summary.baseline.firstYear}–${summary.baseline.lastYear}${periodNote}`, formatInteger(info.median)],
    ['vs median', formatSignedPercent(info.median > 0 ? info.total / info.median - 1 : Number.NaN)],
    ['Critical threshold (90th percentile)', formatInteger(info.threshold)],
  ];
  if (info.rank) {
    rows.push([`Rank among ${summary.yearAssessment.referenceCount} baseline years`, `#${info.rank}`]);
  }
  rows.push(['Peak month', info.peakMonthOfYear === null ? '—' : MONTH_NAMES[info.peakMonthOfYear]]);
  rows.push(['Months ≥ +100% vs normal', String(info.monthsWellAboveNormal)]);
  return {
    title: `${year}${info.isPartial ? ' · year to date' : ''}`,
    badge: info.isCritical ? '▲ Critical year' : '',
    rows,
    notes: [`Source: ${yearSource(year)}`],
  };
}

export function seasonalMonthTooltip(summary, monthOfYear) {
  const total = summary.profile.reduce((sum, value) => sum + value, 0);
  const rank = [...summary.profile].sort((first, second) => second - first).indexOf(summary.profile[monthOfYear]) + 1;
  return {
    title: MONTH_NAMES[monthOfYear],
    badge: isInSeason(summary.season, monthOfYear) ? '· critical season' : '',
    rows: [
      ['Average per year', formatInteger(summary.profile[monthOfYear])],
      ['Share of yearly activity', total > 0 ? `${Math.round((summary.profile[monthOfYear] / total) * 100)}%` : '—'],
      ['Rank among months', `#${rank}`],
    ],
    notes: [`Baseline ${baselineLabel(summary.baseline)}, harmonized series`],
  };
}

function modisNote(monthIndex) {
  if (monthIndex < SENSOR_MILESTONES.aquaModisStart) {
    return ' (Terra only)';
  }
  return monthIndex === SENSOR_MILESTONES.aquaModisOutage ? ' (Aqua outage)' : '';
}

function yearSource(year) {
  const startYear = yearOf(SENSOR_MILESTONES.viirsNoaa20Start);
  if (year < startYear) {
    return 'estimated from MODIS';
  }
  if (year === startYear) {
    return `estimated from MODIS until ${MONTH_ABBREVIATIONS[monthOfYearOf(SENSOR_MILESTONES.viirsNoaa20Start) - 1]}, observed VIIRS NOAA-20 after`;
  }
  return 'observed VIIRS NOAA-20';
}
