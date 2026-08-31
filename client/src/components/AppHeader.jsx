import { UploadIcon, VMarkIcon } from './Icons';

export default function AppHeader({ onOpenImport, onResetHint }) {
  return (
    <header>
      <div className="logo">
        <div className="logo-v">
          <VMarkIcon />
        </div>
        <div>
          <div className="logo-text">Valor Equity Partners</div>
          <div className="logo-sub">Portfolio Overview Generator</div>
        </div>
      </div>
      <div className="header-right">
        <button
          className="btn btn-ghost"
          onClick={onResetHint}
          title="Data is shared — edits are saved for the whole team"
          style={{ fontSize: 11, padding: '6px 10px', color: 'var(--grey-400)' }}
        >
          Shared data
        </button>
        <button className="btn btn-secondary" onClick={onOpenImport} style={{ fontSize: 12, padding: '6px 12px' }}>
          <UploadIcon />
          Import CSV
        </button>
      </div>
    </header>
  );
}
