import { densityColor } from '../charts/color-scales.js';
import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { monthLabel } from '../time/month-index.js';
import { formatInteger } from '../ui/number-format.js';
import { cellBounds, createCellLayerGroup } from './cell-rectangles.js';

const MIN_VISIBLE_VALUE = 0.05;
const FILL_OPACITY = 0.82;

export function createHarmonizedGridLayer(leaflet, map) {
  const layer = createCellLayerGroup(leaflet, map);

  function show(result, monthIndex) {
    const cells = result.cellGrid.cellsForMonth(monthIndex).filter(({ value }) => value >= MIN_VISIBLE_VALUE);
    layer.replace(cells.map((entry) => ({
      bounds: cellBounds(entry.cell, result.area),
      style: { fillColor: densityColor(entry.density), fillOpacity: FILL_OPACITY },
      tooltip: cellTooltip(entry, monthIndex),
    })));
  }

  return { show, setVisible: layer.setVisible };
}

function cellTooltip({ cell, modis, value, density }, monthIndex) {
  const isObserved = monthIndex >= SENSOR_MILESTONES.viirsNoaa20Start;
  const lines = [
    `${monthLabel(monthIndex)} · ${cell.sizeDegrees}° cell`,
    `≈ ${value < 10 ? value.toFixed(1) : formatInteger(value)} VIIRS-equivalent detections`,
    `${density.toFixed(2)} per 100 km²`,
    `${isObserved ? 'Observed VIIRS NOAA-20' : 'Estimated from MODIS'} (raw MODIS in cell: ${formatInteger(modis)})`,
  ];
  const element = document.createElement('div');
  lines.forEach((line, index) => {
    const row = document.createElement(index === 0 ? 'strong' : 'div');
    row.textContent = line;
    element.append(row);
  });
  return element;
}
