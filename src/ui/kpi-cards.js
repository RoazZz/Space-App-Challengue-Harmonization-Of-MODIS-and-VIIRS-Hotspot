import { seasonLabel } from '../analysis/critical-periods.js';
import { MONTH_ABBREVIATIONS, MONTH_NAMES } from '../time/month-index.js';
import { formatCompact, formatInteger, formatSignedPercent } from './number-format.js';

const SHOWN_CRITICAL_YEARS = 3;
const NOTABLE_CHANGE = 0.1;

export function createKpiCards(container) {
  function clear() {
    container.replaceChildren();
  }

  function show(summary) {
    container.replaceChildren(
      estimatedDetectionsCard(summary),
      criticalSeasonCard(summary),
      criticalYearsCard(summary),
      yearToDateCard(summary),
    );
  }

  return { clear, show };
}

function estimatedDetectionsCard({ total, includesEstimates }) {
  return createCard({
    label: 'Estimated detections',
    value: formatCompact(total),
    valueTitle: formatInteger(total),
    detail: `VIIRS-equivalent · ${includesEstimates ? 'partly estimated' : 'observed'}`,
  });
}

function criticalSeasonCard({ season, profile }) {
  const peakMonth = profile.indexOf(Math.max(...profile));
  return createCard({
    label: 'Critical season',
    value: seasonLabel(season),
    detail: season ? `${Math.round(season.share * 100)}% of yearly activity · peak ${MONTH_NAMES[peakMonth]}` : 'not enough data',
  });
}

function criticalYearsCard({ criticalYears, yearAssessment }) {
  const partialYear = [...yearAssessment.years.values()].find(({ isPartial }) => isPartial)?.year;
  const shown = criticalYears.slice(0, SHOWN_CRITICAL_YEARS).map((year) => (year === partialYear ? `${year}*` : String(year)));
  const extra = criticalYears.length > SHOWN_CRITICAL_YEARS ? ` +${criticalYears.length - SHOWN_CRITICAL_YEARS}` : '';
  return createCard({
    label: 'Critical years',
    value: criticalYears.length ? `${shown.join(' · ')}${extra}` : 'None',
    valueModifier: criticalYears.length > 1 ? 'is-small' : '',
    detail: `total > 90th percentile (${formatCompact(yearAssessment.fullYearThreshold)}/yr)${criticalYears.includes(partialYear) ? ' · *year to date' : ''}`,
  });
}

function yearToDateCard({ yearToDate, baseline }) {
  const { year, change, current, reference, lastMonthOfYear, referenceYearCount } = yearToDate;
  const arrow = change > 0 ? '▲ ' : change < 0 ? '▼ ' : '';
  return createCard({
    label: `${year} vs history`,
    value: Number.isFinite(change) ? `${arrow}${formatSignedPercent(change)}` : '—',
    valueModifier: change > NOTABLE_CHANGE ? 'is-up' : change < -NOTABLE_CHANGE ? 'is-down' : '',
    detail: Number.isFinite(change)
      ? `Jan–${MONTH_ABBREVIATIONS[lastMonthOfYear]} ${year}: ${formatInteger(current)} vs ${baseline.statistic} ${formatInteger(reference)} (${referenceYearCount} yr)`
      : 'no comparable baseline years',
  });
}

function createCard({ label, value, valueTitle = '', valueModifier = '', detail }) {
  const card = document.createElement('div');
  card.className = 'kpi-card';
  const valueElement = textElement(`kpi-value ${valueModifier}`.trim(), value);
  valueElement.title = valueTitle;
  card.append(textElement('kpi-label', label), valueElement, textElement('kpi-detail', detail));
  return card;
}

function textElement(className, text) {
  const element = document.createElement('div');
  element.className = className;
  element.textContent = text;
  return element;
}
