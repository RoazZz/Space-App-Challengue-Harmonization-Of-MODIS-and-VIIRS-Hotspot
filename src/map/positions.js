export function toLatLng([longitude, latitude]) {
  return [latitude, longitude];
}

export function toPosition(latLng) {
  return [latLng.lng, latLng.lat];
}
