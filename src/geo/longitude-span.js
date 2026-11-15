import { FULL_TURN_DEGREES, normalizeLongitude } from './longitude.js';

export const WHOLE_WORLD_SPAN = Object.freeze({ west: -180, east: 180 });

export function longitudeExtent(positions) {
  const longitudes = positions.map(([longitude]) => longitude);
  return { west: Math.min(...longitudes), east: Math.max(...longitudes) };
}

export function coveringLongitudeSpan(extents) {
  if (extents.some(coversFullTurn)) {
    return WHOLE_WORLD_SPAN;
  }
  const merged = mergeOverlapping(extents.map(toNormalizedExtent).sort(byWest));
  const largestGap = findLargestGap(merged);
  if (largestGap.size <= 0) {
    return WHOLE_WORLD_SPAN;
  }
  return { west: largestGap.nextWest, east: largestGap.nextWest + FULL_TURN_DEGREES - largestGap.size };
}

function coversFullTurn(extent) {
  return extent.east - extent.west >= FULL_TURN_DEGREES;
}

function toNormalizedExtent(extent) {
  const west = normalizeLongitude(extent.west);
  return { west, east: west + (extent.east - extent.west) };
}

function byWest(first, second) {
  return first.west - second.west;
}

function mergeOverlapping(sortedExtents) {
  return sortedExtents.reduce((merged, extent) => {
    const last = merged[merged.length - 1];
    if (last && extent.west <= last.east) {
      last.east = Math.max(last.east, extent.east);
    } else {
      merged.push({ ...extent });
    }
    return merged;
  }, []);
}

function findLargestGap(merged) {
  return merged.reduce((largest, current, index) => {
    const isLast = index === merged.length - 1;
    const next = merged[isLast ? 0 : index + 1];
    const nextWest = isLast ? next.west + FULL_TURN_DEGREES : next.west;
    const size = nextWest - current.east;
    return size > largest.size ? { size, nextWest: next.west } : largest;
  }, { size: -Infinity, nextWest: 0 });
}
