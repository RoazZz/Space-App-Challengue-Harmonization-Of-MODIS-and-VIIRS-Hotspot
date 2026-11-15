export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values) {
  return values.length ? sum(values) / values.length : Number.NaN;
}

export function standardDeviation(values) {
  if (values.length < 2) {
    return Number.NaN;
  }
  const average = mean(values);
  return Math.sqrt(sum(values.map((value) => (value - average) ** 2)) / (values.length - 1));
}

export function quantile(values, probability) {
  if (!values.length) {
    return Number.NaN;
  }
  const sorted = [...values].sort((first, second) => first - second);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function median(values) {
  return quantile(values, 0.5);
}
