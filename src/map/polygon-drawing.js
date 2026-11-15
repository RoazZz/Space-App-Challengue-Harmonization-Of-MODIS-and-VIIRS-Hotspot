import { setDrawingCursor } from './map-view.js';
import { toPosition } from './positions.js';

const SKETCH_STYLE = Object.freeze({ color: '#ff6b35', weight: 2, dashArray: '5 4' });
const VERTEX_STYLE = Object.freeze({ radius: 3, color: '#ff6b35', fillColor: '#ff6b35', fillOpacity: 1 });
const MIN_VERTEX_SEPARATION_DEGREES = 0.02;
const MIN_VERTICES = 3;
const DOUBLE_CLICK_ZOOM_RESTORE_DELAY_MS = 300;

export function createPolygonDrawing(leaflet, map) {
  const sketchGroup = leaflet.layerGroup().addTo(map);
  let callbacks = null;
  let vertices = [];
  let outline = null;

  function start(drawingCallbacks) {
    cancel();
    callbacks = drawingCallbacks;
    map.doubleClickZoom.disable();
    setDrawingCursor(map, true);
    map.on('click', addVertex);
    map.on('mousemove', followCursor);
    map.on('dblclick', finish);
  }

  function cancel() {
    if (!callbacks) {
      return;
    }
    map.off('click', addVertex);
    map.off('mousemove', followCursor);
    map.off('dblclick', finish);
    clearSketch();
    setDrawingCursor(map, false);
    setTimeout(() => map.doubleClickZoom.enable(), DOUBLE_CLICK_ZOOM_RESTORE_DELAY_MS);
    callbacks = null;
  }

  function undo() {
    vertices.pop();
    redrawSketch();
  }

  function finish() {
    if (!callbacks) {
      return;
    }
    const distinctVertices = withoutCloseNeighbors(vertices);
    if (distinctVertices.length < MIN_VERTICES) {
      callbacks.onInvalid();
      return;
    }
    const { onComplete } = callbacks;
    cancel();
    onComplete(distinctVertices.map(toPosition));
  }

  function addVertex(event) {
    vertices.push(event.latlng);
    redrawSketch();
  }

  function followCursor(event) {
    if (outline) {
      outline.setLatLngs([...vertices, event.latlng]);
    }
  }

  function redrawSketch() {
    sketchGroup.clearLayers();
    outline = vertices.length ? leaflet.polyline(vertices, SKETCH_STYLE).addTo(sketchGroup) : null;
    vertices.forEach((vertex) => leaflet.circleMarker(vertex, VERTEX_STYLE).addTo(sketchGroup));
  }

  function clearSketch() {
    vertices = [];
    redrawSketch();
  }

  return { start, cancel, undo, finish, isActive: () => callbacks !== null };
}

function withoutCloseNeighbors(latLngs) {
  return latLngs.reduce((kept, latLng) => {
    const last = kept[kept.length - 1];
    if (!last || separationDegrees(last, latLng) > MIN_VERTEX_SEPARATION_DEGREES) {
      kept.push(latLng);
    }
    return kept;
  }, []);
}

function separationDegrees(first, second) {
  return Math.abs(first.lat - second.lat) + Math.abs(first.lng - second.lng);
}
