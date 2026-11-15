import { anomalyClassOf } from '../analysis/anomalies.js';
import { monthFlags } from '../analysis/month-flags.js';
import { MONTH_ABBREVIATIONS, MONTHS_PER_YEAR, RECORD_START_YEAR, yearOf } from '../time/month-index.js';
import { formatCompact } from '../ui/number-format.js';
import { monthCellTooltip } from './burn-calendar-tooltips.js';
import { DIVERGING_COLORS } from './color-scales.js';
import { hatchPatternDefinitions, svgElement, svgText } from './svg.js';

const LAYOUT = Object.freeze({ width: 548, left: 34, right: 10, top: 18, gap: 1.4, baselineColumn: 56 });
const PATTERN_PREFIX = 'anomalies';
const OUT_OF_RANGE_OPACITY = 0.2;

export function renderAnomalyGrid({ container, result, summary, tooltip, selectedMonthIndex, onMonthSelected }) {
  const yearCount = yearOf(result.recordWindow.lastMonthIndex) - RECORD_START_YEAR + 1;
  const cellSize = Math.floor((LAYOUT.width - LAYOUT.left - LAYOUT.right - LAYOUT.baselineColumn) / yearCount);
  const height = LAYOUT.top + cellSize * MONTHS_PER_YEAR + 4;
  const svg = svgElement('svg', { viewBox: `0 0 ${LAYOUT.width} ${height}`, width: '100%', role: 'img', 'aria-label': 'Monthly anomalies' }, [
    hatchPatternDefinitions(PATTERN_PREFIX),
    ...yearLabels(yearCount, cellSize),
    ...MONTH_ABBREVIATIONS.map((label, monthOfYear) => svgText(label, { x: LAYOUT.left - 6, y: LAYOUT.top + monthOfYear * cellSize + cellSize * 0.68, 'font-size': 9, fill: '#9aa7b4', 'text-anchor': 'end' })),
    ...cells(result, summary, yearCount, cellSize, selectedMonthIndex),
    ...baselineColumn(summary, yearCount, cellSize),
  ]);
  svg.addEventListener('mousemove', (event) => {
    const cell = event.target.closest('[data-month-index]');
    if (cell) {
      tooltip.show(monthCellTooltip(result, summary, Number(cell.dataset.monthIndex)), event);
    } else {
      tooltip.hide();
    }
  });
  svg.addEventListener('mouseleave', tooltip.hide);
  svg.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-month-index]');
    if (cell && Number(cell.dataset.monthIndex) <= result.recordWindow.lastMonthIndex) {
      onMonthSelected(Number(cell.dataset.monthIndex));
    }
  });
  container.replaceChildren(svg);
}

function yearLabels(yearCount, cellSize) {
  return Array.from({ length: yearCount }, (_, yearOffset) => {
    const year = RECORD_START_YEAR + yearOffset;
    return svgText(String(year).slice(2), { x: LAYOUT.left + yearOffset * cellSize + cellSize / 2, y: 12, 'font-size': 8.3, 'text-anchor': 'middle', fill: year % 5 === 1 ? '#c9d3dc' : '#6f7c89' });
  });
}

function cells(result, summary, yearCount, cellSize, selectedMonthIndex) {
  const elements = [];
  for (let monthIndex = 0; monthIndex < yearCount * MONTHS_PER_YEAR; monthIndex += 1) {
    const x = LAYOUT.left + Math.floor(monthIndex / MONTHS_PER_YEAR) * cellSize + LAYOUT.gap / 2;
    const y = LAYOUT.top + (monthIndex % MONTHS_PER_YEAR) * cellSize + LAYOUT.gap / 2;
    const size = cellSize - LAYOUT.gap;
    elements.push(svgElement('rect', { 'data-month-index': monthIndex, x, y, width: size, height: size, rx: 2, class: 'calendar-cell is-selectable', ...cellStyle(result, summary, monthIndex) }));
    if (monthIndex === selectedMonthIndex) {
      elements.push(svgElement('rect', { x: x - 0.8, y: y - 0.8, width: size + 1.6, height: size + 1.6, rx: 2.5, fill: 'none', stroke: '#fff', 'stroke-width': 1.6, 'pointer-events': 'none' }));
    }
  }
  return elements;
}

function cellStyle(result, summary, monthIndex) {
  if (monthIndex > result.recordWindow.lastMonthIndex) {
    return { fill: 'none', stroke: '#2d3741', 'stroke-dasharray': '2 2' };
  }
  const flags = monthFlags(result, summary.range, monthIndex);
  const opacity = flags.isOutOfRange ? OUT_OF_RANGE_OPACITY : 1;
  if (flags.hasNoData) {
    return { fill: `url(#${PATTERN_PREFIX}-no-data)`, opacity };
  }
  if (flags.isPartial) {
    return { fill: `url(#${PATTERN_PREFIX}-partial)`, opacity };
  }
  return { fill: DIVERGING_COLORS[anomalyClassOf(result.harmonized, summary.baseline, monthIndex)], opacity };
}

function baselineColumn(summary, yearCount, cellSize) {
  const x = LAYOUT.left + cellSize * yearCount + 8;
  return [
    svgText(summary.baseline.statistic === 'median' ? 'Median' : 'Mean', { x, y: 12, 'font-size': 8.3, fill: '#7f8c99' }),
    ...summary.baseline.values.map((value, monthOfYear) => svgText(formatCompact(value), { x, y: LAYOUT.top + monthOfYear * cellSize + cellSize * 0.68, 'font-size': 9, fill: '#c9d3dc', 'font-family': 'monospace' })),
  ];
}
