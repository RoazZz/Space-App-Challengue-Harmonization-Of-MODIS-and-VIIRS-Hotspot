import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API_ROOT = 'https://firms.modaps.eosdis.nasa.gov/api';
const DAYS_PER_REQUEST = 5;
const REQUEST_SPACING_MS = 650;
const PARALLEL_REQUESTS = 3;
const RETRY_DELAYS_MS = Object.freeze([5000, 30000, 90000]);
const MILLISECONDS_PER_DAY = 86400000;
const SENSOR_PLANS = Object.freeze([
  { sensor: 'modis', standardSource: 'MODIS_SP', nearRealTimeSource: 'MODIS_NRT', firstDate: '2001-01-01' },
  { sensor: 'viirs', standardSource: 'VIIRS_NOAA20_SP', nearRealTimeSource: 'VIIRS_NOAA20_NRT', firstDate: '2018-04-01' },
]);

const mapKey = process.env.FIRMS_MAP_KEY;
const [regionName, boundingBox] = process.argv.slice(2);
if (!mapKey || !regionName || !boundingBox) {
  console.error('Usage: FIRMS_MAP_KEY=<key> node scripts/firms/download-detections.mjs <region-name> <west,south,east,north>');
  process.exit(1);
}

const outputDirectory = join('scripts', 'firms', 'output', regionName);
const progressPath = join(outputDirectory, 'progress.json');
mkdirSync(outputDirectory, { recursive: true });
const completedWindows = new Set(existsSync(progressPath) ? JSON.parse(readFileSync(progressPath, 'utf8')) : []);
let nextRequestTime = 0;

const availability = await fetchAvailability();
const windows = SENSOR_PLANS.flatMap((plan) => windowsFor(plan, availability)).filter(({ key }) => !completedWindows.has(key));
console.log(`${windows.length} requests to go for ${regionName}`);
await runInParallel(windows, downloadWindow);
console.log('Download complete');

async function fetchAvailability() {
  const text = await fetchText(`${API_ROOT}/data_availability/csv/${mapKey}/ALL`);
  return Object.fromEntries(text.trim().split('\n').slice(1).map((line) => {
    const [source, firstDate, lastDate] = line.split(',');
    return [source, { firstDate, lastDate }];
  }));
}

function windowsFor({ sensor, standardSource, nearRealTimeSource, firstDate }, available) {
  const standardEnd = available[standardSource].lastDate;
  return [
    ...dateWindows(firstDate, standardEnd).map((start) => ({ sensor, source: standardSource, start })),
    ...dateWindows(addDays(standardEnd, 1), available[nearRealTimeSource].lastDate).map((start) => ({ sensor, source: nearRealTimeSource, start })),
  ].map((window) => ({ ...window, key: `${window.source}:${window.start}` }));
}

function dateWindows(firstDate, lastDate) {
  const starts = [];
  for (let date = firstDate; date <= lastDate; date = addDays(date, DAYS_PER_REQUEST)) {
    starts.push(date);
  }
  return starts;
}

async function downloadWindow({ sensor, source, start, key }) {
  const text = await fetchText(`${API_ROOT}/area/csv/${mapKey}/${source}/${boundingBox}/${DAYS_PER_REQUEST}/${start}`);
  const [header, ...rows] = text.trim().split('\n');
  if (!header.startsWith('latitude')) {
    throw new Error(`Unexpected response for ${key}: ${header.slice(0, 120)}`);
  }
  const filePath = join(outputDirectory, `${sensor}_${start.slice(0, 4)}.csv`);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${header}\n`);
  }
  if (rows.length) {
    appendFileSync(filePath, `${rows.join('\n')}\n`);
  }
  completedWindows.add(key);
  writeFileSync(progressPath, JSON.stringify([...completedWindows]));
}

async function fetchText(url) {
  for (let attempt = 0; ; attempt += 1) {
    await waitForTurn();
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (response.ok && !text.startsWith('Invalid') && !text.includes('Exceeding')) {
        return text;
      }
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw error;
      }
      console.warn(`Retrying after error: ${error.message}`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

async function runInParallel(items, task) {
  let nextIndex = 0;
  let finished = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await task(item);
      finished += 1;
      if (finished % 100 === 0) {
        console.log(`${finished}/${items.length} done`);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL_REQUESTS }, worker));
}

async function waitForTurn() {
  const now = Date.now();
  const wait = Math.max(0, nextRequestTime - now);
  nextRequestTime = Math.max(now, nextRequestTime) + REQUEST_SPACING_MS;
  await sleep(wait);
}

function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
