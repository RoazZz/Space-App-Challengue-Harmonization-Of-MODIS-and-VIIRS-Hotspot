import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { monthIndexOf } from '../time/month-index.js';

export const TRAINING_WINDOW = Object.freeze({ firstMonthIndex: SENSOR_MILESTONES.viirsNoaa20Start, lastMonthIndex: monthIndexOf(2023, 11) });
export const TEST_WINDOW_START = monthIndexOf(2024, 0);

export function isTrainingMonth(monthIndex) {
  return monthIndex >= TRAINING_WINDOW.firstMonthIndex && monthIndex <= TRAINING_WINDOW.lastMonthIndex;
}
