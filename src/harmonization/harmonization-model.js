import { dotProduct, fitLeastSquares } from './least-squares.js';
import { isTrainingMonth } from './harmonization-windows.js';

const UNTRAINED_MODEL = Object.freeze({ isTrained: false, predict: () => 0 });

export function trainHarmonizationModel(samples, encodeFeatures) {
  const trainingSamples = samples.filter(isUsableTrainingSample);
  if (trainingSamples.length === 0) {
    return UNTRAINED_MODEL;
  }
  const featureRows = trainingSamples.map(encodeFeatures);
  const targets = trainingSamples.map(({ viirs }) => Math.log1p(viirs));
  const coefficients = fitLeastSquares(featureRows, targets);
  const smearingFactor = meanOfExponentials(featureRows.map((features, index) => targets[index] - dotProduct(coefficients, features)));
  return Object.freeze({
    isTrained: true,
    predict: (sample) => Math.max(0, Math.exp(dotProduct(coefficients, encodeFeatures(sample))) * smearingFactor - 1),
  });
}

function isUsableTrainingSample({ monthIndex, modisDay, modisNight, viirs }) {
  return isTrainingMonth(monthIndex) && modisDay + modisNight + viirs > 0;
}

function meanOfExponentials(residuals) {
  return residuals.reduce((total, residual) => total + Math.exp(residual), 0) / residuals.length;
}
