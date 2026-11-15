import { renderBurnCalendar } from '../charts/burn-calendar.js';
import { renderBurnCalendarLegend } from '../charts/burn-calendar-legend.js';
import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { monthLabel, RECORD_START_YEAR, monthIndexOf } from '../time/month-index.js';
import { createAnalysisHeader } from './analysis-header.js';
import { createKpiCards } from './kpi-cards.js';
import { renderLatestMonthLine } from './latest-month-line.js';
import { createTimeSeriesTab } from './time-series-tab.js';

export function createAnalysisView({ header, kpiContainer, latestMonthElement, tabsElement, calendarElements, timeSeriesElements, tooltip, onMonthSelected }) {
  const analysisHeader = createAnalysisHeader(header);
  const kpiCards = createKpiCards(kpiContainer);
  const timeSeriesTab = createTimeSeriesTab({ elements: timeSeriesElements, tooltip });
  const { chart, legend, footnote } = calendarElements;

  return {
    showLoading(area) {
      analysisHeader.showLoading(area);
      kpiCards.clear();
      latestMonthElement.replaceChildren();
      tabsElement.hidden = true;
      tooltip.hide();
    },
    show(result, summary, selectedMonthIndex) {
      analysisHeader.show(result, summary);
      kpiCards.show(summary);
      renderLatestMonthLine(latestMonthElement, result, summary);
      const { edges } = renderBurnCalendar({ container: chart, result, summary, tooltip, selectedMonthIndex, onMonthSelected });
      renderBurnCalendarLegend(legend, edges, summary);
      footnote.textContent = calendarFootnote();
      timeSeriesTab.show(result, summary.range);
      tabsElement.hidden = false;
    },
  };
}

function calendarFootnote() {
  const terraOnly = `${monthLabel(monthIndexOf(RECORD_START_YEAR, 0))} – ${monthLabel(SENSOR_MILESTONES.aquaModisStart - 1)}`;
  return 'Each cell is one month. Color = harmonized hotspot detections (VIIRS-equivalent) inside the area (log-spaced classes). '
    + 'Bars on top: annual totals · bars on the right: average per month. Hover cells and bars for details. '
    + `${terraOnly} is Terra-only (fewer MODIS overpasses).`;
}
