import { cellBounds, createCellLayerGroup } from './cell-rectangles.js';

const FILL_OPACITY = 0.28;

export function createStrataLayer(leaflet, map) {
  const layer = createCellLayerGroup(leaflet, map);

  function show(result) {
    const strataById = new Map(result.strata.map((stratum) => [stratum.id, stratum]));
    const prefix = result.isDemoData ? 'Demo stratum' : 'Stratum';
    layer.replace(result.cellGrid.coveredCells.map((cell) => {
      const stratum = strataById.get(cell.stratumId);
      return {
        bounds: cellBounds(cell, result.area),
        style: { fillColor: stratum.color, fillOpacity: FILL_OPACITY },
        tooltip: `${prefix}: ${stratum.name}`,
      };
    }));
  }

  return { show, setVisible: layer.setVisible };
}
