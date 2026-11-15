const TARGET_TICK_COUNT = 4;

export function niceTicks(maximum) {
  const span = maximum || 1;
  const rawStep = span / TARGET_TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = magnitude * niceMultiplier(rawStep / magnitude);
  const ticks = [];
  for (let value = 0; value < span + step; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return ticks;
}

export function logTicks(maximum) {
  const ticks = [];
  for (let exponent = 0; exponent <= Math.max(1, Math.ceil(Math.log10(1 + maximum))); exponent += 1) {
    ticks.push(10 ** exponent);
  }
  return ticks;
}

function niceMultiplier(ratio) {
  if (ratio >= 7.5) {
    return 10;
  }
  if (ratio >= 3.5) {
    return 5;
  }
  return ratio >= 1.5 ? 2 : 1;
}
