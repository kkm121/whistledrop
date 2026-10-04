import React from 'react';
import { sounds } from '../lib/sound';

interface Props {
  activeTab: 'submit' | 'track' | 'moderator';
  setActiveTab: (t: 'submit' | 'track' | 'moderator') => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  isModeratorAuthed: boolean;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  audioEnabled,
  setAudioEnabled,
  isModeratorAuthed,
}) => {
  return (
    <header className="whistle-header">
      <div className="header-left">
        <div className="brand-lockup" onClick={() => { sounds.playTap(); setActiveTab('submit'); }}>
          <div className="brand-icon-shield">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">WhistleDrop</h1>
            <p className="brand-subtitle">Speak Without Being Seen · Confidential AI Vault</p>
          </div>
        </div>

        <div className="anonymity-pill-badge" title="No accounts, no IP logs, no identity tracking by design">
          <span className="pulsing-green-dot" />
          <span>Zero-Footprint Anonymity Guaranteed</span>
        </div>
      </div>

      <div className="header-nav-segmented">
        <button
          className={`nav-tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => { sounds.playTap(); setActiveTab('submit'); }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Submit Report</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => { sounds.playTap(); setActiveTab('track'); }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Track Case</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'moderator' ? 'active' : ''}`}
          onClick={() => { sounds.playTap(); setActiveTab('moderator'); }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Moderator Studio</span>
          {isModeratorAuthed && <span className="auth-indicator-dot" title="Authenticated" />}
        </button>
      </div>

      <div className="header-actions">
        <button
          className="icon-action-btn"
          onClick={() => {
            const next = !audioEnabled;
            sounds.setEnabled(next);
            setAudioEnabled(next);
            if (next) sounds.playSuccess();
          }}
          title={audioEnabled ? 'Mute audio' : 'Enable audio feedback'}
        >
          {audioEnabled ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};
