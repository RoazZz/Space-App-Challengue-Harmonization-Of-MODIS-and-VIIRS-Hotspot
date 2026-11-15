const MONTHS_PER_YEAR = 12;

export function createFeatureEncoder(strata) {
  const comparedStrata = strata.slice(1);
  return ({ modisDay, modisNight, modisHighConfidence, stratumId, monthOfYear }) => {
    const modis = modisDay + modisNight;
    const angle = (2 * Math.PI * monthOfYear) / MONTHS_PER_YEAR;
    return [
      1,
      Math.log1p(modis),
      ...comparedStrata.map(({ id }) => (id === stratumId ? 1 : 0)),
      Math.sin(angle),
      Math.cos(angle),
      modis > 0 ? modisNight / modis : 0,
      modis > 0 ? modisHighConfidence / modis : 0,
    ];
  };
}
