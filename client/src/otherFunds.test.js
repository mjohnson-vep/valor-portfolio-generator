import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatOtherFundsLine } from './otherFunds.js';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const shared = require('../../shared/otherFunds.js');

test('UI formatter matches shared PPT formatter', () => {
  const funds = ['VSV – Core', 'VAAI – Core'];
  assert.equal(formatOtherFundsLine(funds), shared.formatOtherFundsLine(funds));
  assert.equal(formatOtherFundsLine(funds), '* VSV – Core · VAAI – Core');
  assert.equal(formatOtherFundsLine(undefined), '');
});

test('CompanyCard: name stays clean; * renders on the fund line under desc', () => {
  const src = readFileSync(join(here, 'components', 'CompanyCard.jsx'), 'utf8');
  assert.match(src, /formatOtherFundsLine\(company\.otherFunds\)/);
  assert.match(src, /className="card-other-funds"/);
  assert.match(src, /className="card-input name"/);
  assert.doesNotMatch(src, /draft\.name.*\*/);
  assert.doesNotMatch(src, /company\.name\s*\+/);
  assert.doesNotMatch(src, /Also in:/);
  assert.match(src, /otherFundsLine \?/);
});
