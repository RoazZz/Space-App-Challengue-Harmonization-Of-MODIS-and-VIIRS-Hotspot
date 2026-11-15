import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createPolygonArea } from '../../src/geo/area-of-interest.js';

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'));
const relativeError = (actual, expected) => Math.abs(actual - expected) / expected;
const areaOf = ({ name, polygons }) => createPolygonArea(name, polygons).areaSquareKm;

test('every country flagged with subdivisions has a subdivision file', () => {
  for (const { id, hasSubdivisions } of readJson('data/countries/index.json')) {
    const exists = existsSync(new URL(`../../data/subdivisions/${id}.json`, import.meta.url));
    assert.equal(exists, hasSubdivisions, id);
  }
});

test('the demo region lists its 32 states', () => {
  assert.equal(readJson('data/subdivisions/mexico.json').subdivisions.length, 32);
});

test('subdivision areas match their reference surface', () => {
  const references = [
    ['mexico', 'veracruz', 71826],
    ['australia', 'new-south-wales', 800642],
    ['brazil', 'mato-grosso', 903207],
    ['canada', 'british-columbia', 944735],
  ];
  for (const [countryId, subdivisionId, referenceSquareKm] of references) {
    const subdivision = readJson(`data/subdivisions/${countryId}.json`).subdivisions.find(({ id }) => id === subdivisionId);
    assert.ok(relativeError(areaOf(subdivision), referenceSquareKm) < 0.03, `${subdivisionId}: ${areaOf(subdivision)}`);
  }
});

test('subdivisions add up to their country', () => {
  for (const countryId of ['mexico', 'argentina', 'india']) {
    const country = readJson(`data/countries/${countryId}.json`);
    const total = readJson(`data/subdivisions/${countryId}.json`).subdivisions.reduce((sum, part) => sum + areaOf(part), 0);
    assert.ok(relativeError(total, areaOf(country)) < 0.03, `${countryId}: ${total} vs ${areaOf(country)}`);
  }
});
