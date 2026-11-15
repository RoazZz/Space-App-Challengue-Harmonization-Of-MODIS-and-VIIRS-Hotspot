const RIDGE = 1e-6;
const PIVOT_FLOOR = 1e-12;

export function fitLeastSquares(featureRows, targets) {
  const size = featureRows[0].length;
  const normalMatrix = Array.from({ length: size }, () => new Float64Array(size));
  const moments = new Float64Array(size);
  featureRows.forEach((features, rowIndex) => {
    for (let row = 0; row < size; row += 1) {
      moments[row] += features[row] * targets[rowIndex];
      for (let column = 0; column < size; column += 1) {
        normalMatrix[row][column] += features[row] * features[column];
      }
    }
  });
  for (let diagonal = 1; diagonal < size; diagonal += 1) {
    normalMatrix[diagonal][diagonal] += RIDGE;
  }
  return solveLinearSystem(normalMatrix, moments);
}

export function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    swapRows(augmented, column, pivotRowFor(augmented, column));
    eliminateColumn(augmented, column);
  }
  return augmented.map((row, index) => row[size] / (row[index] || PIVOT_FLOOR));
}

export function dotProduct(first, second) {
  return first.reduce((total, value, index) => total + value * second[index], 0);
}

function pivotRowFor(augmented, column) {
  let pivot = column;
  for (let row = column + 1; row < augmented.length; row += 1) {
    if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
      pivot = row;
    }
  }
  return pivot;
}

function swapRows(augmented, first, second) {
  [augmented[first], augmented[second]] = [augmented[second], augmented[first]];
}

function eliminateColumn(augmented, column) {
  const pivotValue = augmented[column][column] || PIVOT_FLOOR;
  augmented.forEach((row, rowIndex) => {
    const factor = rowIndex === column ? 0 : row[column] / pivotValue;
    if (factor !== 0) {
      for (let index = column; index < row.length; index += 1) {
        row[index] -= factor * augmented[column][index];
      }
    }
  });
}
