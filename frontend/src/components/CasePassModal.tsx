import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { sounds } from '../lib/sound';
import { ReportSubmitResponse } from '../types';

interface Props {
  data: ReportSubmitResponse;
  onClose: () => void;
  onTrackNow: (code: string) => void;
  flashNotice: (msg: string) => void;
}

export const CasePassModal: React.FC<Props> = ({
  data,
  onClose,
  onTrackNow,
  flashNotice,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.case_code);
      setCopied(true);
      sounds.playSuccess();
      flashNotice('Case code copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      flashNotice('Clipboard copy failed.');
    }
  };

  const handleDownload = () => {
    sounds.playTap();
    const content = `======================================================
WHISTLEDROP CONFIDENTIAL CASE TRACKING PASS
======================================================
Case Tracking Code : ${data.case_code}
Submission Date    : ${new Date(data.created_at).toLocaleString()}
Incident Category  : ${data.category.toUpperCase()}
Initial Severity   : ${data.severity}
Assigned Division  : ${data.department || 'Campus & Operations'}
Status             : ${data.status}

IMPORTANT NOTICE:
WhistleDrop maintains zero personal identity records.
This case code is the ONLY cryptographic token that can access
investigation updates or view moderator notices.
Store this file securely. It cannot be re-issued if lost.
======================================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whistledrop-pass-${data.case_code}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashNotice('Case pass downloaded.');
  };

  return (
    <div className="modal-backdrop-overlay">
      <motion.div
        className="case-pass-modal glass-panel"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        <div className="modal-badge-row">
          <span className="secure-pass-tag">CONFIDENTIAL RECEIPT</span>
          <button className="modal-close-x" onClick={onClose} title="Close modal">×</button>
        </div>

        <div className="pass-header-content">
          <div className="pass-icon-ring">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="pass-title">Incident Successfully Submitted</h3>
          <p className="pass-description">
            Your report is encrypted and queued for investigation. Use the following unguessable case code to track updates.
          </p>
        </div>

        <div className="case-code-display-box">
          <span className="code-label">YOUR PRIVATE CASE TRACKING CODE</span>
          <div className="code-value-row">
            <span className="case-code-string">{data.case_code}</span>
            <button className={`copy-code-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
        </div>

        <div className="pass-metadata-grid">
          <div className="meta-item">
            <span className="meta-lbl">Category</span>
            <strong className="meta-val">{data.category.toUpperCase()}</strong>
          </div>
          <div className="meta-item">
            <span className="meta-lbl">ML Severity</span>
            <strong className="meta-val">{data.severity}</strong>
          </div>
          <div className="meta-item">
            <span className="meta-lbl">Routing</span>
            <strong className="meta-val">{data.department || 'Operations'}</strong>
          </div>
          <div className="meta-item">
            <span className="meta-lbl">Initial Status</span>
            <strong className="meta-val">{data.status}</strong>
          </div>
        </div>

        <div className="warning-callout-box">
          <span className="warning-icon">⚠️</span>
          <span>
            Save this code now. To safeguard your absolute anonymity, this code will never be shown again and cannot be reset by any administrator.
          </span>
        </div>

        <div className="modal-button-actions">
          <button className="btn-secondary" onClick={handleDownload}>
            Download Pass (.txt)
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              sounds.playTap();
              onTrackNow(data.case_code);
            }}
          >
            Track Status Now →
          </button>
        </div>
      </motion.div>
    </div>
  );
};
