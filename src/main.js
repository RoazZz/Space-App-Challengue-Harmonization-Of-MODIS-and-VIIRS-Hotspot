import { APP_CONFIG } from './config.js';
import { createBoundaryCatalog } from './data/boundary-catalog.js';
import { createAreaLayer } from './map/area-layer.js';
import { createBaseLayers } from './map/base-layers.js';
import { createMap } from './map/map-view.js';
import { createPointPicking } from './map/point-picking.js';
import { createPolygonDrawing } from './map/polygon-drawing.js';
import { createRectangleDrawing } from './map/rectangle-drawing.js';
import { createAreaSection } from './ui/area-section.js';
import { createAreaSummary } from './ui/area-summary.js';
import { bindBaseLayerPicker } from './ui/base-layer-picker.js';
import { createCircleForm } from './ui/circle-form.js';
import { trackCursorCoordinates } from './ui/cursor-coordinates.js';
import { bindPanelVisibility } from './ui/panel-visibility.js';
import { createPresetPicker } from './ui/preset-picker.js';
import { createToast } from './ui/toast.js';

const BOUNDARY_LOAD_ERROR = 'Boundaries could not be loaded. Check your connection and try again.';
const INVALID_COORDINATES = 'Enter a valid latitude (−90 to 90) and longitude (−180 to 180).';

const leaflet = window.L;
const byId = (id) => document.getElementById(id);
const allOf = (selector) => Array.from(document.querySelectorAll(selector));

const map = createMap(leaflet, 'map');
bindBaseLayerPicker(allOf('[data-base-layer]'), createBaseLayers(leaflet, map));
trackCursorCoordinates(map, byId('cursor-coordinates'));

const toast = createToast(byId('toast'));
const panelVisibility = bindPanelVisibility(byId('panel-visibility-button'), map);
const areaLayer = createAreaLayer(leaflet, map);
const areaSummary = createAreaSummary(byId('area-summary'));

function selectArea(area) {
  areaLayer.show(area);
  areaLayer.fit(area, panelVisibility.fitPadding());
  areaSummary.show(area);
}

const areaSection = createAreaSection({
  elements: {
    modeButtons: allOf('[data-area-mode]'),
    panes: allOf('[data-area-pane]'),
    rectangleButton: byId('rectangle-button'),
    polygonStartButton: byId('polygon-start-button'),
    polygonUndoButton: byId('polygon-undo-button'),
    polygonFinishButton: byId('polygon-finish-button'),
  },
  tools: {
    rectangle: createRectangleDrawing(leaflet, map),
    polygon: createPolygonDrawing(leaflet, map),
    pointPicking: createPointPicking(map),
  },
  presetPicker: createPresetPicker({
    elements: {
      countrySelect: byId('country-select'),
      subdivisionSelect: byId('subdivision-select'),
      subdivisionField: byId('subdivision-field'),
    },
    catalog: createBoundaryCatalog(APP_CONFIG.boundaryPaths),
    initialCountryId: APP_CONFIG.initialCountryId,
    onAreaSelected: selectArea,
    onLoadError: () => toast.show(BOUNDARY_LOAD_ERROR),
  }),
  circleForm: createCircleForm({
    latitudeInput: byId('circle-latitude'),
    longitudeInput: byId('circle-longitude'),
    radiusInput: byId('circle-radius'),
    applyButton: byId('circle-apply-button'),
    onAreaSelected: selectArea,
    onInvalid: () => toast.show(INVALID_COORDINATES),
  }),
  getMapCenter: () => {
    const center = map.getCenter();
    return { latitude: center.lat, longitude: center.lng };
  },
  notify: toast.show,
  onAreaSelected: selectArea,
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    areaSection.cancelDrawing();
  }
});

areaSection.initialize();
