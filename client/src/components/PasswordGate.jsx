import { useState } from 'react';
import { api, setStoredPassword, clearStoredPassword } from '../api';
import { VMarkIcon } from './Icons';

export default function PasswordGate({ onUnlocked }) {
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setChecking(true);
    setError(false);
    setStoredPassword(password);
    try {
      await api.getData();
      onUnlocked();
    } catch {
      clearStoredPassword();
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="password-gate">
      <div className="password-gate-card">
        <div className="password-gate-logo">
          <VMarkIcon />
        </div>
        <div className="password-gate-title">Valor Equity Partners</div>
        <div className="password-gate-subtitle">Portfolio Overview Generator</div>
        <form onSubmit={handleSubmit}>
          <input
            className="password-gate-input"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          {error && <div className="password-gate-error">Incorrect password. Try again.</div>}
          <button className="password-gate-submit" type="submit" disabled={checking || !password}>
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
