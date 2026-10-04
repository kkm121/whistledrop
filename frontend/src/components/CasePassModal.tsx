import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { sounds } from '../lib/sound';
import { ReportSubmitResponse } from '../types';
import {
  LockIcon,
  CopyIcon,
  CheckCircleIcon,
  DownloadIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
} from './Icons';

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
          <button className="modal-close-x" onClick={onClose} title="Close modal">
            ×
          </button>
        </div>

        <div className="pass-header-content">
          <div className="pass-icon-ring">
            <LockIcon size={28} />
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
              {copied ? <CheckCircleIcon size={14} /> : <CopyIcon size={14} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
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
          <AlertTriangleIcon size={18} className="warning-callout-icon" />
          <span>
            Save this code now. To safeguard your absolute anonymity, this code will never be shown again and cannot be reset by any administrator.
          </span>
        </div>

        <div className="modal-button-actions">
          <button className="btn-secondary" onClick={handleDownload}>
            <DownloadIcon size={15} />
            <span>Download Pass (.txt)</span>
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              sounds.playTap();
              onTrackNow(data.case_code);
            }}
          >
            <span>Track Status Now</span>
            <ArrowRightIcon size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
