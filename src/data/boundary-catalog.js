export function createBoundaryCatalog({ countriesPath, subdivisionsPath }, fetchJson = fetchJsonOverHttp) {
  return {
    listCountries: () => fetchJson(`${countriesPath}/index.json`),
    loadCountry: (countryId) => fetchJson(`${countriesPath}/${countryId}.json`),
    loadSubdivisions: async (countryId) => (await fetchJson(`${subdivisionsPath}/${countryId}.json`)).subdivisions,
  };
}

async function fetchJsonOverHttp(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request for ${url} failed with status ${response.status}`);
  }
  return response.json();
}
