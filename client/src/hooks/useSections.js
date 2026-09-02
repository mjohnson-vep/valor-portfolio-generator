import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function defaultDateLabel() {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

export function useSections() {
  const [sections, setSections] = useState(null);
  const [deckSettings, setDeckSettings] = useState({ title: 'Portfolio Overview', date: '', footer: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loadToken, setLoadToken] = useState(0);

  // Any request can come back as an auth failure (wrong/missing password, or
  // the password changed on the backend mid-session) — funnel all of those
  // into the same gate instead of showing a raw error message.
  const handleError = useCallback((err) => {
    if (err.isAuthError) setAuthRequired(true);
    else setError(err.message);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getData()
      .then((data) => {
        if (cancelled) return;
        setAuthRequired(false);
        setSections(data.sections);
        setDeckSettings({
          title: data.deckSettings.title || 'Portfolio Overview',
          date: data.deckSettings.date || defaultDateLabel(),
          footer: data.deckSettings.footer || 'Confidential. Not For Further Distribution.',
        });
      })
      .catch((err) => !cancelled && handleError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadToken, handleError]);

  // Called once the password gate confirms a working password, to load real data.
  const retryLoad = useCallback(() => setLoadToken((t) => t + 1), []);

  const replaceSection = useCallback((sectionId, updater) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? updater(s) : s)));
  }, []);

  const updateDeckSetting = useCallback(
    (field, value) => {
      setDeckSettings((prev) => ({ ...prev, [field]: value }));
      api.updateDeckSettings({ [field]: value }).catch(handleError);
    },
    [handleError]
  );

  const addCompany = useCallback(
    async (sectionId) => {
      const company = await api.addCompany(sectionId, { name: '', url: '', desc: '', included: true });
      replaceSection(sectionId, (s) => ({ ...s, companies: [...s.companies, company] }));
      return company;
    },
    [replaceSection]
  );

  const updateCompany = useCallback(
    async (sectionId, companyId, fields) => {
      replaceSection(sectionId, (s) => ({
        ...s,
        companies: s.companies.map((c) => (c.id === companyId ? { ...c, ...fields } : c)),
      }));
      try {
        await api.updateCompany(sectionId, companyId, fields);
      } catch (err) {
        handleError(err);
      }
    },
    [replaceSection, handleError]
  );

  const removeCompany = useCallback(
    async (sectionId, companyId) => {
      replaceSection(sectionId, (s) => ({ ...s, companies: s.companies.filter((c) => c.id !== companyId) }));
      try {
        await api.removeCompany(sectionId, companyId);
      } catch (err) {
        handleError(err);
      }
    },
    [replaceSection, handleError]
  );

  const duplicateCompany = useCallback(
    async (sectionId, companyId) => {
      const copy = await api.duplicateCompany(sectionId, companyId);
      replaceSection(sectionId, (s) => {
        const idx = s.companies.findIndex((c) => c.id === companyId);
        const companies = [...s.companies];
        companies.splice(idx + 1, 0, copy);
        return { ...s, companies };
      });
    },
    [replaceSection]
  );

  const reorderSection = useCallback(
    async (sectionId, orderedIds) => {
      replaceSection(sectionId, (s) => {
        const byId = new Map(s.companies.map((c) => [c.id, c]));
        return { ...s, companies: orderedIds.map((id) => byId.get(id)) };
      });
      try {
        await api.reorderSection(sectionId, orderedIds);
      } catch (err) {
        handleError(err);
      }
    },
    [replaceSection, handleError]
  );

  const toggleAllInSection = useCallback(
    async (sectionId, included) => {
      replaceSection(sectionId, (s) => ({ ...s, companies: s.companies.map((c) => ({ ...c, included })) }));
      try {
        await api.toggleAllInSection(sectionId, included);
      } catch (err) {
        handleError(err);
      }
    },
    [replaceSection, handleError]
  );

  const sortSection = useCallback(
    async (sectionId) => {
      const updated = await api.sortSection(sectionId);
      replaceSection(sectionId, () => updated);
    },
    [replaceSection]
  );

  const importCsv = useCallback(
    async (sectionId, csv) => {
      const { added, section } = await api.importCsv(sectionId, csv);
      replaceSection(sectionId, () => section);
      return added;
    },
    [replaceSection]
  );

  return {
    sections,
    deckSettings,
    loading,
    error,
    authRequired,
    retryLoad,
    updateDeckSetting,
    addCompany,
    updateCompany,
    removeCompany,
    duplicateCompany,
    reorderSection,
    toggleAllInSection,
    sortSection,
    importCsv,
  };
}
