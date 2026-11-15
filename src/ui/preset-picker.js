import { createPolygonArea } from '../geo/area-of-interest.js';

const WHOLE_COUNTRY_OPTION = Object.freeze({ id: '', name: 'Whole country' });

export function createPresetPicker({ elements, catalog, initialCountryId, onAreaSelected, onLoadError }) {
  const { countrySelect, subdivisionSelect, subdivisionField } = elements;
  let countries = [];
  let selectedCountry = null;
  let subdivisions = [];
  let latestRequestId = 0;

  async function initialize() {
    try {
      countries = await catalog.listCountries();
      countrySelect.replaceChildren(...countries.map(toOption));
      countrySelect.value = initialCountryId;
      countrySelect.addEventListener('change', () => selectCountry(countrySelect.value));
      subdivisionSelect.addEventListener('change', emitSelection);
      await selectCountry(initialCountryId);
    } catch (error) {
      onLoadError(error);
    }
  }

  async function selectCountry(countryId) {
    latestRequestId += 1;
    const requestId = latestRequestId;
    try {
      const [country, countrySubdivisions] = await Promise.all([
        catalog.loadCountry(countryId),
        loadSubdivisionsOf(countryId),
      ]);
      if (requestId === latestRequestId) {
        showCountry(country, countrySubdivisions);
      }
    } catch (error) {
      onLoadError(error);
    }
  }

  function loadSubdivisionsOf(countryId) {
    const entry = countries.find(({ id }) => id === countryId);
    return entry?.hasSubdivisions ? catalog.loadSubdivisions(countryId) : Promise.resolve([]);
  }

  function showCountry(country, countrySubdivisions) {
    selectedCountry = country;
    subdivisions = countrySubdivisions;
    subdivisionSelect.replaceChildren(...[WHOLE_COUNTRY_OPTION, ...subdivisions].map(toOption));
    subdivisionField.hidden = subdivisions.length === 0;
    emitSelection();
  }

  function emitSelection() {
    const subdivision = subdivisions.find(({ id }) => id === subdivisionSelect.value);
    const area = subdivision
      ? createPolygonArea(`${subdivision.name}, ${selectedCountry.name}`, subdivision.polygons)
      : createPolygonArea(selectedCountry.name, selectedCountry.polygons);
    onAreaSelected(area);
  }

  function reselect() {
    if (selectedCountry) {
      emitSelection();
    }
  }

  return { initialize, reselect };
}

function toOption({ id, name }) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = name;
  return option;
}
