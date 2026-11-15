import { SENSOR_MILESTONES } from '../sensor-catalog.js';
import { monthOfYearOf, yearOf } from '../../time/month-index.js';
import { approximateGaussian, createRandom, hashIntegers } from './seeded-random.js';

const HOURS_PER_DAY = 24;
const DEGREES_PER_HOUR = 15;
const OVERPASS_JITTER_HOURS = 1.2;
const LOCAL_OVERPASS_HOURS = Object.freeze({
  terra: { day: 10.5, night: 22.5 },
  aqua: { day: 13.5, night: 1.5 },
  noaa20: { day: 13.5, night: 1.5 },
});
const SENSOR_CODES = Object.freeze({ modis: 11, viirs: 23 });

const pad = (value) => String(value).padStart(2, '0');

export function simulateDetections({ cell, totals, monthIndex, recordWindow, seed }) {
  const daysAvailable = availableDays(monthIndex, recordWindow);
  return [
    ...sensorDetections({ cell, monthIndex, seed, daysAvailable, sensor: 'modis', dayCount: totals.modisDay, nightCount: totals.modisNight, highConfidenceShare: highConfidenceShareOf(totals) }),
    ...sensorDetections({ cell, monthIndex, seed, daysAvailable, sensor: 'viirs', dayCount: totals.viirsDay, nightCount: totals.viirsNight }),
  ];
}

function sensorDetections({ cell, monthIndex, seed, daysAvailable, sensor, dayCount, nightCount, highConfidenceShare }) {
  const random = createRandom(hashIntegers(seed, cell.south * 100, cell.west * 100, monthIndex, SENSOR_CODES[sensor]));
  return Array.from({ length: dayCount + nightCount }, (_, index) => {
    const isNight = index >= dayCount;
    const latitude = cell.south + random() * cell.sizeDegrees;
    const longitude = cell.west + random() * cell.sizeDegrees;
    const satellite = satelliteFor(sensor, monthIndex, random);
    const acquisition = acquisitionTime({ monthIndex, longitude, satellite, isNight, daysAvailable, random });
    return {
      latitude: round(latitude, 5),
      longitude: round(longitude, 5),
      ...acquisition,
      satellite: satellite.label,
      instrument: sensor === 'modis' ? 'MODIS' : 'VIIRS',
      confidence: sensor === 'modis' ? modisConfidence(highConfidenceShare, random) : viirsConfidence(isNight, random),
      frp: round(Math.exp(sensor === 'modis' ? Math.log(14) + 0.95 * approximateGaussian(random) : Math.log(3.6) + 1.05 * approximateGaussian(random)), 2),
      daynight: isNight ? 'N' : 'D',
    };
  });
}

function satelliteFor(sensor, monthIndex, random) {
  if (sensor === 'viirs') {
    return { label: 'N20', overpass: LOCAL_OVERPASS_HOURS.noaa20 };
  }
  const isAqua = monthIndex >= SENSOR_MILESTONES.aquaModisStart && random() < 0.5;
  return isAqua ? { label: 'Aqua', overpass: LOCAL_OVERPASS_HOURS.aqua } : { label: 'Terra', overpass: LOCAL_OVERPASS_HOURS.terra };
}

function acquisitionTime({ monthIndex, longitude, satellite, isNight, daysAvailable, random }) {
  const localHour = (isNight ? satellite.overpass.night : satellite.overpass.day) + (random() - 0.5) * OVERPASS_JITTER_HOURS;
  const utcHourUnwrapped = localHour - longitude / DEGREES_PER_HOUR;
  const dayShift = Math.floor(utcHourUnwrapped / HOURS_PER_DAY);
  const utcHour = utcHourUnwrapped - dayShift * HOURS_PER_DAY;
  const day = Math.min(daysAvailable, Math.max(1, 1 + Math.floor(random() * daysAvailable) + dayShift));
  const hours = Math.floor(utcHour);
  const minutes = Math.floor((utcHour - hours) * 60);
  return {
    acq_date: `${yearOf(monthIndex)}-${pad(monthOfYearOf(monthIndex) + 1)}-${pad(day)}`,
    acq_time: `${pad(hours)}${pad(minutes)}`,
  };
}

function availableDays(monthIndex, recordWindow) {
  const daysInMonth = new Date(Date.UTC(yearOf(monthIndex), monthOfYearOf(monthIndex) + 1, 0)).getUTCDate();
  return monthIndex === recordWindow.lastMonthIndex ? Math.max(1, Math.floor(daysInMonth * recordWindow.lastMonthFraction)) : daysInMonth;
}

function highConfidenceShareOf({ modisDay, modisNight, modisHighConfidence }) {
  const total = modisDay + modisNight;
  return total > 0 ? modisHighConfidence / total : 0;
}

function modisConfidence(highConfidenceShare, random) {
  if (random() < highConfidenceShare) {
    return 80 + Math.floor(random() * 21);
  }
  return random() < 0.82 ? 30 + Math.floor(random() * 50) : Math.floor(random() * 30);
}

function viirsConfidence(isNight, random) {
  const draw = random();
  if (draw < 0.09) {
    return 'h';
  }
  return draw < 0.09 + (isNight ? 0.06 : 0.16) ? 'l' : 'n';
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
