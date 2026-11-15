import { monthLabel } from '../time/month-index.js';
import { formatInteger, formatSignedPercent } from './number-format.js';

export function renderLatestMonthLine(element, result, summary) {
  const { monthIndex, value, reference, change } = summary.lastCompleteMonth;
  const { statistic, firstYear, lastYear } = summary.baseline;
  const endsInPartialMonth = summary.range.lastMonthIndex === result.recordWindow.lastMonthIndex;
  element.replaceChildren(
    document.createTextNode('Latest complete month '),
    strong(monthLabel(monthIndex)),
    document.createTextNode(`: ${formatInteger(value)} vs ${statistic} ${formatInteger(reference)} (${firstYear}–${lastYear}) → `),
    strong(formatSignedPercent(change)),
    document.createTextNode(endsInPartialMonth ? ` · ${monthLabel(result.recordWindow.lastMonthIndex)} is partial and not compared` : ''),
  );
}

function strong(text) {
  const element = document.createElement('b');
  element.textContent = text;
  return element;
}
