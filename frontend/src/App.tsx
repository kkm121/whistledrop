import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LiquidBackdrop } from './components/LiquidBackdrop';
import { CursorGlow } from './components/CursorGlow';
import { Preloader } from './components/Preloader';
import { Header } from './components/Header';
import { ReportDropBox } from './components/ReportDropBox';
import { CasePassModal } from './components/CasePassModal';
import { CaseTracker } from './components/CaseTracker';
import { ModeratorStudio } from './components/ModeratorStudio';
import { ReportSubmitResponse } from './types';

export const App: React.FC = () => {
  const [showPreloader, setShowPreloader] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('whistle_theme') as 'dark' | 'light') || 'dark';
  });
  const [activeTab, setActiveTab] = useState<'submit' | 'track' | 'moderator'>('submit');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [moderatorToken, setModeratorToken] = useState(
    localStorage.getItem('whistle_mod_token') || 'dev-moderator-key-CHANGE-ME'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittedPass, setSubmittedPass] = useState<ReportSubmitResponse | null>(null);
  const [prefilledTrackCode, setPrefilledTrackCode] = useState('');

  // Synchronize theme with document element
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('whistle_theme', theme);
  }, [theme]);

  const flashNotice = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSetModeratorToken = (t: string) => {
    setModeratorToken(t);
    localStorage.setItem('whistle_mod_token', t);
  };

  const handleTrackCodeFromPass = (code: string) => {
    setSubmittedPass(null);
    setPrefilledTrackCode(code);
    setActiveTab('track');
  };

  return (
    <div className="whistle-studio-app">
      {/* Paced 4.2-second Luxury Skippable Preloader */}
      <AnimatePresence>
        {showPreloader && <Preloader onDone={() => setShowPreloader(false)} />}
      </AnimatePresence>

      {/* Dynamic Colorful Liquid Mesh & Ambient Glow */}
      <LiquidBackdrop />
      <CursorGlow />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        isModeratorAuthed={Boolean(moderatorToken)}
        theme={theme}
        setTheme={setTheme}
      />

      <main className="studio-main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ReportDropBox
                onSuccess={(res) => setSubmittedPass(res)}
                flashNotice={flashNotice}
              />
            </motion.div>
          )}

          {activeTab === 'track' && (
            <motion.div
              key="track"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <CaseTracker
                initialCode={prefilledTrackCode}
                flashNotice={flashNotice}
              />
            </motion.div>
          )}

          {activeTab === 'moderator' && (
            <motion.div
              key="moderator"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ModeratorStudio
                token={moderatorToken}
                setToken={handleSetModeratorToken}
                flashNotice={flashNotice}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Case Pass Receipt Modal */}
      <AnimatePresence>
        {submittedPass && (
          <CasePassModal
            data={submittedPass}
            onClose={() => setSubmittedPass(null)}
            onTrackNow={handleTrackCodeFromPass}
            flashNotice={flashNotice}
          />
        )}
      </AnimatePresence>

      {/* Interactive Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="toast-notification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className="toast-beacon" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="studio-footer">
        <div className="footer-content">
          <span>WhistleDrop Intelligence Architecture · 100% Zero-Footprint Anonymity · Multi-Task Machine Learning Engine</span>
          <span className="footer-tag">GDG on Campus SRM · Backend & ML Domain</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
