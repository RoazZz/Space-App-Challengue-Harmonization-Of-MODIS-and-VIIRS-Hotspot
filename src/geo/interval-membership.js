import { FULL_TURN_DEGREES } from './longitude.js';

export function isInsideIntervals(longitude, intervals) {
  return [longitude, longitude + FULL_TURN_DEGREES, longitude - FULL_TURN_DEGREES]
    .some((candidate) => intervals.some(([start, end]) => candidate >= start && candidate <= end));
}
