import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { MONTHS_PER_YEAR } from './month-index.js';

const LAST_YEARS_SHORTCUT = 5;

export function createDateRange(firstMonthIndex, lastMonthIndex, recordWindow) {
  const first = Math.max(recordWindow.firstMonthIndex, Math.min(firstMonthIndex, lastMonthIndex));
  const last = Math.min(recordWindow.lastMonthIndex, Math.max(firstMonthIndex, lastMonthIndex));
  return Object.freeze({ firstMonthIndex: first, lastMonthIndex: last });
}

export function contains(range, monthIndex) {
  return monthIndex >= range.firstMonthIndex && monthIndex <= range.lastMonthIndex;
}

export const DATE_RANGE_SHORTCUTS = Object.freeze({
  fullRecord: (recordWindow) => createDateRange(recordWindow.firstMonthIndex, recordWindow.lastMonthIndex, recordWindow),
  overlap: (recordWindow) => createDateRange(SENSOR_MILESTONES.viirsNoaa20Start, recordWindow.lastMonthIndex, recordWindow),
  lastFiveYears: (recordWindow) => createDateRange(recordWindow.lastMonthIndex - LAST_YEARS_SHORTCUT * MONTHS_PER_YEAR, recordWindow.lastMonthIndex, recordWindow),
});
