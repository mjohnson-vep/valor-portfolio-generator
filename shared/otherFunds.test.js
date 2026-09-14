'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  formatOtherFundsLine,
  normalizeOtherFunds,
  hasOtherFunds,
  MULTI_FUND_LEGEND,
} = require('./otherFunds');

test('formatOtherFundsLine: missing / empty / junk → no footnote', () => {
  assert.equal(formatOtherFundsLine(undefined), '');
  assert.equal(formatOtherFundsLine(null), '');
  assert.equal(formatOtherFundsLine([]), '');
  assert.equal(formatOtherFundsLine(['', '  ']), '');
  assert.equal(formatOtherFundsLine('VSV – Core'), '');
  assert.equal(hasOtherFunds(undefined), false);
});

test('formatOtherFundsLine: * sits on the funds, never as a name suffix', () => {
  assert.equal(formatOtherFundsLine(['VSV – Core']), '* VSV – Core');
  assert.equal(
    formatOtherFundsLine(['Growth – Platform', 'VAAI – Core']),
    '* Growth – Platform · VAAI – Core'
  );
  assert.equal(formatOtherFundsLine(['  Seed  ', '', 'VSV – Core']), '* Seed · VSV – Core');
  assert.ok(!formatOtherFundsLine(['VSV – Core']).includes('Also in:'));
});

test('normalizeOtherFunds drops non-strings', () => {
  assert.deepEqual(normalizeOtherFunds(['VSV – Core', 12, null, ' Seed ']), ['VSV – Core', 'Seed']);
});

test('legend wording is the agreed footer line', () => {
  assert.equal(MULTI_FUND_LEGEND, '* Additional Valor fund(s) invested');
});
