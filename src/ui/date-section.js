import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { createDateRange, DATE_RANGE_SHORTCUTS } from '../time/date-range.js';
import { MONTH_ABBREVIATIONS, monthIndexOf, monthLabel, monthOfYearOf, RECORD_START_YEAR, yearOf } from '../time/month-index.js';

export function createDateSection({ elements, recordWindow, onRangeChanged, notify }) {
  const { fromMonth, fromYear, toMonth, toYear, shortcutButtons } = elements;
  let currentRange = DATE_RANGE_SHORTCUTS.fullRecord(recordWindow);

  function setRange(range) {
    currentRange = range;
    writeSelects(range);
    onRangeChanged(range);
  }

  function readSelects() {
    const first = monthIndexOf(Number(fromYear.value), Number(fromMonth.value));
    const last = monthIndexOf(Number(toYear.value), Number(toMonth.value));
    if (Math.max(first, last) > recordWindow.lastMonthIndex) {
      notify(`Data end in ${monthLabel(recordWindow.lastMonthIndex)} — the range was cut there.`);
    }
    setRange(createDateRange(first, last, recordWindow));
  }

  function writeSelects({ firstMonthIndex, lastMonthIndex }) {
    fromMonth.value = monthOfYearOf(firstMonthIndex);
    fromYear.value = yearOf(firstMonthIndex);
    toMonth.value = monthOfYearOf(lastMonthIndex);
    toYear.value = yearOf(lastMonthIndex);
  }

  [fromMonth, toMonth].forEach((select) => select.replaceChildren(...MONTH_ABBREVIATIONS.map((label, index) => option(index, label))));
  [fromYear, toYear].forEach((select) => select.replaceChildren(...yearsOf(recordWindow).map((year) => option(year, year))));
  [fromMonth, fromYear, toMonth, toYear].forEach((select) => select.addEventListener('change', readSelects));
  shortcutButtons.forEach((button) => button.addEventListener('click', () => setRange(DATE_RANGE_SHORTCUTS[button.dataset.rangeShortcut](recordWindow))));
  shortcutButtons
    .filter((button) => button.dataset.rangeShortcut === 'overlap')
    .forEach((button) => { button.textContent = `Overlap (${monthLabel(SENSOR_MILESTONES.viirsNoaa20Start)} →)`; });
  writeSelects(currentRange);

  return { currentRange: () => currentRange };
}

function yearsOf(recordWindow) {
  return Array.from({ length: yearOf(recordWindow.lastMonthIndex) - RECORD_START_YEAR + 1 }, (_, offset) => RECORD_START_YEAR + offset);
}

function option(value, label) {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}
