import { MONTH_ABBREVIATIONS, MONTHS_PER_YEAR, monthIndexOf } from '../time/month-index.js';
import { formatCompact, formatInteger } from '../ui/number-format.js';
import { niceTicks } from './axis-ticks.js';
import { hatchPatternDefinitions, svgElement, svgText } from './svg.js';

const LAYOUT = Object.freeze({ width: 548, height: 178, left: 46, right: 12, top: 12, bottom: 26 });
const INNER = Object.freeze({ width: LAYOUT.width - LAYOUT.left - LAYOUT.right, height: LAYOUT.height - LAYOUT.top - LAYOUT.bottom });
const BAR_COLOR = '#F0E442';
const PATTERN_PREFIX = 'focus';

export function renderYearInFocus({ container, result, summary, year }) {
  const values = Array.from({ length: MONTHS_PER_YEAR }, (_, monthOfYear) => result.harmonized[monthIndexOf(year, monthOfYear)]);
  const { baseline } = summary;
  const maximum = Math.max(1, ...[...values, ...baseline.upperQuartiles, ...baseline.values].filter(Number.isFinite));
  const ticks = niceTicks(maximum);
  const top = ticks[ticks.length - 1];
  const y = (value) => LAYOUT.top + INNER.height - (value / top) * INNER.height;
  const barWidth = INNER.width / MONTHS_PER_YEAR;
  const svg = svgElement('svg', { viewBox: `0 0 ${LAYOUT.width} ${LAYOUT.height}`, width: '100%' }, [
    hatchPatternDefinitions(PATTERN_PREFIX),
    ...ticks.flatMap((tick) => [
      svgElement('line', { x1: LAYOUT.left, x2: LAYOUT.width - LAYOUT.right, y1: y(tick), y2: y(tick), stroke: '#222b34' }),
      svgText(formatCompact(tick), { x: LAYOUT.left - 6, y: y(tick) + 3, 'font-size': 9, fill: '#7f8c99', 'text-anchor': 'end' }),
    ]),
    ...values.flatMap((value, monthOfYear) => monthElements({ value, monthOfYear, year, baseline, y, barWidth, result })),
  ]);
  container.replaceChildren(svg);
}

function monthElements({ value, monthOfYear, year, baseline, y, barWidth, result }) {
  const x = LAYOUT.left + monthOfYear * barWidth;
  const elements = [];
  if (Number.isFinite(baseline.lowerQuartiles[monthOfYear])) {
    elements.push(svgElement('rect', { x: x + 3, y: y(baseline.upperQuartiles[monthOfYear]), width: barWidth - 6, height: Math.max(1, y(baseline.lowerQuartiles[monthOfYear]) - y(baseline.upperQuartiles[monthOfYear])), fill: '#8d9aa7', 'fill-opacity': 0.18 }));
  }
  if (Number.isFinite(value)) {
    const bar = { x: x + barWidth * 0.27, y: y(value), width: barWidth * 0.46, height: Math.max(0.5, y(0) - y(value)) };
    elements.push(svgElement('rect', { ...bar, fill: BAR_COLOR, 'fill-opacity': 0.85 }, [svgElement('title', {}, [`${MONTH_ABBREVIATIONS[monthOfYear]} ${year}: ${formatInteger(value)}`])]));
    if (monthIndexOf(year, monthOfYear) === result.recordWindow.lastMonthIndex) {
      elements.push(svgElement('rect', { ...bar, fill: `url(#${PATTERN_PREFIX}-partial)` }));
    }
  }
  if (Number.isFinite(baseline.values[monthOfYear])) {
    elements.push(svgElement('line', { x1: x + 4, x2: x + barWidth - 4, y1: y(baseline.values[monthOfYear]), y2: y(baseline.values[monthOfYear]), stroke: '#fff', 'stroke-width': 2 }));
  }
  elements.push(svgText(MONTH_ABBREVIATIONS[monthOfYear], { x: x + barWidth / 2, y: LAYOUT.height - 9, 'font-size': 9.5, fill: '#9aa7b4', 'text-anchor': 'middle' }));
  return elements;
}
