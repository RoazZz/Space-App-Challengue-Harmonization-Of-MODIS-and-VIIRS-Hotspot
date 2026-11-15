const WORLD_VIEW = Object.freeze({ center: [20, 0], zoom: 2 });
const ZOOM_LIMITS = Object.freeze({ min: 2, max: 12 });
const LEAFLET_LINK = '<a href="https://leafletjs.com">Leaflet</a>';
const DRAWING_CLASS = 'is-drawing';

export function createMap(leaflet, containerId) {
  const map = leaflet.map(containerId, {
    zoomControl: false,
    preferCanvas: true,
    minZoom: ZOOM_LIMITS.min,
    maxZoom: ZOOM_LIMITS.max,
  }).setView(WORLD_VIEW.center, WORLD_VIEW.zoom);
  leaflet.control.zoom({ position: 'bottomright' }).addTo(map);
  leaflet.control.scale({ position: 'bottomright', imperial: false }).addTo(map);
  map.attributionControl.setPosition('bottomright');
  map.attributionControl.setPrefix(LEAFLET_LINK);
  return map;
}

export function setDrawingCursor(map, isDrawing) {
  map.getContainer().classList.toggle(DRAWING_CLASS, isDrawing);
}
