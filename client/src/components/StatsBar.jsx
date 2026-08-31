export default function StatsBar({ sections }) {
  const total = sections.reduce((sum, s) => sum + s.companies.length, 0);
  const slides = sections.reduce((sum, s) => sum + Math.ceil(s.companies.length / 16), 0);

  return (
    <div className="stats-bar">
      <div className="stat">
        <div className="stat-value">{total}</div>
        <div className="stat-label">Portfolio Companies</div>
      </div>
      <div className="stat-divider" />
      {sections.map((s) => (
        <div key={s.id} style={{ display: 'contents' }}>
          <div className="stat">
            <div className="stat-value">{s.companies.length}</div>
            <div className="stat-label">{s.label}</div>
          </div>
          <div className="stat-divider" />
        </div>
      ))}
      <div className="stat">
        <div className="stat-value">{slides + 2}</div>
        <div className="stat-label">Total Slides</div>
      </div>
    </div>
  );
}
