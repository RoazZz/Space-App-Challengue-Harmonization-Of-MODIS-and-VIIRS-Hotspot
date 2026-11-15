import { seasonLabel } from '../analysis/critical-periods.js';
import { formatCompact } from '../ui/number-format.js';
import { DARK_TEXT_CLASS_LIMIT, SEQUENTIAL_COLORS, ZERO_COLOR } from './color-scales.js';
import { hatchPatternDefinitions, svgElement } from './svg.js';

const LEGEND_PATTERN_PREFIX = 'calendar-legend';

export function renderBurnCalendarLegend(container, edges, summary) {
  container.replaceChildren(
    legendRow([legendText('Detections / month:'), colorRamp(edges)]),
    legendRow([
      legendItem(icon([svgElement('rect', { x: 1, y: 1, width: 11, height: 11, rx: 2, fill: 'none', stroke: '#4a5562', 'stroke-dasharray': '2 2' })]), 'No data yet'),
      legendItem(icon([hatchPatternDefinitions(LEGEND_PATTERN_PREFIX), svgElement('rect', { width: 13, height: 13, rx: 2, fill: '#b5367a' }),
        svgElement('rect', { width: 13, height: 13, rx: 2, fill: `url(#${LEGEND_PATTERN_PREFIX}-partial)` })]), 'Partial month'),
      legendItem(icon([svgElement('rect', { width: 13, height: 13, rx: 2, fill: '#51127c' }), svgElement('circle', { cx: 10, cy: 3, r: 1.5, fill: '#fff' })]), 'Low observation coverage'),
      legendItem(icon([svgElement('rect', { width: 13, height: 13, rx: 2, fill: '#b5367a', opacity: 0.25 })]), 'Outside date range'),
    ]),
    legendRow([
      legendItem(icon([svgElement('rect', { x: 1, y: 4, width: 11, height: 9, fill: '#ff6b35' }), svgElement('path', { d: 'M3.5,3.5h6l-3,-3.5z', fill: '#ff6b35' })]),
        `Critical year: total above the 90th percentile of ${summary.baseline.firstYear}–${summary.baseline.lastYear}`),
      legendItem(icon([svgElement('rect', { x: 5, y: 0, width: 2.5, height: 13, fill: '#ff6b35' })]),
        `Critical season: ${seasonLabel(summary.season)} (${summary.season ? Math.round(summary.season.share * 100) : '—'}% of yearly activity)`),
    ]),
  );
}

function colorRamp(edges) {
  const ramp = document.createElement('div');
  ramp.className = 'color-ramp';
  ramp.append(rampBox(ZERO_COLOR, '0', true));
  SEQUENTIAL_COLORS.forEach((color, classIndex) => ramp.append(rampBox(color, rampLabel(edges, classIndex), classIndex < DARK_TEXT_CLASS_LIMIT)));
  return ramp;
}

function rampLabel(edges, classIndex) {
  if (classIndex === 0) {
    return `<${formatCompact(edges[0])}`;
  }
  if (classIndex === SEQUENTIAL_COLORS.length - 1) {
    return `≥${formatCompact(edges[edges.length - 1])}`;
  }
  return formatCompact(edges[classIndex - 1]);
}

function rampBox(color, label, hasLightText) {
  const box = document.createElement('div');
  box.className = hasLightText ? 'ramp-box light-text' : 'ramp-box';
  box.style.background = color;
  box.textContent = label;
  return box;
}

function legendRow(children) {
  const row = document.createElement('div');
  row.className = 'legend';
  row.append(...children);
  return row;
}

function legendItem(iconElement, text) {
  const item = document.createElement('span');
  item.className = 'legend-item';
  item.append(iconElement, document.createTextNode(text));
  return item;
}

function legendText(text) {
  const element = document.createElement('span');
  element.className = 'legend-item';
  element.textContent = text;
  return element;
}

function icon(children) {
  return svgElement('svg', { width: 13, height: 13 }, children);
}
