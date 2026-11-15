import { monthOfYearOf, yearOf } from '../time/month-index.js';

export function exportFileName(kind, result, range) {
  const demoTag = result.isDemoData ? '_DEMO' : '';
  const lastMonth = Math.min(range.lastMonthIndex, result.recordWindow.lastMonthIndex);
  return `emberspotter${demoTag}_${kind}_${slug(result.area.name)}_${yearMonth(range.firstMonthIndex)}-${yearMonth(lastMonth)}.csv`;
}

function slug(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function yearMonth(monthIndex) {
  return `${yearOf(monthIndex)}${String(monthOfYearOf(monthIndex) + 1).padStart(2, '0')}`;
}
