import { useState } from 'react';
import { CloseIcon } from './Icons';

export default function ImportModal({ open, sectionLabel, onClose, onImport }) {
  const [text, setText] = useState('');

  if (!open) return null;

  const handleImport = () => {
    const raw = text.trim();
    if (!raw) return;
    onImport(raw);
    setText('');
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Import Companies from CSV</div>
          <button className="btn btn-ghost" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--grey-600)' }}>
            Paste CSV data below. Companies will be added to the currently selected section (<strong>{sectionLabel}</strong>).
          </div>
          <textarea
            className="modal-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Company Name, Website, Description\nAALO ATOMICS, aalo.com, Operator of a clean energy company...\nADDEPAR, addepar.com, Financial reporting tools...'}
          />
          <div className="modal-hint">
            Format: <code>Name, URL, Description</code> — one company per line. Header row optional. Paste from Excel by selecting 3 columns.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport}>Import Companies</button>
        </div>
      </div>
    </div>
  );
}
