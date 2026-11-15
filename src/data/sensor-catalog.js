import { monthIndexOf } from '../time/month-index.js';

export const SENSOR_MILESTONES = Object.freeze({
  aquaModisStart: monthIndexOf(2002, 6),
  aquaModisOutage: monthIndexOf(2020, 7),
  viirsNoaa20Start: monthIndexOf(2018, 3),
});
