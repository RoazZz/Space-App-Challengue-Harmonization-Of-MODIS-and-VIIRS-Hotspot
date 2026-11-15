import { createAnalysisHeader } from './analysis-header.js';
import { createKpiCards } from './kpi-cards.js';

export function createAnalysisView({ titleElement, subtitleElement, confidenceElement, kpiContainer }) {
  const header = createAnalysisHeader({ titleElement, subtitleElement, confidenceElement });
  const kpiCards = createKpiCards(kpiContainer);

  return {
    showLoading(area) {
      header.showLoading(area);
      kpiCards.clear();
    },
    show(result) {
      header.show(result);
      kpiCards.show(result);
    },
  };
}
