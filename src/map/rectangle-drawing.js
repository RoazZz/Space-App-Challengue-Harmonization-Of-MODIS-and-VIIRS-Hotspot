import { setDrawingCursor } from './map-view.js';

const SKETCH_STYLE = Object.freeze({ color: '#ff6b35', weight: 2, fillOpacity: 0.08, dashArray: '5 4' });
const MIN_SIDE_DEGREES = 0.05;

export function createRectangleDrawing(leaflet, map) {
  let callbacks = null;
  let startLatLng = null;
  let sketch = null;

  function start(drawingCallbacks) {
    cancel();
    callbacks = drawingCallbacks;
    map.dragging.disable();
    setDrawingCursor(map, true);
    map.on('mousedown', beginSketch);
    map.on('mousemove', updateSketch);
    map.on('mouseup', completeSketch);
  }

  function cancel() {
    if (!callbacks) {
      return;
    }
    map.off('mousedown', beginSketch);
    map.off('mousemove', updateSketch);
    map.off('mouseup', completeSketch);
    removeSketch();
    map.dragging.enable();
    setDrawingCursor(map, false);
    callbacks = null;
  }

  function beginSketch(event) {
    startLatLng = event.latlng;
    sketch = leaflet.rectangle(leaflet.latLngBounds(startLatLng, startLatLng), SKETCH_STYLE).addTo(map);
  }

  function updateSketch(event) {
    if (sketch) {
      sketch.setBounds(leaflet.latLngBounds(startLatLng, event.latlng));
    }
  }

  function completeSketch(event) {
    if (!startLatLng) {
      return;
    }
    const bounds = boundsBetween(startLatLng, event.latlng);
    const { onComplete, onInvalid } = callbacks;
    cancel();
    if (isTooSmall(bounds)) {
      onInvalid();
      return;
    }
    onComplete(bounds);
  }

  function removeSketch() {
    if (sketch) {
      sketch.remove();
    }
    sketch = null;
    startLatLng = null;
  }

  return { start, cancel, isActive: () => callbacks !== null };
}

function boundsBetween(first, second) {
  return {
    south: Math.min(first.lat, second.lat),
    north: Math.max(first.lat, second.lat),
    west: Math.min(first.lng, second.lng),
    east: Math.max(first.lng, second.lng),
  };
}

function isTooSmall({ south, north, west, east }) {
  return north - south < MIN_SIDE_DEGREES || east - west < MIN_SIDE_DEGREES;
}
