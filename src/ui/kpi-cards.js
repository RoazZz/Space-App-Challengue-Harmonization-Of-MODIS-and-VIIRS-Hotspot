import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { sum } from '../analysis/statistics.js';
import { formatCompact, formatInteger } from './number-format.js';

export function createKpiCards(container) {
  function clear() {
    container.replaceChildren();
  }

  function show({ harmonized, recordWindow }) {
    const total = sum(Array.from(harmonized));
    const includesEstimates = recordWindow.firstMonthIndex < SENSOR_MILESTONES.viirsNoaa20Start;
    container.replaceChildren(createCard({
      label: 'Estimated detections',
      value: formatCompact(total),
      valueTitle: formatInteger(total),
      detail: `VIIRS-equivalent · ${includesEstimates ? 'partly estimated' : 'observed'}`,
    }));
  }

  return { clear, show };
}

function createCard({ label, value, valueTitle, detail }) {
  const card = document.createElement('div');
  card.className = 'kpi-card';
  card.append(
    textElement('kpi-label', label),
    Object.assign(textElement('kpi-value', value), { title: valueTitle }),
    textElement('kpi-detail', detail),
  );
  return card;
}

function textElement(className, text) {
  const element = document.createElement('div');
  element.className = className;
  element.textContent = text;
  return element;
}
