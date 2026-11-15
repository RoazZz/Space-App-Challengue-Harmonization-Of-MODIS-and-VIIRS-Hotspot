import { quantile } from '../analysis/statistics.js';

export const SEQUENTIAL_COLORS = Object.freeze(['#2c115f', '#51127c', '#812581', '#b5367a', '#e55064', '#fb8761', '#fec287', '#fcfdbf']);
export const ZERO_COLOR = '#1d242c';
export const DARK_TEXT_CLASS_LIMIT = 4;

const VISIBLE_MINIMUM = 0.5;
const CLASS_COUNT = SEQUENTIAL_COLORS.length;
const MIN_RANGE_RATIO = 8;

export function logClassEdges(values) {
  const positive = values.filter((value) => value >= VISIBLE_MINIMUM);
  const low = Math.max(1, positive.length ? quantile(positive, 0.03) : 1);
  const high = Math.max(positive.length ? Math.max(...positive) : MIN_RANGE_RATIO, low * MIN_RANGE_RATIO);
  const edges = [];
  for (let classIndex = 1; classIndex < CLASS_COUNT; classIndex += 1) {
    const previous = edges[edges.length - 1] ?? 0;
    edges.push(Math.max(previous + 1, roundToTwoSignificantDigits(low * (high / low) ** (classIndex / CLASS_COUNT))));
  }
  return edges;
}

export function sequentialColor(value, edges) {
  if (value < VISIBLE_MINIMUM) {
    return ZERO_COLOR;
  }
  const classIndex = edges.findIndex((edge) => value < edge);
  return SEQUENTIAL_COLORS[classIndex === -1 ? CLASS_COUNT - 1 : classIndex];
}

function roundToTwoSignificantDigits(value) {
  const magnitude = 10 ** (Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}

export const DENSITY_CLASS_EDGES = Object.freeze([0.25, 0.5, 1, 2, 4, 8, 16]);

export function densityColor(density) {
  const classIndex = DENSITY_CLASS_EDGES.findIndex((edge) => density < edge);
  return SEQUENTIAL_COLORS[classIndex === -1 ? CLASS_COUNT - 1 : classIndex];
}

export const DIVERGING_COLORS = Object.freeze(['#2166ac', '#4393c3', '#92c5de', '#4b535c', '#f4a582', '#d6604d', '#b2182b']);
export const DIVERGING_RATIO_EDGES = Object.freeze([0.25, 0.5, 0.8, 1.25, 2, 4]);
export const DIVERGING_LABELS = Object.freeze(['≤ −75%', '−75 to −50%', '−50 to −20%', '−20 to +25%', '+25 to +100%', '+100 to +300%', '> +300%']);
export const NEUTRAL_DIVERGING_CLASS = 3;

export function divergingClassIndex(ratio) {
  const classIndex = DIVERGING_RATIO_EDGES.findIndex((edge) => ratio < edge);
  return classIndex === -1 ? DIVERGING_COLORS.length - 1 : classIndex;
}
