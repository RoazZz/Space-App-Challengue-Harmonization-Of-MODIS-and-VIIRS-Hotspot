export function createPointPicking(map) {
  let pickHandler = null;

  function handleClick(event) {
    pickHandler({ latitude: event.latlng.lat, longitude: event.latlng.lng });
  }

  function enable(onPick) {
    disable();
    pickHandler = onPick;
    map.on('click', handleClick);
  }

  function disable() {
    if (pickHandler) {
      map.off('click', handleClick);
    }
    pickHandler = null;
  }

  return { enable, disable };
}
