import { monthIndexOf } from './month-index.js';

const MILLISECONDS_PER_DAY = 86400000;

export function createRecordWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const monthOfYear = now.getUTCMonth();
  const monthStart = Date.UTC(year, monthOfYear, 1);
  const daysInMonth = new Date(Date.UTC(year, monthOfYear + 1, 0)).getUTCDate();
  const lastMonthIndex = monthIndexOf(year, monthOfYear);
  return Object.freeze({
    firstMonthIndex: 0,
    lastMonthIndex,
    monthCount: lastMonthIndex + 1,
    lastMonthFraction: (now.getTime() - monthStart) / (daysInMonth * MILLISECONDS_PER_DAY),
  });
}
