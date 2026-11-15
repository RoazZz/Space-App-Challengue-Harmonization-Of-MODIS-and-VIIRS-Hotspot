import { createPolygonArea } from '../geo/area-of-interest.js';

export function createCountryPicker({ selectElement, catalog, initialCountryId, onAreaSelected, onLoadError }) {
  let latestRequestId = 0;

  async function selectCountry(countryId) {
    latestRequestId += 1;
    const requestId = latestRequestId;
    try {
      const country = await catalog.loadCountry(countryId);
      if (requestId === latestRequestId) {
        onAreaSelected(createPolygonArea(country.name, country.polygons));
      }
    } catch (error) {
      onLoadError(error);
    }
  }

  async function initialize() {
    try {
      const countries = await catalog.listCountries();
      selectElement.replaceChildren(...countries.map(toOption));
      selectElement.value = initialCountryId;
      selectElement.addEventListener('change', () => selectCountry(selectElement.value));
      await selectCountry(initialCountryId);
    } catch (error) {
      onLoadError(error);
    }
  }

  return { initialize, reselect: () => selectCountry(selectElement.value) };
}

function toOption({ id, name }) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = name;
  return option;
}
