import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseNumber, parseInteger } from './numberParsing.js';

test('parseNumber handles commas and empty values', () => {
  assert.equal(parseNumber('1,234.50'), 1234.5);
  assert.equal(parseNumber(''), 0);
  assert.equal(parseNumber(null), 0);
});

test('parseInteger handles commas and empty values', () => {
  assert.equal(parseInteger('9,876'), 9876);
  assert.equal(parseInteger(undefined), 0);
  assert.equal(parseInteger('not-a-number'), 0);
});
