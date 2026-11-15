export const BASE_LAYER = Object.freeze({ DARK: 'dark', SATELLITE: 'satellite' });

const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ESRI_ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics';

const TILE_SOURCES = Object.freeze({
  darkMap: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { subdomains: 'abcd', maxZoom: 19, attribution: CARTO_ATTRIBUTION },
  },
  darkLabels: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    options: { subdomains: 'abcd', maxZoom: 19, pane: 'shadowPane', attribution: CARTO_ATTRIBUTION },
  },
  satelliteImagery: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 18, attribution: ESRI_ATTRIBUTION },
  },
});

export function createBaseLayers(leaflet, map) {
  const tileLayer = ({ url, options }) => leaflet.tileLayer(url, options);
  const layerGroups = {
    [BASE_LAYER.DARK]: leaflet.layerGroup([tileLayer(TILE_SOURCES.darkMap)]),
    [BASE_LAYER.SATELLITE]: leaflet.layerGroup([tileLayer(TILE_SOURCES.satelliteImagery), tileLayer(TILE_SOURCES.darkLabels)]),
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
