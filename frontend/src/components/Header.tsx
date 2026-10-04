import React from 'react';
import { sounds } from '../lib/sound';
import {
  ShieldCheckIcon,
  FileTextIcon,
  SearchIcon,
  LockIcon,
  SunIcon,
  MoonIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from './Icons';

interface Props {
  activeTab: 'submit' | 'track' | 'moderator';
  setActiveTab: (t: 'submit' | 'track' | 'moderator') => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  isModeratorAuthed: boolean;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  audioEnabled,
  setAudioEnabled,
  isModeratorAuthed,
  theme,
  setTheme,
}) => {
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    sounds.playTap();
  };

  return (
    <header className="whistle-header">
      <div className="header-left">
        <div
          className="brand-lockup"
          onClick={() => {
            sounds.playTap();
            setActiveTab('submit');
          }}
        >
          <div className="brand-icon-shield">
            <ShieldCheckIcon size={24} />
          </div>
          <div>
            <h1 className="brand-title">WhistleDrop</h1>
            <p className="brand-subtitle">Confidential AI Intelligence · Speak Without Being Seen</p>
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
          onClick={() => {
            sounds.playTap();
            setActiveTab('submit');
          }}
        >
          <FileTextIcon size={16} />
          <span>Submit Report</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => {
            sounds.playTap();
            setActiveTab('track');
          }}
        >
          <SearchIcon size={16} />
          <span>Track Case</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'moderator' ? 'active' : ''}`}
          onClick={() => {
            sounds.playTap();
            setActiveTab('moderator');
          }}
        >
          <LockIcon size={16} />
          <span>Moderator Studio</span>
          {isModeratorAuthed && <span className="auth-indicator-dot" title="Authenticated clearance" />}
        </button>
      </div>

      <div className="header-actions">
        {/* Theme Toggle Button */}
        <button
          className="icon-action-btn theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        {/* Audio Toggle Button */}
        <button
          className="icon-action-btn"
          onClick={() => {
            const next = !audioEnabled;
            sounds.setEnabled(next);
            setAudioEnabled(next);
            if (next) sounds.playSuccess();
          }}
          title={audioEnabled ? 'Mute audio' : 'Enable audio feedback'}
          aria-label="Toggle audio feedback"
        >
          {audioEnabled ? <VolumeIcon size={18} /> : <VolumeMuteIcon size={18} />}
        </button>
      </div>
    </header>
  );
};
