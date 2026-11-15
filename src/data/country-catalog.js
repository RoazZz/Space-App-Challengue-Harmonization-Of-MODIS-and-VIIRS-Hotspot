export function createCountryCatalog(basePath, fetchJson = fetchJsonOverHttp) {
  return {
    listCountries: () => fetchJson(`${basePath}/index.json`),
    loadCountry: (countryId) => fetchJson(`${basePath}/${countryId}.json`),
  };
}

async function fetchJsonOverHttp(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request for ${url} failed with status ${response.status}`);
  }
  return response.json();
}
