import { toCsv } from './csv-writer.js';

export const DETECTIONS_ROW_LIMIT = 50000;
const FIRMS_COLUMNS = Object.freeze(['latitude', 'longitude', 'acq_date', 'acq_time', 'satellite', 'instrument', 'confidence', 'frp', 'daynight']);
const DEMO_COLUMN = 'demo_flag';
const DEMO_VALUE = 'SYNTHETIC';

export function buildDetectionsCsv(result, range) {
  const rows = [];
  let isTruncated = false;
  const lastMonth = Math.min(range.lastMonthIndex, result.recordWindow.lastMonthIndex);
  for (let monthIndex = lastMonth; monthIndex >= range.firstMonthIndex && !isTruncated; monthIndex -= 1) {
    const detections = result.detectionsForMonth(monthIndex);
    const room = DETECTIONS_ROW_LIMIT - rows.length;
    rows.push(...detections.slice(0, room));
    isTruncated = detections.length > room;
  }
  rows.sort(byAcquisition);
  const columns = result.isDemoData ? [...FIRMS_COLUMNS, DEMO_COLUMN] : FIRMS_COLUMNS;
  const exportedRows = result.isDemoData ? rows.map((row) => ({ ...row, [DEMO_COLUMN]: DEMO_VALUE })) : rows;
  return { text: toCsv(columns, exportedRows), rowCount: rows.length, isTruncated };
}

function byAcquisition(first, second) {
  return `${first.acq_date}${first.acq_time}`.localeCompare(`${second.acq_date}${second.acq_time}`);
}
