const crypto = require('crypto');

// Timing-safe comparison so response time can't leak how many characters matched.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Standard HTTP Basic Auth, gating every /api route behind one shared
// username/password (set via APP_USERNAME/APP_PASSWORD on the host, never
// hardcoded). If APP_PASSWORD isn't configured, requests pass through
// unauthenticated — that's intentional so a fresh deploy isn't locked out
// before the variable is set, but it means it MUST be configured before
// sharing the app URL with anyone.
function requireBasicAuth(req, res, next) {
  const configuredUser = process.env.APP_USERNAME;
  const configuredPass = process.env.APP_PASSWORD;
  if (!configuredPass) {
    console.warn('APP_PASSWORD is not set — /api routes are currently unprotected.');
    return next();
  }

  const header = req.header('authorization') || '';
  const match = header.match(/^Basic (.+)$/i);
  if (match) {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const sepIndex = decoded.indexOf(':');
    const user = sepIndex === -1 ? decoded : decoded.slice(0, sepIndex);
    const pass = sepIndex === -1 ? '' : decoded.slice(sepIndex + 1);
    const userOk = !configuredUser || safeEqual(user, configuredUser);
    if (userOk && safeEqual(pass, configuredPass)) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Valor Portfolio Generator"');
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { requireBasicAuth };
