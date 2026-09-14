'use strict';

/**
 * Optional fields on a company object (existing fields are unchanged):
 *   valorId?: string      — vOS company id for future reconciliation
 *   otherFunds?: string[] — other section labels this company also appears in
 *                           (excluding the section this row lives in)
 *
 * Frontend and PPT must tolerate companies that omit both fields.
 */

const MULTI_FUND_LEGEND = '* Additional Valor fund(s) invested';
const OTHER_FUNDS_JOIN = ' · ';

function normalizeOtherFunds(otherFunds) {
  if (!Array.isArray(otherFunds)) return [];
  return otherFunds
    .filter((label) => typeof label === 'string')
    .map((label) => label.trim())
    .filter(Boolean);
}

/**
 * Footnote line under the description. Leading `*` marks the *funds*, never
 * the company name. Empty / missing otherFunds → empty string (caller hides it).
 * Examples: "* VSV – Core"  |  "* Growth – Platform · VAAI – Core"
 */
function formatOtherFundsLine(otherFunds) {
  const labels = normalizeOtherFunds(otherFunds);
  if (!labels.length) return '';
  return `* ${labels.join(OTHER_FUNDS_JOIN)}`;
}

function hasOtherFunds(otherFunds) {
  return formatOtherFundsLine(otherFunds) !== '';
}

module.exports = {
  MULTI_FUND_LEGEND,
  OTHER_FUNDS_JOIN,
  normalizeOtherFunds,
  formatOtherFundsLine,
  hasOtherFunds,
};
