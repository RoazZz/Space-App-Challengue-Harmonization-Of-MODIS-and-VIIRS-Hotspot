import { buildDetectionsCsv, DETECTIONS_ROW_LIMIT } from '../export/detections-csv.js';
import { downloadTextFile } from '../export/csv-writer.js';
import { exportFileName } from '../export/export-file-name.js';
import { buildMonthlySeriesCsv } from '../export/monthly-series-csv.js';
import { formatInteger } from './number-format.js';
import { waitForPaint } from './paint.js';

export function bindExportActions({ detectionsButton, seriesButton, currentAnalysis, notify }) {
  detectionsButton.addEventListener('click', async () => {
    const analysis = currentAnalysis();
    if (!analysis) {
      return;
    }
    notify('Preparing the hotspots CSV…');
    await waitForPaint();
    const { result, summary } = analysis;
    const { text, rowCount, isTruncated } = await buildDetectionsCsv(result, summary.range);
    downloadTextFile(exportFileName('hotspots', result, summary.range), text);
    notify(isTruncated
      ? `Export capped at the ${formatInteger(DETECTIONS_ROW_LIMIT)} most recent hotspots. Narrow the area or dates for a full export.`
      : `Exported ${formatInteger(rowCount)} hotspots.`);
  });

  seriesButton.addEventListener('click', () => {
    const analysis = currentAnalysis();
    if (!analysis) {
      return;
    }
    const { result, summary } = analysis;
    downloadTextFile(exportFileName('monthly_series', result, summary.range), buildMonthlySeriesCsv(result, summary));
    notify('Exported the monthly series.');
  });
}
