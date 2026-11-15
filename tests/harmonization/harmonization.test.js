import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitLeastSquares } from '../../src/harmonization/least-squares.js';
import { createFeatureEncoder } from '../../src/harmonization/harmonization-features.js';
import { trainHarmonizationModel } from '../../src/harmonization/harmonization-model.js';
import { assessHarmonization, CONFIDENCE } from '../../src/harmonization/harmonization-confidence.js';
import { TEST_WINDOW_START, TRAINING_WINDOW } from '../../src/harmonization/harmonization-windows.js';

const STRATA = [{ id: 'forest' }, { id: 'grassland' }];

test('least squares recovers known coefficients', () => {
  const rows = [];
  const targets = [];
  for (let x = 0; x < 10; x += 1) {
    for (let z = 0; z < 5; z += 1) {
      rows.push([1, x, z]);
      targets.push(2 + 3 * x - 0.5 * z);
    }
  }
  const [intercept, slope, secondSlope] = fitLeastSquares(rows, targets);
  assert.ok(Math.abs(intercept - 2) < 1e-4 && Math.abs(slope - 3) < 1e-4 && Math.abs(secondSlope + 0.5) < 1e-4);
});

test('the model learns a stable VIIRS to MODIS ratio during the training window', () => {
  const samples = [];
  for (let monthIndex = TRAINING_WINDOW.firstMonthIndex; monthIndex <= TRAINING_WINDOW.lastMonthIndex; monthIndex += 1) {
    for (const modis of [5, 20, 80, 300]) {
      samples.push({ monthIndex, monthOfYear: monthIndex % 12, stratumId: 'forest', modisDay: modis, modisNight: 0, modisHighConfidence: modis / 2, viirs: 3 * modis });
    }
  }
  const model = trainHarmonizationModel(samples, createFeatureEncoder(STRATA));
  const prediction = model.predict({ monthIndex: 10, monthOfYear: 10, stratumId: 'forest', modisDay: 100, modisNight: 0, modisHighConfidence: 50 });
  assert.ok(model.isTrained);
  assert.ok(Math.abs(prediction - 300) / 300 < 0.05, String(prediction));
});

test('without overlap data the model predicts nothing', () => {
  const model = trainHarmonizationModel([{ monthIndex: 10, modisDay: 5, modisNight: 0, viirs: 0 }], createFeatureEncoder(STRATA));
  assert.equal(model.isTrained, false);
  assert.equal(model.predict({}), 0);
});

function overlapMonths(errorFactor, viirsPerMonth) {
  const months = [];
  for (let monthIndex = TRAINING_WINDOW.firstMonthIndex; monthIndex < TEST_WINDOW_START + 24; monthIndex += 1) {
    months.push({ monthIndex, observed: viirsPerMonth, estimated: viirsPerMonth * errorFactor });
  }
  return months;
}

test('confidence follows the error and detection thresholds', () => {
  assert.equal(assessHarmonization(overlapMonths(1.1, 500)).level, CONFIDENCE.HIGH);
  assert.equal(assessHarmonization(overlapMonths(1.4, 500)).level, CONFIDENCE.MODERATE);
  assert.equal(assessHarmonization(overlapMonths(1.1, 3)).level, CONFIDENCE.LOW);
  assert.equal(assessHarmonization(overlapMonths(1, 0)).level, CONFIDENCE.NONE);
  assert.ok(Math.abs(assessHarmonization(overlapMonths(1.1, 500)).typicalErrorPercent - 9.5) < 1);
});
