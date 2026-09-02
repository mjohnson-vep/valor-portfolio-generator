// In dev, Vite proxies /api to the local Express server. In production, set
// VITE_API_URL at build time to the deployed Railway backend's origin.
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const BASIC_AUTH_USERNAME = 'valor';
const AUTH_STORAGE_KEY = 'valor_portfolio_basic_auth';

export function setStoredPassword(password) {
  localStorage.setItem(AUTH_STORAGE_KEY, btoa(`${BASIC_AUTH_USERNAME}:${password}`));
}

export function clearStoredPassword() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

class AuthError extends Error {
  constructor() {
    super('Incorrect password');
    this.isAuthError = true;
  }
}

function authHeaders() {
  const token = localStorage.getItem(AUTH_STORAGE_KEY);
  return token ? { Authorization: `Basic ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options,
  });
  if (res.status === 401) {
    clearStoredPassword();
    throw new AuthError();
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getData: () => request('/data'),

  updateDeckSettings: (settings) => request('/deck-settings', { method: 'PUT', body: JSON.stringify(settings) }),

  addCompany: (sectionId, company) =>
    request(`/sections/${sectionId}/companies`, { method: 'POST', body: JSON.stringify(company) }),

  updateCompany: (sectionId, companyId, fields) =>
    request(`/sections/${sectionId}/companies/${companyId}`, { method: 'PATCH', body: JSON.stringify(fields) }),

  removeCompany: (sectionId, companyId) =>
    request(`/sections/${sectionId}/companies/${companyId}`, { method: 'DELETE' }),

  duplicateCompany: (sectionId, companyId) =>
    request(`/sections/${sectionId}/companies/${companyId}/duplicate`, { method: 'POST' }),

  reorderSection: (sectionId, orderedIds) =>
    request(`/sections/${sectionId}/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) }),

  toggleAllInSection: (sectionId, included) =>
    request(`/sections/${sectionId}/toggle-all`, { method: 'PUT', body: JSON.stringify({ included }) }),

  sortSection: (sectionId) => request(`/sections/${sectionId}/sort`, { method: 'POST' }),

  importCsv: (sectionId, csv) =>
    request(`/sections/${sectionId}/import`, { method: 'POST', body: JSON.stringify({ csv }) }),

  generatePptx: async (deckSettings) => {
    const res = await fetch(`${API_BASE}/generate-pptx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(deckSettings),
    });
    if (res.status === 401) {
      clearStoredPassword();
      throw new AuthError();
    }
    if (!res.ok) throw new Error(`Failed to generate PPTX (${res.status})`);
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : 'Valor_Portfolio_Overview.pptx';
    const blob = await res.blob();
    return { blob, filename };
  },
};
