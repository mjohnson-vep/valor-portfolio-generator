import { useEffect, useRef, useState } from 'react';
import { DragHandleIcon, DuplicateIcon, TrashIcon } from './Icons';

export default function CompanyCard({
  company,
  autoFocus,
  onAutoFocusHandled,
  isDragging,
  isDragOver,
  onUpdate,
  onToggleIncluded,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) {
  const [draft, setDraft] = useState({ name: company.name, url: company.url, desc: company.desc });
  const nameRef = useRef(null);

  useEffect(() => {
    setDraft({ name: company.name, url: company.url, desc: company.desc });
  }, [company.name, company.url, company.desc]);

  useEffect(() => {
    if (autoFocus && nameRef.current) {
      nameRef.current.focus();
      onAutoFocusHandled?.();
    }
    // Only ever fires once per card mount — deliberately ignoring onAutoFocusHandled identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const commit = (field) => {
    if (draft[field] !== company[field]) onUpdate(field, draft[field]);
  };

  const excluded = company.included === false;
  const needsDesc = !company.desc || !company.desc.trim();

  return (
    <div
      className={`company-card ${excluded ? 'excluded' : ''} ${needsDesc ? 'needs-desc' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable="true"
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <input type="checkbox" className="card-include" title="Include in PPT" checked={!excluded} onChange={(e) => onToggleIncluded(e.target.checked)} />
      <div className="drag-handle" title="Drag to reorder">
        <DragHandleIcon />
      </div>
      <input
        ref={nameRef}
        className="card-input name"
        value={draft.name}
        placeholder="COMPANY NAME"
        title="Company name"
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        onBlur={() => commit('name')}
      />
      <input
        className="card-input url"
        value={draft.url}
        placeholder="website.com"
        title="Website URL"
        onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
        onBlur={() => commit('url')}
      />
      <input
        className="card-input desc"
        value={draft.desc}
        placeholder={needsDesc ? '⚠ Add description...' : 'One-line description...'}
        title="Description"
        style={needsDesc ? { borderColor: '#F59E0B' } : undefined}
        onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))}
        onBlur={() => commit('desc')}
      />
      <div className="card-actions">
        <button className="btn btn-ghost" onClick={onDuplicate} title="Duplicate">
          <DuplicateIcon />
        </button>
        <button className="btn btn-danger" onClick={onRemove} title="Remove">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
