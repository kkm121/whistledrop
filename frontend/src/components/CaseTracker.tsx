import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackReport } from '../lib/api';
import { sounds } from '../lib/sound';
import { ReportTrackResponse, Status } from '../types';
import {
  SearchIcon,
  KeyIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  FileTextIcon,
} from './Icons';

interface Props {
  initialCode?: string;
  flashNotice: (msg: string) => void;
}

const STEPS: Status[] = ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED'];

export const CaseTracker: React.FC<Props> = ({ initialCode = '', flashNotice }) => {
  const [caseCode, setCaseCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState<ReportTrackResponse | null>(null);
  const [searchedCode, setSearchedCode] = useState('');

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = caseCode.trim();
    if (!cleanCode) {
      flashNotice('Please enter a case code.');
      return;
    }

    setLoading(true);
    sounds.playTap();

    try {
      const data = await trackReport(cleanCode);
      setCaseData(data);
      setSearchedCode(cleanCode);
      sounds.playSuccess();
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Unknown case code. Please check for typos.');
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: Status) => {
    if (status === 'SUBMITTED') return 0;
    if (status === 'UNDER_REVIEW') return 1;
    if (status === 'RESOLVED' || status === 'CLOSED') return 2;
    if (status === 'DISMISSED') return 1;
    return 0;
  };

  return (
    <div className="case-tracker-container">
      <section className="tracker-hero">
        <div className="hero-kicker-strip">
          <span className="hero-kicker-beacon" />
          <span className="hero-kicker">CASE PROGRESS STATION</span>
        </div>
        <h2 className="hero-heading">Track Anonymous Investigation</h2>
        <p className="hero-tagline">
          Enter your unique cryptographic case code below to monitor investigation status and review official moderator notices in real-time.
        </p>
      </section>

      <form className="track-search-bar glass-panel" onSubmit={handleTrack}>
        <div className="search-input-group">
          <KeyIcon size={18} className="search-key-icon-svg" />
          <input
            type="text"
            className="track-code-input"
            placeholder="Enter case code (e.g. WD-XXXXXXXXXX)..."
            value={caseCode}
            onChange={(e) => setCaseCode(e.target.value.toUpperCase())}
            maxLength={32}
            required
          />
        </div>
        <button type="submit" className="track-submit-btn" disabled={loading || !caseCode.trim()}>
          <SearchIcon size={15} />
          <span>{loading ? 'Searching Vault...' : 'Track Progress'}</span>
        </button>
      </form>

      <AnimatePresence>
        {caseData && (
          <motion.div
            className="tracker-results-card glass-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div className="results-top-header">
              <div>
                <span className="active-case-tag">CRYPTOGRAPHIC DOSSIER</span>
                <h3 className="results-case-title">{searchedCode}</h3>
                <span className="results-date">
                  Submitted {new Date(caseData.created_at).toLocaleString()}
                </span>
              </div>

              <div className="status-badge-container">
                <span className={`status-pill ${caseData.status.toLowerCase()}`}>
                  {caseData.status}
                </span>
                <span className="unit-pill">
                  {caseData.department || 'Campus & Operations'}
                </span>
              </div>
            </div>

            {/* Stepper Timeline Progress */}
            <div className="investigation-stepper">
              {STEPS.map((step, idx) => {
                const currentIdx = getStepIndex(caseData.status);
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div
                    key={step}
                    className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                  >
                    <div className="stepper-node">
                      {isCompleted ? <CheckCircleIcon size={14} /> : idx + 1}
                    </div>
                    <span className="step-label">{step.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>

            {caseData.status === 'CLOSED' && (
              <div className="case-closed-notice">
                <ShieldCheckIcon size={18} />
                <div>
                  <strong>Investigation Formally Concluded & Closed</strong>
                  <p>{caseData.closure_reason || 'This inquiry has reached final resolution.'}</p>
                </div>
              </div>
            )}

            {caseData.status === 'DISMISSED' && (
              <div className="case-dismissed-notice">
                <AlertTriangleIcon size={18} />
                <div>
                  <strong>Case Dismissed</strong>
                  <p>Following preliminary review, this submission did not meet institutional investigation thresholds.</p>
                </div>
              </div>
            )}

            {/* Attached Evidence Download Link */}
            {Boolean(caseData.evidence_file_name) && (
              <div className="evidence-tracker-row">
                <div className="evidence-badge-tag">
                  <FileTextIcon size={16} />
                  <span>Confidential Proof Document Attached</span>
                </div>
                <a
                  href={`/reports/${searchedCode}/evidence`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-evidence-btn"
                >
                  <DownloadIcon size={14} />
                  <span>Download Attached File</span>
                </a>
              </div>
            )}

            {/* Public Updates Log */}
            <div className="tracker-updates-section">
              <h4 className="updates-title">
                <ClockIcon size={16} />
                <span>Investigation Progress Log ({caseData.updates.length})</span>
              </h4>

              {caseData.updates.length === 0 ? (
                <div className="no-updates-box">
                  <p>No public updates posted yet. The compliance committee has received your submission and initial triage is in progress.</p>
                </div>
              ) : (
                <div className="tracker-timeline-list">
                  {caseData.updates.map((u, i) => (
                    <div key={i} className="tracker-timeline-item">
                      <div className="tracker-timeline-bullet" />
                      <div className="tracker-timeline-content">
                        <span className="update-timestamp">
                          {new Date(u.created_at).toLocaleString()}
                        </span>
                        <p className="update-body-text">{u.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
