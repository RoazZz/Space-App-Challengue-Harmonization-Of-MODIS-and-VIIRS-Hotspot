import { isInSeason } from '../analysis/critical-periods.js';
import { monthFlags } from '../analysis/month-flags.js';
import { contains } from '../time/date-range.js';
import { MONTH_ABBREVIATIONS, MONTHS_PER_YEAR, monthIndexOf, RECORD_START_YEAR, yearOf } from '../time/month-index.js';
import { monthCellTooltip, seasonalMonthTooltip, yearTooltip } from './burn-calendar-tooltips.js';
import { logClassEdges, sequentialColor } from './color-scales.js';
import { hatchPatternDefinitions, svgElement, svgText } from './svg.js';

const LAYOUT = Object.freeze({ width: 548, left: 34, right: 66, top: 52, gap: 1.4, annualBarMaxHeight: 30, annualBarBase: 38 });
const COLORS = Object.freeze({ series: '#F0E442', critical: '#ff6b35', criticalText: '#ff8a5c', label: '#9aa7b4', faint: '#6f7c89', strong: '#c9d3dc', caption: '#7f8c99' });
const PATTERN_PREFIX = 'calendar';
const OUT_OF_RANGE_OPACITY = 0.2;
const HIGHLIGHTED_YEAR_STEP = 5;

export function renderBurnCalendar({ container, result, summary, tooltip }) {
  const geometry = calendarGeometry(result);
  const values = rangeValues(result, summary);
  const edges = logClassEdges(values);
  const svg = svgElement('svg', { viewBox: `0 0 ${LAYOUT.width} ${geometry.height}`, width: '100%', role: 'img', 'aria-label': 'Monthly burn calendar' }, [
    hatchPatternDefinitions(PATTERN_PREFIX),
    ...annualTotalsCaption(),
    ...annualBars(result, summary, geometry),
    ...monthLabels(summary, geometry),
    ...monthCells(result, summary, geometry, edges),
    ...monthlyAverageBars(result, summary, geometry),
  ]);
  bindTooltips(svg, result, summary, tooltip);
  container.replaceChildren(svg);
  return { edges };
}

function calendarGeometry(result) {
  const yearCount = yearOf(result.recordWindow.lastMonthIndex) - RECORD_START_YEAR + 1;
  const cellSize = Math.floor((LAYOUT.width - LAYOUT.left - LAYOUT.right) / yearCount);
  return { yearCount, cellSize, gridWidth: cellSize * yearCount, height: LAYOUT.top + cellSize * MONTHS_PER_YEAR + 4 };
}

function rangeValues(result, summary) {
  const values = [];
  for (let monthIndex = summary.range.firstMonthIndex; monthIndex <= summary.range.lastMonthIndex; monthIndex += 1) {
    if (summary.isComparable(monthIndex)) {
      values.push(result.harmonized[monthIndex]);
    }
  }
  return values.length ? values : [result.harmonized[summary.range.lastMonthIndex]].filter(Number.isFinite);
}

function annualTotalsCaption() {
  const x = LAYOUT.left - 6;
  return [
    svgText('Total', { x, y: 22, 'font-size': 8.5, fill: COLORS.caption, 'text-anchor': 'end' }),
    svgText('/ yr', { x, y: 32, 'font-size': 8.5, fill: COLORS.caption, 'text-anchor': 'end' }),
  ];
}

function annualBars(result, summary, { yearCount, cellSize }) {
  const totals = Array.from({ length: yearCount }, (_, yearOffset) => yearTotalInRange(result, summary, RECORD_START_YEAR + yearOffset));
  const maximum = Math.max(...totals.filter(Number.isFinite), 1);
  return totals.flatMap((total, yearOffset) => {
    const year = RECORD_START_YEAR + yearOffset;
    const x = LAYOUT.left + yearOffset * cellSize;
    const isCritical = summary.yearAssessment.years.get(year)?.isCritical ?? false;
    const elements = [];
    if (Number.isFinite(total)) {
      const height = Math.max(1, (total / maximum) * LAYOUT.annualBarMaxHeight);
      elements.push(svgElement('rect', {
        x: x + 1.5, y: LAYOUT.annualBarBase - height, width: cellSize - 3, height,
        fill: isCritical ? COLORS.critical : COLORS.series, 'fill-opacity': isCritical ? 0.95 : 0.55, 'pointer-events': 'none',
      }));
      if (isCritical) {
        elements.push(svgElement('path', { d: `M${x + cellSize / 2 - 3},${LAYOUT.annualBarBase - 4 - height}h6l-3,-4.5z`, fill: COLORS.critical, 'pointer-events': 'none' }));
      }
      elements.push(svgElement('rect', { 'data-year': year, x, y: 2, width: cellSize, height: 49, fill: 'transparent', class: 'chart-hit' }));
    }
    elements.push(svgText(String(year).slice(2), {
      x: x + cellSize / 2, y: 48, 'font-size': 8.3, 'text-anchor': 'middle', 'pointer-events': 'none',
      fill: isCritical ? COLORS.criticalText : yearLabelColor(year), 'font-weight': isCritical ? 700 : 400,
    }));
    return elements;
  });
}

function yearTotalInRange(result, summary, year) {
  let total = 0;
  let hasValue = false;
  for (let monthOfYear = 0; monthOfYear < MONTHS_PER_YEAR; monthOfYear += 1) {
    const monthIndex = monthIndexOf(year, monthOfYear);
    if (contains(summary.range, monthIndex) && Number.isFinite(result.harmonized[monthIndex])) {
      total += result.harmonized[monthIndex];
      hasValue = true;
    }
  }
  return hasValue ? total : Number.NaN;
}

function monthLabels(summary, { cellSize }) {
  return MONTH_ABBREVIATIONS.flatMap((label, monthOfYear) => {
    const inSeason = isInSeason(summary.season, monthOfYear);
    const y = LAYOUT.top + monthOfYear * cellSize;
    const elements = [svgText(label, {
      x: LAYOUT.left - 7, y: y + cellSize * 0.68, 'font-size': 9, 'text-anchor': 'end',
      fill: inSeason ? COLORS.criticalText : COLORS.label, 'font-weight': inSeason ? 700 : 400,
    })];
    if (inSeason) {
      elements.push(svgElement('rect', { x: LAYOUT.left - 3.5, y: y + 0.5, width: 2.2, height: cellSize - 1, fill: COLORS.critical }));
    }
    return elements;
  });
}

function monthCells(result, summary, geometry, edges) {
  const elements = [];
  for (let yearOffset = 0; yearOffset < geometry.yearCount; yearOffset += 1) {
    for (let monthOfYear = 0; monthOfYear < MONTHS_PER_YEAR; monthOfYear += 1) {
      elements.push(...monthCell(result, summary, geometry, edges, yearOffset, monthOfYear));
    }
  }
  return elements;
}

function monthCell(result, summary, { cellSize }, edges, yearOffset, monthOfYear) {
  const monthIndex = yearOffset * MONTHS_PER_YEAR + monthOfYear;
  const x = LAYOUT.left + yearOffset * cellSize + LAYOUT.gap / 2;
  const y = LAYOUT.top + monthOfYear * cellSize + LAYOUT.gap / 2;
  const size = cellSize - LAYOUT.gap;
  const base = { 'data-month-index': monthIndex, x, y, width: size, height: size, rx: 2, class: 'calendar-cell' };
  if (monthIndex > result.recordWindow.lastMonthIndex) {
    return [svgElement('rect', { ...base, fill: 'none', stroke: '#2d3741', 'stroke-dasharray': '2 2' })];
  }
  const flags = monthFlags(result, summary.range, monthIndex);
  const fill = flags.hasNoData ? `url(#${PATTERN_PREFIX}-no-data)` : sequentialColor(result.harmonized[monthIndex], edges);
  const elements = [svgElement('rect', { ...base, fill, opacity: flags.isOutOfRange ? OUT_OF_RANGE_OPACITY : 1 })];
  if (flags.isPartial && !flags.hasNoData) {
    elements.push(svgElement('rect', { x, y, width: size, height: size, rx: 2, fill: `url(#${PATTERN_PREFIX}-partial)`, 'pointer-events': 'none' }));
  }
  if (flags.hasLowCoverage && !flags.hasNoData) {
    elements.push(svgElement('circle', { cx: x + size - 3, cy: y + 3, r: 1.5, fill: '#fff', 'fill-opacity': flags.isOutOfRange ? 0.25 : 0.85, 'pointer-events': 'none' }));
  }
  return elements;
}

function monthlyAverageBars(result, summary, { cellSize, gridWidth }) {
  const averages = monthlyAveragesInRange(result, summary);
  const maximum = Math.max(...averages, 1);
  const x = LAYOUT.left + gridWidth + 8;
  const barWidth = LAYOUT.right - 14;
  return [
    svgText('Avg / month', { x, y: LAYOUT.top - 6, 'font-size': 8.5, fill: COLORS.caption }),
    ...averages.flatMap((average, monthOfYear) => {
      const y = LAYOUT.top + monthOfYear * cellSize;
      return [
        svgElement('rect', {
          x, y: y + 3, width: Math.max((average / maximum) * barWidth, 0.5), height: cellSize - 6, 'fill-opacity': 0.8, 'pointer-events': 'none',
          fill: isInSeason(summary.season, monthOfYear) ? COLORS.critical : COLORS.series,
        }),
        svgElement('rect', { 'data-month-of-year': monthOfYear, x: x - 2, y, width: barWidth + 6, height: cellSize, fill: 'transparent', class: 'chart-hit' }),
      ];
    }),
  ];
}

function monthlyAveragesInRange(result, summary) {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, monthOfYear) => {
    const values = [];
    for (let monthIndex = monthOfYear; monthIndex <= result.recordWindow.lastMonthIndex; monthIndex += MONTHS_PER_YEAR) {
      if (contains(summary.range, monthIndex) && summary.isComparable(monthIndex)) {
        values.push(result.harmonized[monthIndex]);
      }
    }
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  });
}

function yearLabelColor(year) {
  return year % HIGHLIGHTED_YEAR_STEP === 1 ? COLORS.strong : COLORS.faint;
}

function bindTooltips(svg, result, summary, tooltip) {
  svg.addEventListener('mousemove', (event) => {
    const content = tooltipContentFor(event.target, result, summary);
    if (content) {
      tooltip.show(content, event);
    } else {
      tooltip.hide();
    }
  });
  svg.addEventListener('mouseleave', tooltip.hide);
}

function tooltipContentFor(target, result, summary) {
  const yearBar = target.closest('[data-year]');
  if (yearBar) {
    return yearTooltip(summary, Number(yearBar.dataset.year));
  }
  const monthBar = target.closest('[data-month-of-year]');
  if (monthBar) {
    return seasonalMonthTooltip(summary, Number(monthBar.dataset.monthOfYear));
  }
  const cell = target.closest('[data-month-index]');
  return cell ? monthCellTooltip(result, summary, Number(cell.dataset.monthIndex)) : null;
}
