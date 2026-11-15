import { AREA_SHAPE } from '../geo/area-of-interest.js';
import { toLatLng } from './positions.js';

const AREA_STYLE = Object.freeze({ color: '#ff6b35', weight: 2, fillColor: '#ff6b35', fillOpacity: 0.05 });
const CENTER_MARKER_STYLE = Object.freeze({ radius: 3, color: '#ff6b35', fillOpacity: 1 });
const MAX_FIT_ZOOM = 9;
const METERS_PER_KM = 1000;

export function createAreaLayer(leaflet, map) {
  const layerGroup = leaflet.layerGroup().addTo(map);

  const drawers = {
    [AREA_SHAPE.POLYGONS]: ({ polygons }) => [
      leaflet.polygon(polygons.map((polygon) => polygon.map((ring) => ring.map(toLatLng))), AREA_STYLE),
    ],
    [AREA_SHAPE.CIRCLE]: ({ center, radiusKm }) => {
      const centerLatLng = [center.latitude, center.longitude];
      return [
        leaflet.circle(centerLatLng, { ...AREA_STYLE, radius: radiusKm * METERS_PER_KM }),
        leaflet.circleMarker(centerLatLng, CENTER_MARKER_STYLE),
      ];
    },
  };

  function show(area) {
    layerGroup.clearLayers();
    drawers[area.shape.type](area.shape).forEach((layer) => layer.addTo(layerGroup));
  }

  function fit({ bounds }, padding) {
    map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { ...padding, maxZoom: MAX_FIT_ZOOM, animate: false });
  }

  return { show, fit };
}
