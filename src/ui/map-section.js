import { DENSITY_CLASS_EDGES, DARK_TEXT_CLASS_LIMIT, SEQUENTIAL_COLORS } from '../charts/color-scales.js';
import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { monthLabel } from '../time/month-index.js';
import { formatInteger } from './number-format.js';

export function createMapSection({ elements, gridLayer, strataLayer, onMonthStep }) {
  const { gridCheckbox, strataCheckbox, previousButton, nextButton, monthElement, infoElement, legendElement } = elements;
  let latest = null;

  function show(result, monthIndex) {
    latest = { result, monthIndex };
    const isPartial = monthIndex === result.recordWindow.lastMonthIndex;
    monthElement.textContent = `${monthLabel(monthIndex)}${isPartial ? ' (partial)' : ''}`;
    infoElement.textContent = monthInfo(result, monthIndex);
    gridLayer.show(result, monthIndex);
    strataLayer.show(result);
    strataCheckbox.closest('label').hidden = result.strata.length < 2;
  }

  gridCheckbox.addEventListener('change', () => gridLayer.setVisible(gridCheckbox.checked));
  strataCheckbox.addEventListener('change', () => strataLayer.setVisible(strataCheckbox.checked));
  previousButton.addEventListener('click', () => onMonthStep(-1));
  nextButton.addEventListener('click', () => onMonthStep(1));
  legendElement.replaceChildren(...densityLegendBoxes());
  gridLayer.setVisible(gridCheckbox.checked);
  strataLayer.setVisible(strataCheckbox.checked);

  return { show, currentMonth: () => latest?.monthIndex };
}

function monthInfo(result, monthIndex) {
  const total = result.cellGrid.cellsForMonth(monthIndex).reduce((sum, { value }) => sum + value, 0);
  const source = monthIndex >= SENSOR_MILESTONES.viirsNoaa20Start ? 'observed VIIRS NOAA-20' : 'estimated from MODIS';
  const cellSize = result.cellGrid.coveredCells[0]?.sizeDegrees ?? result.gridLevel.cellDegrees;
  return `Harmonized activity this month: ≈ ${formatInteger(total)} VIIRS-equivalent detections in the area · ${source} · grid cells of ${cellSize}°. `
    + 'Hover a cell for its value. Click a calendar cell to change the month.';
}

function densityLegendBoxes() {
  return SEQUENTIAL_COLORS.map((color, classIndex) => {
    const box = document.createElement('div');
    box.className = classIndex < DARK_TEXT_CLASS_LIMIT ? 'ramp-box light-text' : 'ramp-box';
    box.style.background = color;
    box.textContent = densityLabel(classIndex);
    return box;
  });
}

function densityLabel(classIndex) {
  if (classIndex === 0) {
    return `<${DENSITY_CLASS_EDGES[0]}`;
  }
  if (classIndex === SEQUENTIAL_COLORS.length - 1) {
    return `≥${DENSITY_CLASS_EDGES[DENSITY_CLASS_EDGES.length - 1]}`;
  }
  return String(DENSITY_CLASS_EDGES[classIndex - 1]);
}
