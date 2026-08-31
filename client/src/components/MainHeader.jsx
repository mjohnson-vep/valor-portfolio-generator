import { PlusIcon, SortIcon } from './Icons';

export default function MainHeader({ section, onSelectAll, onDeselectAll, onSort, onAddCompany }) {
  const slides = Math.ceil(section.companies.length / 16);
  const included = section.companies.filter((c) => c.included !== false).length;

  return (
    <div className="main-header">
      <div>
        <div className="main-title">{section.pptLabel}</div>
        <div className="main-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span>
            {included} of {section.companies.length} included &#183; {slides} slide{slides !== 1 ? 's' : ''}
          </span>
          {section.companies.length > 0 && (
            <span className="select-toggle">
              <button className="btn-select-all" onClick={onSelectAll}>Select all</button>
              <button className="btn-select-all" onClick={onDeselectAll}>Deselect all</button>
            </span>
          )}
        </div>
      </div>
      <div className="main-actions">
        <button className="btn btn-secondary" onClick={onSort}>
          <SortIcon />
          A &#8594; Z
        </button>
        <button className="btn btn-primary" onClick={onAddCompany}>
          <PlusIcon width={13} height={13} strokeWidth="2.5" />
          Add Company
        </button>
      </div>
    </div>
  );
}
