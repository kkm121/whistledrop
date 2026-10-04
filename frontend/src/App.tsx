import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LiquidBackdrop } from './components/LiquidBackdrop';
import { Header } from './components/Header';
import { ReportDropBox } from './components/ReportDropBox';
import { CasePassModal } from './components/CasePassModal';
import { CaseTracker } from './components/CaseTracker';
import { ModeratorStudio } from './components/ModeratorStudio';
import { ReportSubmitResponse } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submit' | 'track' | 'moderator'>('submit');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [moderatorToken, setModeratorToken] = useState(
    localStorage.getItem('whistle_mod_token') || 'dev-moderator-key-CHANGE-ME'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittedPass, setSubmittedPass] = useState<ReportSubmitResponse | null>(null);
  const [prefilledTrackCode, setPrefilledTrackCode] = useState('');

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
      <LiquidBackdrop />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        isModeratorAuthed={Boolean(moderatorToken)}
      />

      <main className="studio-main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
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

      {/* Interactive Toast */}
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
          <span>WhistleDrop Architecture · 100% Cryptographic Anonymity · Multi-Task Machine Learning Engine</span>
          <span className="footer-tag">GDG on Campus SRM · Backend & ML Domain</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
