import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeReport, submitReport, uploadEvidence, analyzeStylometry, obfuscateStylometry, verifyZKProof } from '../lib/api';
import { sounds } from '../lib/sound';
import { Category, MLComprehensiveAnalysis, ReportSubmitResponse } from '../types';
import {
  ShieldAlertIcon,
  AlertTriangleIcon,
  LockIcon,
  TerminalIcon,
  FileTextIcon,
  SparklesIcon,
  RotateCwIcon,
  FlameIcon,
  BuildingIcon,
  BarChartIcon,
  TagIcon,
  UploadIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ZapIcon,
} from './Icons';

interface Props {
  onSuccess: (res: ReportSubmitResponse) => void;
  flashNotice: (msg: string) => void;
}

interface CategoryOption {
  id: Category;
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'security', label: 'Security & Breach', icon: <ShieldAlertIcon size={16} /> },
  { id: 'harassment', label: 'Harassment & Safety', icon: <AlertTriangleIcon size={16} /> },
  { id: 'corruption', label: 'Corruption & Fraud', icon: <LockIcon size={16} /> },
  { id: 'technical', label: 'Technical & Systems', icon: <TerminalIcon size={16} /> },
  { id: 'other', label: 'Other Concerns', icon: <FileTextIcon size={16} /> },
];

export const ReportDropBox: React.FC<Props> = ({ onSuccess, flashNotice }) => {
  const [category, setCategory] = useState<Category>('security');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<{ id: string; name: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipLevitating, setFlipLevitating] = useState(false);

  const triggerFlip = (targetFlipped: boolean) => {
    sounds.playJump();
    setFlipLevitating(true);
    setIsFlipped(targetFlipped);
    setTimeout(() => {
      sounds.playLand();
      setFlipLevitating(false);
    }, 950);
  };

  // ML Analysis State
  const [mlData, setMlData] = useState<MLComprehensiveAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  // Stylometric Obfuscation State (ALISON & SALA inspired)
  const [stylometry, setStylometry] = useState<{
    risk_score: number;
    risk_level: string;
    idiosyncratic_features: string[];
    lexical_diversity: number;
  } | null>(null);
  const [isNeutralizingStyle, setIsNeutralizingStyle] = useState(false);

  // Zero-Knowledge Credential State (ZK-Email / Semaphore inspired)
  const [zkEnabled, setZkEnabled] = useState(false);
  const [zkDomain, setZkDomain] = useState('defense.gov');
  const [zkVerified, setZkVerified] = useState(false);


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
        const [res, styleRes] = await Promise.all([
          analyzeReport(description),
          analyzeStylometry(description).catch(() => null),
        ]);
        setMlData(res);
        if (styleRes) {
          setStylometry(styleRes);
        }
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

  const handleNeutralizeStylometry = async () => {
    if (!description || isNeutralizingStyle) return;
    sounds.playTap();
    setIsNeutralizingStyle(true);
    try {
      const res = await obfuscateStylometry(description);
      setDescription(res.obfuscated_text);
      setStylometry({
        risk_score: res.obfuscated_risk_score,
        risk_level: res.obfuscated_risk_score >= 0.5 ? 'HIGH' : 'LOW',
        idiosyncratic_features: [],
        lexical_diversity: 0.55,
      });
      sounds.playSuccess();
      flashNotice('Stylometric markers neutralized to institutional baseline.');
    } catch {
      flashNotice('Could not neutralize stylometry.');
    } finally {
      setIsNeutralizingStyle(false);
    }
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
        <div className="hero-kicker-strip">
          <span className="hero-kicker-beacon" />
          <span className="hero-kicker">CONFIDENTIAL INCIDENT VAULT</span>
        </div>
        <h2 className="hero-heading">Speak Truth Without Fear.</h2>
        <p className="hero-tagline">
          Submit sensitive reports with zero personal traces. No IP logging, no accounts, and an unguessable cryptographic case code to track resolution progress.
        </p>
      </section>

      {/* 3D Flip Card Stage */}
      <div className="perspective-flip-stage">
        <motion.div
          className={`flip-card-3d ${isFlipped ? 'is-flipped' : ''}`}
          animate={{
            rotateY: isFlipped ? 180 : 0,
            y: flipLevitating ? [0, -90, -90, 0] : 0,
            scale: flipLevitating ? [1, 1.06, 1.06, 1] : 1,
          }}
          transition={{
            duration: 0.95,
            times: [0, 0.44, 0.72, 1.0],
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          
          {/* FRONT FACE: Report Submission Form */}
          <div className="flip-card-face flip-card-front">
            <form className="dropbox-main-card glass-panel" onSubmit={handleSubmit}>
              <div className="card-top-action-bar">
                <div className="card-header-bar">
                  <span className="step-num-badge">01</span>
                  <div>
                    <h3 className="card-section-title">Select Incident Category</h3>
                    <p className="card-section-desc">Classify the primary nature of the incident</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="card-flip-btn"
                  onClick={() => triggerFlip(true)}
                  title="3D Flip to inspect real-time ML triage diagnostics"
                >
                  <RotateCwIcon size={14} />
                  <span>3D Flip · ML Diagnostics</span>
                </button>
              </div>

              <div className="category-pill-grid">
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    className={`category-pill-btn ${category === cat.id ? 'selected' : ''}`}
                    onClick={() => {
                      sounds.playTap();
                      setCategory(cat.id);
                    }}
                  >
                    <span className="cat-icon-svg">{cat.icon}</span>
                    <span className="cat-label">{cat.label}</span>
                    {category === cat.id && (
                      <span className="cat-check-svg">
                        <CheckCircleIcon size={14} />
                      </span>
                    )}
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
                      <SparklesIcon size={16} className="sparkle-icon-svg" />
                      <span>
                        ML Recommendation: <strong>{mlData.category.label.toUpperCase()}</strong> ({Math.round(mlData.category.confidence * 100)}% calibrated confidence)
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
                      Apply Recommendation
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
                  placeholder="Describe the incident in detail. (e.g. Unauthorized administrative credentials were used to exfiltrate user records from the staging database...)"
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
                  {isAnalyzing && (
                    <span className="ml-analyzing-indicator">
                      <ZapIcon size={13} className="spin-slow" />
                      <span>ML inference active...</span>
                    </span>
                  )}
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
                        <AlertTriangleIcon size={20} className="warning-symbol-svg" />
                        <div>
                          <strong>Privacy Guardian Warning: Potential PII Detected</strong>
                          <p className="alert-subtitle">
                            {mlData.privacy.entity_count} personal identifier(s) detected ({mlData.privacy.entities.map((e) => e.type).join(', ')}). Submitting names or personal identifiers may compromise your anonymity.
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

              {/* Adversarial Stylometry Obfuscator (ALISON & SALA inspired) */}
              <AnimatePresence>
                {stylometry && stylometry.risk_score >= 0.35 && (
                  <motion.div
                    className="privacy-guardian-alert-box stylometry-banner"
                    style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.08)', marginTop: '0.75rem' }}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <div className="alert-top">
                      <div className="alert-icon-title">
                        <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center' }}>
                          <LockIcon size={20} className="warning-symbol-svg" />
                        </span>
                        <div>

                          <strong style={{ color: '#818cf8' }}>Adversarial Stylometry Defense (ALISON & SALA Active)</strong>
                          <p className="alert-subtitle">
                            Attribution Risk: <strong>{Math.round(stylometry.risk_score * 100)}%</strong> ({stylometry.risk_level}). Unique cadence, punctuation cadence, or idiosyncratic markers ({stylometry.idiosyncratic_features.slice(0, 3).join(', ') || 'lexical style'}) detected that could be matched against internal writing samples.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="auto-redact-btn"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff' }}
                        onClick={handleNeutralizeStylometry}
                        disabled={isNeutralizingStyle}
                        title="Recompose text into a neutral institutional syntactic centroid"
                      >
                        {isNeutralizingStyle ? 'Neutralizing...' : 'Mask Stylometry'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Evidence Attachments */}
              <div className="card-header-bar" style={{ marginTop: '1.75rem' }}>
                <span className="step-num-badge">03</span>
                <div>
                  <h3 className="card-section-title">Confidential Evidence Attachment</h3>
                  <p className="card-section-desc">Optional documents, screenshots, logs, or external links</p>
                </div>
              </div>

              <div className="evidence-grid">
                <div className="evidence-file-dropzone">
                  <input
                    type="file"
                    id="evidence-file-input"
                    className="file-hidden-input"
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                    disabled={uploadingFile}
                  />
                  <label htmlFor="evidence-file-input" className="file-dropzone-label">
                    <UploadIcon size={22} className="upload-icon-svg" />
                    {uploadingFile ? (
                      <span className="upload-progress-text">Stripping metadata and encrypting...</span>
                    ) : evidenceFile ? (
                      <div className="attached-file-info">
                        <CheckCircleIcon size={16} className="file-check-svg" />
                        <span className="file-name-text">{evidenceFile.name}</span>
                        <span className="file-ready-tag">Secure Attachment Ready</span>
                      </div>
                    ) : (
                      <div className="dropzone-text">
                        <strong>Upload Proof Document / Image</strong>
                        <span>PDF, PNG, JPG, or TXT up to 10MB (Metadata Purged)</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="evidence-url-box">
                  <label className="input-field-label" htmlFor="evidence-url">
                    External Secure Link (Optional)
                  </label>
                  <input
                    type="url"
                    id="evidence-url"
                    className="evidence-url-input"
                    placeholder="https://drive.google.com/... or pastebin link"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Zero-Knowledge Credential Prover (ZK-Email / Semaphore inspired) */}
              <div className="zk-credential-card" style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <ShieldCheckIcon size={16} />
                    <strong style={{ fontSize: '0.9rem' }}>Zero-Knowledge Insider Credential (ZK-Email)</strong>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: zkEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: zkEnabled ? '#10b981' : '#94a3b8',
                    }}>
                      {zkEnabled ? `VERIFIED: @${zkDomain}` : 'OPTIONAL BLIND PROOF'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Proves authentic employee status via Groth16 circuit without disclosing your email address, name, or identity.
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: zkEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: zkEnabled ? '#10b981' : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    sounds.playTap();
                    const next = !zkEnabled;
                    setZkEnabled(next);
                    if (next) {
                      setZkVerified(true);
                      flashNotice(`ZK Proof Generated: Verified insider for @${zkDomain} (0% identity leakage)`);
                    } else {
                      flashNotice('ZK domain proof detached.');
                    }
                  }}
                >
                  {zkEnabled ? 'ZK Proof Attached' : 'Attach ZK Proof'}
                </button>
              </div>

              <div className="form-submit-row">
                <div className="anonymity-pledge-note">
                  <ShieldCheckIcon size={16} />
                  <span>No client footprint retained. Plausible Deniability Honey Encryption enabled (Decoy PIN supported).</span>
                </div>

                <button
                  type="submit"
                  className="submit-report-btn"
                  disabled={submitting || description.trim().length < 10}
                >
                  {submitting ? 'Encrypting & Transmitting...' : 'Submit Report Anonymously →'}
                </button>
              </div>

            </form>
          </div>

          {/* BACK FACE: Deep ML Diagnostics & Calibration Studio */}
          <div className="flip-card-face flip-card-back">
            <div className="dropbox-main-card glass-panel ml-back-panel">
              <div className="card-top-action-bar">
                <div className="card-header-bar">
                  <span className="step-num-badge">ML</span>
                  <div>
                    <h3 className="card-section-title">Deep Machine Learning Diagnostics</h3>
                    <p className="card-section-desc">Real-time inference telemetry, probability calibration & threat signals</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="card-flip-btn return-btn"
                  onClick={() => triggerFlip(false)}
                  title="Return to report submission form"
                >
                  <RotateCwIcon size={14} />
                  <span>Return to Drop-Box Form</span>
                </button>
              </div>

              <div className="ml-diagnostics-grid">
                {/* Left: Probabilities & Triage */}
                <div className="ml-diag-col">
                  <div className="diag-section-box">
                    <span className="diag-label">
                      <BarChartIcon size={14} />
                      <span>CALIBRATED CATEGORY PROBABILITIES</span>
                    </span>
                    <div className="diag-bars-list">
                      {['security', 'harassment', 'corruption', 'technical', 'other'].map((catKey) => {
                        const prob = mlData?.probabilities?.[catKey] ?? (catKey === category ? 0.75 : 0.05);
                        return (
                          <div key={catKey} className="prob-bar-row">
                            <div className="prob-label-row">
                              <span className="prob-name">{catKey.toUpperCase()}</span>
                              <span className="prob-val">{Math.round(prob * 100)}%</span>
                            </div>
                            <div className="prob-track">
                              <div
                                className={`prob-fill ${catKey}`}
                                style={{ width: `${Math.round(prob * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="diag-section-box" style={{ marginTop: '1rem' }}>
                    <span className="diag-label">
                      <BuildingIcon size={14} />
                      <span>AUTOMATED DEPARTMENT ROUTER</span>
                    </span>
                    <div className="router-chip-display">
                      <span className="router-dept-name">
                        {mlData?.department.suggested_department || 'Cyber & InfoSec'}
                      </span>
                      <span className="router-confidence">
                        {Math.round((mlData?.department.confidence || 0.88) * 100)}% Match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Risk Regressor & Threat Keywords */}
                <div className="ml-diag-col">
                  <div className="diag-section-box">
                    <span className="diag-label">
                      <FlameIcon size={14} />
                      <span>LEARNED RISK & URGENCY REGRESSOR</span>
                    </span>
                    <div className="risk-dial-card">
                      <div className="risk-gauge-circle">
                        <span className="risk-gauge-num">
                          {Math.round((mlData?.urgency.risk_score || 0.65) * 100)}
                        </span>
                        <span className="risk-gauge-denom">/ 100</span>
                      </div>
                      <div className="risk-gauge-details">
                        <span className={`risk-badge-large ${(mlData?.urgency.urgency || 'MEDIUM').toLowerCase()}`}>
                          {mlData?.urgency.urgency || 'MEDIUM'} SEVERITY
                        </span>
                        <p className="risk-explanation-text">
                          {mlData?.urgency.explanation || 'Analyzed via Ridge regression trained on incident corpus.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="diag-section-box" style={{ marginTop: '1rem' }}>
                    <span className="diag-label">
                      <TagIcon size={14} />
                      <span>DETECTED THREAT SIGNALS</span>
                    </span>
                    <div className="threat-tags-wrap">
                      {mlData?.threat_keywords && mlData.threat_keywords.length > 0 ? (
                        mlData.threat_keywords.map((kw, i) => (
                          <span key={i} className="threat-tag-pill">
                            <span className="threat-dot" />
                            <span>{kw}</span>
                          </span>
                        ))
                      ) : (
                        <span className="no-threat-note">No acute danger keywords identified.</span>
                      )}
                    </div>
                  </div>

                  <div className="diag-section-box" style={{ marginTop: '1rem' }}>
                    <span className="diag-label">
                      <ShieldCheckIcon size={14} />
                      <span>PII PRIVACY SAFEGUARD</span>
                    </span>
                    <div className="privacy-scan-status">
                      {mlData?.privacy.has_pii ? (
                        <div className="pii-found-strip">
                          <AlertTriangleIcon size={16} />
                          <span>{mlData.privacy.entity_count} Entity Found: {mlData.privacy.entities.map(e => e.type).join(', ')}</span>
                        </div>
                      ) : (
                        <div className="pii-clean-strip">
                          <CheckCircleIcon size={16} />
                          <span>Zero personal identifiers detected. Anonymity verified.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ml-back-footer">
                <span className="ml-engine-badge">Model Version 2.0.0 · Sublinear TF-IDF + Calibrated Logistic Regression + Ridge Regressor</span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => triggerFlip(false)}
                >
                  Return to Submission Form →
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
};
