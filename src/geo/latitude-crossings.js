export function createLatitudeScanner(polygons) {
  const rings = polygons.flatMap((polygon) => polygon.map(withLatitudeExtent));
  return (latitude) => {
    const crossings = rings
      .filter(({ south, north }) => latitude >= south && latitude <= north)
      .flatMap(({ ring }) => ringCrossings(ring, latitude));
    crossings.sort((first, second) => first - second);
    return pairUp(crossings);
  };
}

function withLatitudeExtent(ring) {
  const latitudes = ring.map(([, latitude]) => latitude);
  return { ring, south: Math.min(...latitudes), north: Math.max(...latitudes) };
}

function pairUp(crossings) {
  const intervals = [];
  for (let index = 0; index + 1 < crossings.length; index += 2) {
    intervals.push([crossings[index], crossings[index + 1]]);
  }
  return intervals;
}

function ringCrossings(ring, latitude) {
  const crossings = [];
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [longitude, edgeLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    if ((edgeLatitude > latitude) !== (previousLatitude > latitude)) {
      const progress = (latitude - edgeLatitude) / (previousLatitude - edgeLatitude);
      crossings.push(longitude + progress * (previousLongitude - longitude));
    }
  }
  return crossings;
}
