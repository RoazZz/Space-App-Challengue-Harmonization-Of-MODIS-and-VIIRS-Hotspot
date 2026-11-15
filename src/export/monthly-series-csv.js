import { LOW_COVERAGE_THRESHOLD } from '../analysis/month-flags.js';
import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { monthOfYearOf, yearOf } from '../time/month-index.js';
import { toCsv } from './csv-writer.js';

const DEMO_VALUE = 'SYNTHETIC';

export function buildMonthlySeriesCsv(result, summary) {
  const { statistic } = summary.baseline;
  const baselineColumn = `baseline_${statistic}_harmonized`;
  const columns = ['month', 'modis_count', 'viirs_n20_count', 'harmonized_viirs_equiv', 'harmonized_low', 'harmonized_high', 'harmonized_source',
    baselineColumn, 'anomaly_pct_harmonized', 'low_coverage_flag', 'partial_month', ...(result.isDemoData ? ['demo_flag'] : [])];
  const rows = [];
  const lastMonth = Math.min(summary.range.lastMonthIndex, result.recordWindow.lastMonthIndex);
  for (let monthIndex = summary.range.firstMonthIndex; monthIndex <= lastMonth; monthIndex += 1) {
    rows.push(monthRow(result, summary, monthIndex, baselineColumn));
  }
  return toCsv(columns, rows);
}

function monthRow(result, summary, monthIndex, baselineColumn) {
  const isObserved = monthIndex >= SENSOR_MILESTONES.viirsNoaa20Start;
  const baseline = summary.baseline.values[monthOfYearOf(monthIndex)];
  const isPartial = monthIndex === result.recordWindow.lastMonthIndex;
  return {
    month: `${yearOf(monthIndex)}-${String(monthOfYearOf(monthIndex) + 1).padStart(2, '0')}`,
    modis_count: Math.round(result.modis[monthIndex]),
    viirs_n20_count: isObserved ? Math.round(result.viirs[monthIndex]) : null,
    harmonized_viirs_equiv: Math.round(result.harmonized[monthIndex]),
    harmonized_low: Math.round(result.lower[monthIndex]),
    harmonized_high: Math.round(result.upper[monthIndex]),
    harmonized_source: isObserved ? 'observed_viirs_n20' : 'modeled_from_modis',
    [baselineColumn]: Number.isFinite(baseline) ? Math.round(baseline) : null,
    anomaly_pct_harmonized: !isPartial && baseline > 0 ? Math.round((result.harmonized[monthIndex] / baseline - 1) * 1000) / 10 : null,
    low_coverage_flag: result.observationCoverage[monthIndex] < LOW_COVERAGE_THRESHOLD ? 1 : 0,
    partial_month: isPartial ? 1 : 0,
    demo_flag: DEMO_VALUE,
  };
}
