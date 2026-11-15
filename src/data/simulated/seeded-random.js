const UINT32_RANGE = 4294967296;
const LARGE_MEAN_THRESHOLD = 30;

export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function hashIntegers(...values) {
  return values.reduce((hash, value) => {
    const mixed = (hash ^ ((value | 0) + 0x9e3779b9 + (hash << 6) + (hash >>> 2))) >>> 0;
    return Math.imul(mixed, 16777619) >>> 0;
  }, 2166136261);
}

export function approximateGaussian(random) {
  return (random() + random() + random() - 1.5) * 2;
}

export function poisson(random, mean) {
  if (!(mean > 0)) {
    return 0;
  }
  if (mean > LARGE_MEAN_THRESHOLD) {
    return Math.max(0, Math.round(mean + Math.sqrt(mean) * approximateGaussian(random)));
  }
  const limit = Math.exp(-mean);
  let count = -1;
  let product = 1;
  do {
    count += 1;
    product *= random();
  } while (product > limit);
  return count;
}
