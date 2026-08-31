import { useRef, useState } from 'react';
import CompanyCard from './CompanyCard';
import { EmptyStateIcon, PlusIcon } from './Icons';

export default function CompanyGrid({ section, lastAddedId, onAutoFocusHandled, onUpdateCompany, onToggleIncluded, onRemove, onDuplicate, onReorder, onAddCompany }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const orderRef = useRef(section.companies);
  orderRef.current = section.companies;

  const handleDrop = (dropIndex) => {
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === dropIndex) return;
    const arr = [...orderRef.current];
    const [moved] = arr.splice(dragIndex, 1);
    arr.splice(dropIndex, 0, moved);
    setDragIndex(null);
    onReorder(arr.map((c) => c.id));
  };

  return (
    <>
      <div className="grid-headers">
        <div />
        <div className="col-header">Company Name</div>
        <div className="col-header">Website</div>
        <div className="col-header">Description</div>
        <div className="col-header" />
      </div>

      <div className="companies-grid">
        {section.companies.length === 0 && (
          <div className="empty-state">
            <EmptyStateIcon />
            <p>No companies yet. Click &#34;Add Company&#34; to get started.</p>
          </div>
        )}

        {section.companies.map((company, i) => (
          <CompanyCard
            key={company.id}
            company={company}
            autoFocus={company.id === lastAddedId}
            onAutoFocusHandled={onAutoFocusHandled}
            isDragging={dragIndex === i}
            isDragOver={dragOverIndex === i}
            onUpdate={(field, value) => onUpdateCompany(company.id, { [field]: value })}
            onToggleIncluded={(val) => onToggleIncluded(company.id, val)}
            onRemove={() => onRemove(company.id)}
            onDuplicate={() => onDuplicate(company.id)}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (i !== dragIndex) setDragOverIndex(i);
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(i);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
          />
        ))}

        <button className="add-row-btn" onClick={onAddCompany}>
          <PlusIcon width={13} height={13} strokeWidth="2.5" />
          {section.companies.length === 0 ? 'Add company' : `Add company to ${section.label}`}
        </button>
      </div>
    </>
  );
}
