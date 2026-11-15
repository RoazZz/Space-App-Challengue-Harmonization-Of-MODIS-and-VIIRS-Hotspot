import { countAnomalyClasses } from '../analysis/anomalies.js';
import { lastCompleteYear } from '../analysis/baseline.js';
import { renderAnomalyGrid } from '../charts/anomaly-grid.js';
import { DIVERGING_COLORS, DIVERGING_LABELS } from '../charts/color-scales.js';
import { svgElement } from '../charts/svg.js';
import { renderYearInFocus } from '../charts/year-in-focus-chart.js';
import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { MONTH_ABBREVIATIONS, monthLabel, monthOfYearOf, RECORD_START_YEAR, yearOf } from '../time/month-index.js';
import { bindSegmentedControl } from './tabs.js';

const MIN_BASELINE_YEARS = 5;

export function createAnomaliesTab({ elements, tooltip, onBaselineChange, onMonthSelected }) {
  const { statisticButtons, firstYearSelect, lastYearElement, focusYearSelect, grid, legend, focusChart, focusLegend, footnote } = elements;
  let focusYear = null;
  let latest = null;

  function show(result, summary, selectedMonthIndex) {
    latest = { result, summary };
    const currentYear = yearOf(result.recordWindow.lastMonthIndex);
    focusYear = focusYear ?? currentYear;
    fillYearOptions(firstYearSelect, RECORD_START_YEAR, lastCompleteYear(result.recordWindow) - MIN_BASELINE_YEARS, summary.baseline.firstYear, false);
    fillYearOptions(focusYearSelect, RECORD_START_YEAR, currentYear, focusYear, true);
    lastYearElement.textContent = `– ${summary.baseline.lastYear}`;
    renderAnomalyGrid({ container: grid, result, summary, tooltip, selectedMonthIndex, onMonthSelected });
    renderLegend(legend, result, summary);
    renderFocus();
    footnote.textContent = footnoteText(summary.baseline);
  }

  function renderFocus() {
    const { result, summary } = latest;
    renderYearInFocus({ container: focusChart, result, summary, year: focusYear });
    renderFocusLegend(focusLegend, result, summary.baseline, focusYear);
  }

  bindSegmentedControl(statisticButtons, 'baselineStatistic', (statistic) => onBaselineChange({ statistic }));
  firstYearSelect.addEventListener('change', () => onBaselineChange({ firstYear: Number(firstYearSelect.value) }));
  focusYearSelect.addEventListener('change', () => {
    focusYear = Number(focusYearSelect.value);
    renderFocus();
  });

  return { show };
}

function fillYearOptions(select, firstYear, lastYear, selectedYear, isDescending) {
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, offset) => firstYear + offset);
  select.replaceChildren(...(isDescending ? years.reverse() : years).map((year) => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    return option;
  }));
  select.value = selectedYear;
}

function renderLegend(container, result, summary) {
  const { statistic, firstYear, lastYear } = summary.baseline;
  const { counts, wellAbove, wellBelow } = countAnomalyClasses(result, summary);
  container.replaceChildren(
    row([text(`Month vs its ${statistic} (${firstYear}–${lastYear}):`)]),
    row(DIVERGING_COLORS.map((color, classIndex) => item(swatch(color), DIVERGING_LABELS[classIndex]))),
    row([text(`In range: ${wellAbove} months ≥ +100% (${counts[5]} + ${counts[6]}) · ${wellBelow} months ≤ −50% (${counts[0]} + ${counts[1]})`)]),
  );
}

function renderFocusLegend(container, result, baseline, year) {
  const isCurrentYear = year === yearOf(result.recordWindow.lastMonthIndex);
  const partialNote = isCurrentYear ? ` (${MONTH_ABBREVIATIONS[monthOfYearOf(result.recordWindow.lastMonthIndex)]} partial)` : '';
  container.replaceChildren(
    item(swatch('#F0E442'), `${year}${partialNote}`),
    item(svgElement('svg', { width: 16, height: 8 }, [svgElement('line', { x1: 0, x2: 16, y1: 4, y2: 4, stroke: '#fff', 'stroke-width': 2 })]), `${baseline.statistic} ${baseline.firstYear}–${baseline.lastYear}`),
    item(swatch('rgba(141, 154, 167, 0.3)'), 'Middle 50% of baseline years'),
  );
}

function footnoteText({ statistic, firstYear, lastYear }) {
  const terraOnly = `${monthLabel(0)} – ${monthLabel(SENSOR_MILESTONES.aquaModisStart - 1)}`;
  return `Anomaly = value ÷ ${statistic} of the same calendar month across ${firstYear}–${lastYear}. Partial months are never compared. `
    + `Low values in ${terraOnly} partly reflect the Terra-only period (fewer MODIS overpasses).`;
}

function row(children) {
  const element = document.createElement('div');
  element.className = 'legend';
  element.append(...children);
  return element;
}

function item(icon, label) {
  const element = document.createElement('span');
  element.className = 'legend-item';
  element.append(icon, document.createTextNode(label));
  return element;
}

function text(content) {
  const element = document.createElement('span');
  element.className = 'legend-item';
  element.textContent = content;
  return element;
}

function swatch(color) {
  const element = document.createElement('span');
  element.className = 'swatch';
  element.style.background = color;
  return element;
}
