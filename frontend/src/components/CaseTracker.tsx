import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackReport } from '../lib/api';
import { sounds } from '../lib/sound';
import { ReportTrackResponse, Status } from '../types';

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
        <span className="hero-kicker">CASE PROGRESS STATION</span>
        <h2 className="hero-heading">Track Anonymous Investigation</h2>
        <p className="hero-tagline">
          Enter your unique case code below to monitor investigation status and review official moderator notes.
        </p>
      </section>

      <form className="track-search-bar glass-panel" onSubmit={handleTrack}>
        <div className="search-input-group">
          <span className="search-key-icon">🔑</span>
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
          {loading ? 'Searching...' : 'Track Progress'}
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
                <span className="active-case-tag">CASE DOSSIER</span>
                <h3 className="results-case-title">{searchedCode}</h3>
                <span className="results-date">
                  Submitted {new Date(caseData.created_at).toLocaleString()}
                </span>
              </div>

              <div className="status-badge-container">
                <span className={`status-pill ${caseData.status.toLowerCase()}`}>
                  {caseData.status}
                </span>
                <span className={`severity-pill ${caseData.severity.toLowerCase()}`}>
                  {caseData.severity}
                </span>
              </div>
            </div>

            {/* Stepper Workflow Timeline */}
            <div className="workflow-stepper">
              <div className="stepper-track-line">
                <div
                  className="stepper-fill-line"
                  style={{
                    width: `${(getStepIndex(caseData.status) / (STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>

              <div className="stepper-nodes-row">
                {STEPS.map((step, idx) => {
                  const currentIdx = getStepIndex(caseData.status);
                  const isComplete = currentIdx >= idx;
                  const isCurrent = currentIdx === idx;

                  let label = step;
                  if (idx === 2) {
                    label = caseData.status === 'DISMISSED' ? 'DISMISSED' : caseData.status === 'CLOSED' ? 'CLOSED' : 'RESOLVED';
                  }

                  return (
                    <div key={step} className={`step-node ${isComplete ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}>
                      <div className="node-circle">
                        {isComplete ? '✓' : idx + 1}
                      </div>
                      <span className="node-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Permanent Case Closure Notice */}
            {caseData.status === 'CLOSED' && caseData.closure_reason && (
              <div className="closure-notice-box">
                <div className="closure-header">
                  <span className="lock-icon">🔒</span>
                  <strong>Case Permanently Closed by Senior Investigator</strong>
                </div>
                <p className="closure-body">{caseData.closure_reason}</p>
              </div>
            )}

            {/* Dossier Attributes Grid */}
            <div className="dossier-grid">
              <div className="dossier-cell">
                <span className="cell-label">CATEGORY</span>
                <strong className="cell-value">{caseData.category.toUpperCase()}</strong>
              </div>
              <div className="dossier-cell">
                <span className="cell-label">ASSIGNED UNIT</span>
                <strong className="cell-value">{caseData.department || 'Campus & Operations'}</strong>
              </div>
              <div className="dossier-cell">
                <span className="cell-label">EVIDENCE ATTACHMENT</span>
                <span className="cell-value">
                  {caseData.evidence_file_name ? (
                    <a
                      href={`/reports/${encodeURIComponent(searchedCode)}/evidence`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-download-link"
                    >
                      📎 Download Evidence File
                    </a>
                  ) : caseData.evidence_url ? (
                    <a
                      href={caseData.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-download-link"
                    >
                      🔗 External Evidence Link
                    </a>
                  ) : (
                    'None attached'
                  )}
                </span>
              </div>
            </div>

            {/* Moderator Updates Log */}
            <div className="updates-timeline-section">
              <h4 className="updates-heading">Investigation Activity Log</h4>
              {caseData.updates.length === 0 ? (
                <p className="empty-updates-text">
                  Your report has been logged and assigned to investigators. Status updates will appear here as the investigation unfolds.
                </p>
              ) : (
                <div className="updates-list">
                  {caseData.updates.map((u, i) => (
                    <div key={i} className="update-timeline-entry">
                      <div className="entry-beacon" />
                      <div className="entry-body">
                        <span className="entry-time">{new Date(u.created_at).toLocaleString()}</span>
                        <p className="entry-msg">{u.message}</p>
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
