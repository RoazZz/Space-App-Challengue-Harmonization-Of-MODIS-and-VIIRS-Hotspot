import { createAreaAnalyzer } from './analysis/area-analyzer.js';
import { DEFAULT_BASELINE_SETTINGS } from './analysis/baseline.js';
import { defaultMapMonth } from './analysis/map-month.js';
import { summarizePeriod } from './analysis/period-summary.js';
import { APP_CONFIG } from './config.js';
import { createBoundaryCatalog } from './data/boundary-catalog.js';
import { loadLandArea } from './data/land-mask.js';
import { createSimulatedFireDataSource } from './data/simulated/simulated-fire-data-source.js';
import { createAreaLayer } from './map/area-layer.js';
import { createBaseLayers } from './map/base-layers.js';
import { createHarmonizedGridLayer } from './map/harmonized-grid-layer.js';
import { createMap } from './map/map-view.js';
import { createPointPicking } from './map/point-picking.js';
import { createPolygonDrawing } from './map/polygon-drawing.js';
import { createRectangleDrawing } from './map/rectangle-drawing.js';
import { createStrataLayer } from './map/strata-layer.js';
import { contains } from './time/date-range.js';
import { monthLabel } from './time/month-index.js';
import { createRecordWindow } from './time/record-window.js';
import { createAnalysisView } from './ui/analysis-view.js';
import { createAreaSection } from './ui/area-section.js';
import { createAreaSummary } from './ui/area-summary.js';
import { bindBaseLayerPicker } from './ui/base-layer-picker.js';
import { createCircleForm } from './ui/circle-form.js';
import { trackCursorCoordinates } from './ui/cursor-coordinates.js';
import { createDateSection } from './ui/date-section.js';
import { showDemoNotices } from './ui/demo-notice.js';
import { bindDialog } from './ui/dialogs.js';
import { renderInterpretationNotices } from './ui/interpretation-notices.js';
import { createMapSection } from './ui/map-section.js';
import { bindPanelVisibility } from './ui/panel-visibility.js';
import { waitForPaint } from './ui/paint.js';
import { createPresetPicker } from './ui/preset-picker.js';
import { bindTabs } from './ui/tabs.js';
import { createToast } from './ui/toast.js';
import { createTooltip } from './ui/tooltip.js';

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
const tooltip = createTooltip(byId('tooltip'));
const analysisView = createAnalysisView({
  header: {
    titleElement: byId('analysis-title'),
    subtitleElement: byId('analysis-subtitle'),
    confidenceElement: byId('confidence-pill'),
  },
  kpiContainer: byId('kpi-grid'),
  latestMonthElement: byId('latest-month'),
  tabsElement: byId('analysis-tabs'),
  calendarElements: {
    chart: byId('calendar-chart'),
    legend: byId('calendar-legend'),
    footnote: byId('calendar-footnote'),
  },
  timeSeriesElements: {
    modeButtons: allOf('[data-time-series-mode]'),
    aggregationButtons: allOf('[data-time-series-aggregation]'),
    logScaleInput: byId('time-series-log-scale'),
    chart: byId('time-series-chart'),
    legend: byId('time-series-legend'),
    footnote: byId('time-series-footnote'),
  },
  tooltip,
  onMonthSelected: (monthIndex) => {
    showMapMonth(monthIndex);
    toast.show(`Map now shows ${monthLabel(monthIndex)}.`);
  },
});
bindTabs({ buttons: allOf('[data-tab]'), panes: allOf('[data-tab-pane]'), onChange: tooltip.hide });
const recordWindow = createRecordWindow();
const dataSourceReady = loadLandArea(APP_CONFIG.landMaskPath).then((landArea) => createSimulatedFireDataSource({ landArea, recordWindow }));
const analyzerReady = dataSourceReady.then(createAreaAnalyzer);
dataSourceReady.then(({ isDemoData }) => showDemoNotices(isDemoData));
const analysisState = { result: null, mapMonthIndex: null };
let latestAnalysisId = 0;

const mapSection = createMapSection({
  elements: {
    gridCheckbox: byId('grid-layer-toggle'),
    strataCheckbox: byId('strata-layer-toggle'),
    previousButton: byId('map-month-previous'),
    nextButton: byId('map-month-next'),
    monthElement: byId('map-month-label'),
    infoElement: byId('map-month-info'),
    legendElement: byId('density-legend'),
  },
  gridLayer: createHarmonizedGridLayer(leaflet, map),
  strataLayer: createStrataLayer(leaflet, map),
  onMonthStep: (step) => showMapMonth(analysisState.mapMonthIndex + step),
});
const interpretationNotices = byId('interpretation-notices');
bindDialog({
  dialog: byId('interpretation-dialog'),
  openButtons: [byId('info-button')],
  closeButtons: allOf('#interpretation-dialog [data-close-dialog]'),
  onOpen: () => analysisState.result && renderInterpretationNotices(interpretationNotices, analysisState.result),
});
const aboutDialog = bindDialog({
  dialog: byId('about-dialog'),
  openButtons: [byId('about-button')],
  closeButtons: allOf('#about-dialog [data-close-dialog]'),
});

const dateSection = createDateSection({
  elements: {
    fromMonth: byId('range-from-month'),
    fromYear: byId('range-from-year'),
    toMonth: byId('range-to-month'),
    toYear: byId('range-to-year'),
    shortcutButtons: allOf('[data-range-shortcut]'),
  },
  recordWindow,
  onRangeChanged: renderAnalysis,
  notify: (message) => toast.show(message),
});

function renderAnalysis() {
  const { result } = analysisState;
  if (!result) {
    return;
  }
  const range = dateSection.currentRange();
  if (!contains(range, analysisState.mapMonthIndex)) {
    analysisState.mapMonthIndex = defaultMapMonth(result, range);
  }
  analysisView.show(result, summarizePeriod(result, range, DEFAULT_BASELINE_SETTINGS), analysisState.mapMonthIndex);
  mapSection.show(result, analysisState.mapMonthIndex);
}

function showMapMonth(monthIndex) {
  const range = dateSection.currentRange();
  analysisState.mapMonthIndex = Math.max(range.firstMonthIndex, Math.min(range.lastMonthIndex, monthIndex));
  renderAnalysis();
}

async function analyzeArea(area) {
  latestAnalysisId += 1;
  const analysisId = latestAnalysisId;
  analysisView.showLoading(area);
  try {
    const analyzer = await analyzerReady;
    await waitForPaint();
    const result = await analyzer.analyze(area);
    if (analysisId === latestAnalysisId) {
      analysisState.result = result;
      analysisState.mapMonthIndex = defaultMapMonth(result, dateSection.currentRange());
      renderAnalysis();
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
aboutDialog.open();
