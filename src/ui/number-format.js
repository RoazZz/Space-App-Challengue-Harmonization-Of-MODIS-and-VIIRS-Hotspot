const integerFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const COMPACT_STEPS = Object.freeze([
  { minimum: 1e7, divisor: 1e6, suffix: 'M', digits: 0 },
  { minimum: 1e6, divisor: 1e6, suffix: 'M', digits: 1 },
  { minimum: 1e4, divisor: 1e3, suffix: 'k', digits: 0 },
  { minimum: 1e3, divisor: 1e3, suffix: 'k', digits: 1 },
]);
const MISSING_VALUE = '—';

export function formatInteger(value) {
  return Number.isFinite(value) ? integerFormat.format(value) : MISSING_VALUE;
}

export function formatCoordinate(value) {
  return value.toFixed(3);
}

export function formatCompact(value) {
  if (!Number.isFinite(value)) {
    return MISSING_VALUE;
  }
  const step = COMPACT_STEPS.find(({ minimum }) => Math.abs(value) >= minimum);
  return step ? `${(value / step.divisor).toFixed(step.digits)}${step.suffix}` : String(Math.round(value));
}

export function formatSignedPercent(ratio) {
  if (!Number.isFinite(ratio)) {
    return MISSING_VALUE;
  }
  const percent = Math.round(ratio * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}
