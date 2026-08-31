import { useEffect, useState } from 'react';
import { DownloadIcon } from './Icons';

// Local draft + commit-on-blur, same pattern as company card fields — avoids
// firing a save request on every keystroke while still keeping the "Download"
// button (which reads live state) in sync once the field loses focus.
function DeckSettingField({ label, field, value, placeholder, onCommit }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <input
        className="setting-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onCommit(field, draft);
        }}
      />
    </div>
  );
}

function SectionTabs({ sections, currentSectionIdx, onSelect }) {
  return (
    <div className="section-tabs">
      {sections.map((s, i) => (
        <button key={s.id} className={`section-tab ${i === currentSectionIdx ? 'active' : ''}`} onClick={() => onSelect(i)}>
          {s.label}
          <span className="section-count">{s.companies.length}</span>
        </button>
      ))}
    </div>
  );
}

function DeckSettings({ deckSettings, onChange }) {
  return (
    <>
      <DeckSettingField label="Title" field="title" value={deckSettings.title} placeholder="Deck title" onCommit={onChange} />
      <DeckSettingField label="Date / Subtitle" field="date" value={deckSettings.date} placeholder="e.g. August 2026" onCommit={onChange} />
      <DeckSettingField label="Footer line" field="footer" value={deckSettings.footer} placeholder="Footer text" onCommit={onChange} />
    </>
  );
}

export default function Sidebar({ sections, currentSectionIdx, onSelectSection, deckSettings, onChangeDeckSetting, status, generating, onGenerate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Sections</div>
        <SectionTabs sections={sections} currentSectionIdx={currentSectionIdx} onSelect={onSelectSection} />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Deck Settings</div>
        <DeckSettings deckSettings={deckSettings} onChange={onChangeDeckSetting} />
      </div>

      {status && <div className={`status-bar show ${status.type}`}>{status.message}</div>}

      <button className={`generate-btn ${generating ? 'loading' : ''}`} disabled={generating} onClick={onGenerate}>
        <div className="spinner" />
        <span className="btn-text">
          <DownloadIcon />
          Download .pptx
        </span>
      </button>
    </aside>
  );
}
