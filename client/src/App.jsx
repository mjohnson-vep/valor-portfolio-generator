import { useEffect, useState } from 'react';
import { useSections } from './hooks/useSections';
import { api } from './api';
import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import StatsBar from './components/StatsBar';
import MainHeader from './components/MainHeader';
import CompanyGrid from './components/CompanyGrid';
import ImportModal from './components/ImportModal';
import PasswordGate from './components/PasswordGate';

export default function App() {
  const {
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
  } = useSections();

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  const showStatus = (message, type = 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus((s) => (s?.message === message ? null : s)), 5000);
  };

  // Surfaces mutation failures that happen after the initial load (the hook
  // keeps local state optimistic, so this is the only signal something didn't save).
  useEffect(() => {
    if (error && sections) showStatus(`Couldn't save your last change: ${error}`, 'error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (authRequired) {
    return <PasswordGate onUnlocked={retryLoad} />;
  }

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: 'Europa, sans-serif', color: 'var(--grey-600)' }}>Loading portfolio data…</div>
    );
  }

  if (error && !sections) {
    return (
      <div style={{ padding: 40, fontFamily: 'Europa, sans-serif', color: 'var(--red)' }}>
        Couldn&#39;t load portfolio data: {error}
      </div>
    );
  }

  const section = sections[currentSectionIdx];

  const handleAddCompany = async () => {
    const company = await addCompany(section.id);
    setLastAddedId(company.id);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    showStatus('Building your presentation…', 'info');
    try {
      const { blob, filename } = await api.generatePptx(deckSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      showStatus('✓ Download started!', 'success');
    } catch (err) {
      if (err.isAuthError) {
        retryLoad(); // re-triggers the data fetch, which will surface the password gate
      } else {
        showStatus('Error generating file. Check console for details.', 'error');
        console.error(err);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = async (csv) => {
    setImportOpen(false);
    try {
      const added = await importCsv(section.id, csv);
      showStatus(`Imported ${added} compan${added !== 1 ? 'ies' : 'y'} into ${section.label}`, 'success');
    } catch (err) {
      showStatus('Import failed. Check console for details.', 'error');
      console.error(err);
    }
  };

  return (
    <>
      <AppHeader
        onOpenImport={() => setImportOpen(true)}
        onResetHint={() => showStatus('This data is shared with your whole team — edits save automatically for everyone.', 'info')}
      />

      <div className="layout">
        <Sidebar
          sections={sections}
          currentSectionIdx={currentSectionIdx}
          onSelectSection={setCurrentSectionIdx}
          deckSettings={deckSettings}
          onChangeDeckSetting={updateDeckSetting}
          status={status}
          generating={generating}
          onGenerate={handleGenerate}
        />

        <main className="main">
          <StatsBar sections={sections} />

          <MainHeader
            section={section}
            onSelectAll={() => toggleAllInSection(section.id, true)}
            onDeselectAll={() => toggleAllInSection(section.id, false)}
            onSort={() => sortSection(section.id)}
            onAddCompany={handleAddCompany}
          />

          <CompanyGrid
            section={section}
            lastAddedId={lastAddedId}
            onAutoFocusHandled={() => setLastAddedId(null)}
            onUpdateCompany={(companyId, fields) => updateCompany(section.id, companyId, fields)}
            onToggleIncluded={(companyId, val) => updateCompany(section.id, companyId, { included: val })}
            onRemove={(companyId) => removeCompany(section.id, companyId)}
            onDuplicate={(companyId) => duplicateCompany(section.id, companyId)}
            onReorder={(orderedIds) => reorderSection(section.id, orderedIds)}
            onAddCompany={handleAddCompany}
          />
        </main>
      </div>

      <ImportModal open={importOpen} sectionLabel={section.label} onClose={() => setImportOpen(false)} onImport={handleImport} />
    </>
  );
}
