import { shiftLongitudeIntoWindow } from '../geo/longitude.js';

export function cellBounds(cell, area) {
  const west = shiftLongitudeIntoWindow(cell.west, area.bounds.west - cell.sizeDegrees);
  return [[cell.south, west], [cell.south + cell.sizeDegrees, west + cell.sizeDegrees]];
}

export function createCellLayerGroup(leaflet, map) {
  const renderer = leaflet.canvas({ padding: 0.4 });
  const group = leaflet.layerGroup();
  let isVisible = false;

  function replace(rectangles) {
    group.clearLayers();
    rectangles.forEach(({ bounds, style, tooltip }) => leaflet.rectangle(bounds, { renderer, stroke: false, ...style }).bindTooltip(tooltip, { sticky: true }).addTo(group));
  }

  function setVisible(visible) {
    isVisible = visible;
    if (visible) {
      group.addTo(map);
    } else {
      group.remove();
    }
  }

  return { replace, setVisible, isVisible: () => isVisible };
}
