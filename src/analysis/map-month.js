import { contains } from '../time/date-range.js';
import { monthIndexOf, MONTHS_PER_YEAR, yearOf } from '../time/month-index.js';

export function defaultMapMonth(result, range) {
  const lastComplete = Math.min(range.lastMonthIndex, result.recordWindow.lastMonthIndex - 1);
  const year = yearOf(lastComplete);
  let best = lastComplete;
  for (let monthOfYear = 0; monthOfYear < MONTHS_PER_YEAR; monthOfYear += 1) {
    const monthIndex = monthIndexOf(year, monthOfYear);
    if (contains(range, monthIndex) && monthIndex <= lastComplete && result.harmonized[monthIndex] > result.harmonized[best]) {
      best = monthIndex;
    }
  }
  return Math.max(range.firstMonthIndex, best);
}
