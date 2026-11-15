import { createAreaAnalyzer } from './analysis/area-analyzer.js';
import { APP_CONFIG } from './config.js';
import { createBoundaryCatalog } from './data/boundary-catalog.js';
import { loadLandArea } from './data/land-mask.js';
import { createSimulatedFireDataSource } from './data/simulated/simulated-fire-data-source.js';
import { createAreaLayer } from './map/area-layer.js';
import { createBaseLayers } from './map/base-layers.js';
import { createMap } from './map/map-view.js';
import { createPointPicking } from './map/point-picking.js';
import { createPolygonDrawing } from './map/polygon-drawing.js';
import { createRectangleDrawing } from './map/rectangle-drawing.js';
import { createRecordWindow } from './time/record-window.js';
import { createAnalysisView } from './ui/analysis-view.js';
import { createAreaSection } from './ui/area-section.js';
import { createAreaSummary } from './ui/area-summary.js';
import { bindBaseLayerPicker } from './ui/base-layer-picker.js';
import { createCircleForm } from './ui/circle-form.js';
import { trackCursorCoordinates } from './ui/cursor-coordinates.js';
import { bindPanelVisibility } from './ui/panel-visibility.js';
import { waitForPaint } from './ui/paint.js';
import { createPresetPicker } from './ui/preset-picker.js';
import { createToast } from './ui/toast.js';

const BOUNDARY_LOAD_ERROR = 'Boundaries could not be loaded. Check your connection and try again.';
const ANALYSIS_ERROR = 'The harmonized series could not be calculated for this area.';
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
const analysisView = createAnalysisView({
  titleElement: byId('analysis-title'),
  subtitleElement: byId('analysis-subtitle'),
  confidenceElement: byId('confidence-pill'),
  kpiContainer: byId('kpi-grid'),
});
const analyzerReady = loadLandArea(APP_CONFIG.landMaskPath).then((landArea) =>
  createAreaAnalyzer(createSimulatedFireDataSource({ landArea, recordWindow: createRecordWindow() })));
let latestAnalysisId = 0;

async function analyzeArea(area) {
  latestAnalysisId += 1;
  const analysisId = latestAnalysisId;
  analysisView.showLoading(area);
  try {
    const analyzer = await analyzerReady;
    await waitForPaint();
    const result = await analyzer.analyze(area);
    if (analysisId === latestAnalysisId) {
      analysisView.show(result);
    }
  } catch {
    toast.show(ANALYSIS_ERROR);
  }
}

function selectArea(area) {
  areaLayer.show(area);
  areaLayer.fit(area, panelVisibility.fitPadding());
  areaSummary.show(area);
  analyzeArea(area);
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
