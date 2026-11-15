import { CONFIDENCE } from '../harmonization/harmonization-confidence.js';
import { TEST_WINDOW_START } from '../harmonization/harmonization-windows.js';
import { monthLabel } from '../time/month-index.js';
import { formatInteger } from './number-format.js';

const SERIES_NAME = 'Harmonized series';
const CONFIDENCE_DOTS = Object.freeze({
  [CONFIDENCE.HIGH]: '●●●',
  [CONFIDENCE.MODERATE]: '●●○',
  [CONFIDENCE.LOW]: '●○○',
  [CONFIDENCE.NONE]: '○○○',
});

export function createAnalysisHeader({ titleElement, subtitleElement, confidenceElement }) {
  function showLoading(area) {
    renderTitle(area.name);
    subtitleElement.textContent = 'Calculating the harmonized series…';
    confidenceElement.hidden = true;
  }

  function show({ area, recordWindow, harmonization }, { range }) {
    renderTitle(area.name);
    const partialNote = range.lastMonthIndex === recordWindow.lastMonthIndex ? ' (partial)' : '';
    subtitleElement.textContent = `${monthLabel(range.firstMonthIndex)} – ${monthLabel(range.lastMonthIndex)}${partialNote} · monthly · VIIRS-equivalent detections`;
    renderConfidence(harmonization, recordWindow);
  }

  function renderTitle(areaName) {
    const seriesLabel = document.createElement('span');
    seriesLabel.className = 'series-label';
    seriesLabel.textContent = ` · ${SERIES_NAME}`;
    titleElement.replaceChildren(document.createTextNode(areaName), seriesLabel);
  }

  function renderConfidence({ level, typicalErrorPercent, overlapDetections }, recordWindow) {
    const levelText = level === CONFIDENCE.NONE ? 'no data' : level;
    confidenceElement.className = `confidence-pill confidence-${level.toLowerCase()}`;
    confidenceElement.textContent = `${CONFIDENCE_DOTS[level]} Harmonization confidence: ${levelText}`;
    confidenceElement.title = `Checked on this area during the MODIS–VIIRS overlap. Typical monthly error ${monthLabel(TEST_WINDOW_START)} – ${monthLabel(recordWindow.lastMonthIndex - 1)}: ±${formatInteger(typicalErrorPercent)}% · VIIRS detections in overlap: ${formatInteger(overlapDetections)}`;
    confidenceElement.hidden = false;
  }

  return { showLoading, show };
}
