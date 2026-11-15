export const BASE_LAYER = Object.freeze({ DARK: 'dark', SATELLITE: 'satellite' });

const ESRI_SERVICES = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_CANVAS_ATTRIBUTION = 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const ESRI_IMAGERY_ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics';

const esriTiles = (service, options) => ({ url: `${ESRI_SERVICES}/${service}/MapServer/tile/{z}/{y}/{x}`, options });

const TILE_SOURCES = Object.freeze({
  darkMap: esriTiles('Canvas/World_Dark_Gray_Base', { maxZoom: 16, attribution: ESRI_CANVAS_ATTRIBUTION }),
  darkLabels: esriTiles('Canvas/World_Dark_Gray_Reference', { maxZoom: 16, pane: 'shadowPane' }),
  satelliteImagery: esriTiles('World_Imagery', { maxZoom: 18, attribution: ESRI_IMAGERY_ATTRIBUTION }),
  satelliteLabels: esriTiles('Reference/World_Boundaries_and_Places', { maxZoom: 18, pane: 'shadowPane' }),
});

export function createBaseLayers(leaflet, map) {
  const tileLayer = ({ url, options }) => leaflet.tileLayer(url, options);
  const layerGroups = {
    [BASE_LAYER.DARK]: leaflet.layerGroup([tileLayer(TILE_SOURCES.darkMap), tileLayer(TILE_SOURCES.darkLabels)]),
    [BASE_LAYER.SATELLITE]: leaflet.layerGroup([tileLayer(TILE_SOURCES.satelliteImagery), tileLayer(TILE_SOURCES.satelliteLabels)]),
  };
  let currentName = null;

  function show(name) {
    if (currentName) {
      map.removeLayer(layerGroups[currentName]);
    }
    layerGroups[name].addTo(map);
    currentName = name;
  }

  return { show };
}
