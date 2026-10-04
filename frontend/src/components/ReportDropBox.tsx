import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeReport, submitReport, uploadEvidence } from '../lib/api';
import { sounds } from '../lib/sound';
import { Category, MLComprehensiveAnalysis, ReportSubmitResponse } from '../types';

interface Props {
  onSuccess: (res: ReportSubmitResponse) => void;
  flashNotice: (msg: string) => void;
}

const CATEGORIES: Array<{ id: Category; label: string; icon: string }> = [
  { id: 'security', label: 'Security & Breach', icon: '🛡️' },
  { id: 'harassment', label: 'Harassment & Safety', icon: '⚠️' },
  { id: 'corruption', label: 'Corruption & Fraud', icon: '⚖️' },
  { id: 'technical', label: 'Technical & Systems', icon: '💻' },
  { id: 'other', label: 'Other Concerns', icon: '📋' },
];

export const ReportDropBox: React.FC<Props> = ({ onSuccess, flashNotice }) => {
  const [category, setCategory] = useState<Category>('security');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<{ id: string; name: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ML Analysis State
  const [mlData, setMlData] = useState<MLComprehensiveAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  // Debounced real-time ML analysis as user types
  useEffect(() => {
    if (description.trim().length < 15) {
      setMlData(null);
      return;
    }

    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const res = await analyzeReport(description);
        setMlData(res);
        if (res.privacy.has_pii) {
          sounds.playAlert();
        }
      } catch {
        /* ignore analyze errors in background */
      } finally {
        setIsAnalyzing(false);
      }
    }, 450);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [description]);

  const handleAutoRedact = () => {
    if (!mlData || !mlData.privacy.has_pii) return;
    sounds.playTap();
    setDescription(mlData.privacy.sanitized_text);
    flashNotice('Personal identifiers auto-sanitized.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      flashNotice('File size exceeds 10MB limit.');
      return;
    }

    setUploadingFile(true);
    try {
      const res = await uploadEvidence(file);
      setEvidenceFile({ id: res.file_id, name: res.original_name });
      sounds.playSuccess();
      flashNotice('Confidential evidence uploaded securely with metadata stripped.');
    } catch (err: any) {
      flashNotice(err.message || 'File upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      flashNotice('Please provide at least 10 characters.');
      return;
    }

    setSubmitting(true);
    sounds.playTap();

    try {
      const res = await submitReport({
        category,
        description: description.trim(),
        evidence_url: evidenceUrl.trim() || null,
        evidence_file_id: evidenceFile ? evidenceFile.id : null,
      });
      sounds.playSuccess();
      onSuccess(res);
      setDescription('');
      setEvidenceUrl('');
      setEvidenceFile(null);
      setMlData(null);
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-dropbox-container">
      {/* Hero Mission */}
      <section className="dropbox-hero">
        <span className="hero-kicker">CONFIDENTIAL INCIDENT VAULT</span>
        <h2 className="hero-heading">Speak Truth Without Fear.</h2>
        <p className="hero-tagline">
          Submit sensitive reports with zero personal traces. No IP logging, no accounts, and an unguessable case code to track resolution progress.
        </p>
      </section>

      <div className="dropbox-grid">
        {/* Left: Main Form */}
        <form className="dropbox-main-card glass-panel" onSubmit={handleSubmit}>
          <div className="card-header-bar">
            <span className="step-num-badge">01</span>
            <div>
              <h3 className="card-section-title">Select Incident Category</h3>
              <p className="card-section-desc">Classify the primary nature of the incident</p>
            </div>
          </div>

          <div className="category-pill-grid">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`category-pill-btn ${category === cat.id ? 'selected' : ''}`}
                onClick={() => { sounds.playTap(); setCategory(cat.id); }}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-label">{cat.label}</span>
                {category === cat.id && <span className="cat-check">✓</span>}
              </button>
            ))}
          </div>

          {/* AI Category Recommendation Banner */}
          <AnimatePresence>
            {mlData?.category.label && mlData.category.label !== category && (
              <motion.div
                className="ai-suggestion-chip"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <div className="ai-chip-content">
                  <span className="sparkle-icon">✨</span>
                  <span>
                    ML Suggestion: <strong>{mlData.category.label.toUpperCase()}</strong> ({Math.round(mlData.category.confidence * 100)}% confidence)
                  </span>
                </div>
                <button
                  type="button"
                  className="ai-apply-btn"
                  onClick={() => {
                    sounds.playTap();
                    setCategory(mlData.category.label as Category);
                    flashNotice(`Category switched to ${mlData.category.label}`);
                  }}
                >
                  Apply Suggestion
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="card-header-bar" style={{ marginTop: '1.75rem' }}>
            <span className="step-num-badge">02</span>
            <div>
              <h3 className="card-section-title">Confidential Incident Details</h3>
              <p className="card-section-desc">State what happened. Be specific regarding events, dates, and locations.</p>
            </div>
          </div>

          <div className="textarea-wrapper">
            <textarea
              className="incident-textarea"
              placeholder="Describe the incident in detail. (e.g. On Wednesday at 3pm, unauthorized access was detected in the financial accounts ledger...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={7}
              minLength={10}
              maxLength={5000}
              required
            />
            <div className="textarea-footer">
              <span className={`char-counter ${description.length < 10 ? 'insufficient' : ''}`}>
                {description.length} / 5000 characters
              </span>
              {isAnalyzing && <span className="ml-analyzing-indicator">🤖 ML Engine analyzing...</span>}
            </div>
          </div>

          {/* Whistleblower Privacy Guardian Alert Box */}
          <AnimatePresence>
            {mlData?.privacy.has_pii && (
              <motion.div
                className="privacy-guardian-alert-box"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <div className="alert-top">
                  <div className="alert-icon-title">
                    <span className="warning-symbol">⚠️</span>
                    <div>
                      <strong>Privacy Guardian Warning: Potential PII Detected</strong>
                      <p className="alert-subtitle">
                        {mlData.privacy.entity_count} personal identifier(s) detected ({mlData.privacy.entities.map(e => e.type).join(', ')}). Submitting your name or phone may compromise your anonymity.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="auto-redact-btn"
                    onClick={handleAutoRedact}
                    title="Replace detected names and numbers with [REDACTED]"
                  >
                    Auto-Sanitize & Redact
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Evidence Attachments */}
          <div className="card-header-bar" style={{ marginTop: '1.75rem' }}>
            <span className="step-num-badge">03</span>
            <div>
              <h3 className="card-section-title">Supporting Evidence (Optional)</h3>
              <p className="card-section-desc">Attach documents, screenshots, or logs. Metadata is automatically purged.</p>
            </div>
          </div>

          <div className="evidence-controls-row">
            <div className="file-uploader-box">
              <input
                type="file"
                id="evidence-file-input"
                className="hidden-file-input"
                onChange={handleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.csv"
              />
              <label htmlFor="evidence-file-input" className="file-upload-label">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{uploadingFile ? 'Stripping metadata & uploading...' : 'Upload Evidence File (PDF, PNG, JPG, TXT)'}</span>
              </label>
              {evidenceFile && (
                <div className="attached-file-badge">
                  <span>📎 {evidenceFile.name}</span>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => { sounds.playTap(); setEvidenceFile(null); }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="url-input-wrapper">
              <input
                type="url"
                className="url-input-field"
                placeholder="Or paste evidence link (Google Drive, IPFS, pastebin)..."
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                maxLength={2048}
              />
            </div>
          </div>

          <div className="form-submit-row">
            <button
              type="submit"
              className="submit-report-btn"
              disabled={submitting || description.trim().length < 10}
            >
              {submitting ? (
                <>
                  <span className="spinner-dot" />
                  <span>Encrypting & Submitting...</span>
                </>
              ) : (
                <>
                  <span>🔒 Submit Anonymous Report</span>
                </>
              )}
            </button>
            <p className="submit-disclaimer">
              Once submitted, you will receive an exclusive case tracking code. It will never be shown again.
            </p>
          </div>
        </form>

        {/* Right: Live ML Intelligence Telemetry */}
        <aside className="dropbox-intel-sidebar glass-panel">
          <div className="intel-header">
            <span className="intel-pulse-dot" />
            <h4 className="intel-title">Real-Time AI Triage Telemetry</h4>
          </div>
          <p className="intel-caption">
            Our multi-task machine learning model evaluates risk, suggests departments, and checks privacy before dispatch.
          </p>

          <div className="intel-card">
            <span className="intel-label">LEARNED RISK TRIAGE</span>
            <div className="risk-meter-container">
              <div
                className={`risk-gauge-bar ${
                  mlData?.urgency.severity === 'CRITICAL'
                    ? 'critical'
                    : mlData?.urgency.severity === 'HIGH'
                    ? 'high'
                    : 'medium'
                }`}
                style={{ width: `${Math.round((mlData?.urgency.risk_score || 0.3) * 100)}%` }}
              />
            </div>
            <div className="risk-readout-row">
              <span className="risk-score-val">
                {mlData ? `${Math.round(mlData.urgency.risk_score * 100)} / 100` : '—'}
              </span>
              <span className={`risk-badge ${mlData?.urgency.severity.toLowerCase() || 'low'}`}>
                {mlData?.urgency.severity || 'LOW'}
              </span>
            </div>
            {mlData?.urgency.contributing_keywords.length ? (
              <div className="threat-tokens-row">
                <span className="token-label">Threat Signals:</span>
                {mlData.urgency.contributing_keywords.map((k) => (
                  <span key={k} className="threat-keyword-pill">{k}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="intel-card">
            <span className="intel-label">RECOMMENDED DEPARTMENT</span>
            <div className="dept-display-val">
              {mlData?.department.department || 'Campus & Operations'}
            </div>
            <div className="dept-conf-bar">
              <span>Match Confidence:</span>
              <strong>{mlData ? `${Math.round(mlData.department.confidence * 100)}%` : '—'}</strong>
            </div>
          </div>

          <div className="intel-card">
            <span className="intel-label">ANONYMITY INTEGRITY</span>
            <div className="anonymity-status-row">
              {mlData?.privacy.has_pii ? (
                <span className="privacy-badge warning">⚠️ Identifiers Found</span>
              ) : (
                <span className="privacy-badge clean">🛡️ 100% Anonymized</span>
              )}
            </div>
            <p className="anonymity-note">
              {mlData?.privacy.advice || 'Type your report on the left. The privacy guardian automatically scans for accidental identity leaks.'}
            </p>
          </div>

          <div className="intel-footer-specs">
            <div className="spec-row">
              <span>Model Architecture:</span>
              <code>TF-IDF Calibrated Logistic Regression</code>
            </div>
            <div className="spec-row">
              <span>Cryptographic Storage:</span>
              <code>SHA-256 Code Hashing</code>
            </div>
            <div className="spec-row">
              <span>Database Integrity:</span>
              <code>Zero-Reporter Schema Columns</code>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
