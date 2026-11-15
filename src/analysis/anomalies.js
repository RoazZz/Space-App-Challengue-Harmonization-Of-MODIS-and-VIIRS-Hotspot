import { DIVERGING_COLORS, divergingClassIndex, NEUTRAL_DIVERGING_CLASS } from '../charts/color-scales.js';
import { contains } from '../time/date-range.js';
import { monthOfYearOf } from '../time/month-index.js';

const WELL_ABOVE_CLASSES = Object.freeze([5, 6]);
const WELL_BELOW_CLASSES = Object.freeze([0, 1]);

export function anomalyClassOf(series, baseline, monthIndex) {
  const normal = baseline.values[monthOfYearOf(monthIndex)];
  if (!(normal > 0)) {
    return series[monthIndex] > 0 ? DIVERGING_COLORS.length - 1 : NEUTRAL_DIVERGING_CLASS;
  }
  return divergingClassIndex(series[monthIndex] / normal);
}

export function countAnomalyClasses(result, summary) {
  const counts = new Array(DIVERGING_COLORS.length).fill(0);
  for (let monthIndex = summary.range.firstMonthIndex; monthIndex <= summary.range.lastMonthIndex; monthIndex += 1) {
    if (summary.isComparable(monthIndex) && summary.baseline.values[monthOfYearOf(monthIndex)] > 0 && contains(summary.range, monthIndex)) {
      counts[anomalyClassOf(result.harmonized, summary.baseline, monthIndex)] += 1;
    }
  }
  const sumOf = (classes) => classes.reduce((total, classIndex) => total + counts[classIndex], 0);
  return { counts, wellAbove: sumOf(WELL_ABOVE_CLASSES), wellBelow: sumOf(WELL_BELOW_CLASSES) };
}
