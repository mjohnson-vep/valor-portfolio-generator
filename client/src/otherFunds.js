/**
 * Display helpers for optional company.otherFunds.
 * Keep the format identical to shared/otherFunds.js (server/PPT).
 * Vite cannot consume that CJS module, so this is the ESM twin.
 */

const OTHER_FUNDS_JOIN = ' · ';

export function normalizeOtherFunds(otherFunds) {
  if (!Array.isArray(otherFunds)) return [];
  return otherFunds
    .filter((label) => typeof label === 'string')
    .map((label) => label.trim())
    .filter(Boolean);
}

/** Smaller text under the description. `*` sits on the funds, never the name. */
export function formatOtherFundsLine(otherFunds) {
  const labels = normalizeOtherFunds(otherFunds);
  if (!labels.length) return '';
  return `* ${labels.join(OTHER_FUNDS_JOIN)}`;
}

export function hasOtherFunds(otherFunds) {
  return formatOtherFundsLine(otherFunds) !== '';
}
