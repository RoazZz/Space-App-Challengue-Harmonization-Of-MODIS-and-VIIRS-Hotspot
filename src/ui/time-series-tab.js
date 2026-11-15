import { renderTimeSeriesChart } from '../charts/time-series-chart.js';
import { buildTimeSeries, overlapRatio, TIME_SERIES_AGGREGATION, TIME_SERIES_MODE } from '../charts/time-series-data.js';
import { svgElement } from '../charts/svg.js';
import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { TEST_WINDOW_START, TRAINING_WINDOW } from '../harmonization/harmonization-windows.js';
import { monthLabel } from '../time/month-index.js';
import { bindSegmentedControl } from './tabs.js';

export function createTimeSeriesTab({ elements, tooltip }) {
  const { modeButtons, aggregationButtons, logScaleInput, chart, legend, footnote } = elements;
  const settings = { mode: TIME_SERIES_MODE.HARMONIZED, aggregation: TIME_SERIES_AGGREGATION.MONTHLY, logScale: false };
  let latest = null;

  function render() {
    if (!latest) {
      return;
    }
    const data = buildTimeSeries(latest.result, latest.range, settings);
    const overlapLabel = `MODIS–VIIRS overlap (${monthLabel(SENSOR_MILESTONES.viirsNoaa20Start)} →)`;
    renderTimeSeriesChart({ container: chart, data, logScale: settings.logScale, tooltip, overlapLabel });
    renderLegend(legend, data, settings.mode);
    footnote.textContent = footnoteText(latest.result, settings.mode);
  }

  bindSegmentedControl(modeButtons, 'timeSeriesMode', (mode) => { settings.mode = mode; render(); });
  bindSegmentedControl(aggregationButtons, 'timeSeriesAggregation', (aggregation) => { settings.aggregation = aggregation; render(); });
  logScaleInput.addEventListener('change', () => { settings.logScale = logScaleInput.checked; render(); });

  return {
    show(result, range) {
      latest = { result, range };
      render();
    },
  };
}

function renderLegend(container, data, mode) {
  const items = data.lines.map((line) => legendItem(lineIcon(line.color, line.dash, line.opacity), line.name));
  if (mode === TIME_SERIES_MODE.HARMONIZED) {
    items.push(legendItem(lineIcon('#F0E442', '5 3'), 'modeled part'), legendItem(swatch('rgba(240, 228, 66, 0.25)'), '≈68% uncertainty'));
  }
  items.push(legendItem(swatch('rgba(86, 180, 233, 0.18)'), `Overlap ${monthLabel(SENSOR_MILESTONES.viirsNoaa20Start)} →`));
  container.replaceChildren(...items);
}

function footnoteText(result, mode) {
  const start = monthLabel(SENSOR_MILESTONES.viirsNoaa20Start);
  if (mode === TIME_SERIES_MODE.RAW) {
    const ratio = overlapRatio(result);
    return `Raw series are not comparable: in this area VIIRS NOAA-20 records about ${Number.isFinite(ratio) ? ratio.toFixed(1) : '—'}× as many detections as MODIS during the overlap. `
      + `Simply joining them (dashed white) creates an artificial jump in ${start}.`;
  }
  const training = `${monthLabel(TRAINING_WINDOW.firstMonthIndex)}–${monthLabel(TRAINING_WINDOW.lastMonthIndex)}`;
  const test = `${monthLabel(TEST_WINDOW_START)}–${monthLabel(result.recordWindow.lastMonthIndex - 1)}`;
  return `After harmonization the series is continuous: before ${start} values are estimated from MODIS by the harmonization model (dashed, with uncertainty band); `
    + `from ${start} they are observed VIIRS NOAA-20. Training: ${training} · independent test: ${test}.`;
}

function legendItem(icon, text) {
  const item = document.createElement('span');
  item.className = 'legend-item';
  item.append(icon, document.createTextNode(text));
  return item;
}

function lineIcon(color, dash, opacity = 1) {
  return svgElement('svg', { width: 20, height: 8 }, [
    svgElement('line', { x1: 0, x2: 20, y1: 4, y2: 4, stroke: color, 'stroke-width': 2, 'stroke-opacity': opacity, ...(dash ? { 'stroke-dasharray': dash } : {}) }),
  ]);
}

function swatch(color) {
  const element = document.createElement('span');
  element.className = 'swatch';
  element.style.background = color;
  return element;
}
