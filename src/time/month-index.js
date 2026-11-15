export const RECORD_START_YEAR = 2001;
export const MONTHS_PER_YEAR = 12;
export const MONTH_ABBREVIATIONS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
export const MONTH_NAMES = Object.freeze(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

export function monthIndexOf(year, monthOfYear) {
  return (year - RECORD_START_YEAR) * MONTHS_PER_YEAR + monthOfYear;
}

export function yearOf(monthIndex) {
  return RECORD_START_YEAR + Math.floor(monthIndex / MONTHS_PER_YEAR);
}

export function monthOfYearOf(monthIndex) {
  return ((monthIndex % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
}

export function monthLabel(monthIndex) {
  return `${MONTH_ABBREVIATIONS[monthOfYearOf(monthIndex)]} ${yearOf(monthIndex)}`;
}
