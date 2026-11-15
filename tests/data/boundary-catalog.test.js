import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoundaryCatalog } from '../../src/data/boundary-catalog.js';

const PATHS = { countriesPath: 'data/countries', subdivisionsPath: 'data/subdivisions' };

function recordingFetch(responses) {
  const requestedUrls = [];
  const fetchJson = async (url) => {
    requestedUrls.push(url);
    return responses[url];
  };
  return { fetchJson, requestedUrls };
}

test('countries and their subdivisions are read from their own folders', async () => {
  const { fetchJson, requestedUrls } = recordingFetch({
    'data/countries/index.json': [{ id: 'chile', name: 'Chile', hasSubdivisions: true }],
    'data/countries/chile.json': { id: 'chile', name: 'Chile', polygons: [] },
    'data/subdivisions/chile.json': { countryId: 'chile', subdivisions: [{ id: 'maule', name: 'Maule', polygons: [] }] },
  });
  const catalog = createBoundaryCatalog(PATHS, fetchJson);
  assert.equal((await catalog.listCountries()).length, 1);
  assert.equal((await catalog.loadCountry('chile')).name, 'Chile');
  assert.deepEqual((await catalog.loadSubdivisions('chile')).map(({ name }) => name), ['Maule']);
  assert.deepEqual(requestedUrls, ['data/countries/index.json', 'data/countries/chile.json', 'data/subdivisions/chile.json']);
});
