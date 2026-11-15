const integerFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatInteger(value) {
  return integerFormat.format(value);
}

export function formatCoordinate(value) {
  return value.toFixed(3);
}
