import { SENSOR_MILESTONES } from '../data/sensor-catalog.js';
import { CONFIDENCE } from '../harmonization/harmonization-confidence.js';
import { monthLabel, yearOf } from '../time/month-index.js';
import { formatInteger } from './number-format.js';

const NOTICE_KIND = Object.freeze({ INFO: 'info', WARNING: 'warning', CONFIDENCE: 'confidence' });
const NOTICE_ICONS = Object.freeze({ [NOTICE_KIND.INFO]: 'i', [NOTICE_KIND.WARNING]: '!', [NOTICE_KIND.CONFIDENCE]: '≈' });

export function renderInterpretationNotices(container, result) {
  container.replaceChildren(sourceCard(result.recordWindow), ...notices(result).map(noticeElement));
}

function notices({ harmonization, recordWindow, isDemoData }) {
  const start = monthLabel(SENSOR_MILESTONES.viirsNoaa20Start);
  const level = harmonization.level === CONFIDENCE.NONE ? 'no data' : harmonization.level;
  const list = [
    { kind: NOTICE_KIND.INFO, title: 'A hotspot is not a fire.', text: 'Each detection marks the center of a satellite pixel (~1 km MODIS, ~375 m VIIRS) containing at least one thermal anomaly. One large fire produces many hotspots; volcanoes, gas flares and industry can also appear.' },
    { kind: NOTICE_KIND.WARNING, title: 'Gaps from clouds, smoke and outages.', text: 'Fires under clouds, heavy smoke or tree canopy, or between overpasses, are missed. Calendar cells with a white dot had low observation coverage, so a quiet month may just be a cloudy one.' },
    { kind: NOTICE_KIND.CONFIDENCE, title: `Harmonization confidence for this area: ${level}.`, text: `Values before ${start} are model estimates (typical error ±${formatInteger(harmonization.typicalErrorPercent)}% per month in the test period). Small areas with few detections are less reliable.` },
    { kind: NOTICE_KIND.INFO, title: 'Monthly resolution only.', text: `Polar-orbiting sensors see each place a few times a day, so periods much shorter than a month give biased counts. ${monthLabel(recordWindow.lastMonthIndex)} is partial and is not compared with baselines.` },
  ];
  if (isDemoData) {
    list.push({ kind: NOTICE_KIND.WARNING, title: 'Demo data.', text: 'All values are synthetic, generated in your browser with a fixed random seed. They follow the real active-fire data layout so the screens can be validated, but they do not describe real fires.' });
  }
  return list;
}

function sourceCard(recordWindow) {
  const start = SENSOR_MILESTONES.viirsNoaa20Start;
  const card = element('div', 'source-card');
  const bar = element('div', 'source-bar');
  const estimated = element('div', 'source-estimated');
  estimated.style.flex = String(start - recordWindow.firstMonthIndex);
  estimated.title = `${monthLabel(recordWindow.firstMonthIndex)} – ${monthLabel(start - 1)}: estimated from MODIS`;
  const observed = element('div', 'source-observed');
  observed.style.flex = String(recordWindow.lastMonthIndex - start + 1);
  observed.title = `${monthLabel(start)} → today: observed VIIRS NOAA-20`;
  bar.append(estimated, observed);
  const axis = element('div', 'source-axis');
  axis.append(element('span', '', String(yearOf(recordWindow.firstMonthIndex))), element('span', '', monthLabel(start)), element('span', '', String(yearOf(recordWindow.lastMonthIndex))));
  card.append(
    element('div', 'source-title', 'Harmonized series · VIIRS-equivalent'),
    bar,
    axis,
    element('div', 'source-legend-item estimated', 'Estimated from MODIS (Terra + Aqua)'),
    element('div', 'source-legend-item observed', 'Observed VIIRS NOAA-20'),
    element('p', 'source-description', 'One consistent monthly series, so the sensor of origin no longer matters. Raw sensor counts appear only as reference: in calendar tooltips and in Time series → Raw sources.'),
  );
  return card;
}

function noticeElement({ kind, title, text }) {
  const notice = element('div', 'notice');
  const body = element('div', '');
  body.append(element('b', '', title), document.createTextNode(` ${text}`));
  notice.append(element('span', `notice-icon notice-${kind}`, NOTICE_ICONS[kind]), body);
  return notice;
}

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  node.textContent = text;
  return node;
}
