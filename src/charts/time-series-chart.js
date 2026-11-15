import { formatCompact, formatInteger } from '../ui/number-format.js';
import { logTicks, niceTicks } from './axis-ticks.js';
import { svgElement, svgText } from './svg.js';

const LAYOUT = Object.freeze({ width: 548, height: 252, left: 48, right: 12, top: 14, bottom: 30 });
const INNER = Object.freeze({ width: LAYOUT.width - LAYOUT.left - LAYOUT.right, height: LAYOUT.height - LAYOUT.top - LAYOUT.bottom });
const OVERLAP_COLOR = '#56B4E9';
const BAND_COLOR = '#F0E442';
const MAX_LABELED_POINTS = 14;
const LONG_SPAN_YEARS = 14;

export function renderTimeSeriesChart({ container, data, logScale, tooltip, overlapLabel }) {
  const scale = createScale(data, logScale);
  const crosshair = svgElement('line', { y1: LAYOUT.top, y2: LAYOUT.top + INNER.height, stroke: '#fff', 'stroke-opacity': 0.5, visibility: 'hidden' });
  const hitArea = svgElement('rect', { x: LAYOUT.left, y: LAYOUT.top, width: INNER.width, height: INNER.height, fill: 'transparent' });
  const svg = svgElement('svg', { viewBox: `0 0 ${LAYOUT.width} ${LAYOUT.height}`, width: '100%', role: 'img', 'aria-label': 'Monthly time series' }, [
    ...overlapShading(data, scale, overlapLabel),
    ...gridLines(scale),
    ...xAxisLabels(data, scale),
    ...uncertaintyBand(data, scale),
    ...data.lines.flatMap((line) => linePaths(line, data, scale)),
    crosshair,
    hitArea,
  ]);
  bindCrosshair({ svg, hitArea, crosshair, data, scale, tooltip });
  container.replaceChildren(svg);
}

function createScale(data, logScale) {
  const maximum = Math.max(1, ...data.lines.flatMap(({ values }) => values.filter(Number.isFinite)),
    ...(data.band ? data.band.upper.filter((value, index) => data.isEstimated[index] && Number.isFinite(value)) : []));
  const ticks = logScale ? logTicks(maximum) : niceTicks(maximum);
  const transform = logScale ? (value) => Math.log10(1 + Math.max(0, value)) : (value) => value;
  const top = transform(ticks[ticks.length - 1]);
  const count = data.points.length;
  return {
    ticks,
    x: (index) => LAYOUT.left + (count <= 1 ? INNER.width / 2 : (index / (count - 1)) * INNER.width),
    y: (value) => LAYOUT.top + INNER.height - (transform(value) / top) * INNER.height,
  };
}

function overlapShading(data, scale, overlapLabel) {
  if (data.overlapIndex < 0) {
    return [];
  }
  const x = data.overlapIndex === 0 ? LAYOUT.left : (scale.x(data.overlapIndex - 1) + scale.x(data.overlapIndex)) / 2;
  return [
    svgElement('rect', { x, y: LAYOUT.top, width: LAYOUT.width - LAYOUT.right - x, height: INNER.height, fill: OVERLAP_COLOR, 'fill-opacity': 0.07 }),
    svgElement('line', { x1: x, x2: x, y1: LAYOUT.top, y2: LAYOUT.top + INNER.height, stroke: OVERLAP_COLOR, 'stroke-opacity': 0.6, 'stroke-dasharray': '3 3' }),
    svgText(overlapLabel, { x: x + 5, y: LAYOUT.top + 11, 'font-size': 9.5, fill: '#8fd0f5' }),
  ];
}

function gridLines(scale) {
  return scale.ticks.flatMap((tick) => [
    svgElement('line', { x1: LAYOUT.left, x2: LAYOUT.width - LAYOUT.right, y1: scale.y(tick), y2: scale.y(tick), stroke: '#222b34' }),
    svgText(formatCompact(tick), { x: LAYOUT.left - 6, y: scale.y(tick) + 3, 'font-size': 9, fill: '#7f8c99', 'text-anchor': 'end' }),
  ]);
}

function xAxisLabels(data, scale) {
  const firstYear = data.points[0]?.year ?? 0;
  const spanYears = (data.points[data.points.length - 1]?.year ?? firstYear) - firstYear;
  const yearStep = spanYears > LONG_SPAN_YEARS ? 5 : 2;
  return data.points.flatMap((point, index) => {
    const label = xLabelFor(point, data.points.length, spanYears, yearStep);
    if (!label) {
      return [];
    }
    const x = scale.x(index);
    const baseline = LAYOUT.top + INNER.height;
    return [
      svgElement('line', { x1: x, x2: x, y1: baseline, y2: baseline + 4, stroke: '#55606b' }),
      svgText(label, { x, y: LAYOUT.height - 12, 'font-size': 9.5, fill: '#9aa7b4', 'text-anchor': 'middle' }),
    ];
  });
}

function xLabelFor(point, count, spanYears, yearStep) {
  if (count <= MAX_LABELED_POINTS) {
    return point.label;
  }
  if (!point.isYearStart) {
    return null;
  }
  return spanYears <= 6 || point.year % yearStep === 1 ? String(point.year) : null;
}

function uncertaintyBand(data, scale) {
  if (!data.band) {
    return [];
  }
  const upper = [];
  const lower = [];
  data.points.forEach((_, index) => {
    if (data.isEstimated[index] && Number.isFinite(data.band.upper[index])) {
      upper.push(`${scale.x(index)},${scale.y(data.band.upper[index])}`);
      lower.unshift(`${scale.x(index)},${scale.y(data.band.lower[index])}`);
    }
  });
  return upper.length > 1 ? [svgElement('polygon', { points: [...upper, ...lower].join(' '), fill: BAND_COLOR, 'fill-opacity': 0.14 })] : [];
}

function linePaths(line, data, scale) {
  const style = { fill: 'none', stroke: line.color, 'stroke-width': line.width, 'stroke-opacity': line.opacity ?? 1 };
  if (line.dashBeforeOverlap && data.overlapIndex > 0) {
    return [
      svgElement('path', { ...style, d: pathData(line.values, scale, 0, data.overlapIndex), 'stroke-dasharray': '5 3' }),
      svgElement('path', { ...style, d: pathData(line.values, scale, data.overlapIndex, data.points.length - 1) }),
    ];
  }
  return [svgElement('path', { ...style, d: pathData(line.values, scale, 0, data.points.length - 1), ...(line.dash ? { 'stroke-dasharray': line.dash } : {}) })];
}

function pathData(values, scale, first, last) {
  let path = '';
  let isDrawing = false;
  for (let index = first; index <= last; index += 1) {
    if (!Number.isFinite(values[index])) {
      isDrawing = false;
      continue;
    }
    path += `${isDrawing ? 'L' : 'M'}${scale.x(index).toFixed(1)},${scale.y(values[index]).toFixed(1)}`;
    isDrawing = true;
  }
  return path;
}

function bindCrosshair({ svg, hitArea, crosshair, data, scale, tooltip }) {
  hitArea.addEventListener('mousemove', (event) => {
    const bounds = svg.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * LAYOUT.width;
    const index = Math.max(0, Math.min(data.points.length - 1, Math.round(((pointerX - LAYOUT.left) / INNER.width) * (data.points.length - 1))));
    crosshair.setAttribute('x1', scale.x(index));
    crosshair.setAttribute('x2', scale.x(index));
    crosshair.setAttribute('visibility', 'visible');
    tooltip.show(pointTooltip(data, index), event);
  });
  hitArea.addEventListener('mouseleave', () => {
    crosshair.setAttribute('visibility', 'hidden');
    tooltip.hide();
  });
}

function pointTooltip(data, index) {
  const rows = data.lines.map(({ name, values }) => [name, formatInteger(values[index])]);
  const notes = [];
  if (data.band) {
    notes.push(data.isEstimated[index]
      ? `Modeled from MODIS · ≈68% range ${formatInteger(data.band.lower[index])}–${formatInteger(data.band.upper[index])}`
      : 'Observed VIIRS NOAA-20');
  }
  return { title: data.points[index].label, rows, notes };
}
