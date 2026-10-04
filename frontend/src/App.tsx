import React, { useState, useEffect, useCallback } from 'react';
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
import { sounds } from './lib/sound';

export const App: React.FC = () => {
  const [showPreloader, setShowPreloader] = useState(true);
  const [introPhase, setIntroPhase] = useState<'loading' | 'title' | 'studio'>('loading');
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

  const dismissBoot = useCallback((immediate?: boolean) => {
    setShowPreloader(false);
    if (immediate) {
      setIntroPhase('studio');
      return;
    }
    setIntroPhase('title');
    sounds.playJump();

    // 1.35s presentation flip and smooth studio entrance
    setTimeout(() => {
      setIntroPhase('studio');
      setTimeout(() => sounds.playLand(), 180);
      setTimeout(() => sounds.playLand(), 560);
    }, 1350);
  }, []);

  return (
    <div className="whistle-studio-app">
      {/* Paced 4.2-second Luxury Skippable Preloader */}
      <AnimatePresence>
        {showPreloader && <Preloader onDone={dismissBoot} />}
      </AnimatePresence>

      {/* Dynamic Colorful Liquid Mesh & Ambient Glow */}
      <LiquidBackdrop />
      <CursorGlow />

      {/* GTA V Keynote 3D Title Slide Presentation (Spin in Air, Stop & Land with Acoustic Thud) */}
      <AnimatePresence>
        {introPhase === 'title' && (
          <motion.div
            className="gta-presentation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.05,
              transition: { duration: 0.18, ease: 'easeOut' },
            }}
          >
            <motion.div
              className="gta-title-card"
              initial={{
                opacity: 0,
                scale: 0.25,
                rotateX: 70,
                rotateY: -35,
                z: -400,
              }}
              animate={{
                opacity: [0, 1, 1],
                scale: [0.25, 1.15, 1.0],
                rotateX: [70, -8, 0],
                rotateY: [-35, 10, 0],
                z: [-400, 20, 0],
              }}
              transition={{
                duration: 1.25,
                times: [0, 0.55, 1],
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="gta-presenter-banner">
                <span>CONFIDENTIAL INTEL PLATFORM</span>
              </div>
              <h1 className="gta-headline">
                WhistleDrop<span className="gta-accent">.</span>
              </h1>
              <p className="gta-subline">Speak Without Being Seen</p>
              <div className="gta-meta-strip">
                <span className="gta-tag">100% Zero-Trace Anonymity</span>
                <span className="gta-dot">•</span>
                <span className="gta-tag">ALISON Stylometry Shield</span>
                <span className="gta-dot">•</span>
                <span className="gta-tag">ZK-Email Proof</span>
                <span className="gta-dot">•</span>
                <span className="gta-tag">Honey Decoy Vault</span>
              </div>
              <div className="gta-specular-flash" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: -60, rotateX: -30, opacity: 0 }}
        animate={
          introPhase === 'studio'
            ? { y: 0, rotateX: 0, opacity: 1 }
            : { y: -60, rotateX: -30, opacity: 0 }
        }
        transition={{ type: 'spring', stiffness: 340, damping: 24, delay: 0.02 }}
      >
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
          isModeratorAuthed={Boolean(moderatorToken)}
          theme={theme}
          setTheme={setTheme}
        />
      </motion.div>

      <main className="studio-main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'submit' && (
            <motion.div
              key="submit"
              initial={{
                opacity: 0,
                scale: 0.22,
                rotateY: 270,
                rotateZ: -10,
                y: -120,
              }}
              animate={
                introPhase === 'studio'
                  ? {
                      opacity: [0, 1, 1, 1],
                      scale: [0.22, 1.04, 1.04, 1.0],
                      rotateY: [270, 0, 0, 0],
                      rotateZ: [-10, 0, 0, 0],
                      y: [-120, -16, -16, 0],
                    }
                  : { opacity: 0, y: -120 }
              }
              transition={{
                duration: 0.82,
                times: [0, 0.46, 0.72, 1.0],
                ease: [0.16, 1, 0.3, 1],
                delay: 0.05,
              }}
              exit={{ opacity: 0, y: -16 }}
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
              initial={{
                opacity: 0,
                scale: 0.22,
                rotateY: -270,
                rotateZ: 10,
                y: -120,
              }}
              animate={{
                opacity: [0, 1, 1, 1],
                scale: [0.22, 1.04, 1.04, 1.0],
                rotateY: [-270, 0, 0, 0],
                rotateZ: [10, 0, 0, 0],
                y: [-120, -16, -16, 0],
              }}
              transition={{
                duration: 0.82,
                times: [0, 0.46, 0.72, 1.0],
                ease: [0.16, 1, 0.3, 1],
                delay: 0.05,
              }}
              exit={{ opacity: 0, y: -16 }}
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
              initial={{
                opacity: 0,
                scale: 0.22,
                rotateY: 270,
                rotateZ: -8,
                y: -120,
              }}
              animate={{
                opacity: [0, 1, 1, 1],
                scale: [0.22, 1.04, 1.04, 1.0],
                rotateY: [270, 0, 0, 0],
                rotateZ: [-8, 0, 0, 0],
                y: [-120, -16, -16, 0],
              }}
              transition={{
                duration: 0.82,
                times: [0, 0.46, 0.72, 1.0],
                ease: [0.16, 1, 0.3, 1],
                delay: 0.05,
              }}
              exit={{ opacity: 0, y: -16 }}
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
