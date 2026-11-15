const DEMO_DATA_CLASS = 'has-demo-data';

export function showDemoNotices(isDemoData) {
  document.body.classList.toggle(DEMO_DATA_CLASS, isDemoData);
}
