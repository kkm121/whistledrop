import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  addReportUpdate,
  closeReportPermanently,
  getAnalytics,
  getIncidentClusters,
  getModeratorReports,
  getReportDuplicates,
  updateReportStatus,
} from '../lib/api';
import { sounds } from '../lib/sound';
import {
  AnalyticsData,
  Category,
  DuplicateItem,
  IncidentCluster,
  ModeratorReportItem,
  Severity,
  Status,
} from '../types';

interface Props {
  token: string;
  setToken: (t: string) => void;
  flashNotice: (msg: string) => void;
}

export const ModeratorStudio: React.FC<Props> = ({ token, setToken, flashNotice }) => {
  const [authInput, setAuthInput] = useState(token || 'dev-moderator-key-CHANGE-ME');
  const [isAuthed, setIsAuthed] = useState(Boolean(token));
  const [reports, setReports] = useState<ModeratorReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ModeratorReportItem | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [clusters, setClusters] = useState<IncidentCluster[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('risk_desc');
  const [activeView, setActiveView] = useState<'cases' | 'clusters' | 'analytics'>('cases');

  // Modal actions
  const [closingCaseId, setClosingCaseId] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [isUpdatePublic, setIsUpdatePublic] = useState(true);

  const fetchReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getModeratorReports(token, {
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        q: searchQuery || undefined,
        sort_by: sortBy,
      });
      setReports(data);
    } catch (err: any) {
      flashNotice(err.message || 'Failed to load moderator cases');
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        setIsAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIntel = async () => {
    if (!token) return;
    try {
      const [clust, ana] = await Promise.all([
        getIncidentClusters(token),
        getAnalytics(token),
      ]);
      setClusters(clust);
      setAnalytics(ana);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (isAuthed && token) {
      fetchReports();
      fetchIntel();
    }
  }, [isAuthed, token, categoryFilter, statusFilter, severityFilter, sortBy]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authInput.trim()) return;
    setToken(authInput.trim());
    setIsAuthed(true);
    sounds.playSuccess();
    flashNotice('Authenticated with Moderator Bearer Token.');
  };

  const handleSelectReport = async (r: ModeratorReportItem) => {
    sounds.playTap();
    setSelectedReport(r);
    try {
      const dups = await getReportDuplicates(token, r.id);
      setDuplicates(dups);
    } catch {
      setDuplicates([]);
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (!selectedReport) return;
    sounds.playTransition();
    try {
      const updated = await updateReportStatus(token, selectedReport.id, newStatus);
      setSelectedReport(updated);
      setReports((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      flashNotice(`Case #${updated.id} transitioned to ${newStatus}.`);
      fetchIntel();
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Status transition failed');
    }
  };

  const handleCloseCase = async () => {
    if (!closingCaseId || !closeReason.trim()) return;
    sounds.playTransition();
    try {
      const updated = await closeReportPermanently(token, closingCaseId, closeReason.trim());
      if (selectedReport?.id === updated.id) {
        setSelectedReport(updated);
      }
      setReports((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setClosingCaseId(null);
      setCloseReason('');
      sounds.playSuccess();
      flashNotice(`Case #${updated.id} permanently closed and archived.`);
      fetchIntel();
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Closure failed');
    }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !updateMessage.trim()) return;
    sounds.playTap();
    try {
      await addReportUpdate(token, selectedReport.id, updateMessage.trim(), isUpdatePublic);
      setUpdateMessage('');
      sounds.playSuccess();
      flashNotice('Status update recorded.');
      // Refresh report details
      const fresh = reports.find((r) => r.id === selectedReport.id);
      if (fresh) setSelectedReport({ ...fresh });
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Update failed');
    }
  };

  if (!isAuthed) {
    return (
      <div className="moderator-auth-gate glass-panel">
        <div className="auth-shield-icon">🛡️</div>
        <h3 className="auth-gate-title">Moderator Security Clearance</h3>
        <p className="auth-gate-desc">
          Enter your Moderator Bearer API Key to access triage, investigative dossiers, and machine learning analytics.
        </p>
        <form onSubmit={handleLogin} className="auth-gate-form">
          <input
            type="password"
            className="auth-key-input"
            placeholder="Bearer token (default: dev-moderator-key-CHANGE-ME)..."
            value={authInput}
            onChange={(e) => setAuthInput(e.target.value)}
            required
          />
          <button type="submit" className="auth-submit-btn">
            Authenticate Session →
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="moderator-studio-container">
      {/* Executive Telemetry Header */}
      <section className="mod-telemetry-grid">
        <div className="telemetry-box glass-panel">
          <span className="telemetry-lbl">TOTAL REPORTS</span>
          <strong className="telemetry-val">{analytics?.total_reports || reports.length}</strong>
        </div>
        <div className="telemetry-box glass-panel">
          <span className="telemetry-lbl">PENDING REVIEW</span>
          <strong className="telemetry-val highlight-amber">{analytics?.pending_review || 0}</strong>
        </div>
        <div className="telemetry-box glass-panel">
          <span className="telemetry-lbl">CRITICAL RISKS</span>
          <strong className="telemetry-val highlight-red">{analytics?.critical_reports || 0}</strong>
        </div>
        <div className="telemetry-box glass-panel">
          <span className="telemetry-lbl">INCIDENT CLUSTERS</span>
          <strong className="telemetry-val highlight-indigo">{clusters.length}</strong>
        </div>
        <div className="telemetry-box glass-panel">
          <span className="telemetry-lbl">RESOLVED / CLOSED</span>
          <strong className="telemetry-val highlight-green">
            {(analytics?.resolved_reports || 0) + (analytics?.closed_reports || 0)}
          </strong>
        </div>
      </section>

      {/* Sub-Navigation & Filters */}
      <div className="mod-controls-row glass-panel">
        <div className="view-mode-tabs">
          <button
            className={`sub-tab-btn ${activeView === 'cases' ? 'active' : ''}`}
            onClick={() => { sounds.playTap(); setActiveView('cases'); }}
          >
            📋 Case Dossiers ({reports.length})
          </button>
          <button
            className={`sub-tab-btn ${activeView === 'clusters' ? 'active' : ''}`}
            onClick={() => { sounds.playTap(); setActiveView('clusters'); }}
          >
            🧩 ML Incident Clusters ({clusters.length})
          </button>
          <button
            className={`sub-tab-btn ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => { sounds.playTap(); setActiveView('analytics'); }}
          >
            📊 Analytics & Trends
          </button>
        </div>

        {activeView === 'cases' && (
          <div className="search-filter-controls">
            <input
              type="text"
              className="mod-search-input"
              placeholder="Search descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
            />

            <select
              className="filter-dropdown"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as Category)}
            >
              <option value="">All Categories</option>
              <option value="security">Security</option>
              <option value="harassment">Harassment</option>
              <option value="corruption">Corruption</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>

            <select
              className="filter-dropdown"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status)}
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="DISMISSED">DISMISSED</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            <select
              className="filter-dropdown"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as Severity)}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <select
              className="filter-dropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="risk_desc">Highest Risk First</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area based on View Mode */}
      {activeView === 'cases' && (
        <div className="cases-split-layout">
          {/* Table / List */}
          <div className="cases-list-card glass-panel">
            {loading ? (
              <div className="loading-state">Fetching investigation records...</div>
            ) : reports.length === 0 ? (
              <div className="empty-state">No matching reports found with current filters.</div>
            ) : (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Incident Excerpt</th>
                      <th>Risk Triage</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr
                        key={r.id}
                        className={`report-row ${selectedReport?.id === r.id ? 'active-row' : ''}`}
                        onClick={() => handleSelectReport(r)}
                      >
                        <td className="row-id">#{r.id}</td>
                        <td>
                          <span className={`cat-pill ${r.category}`}>{r.category}</span>
                        </td>
                        <td className="row-desc">
                          {r.description.slice(0, 75)}
                          {r.description.length > 75 ? '…' : ''}
                        </td>
                        <td>
                          <div className="table-risk-col">
                            <span className={`risk-pill ${r.severity.toLowerCase()}`}>
                              {r.severity}
                            </span>
                            <span className="risk-score-num">
                              {Math.round(r.priority_score * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="row-dept">{r.department || 'Operations'}</td>
                        <td>
                          <span className={`status-pill ${r.status.toLowerCase()}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="row-date">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Case Detail Drawer */}
          <aside className="case-detail-drawer glass-panel">
            {selectedReport ? (
              <div className="drawer-content">
                <div className="drawer-header">
                  <div>
                    <span className="drawer-tag">CASE DOSSIER #{selectedReport.id}</span>
                    <h3 className="drawer-title">{selectedReport.category.toUpperCase()}</h3>
                  </div>
                  <span className={`status-pill ${selectedReport.status.toLowerCase()}`}>
                    {selectedReport.status}
                  </span>
                </div>

                <div className="drawer-meta-bar">
                  <div className="drawer-meta-item">
                    <span>ML Risk Score:</span>
                    <strong>{Math.round(selectedReport.priority_score * 100)} / 100 ({selectedReport.severity})</strong>
                  </div>
                  <div className="drawer-meta-item">
                    <span>Routing Unit:</span>
                    <strong>{selectedReport.department || 'Operations'}</strong>
                  </div>
                </div>

                <div className="drawer-section">
                  <span className="section-label">FULL INCIDENT STATEMENT</span>
                  <div className="statement-box">{selectedReport.description}</div>
                </div>

                {/* Evidence Attachment */}
                <div className="drawer-section">
                  <span className="section-label">ATTACHED EVIDENCE</span>
                  {selectedReport.evidence_file ? (
                    <div className="evidence-chip">
                      <span>📎 File: {selectedReport.evidence_file_name || selectedReport.evidence_file}</span>
                      <a
                        href={`/uploads/${selectedReport.evidence_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-tiny"
                      >
                        Download
                      </a>
                    </div>
                  ) : selectedReport.evidence_url ? (
                    <div className="evidence-chip">
                      <span>🔗 Link: {selectedReport.evidence_url}</span>
                      <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer" className="btn-tiny">
                        Visit
                      </a>
                    </div>
                  ) : (
                    <p className="muted-text">No evidence documents attached.</p>
                  )}
                </div>

                {/* Case Closure Notice */}
                {selectedReport.status === 'CLOSED' && (
                  <div className="drawer-closure-box">
                    <strong>🔒 Permanently Closed</strong>
                    <p>{selectedReport.closure_reason}</p>
                  </div>
                )}

                {/* Workflow Transitions */}
                {selectedReport.status !== 'CLOSED' && (
                  <div className="drawer-actions-box">
                    <span className="section-label">CASE WORKFLOW ACTIONS</span>
                    <div className="action-buttons-row">
                      {selectedReport.status === 'SUBMITTED' && (
                        <button
                          className="btn-action primary"
                          onClick={() => handleStatusChange('UNDER_REVIEW')}
                        >
                          → Move to Under Review
                        </button>
                      )}
                      {selectedReport.status === 'UNDER_REVIEW' && (
                        <>
                          <button
                            className="btn-action success"
                            onClick={() => handleStatusChange('RESOLVED')}
                          >
                            ✓ Mark as Resolved
                          </button>
                          <button
                            className="btn-action danger"
                            onClick={() => handleStatusChange('DISMISSED')}
                          >
                            ✕ Dismiss Case
                          </button>
                        </>
                      )}
                      {(selectedReport.status === 'RESOLVED' || selectedReport.status === 'DISMISSED' || selectedReport.status === 'UNDER_REVIEW') && (
                        <button
                          className="btn-action dark"
                          onClick={() => {
                            sounds.playTap();
                            setClosingCaseId(selectedReport.id);
                          }}
                        >
                          🔒 Permanently Close Case
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Post Status Update */}
                {selectedReport.status !== 'CLOSED' && (
                  <form className="drawer-update-form" onSubmit={handleAddUpdate}>
                    <span className="section-label">POST INVESTIGATION UPDATE</span>
                    <textarea
                      className="update-input"
                      placeholder="Enter status notice (e.g. Investigation underway with legal department)..."
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      rows={2}
                      required
                    />
                    <div className="update-form-footer">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={isUpdatePublic}
                          onChange={(e) => setIsUpdatePublic(e.target.checked)}
                        />
                        <span>Visible to Reporter (Public)</span>
                      </label>
                      <button type="submit" className="btn-tiny primary">
                        Post Update
                      </button>
                    </div>
                  </form>
                )}

                {/* ML Duplicates & Similar Reports Panel */}
                <div className="drawer-section">
                  <span className="section-label">ML CORRELATED / SIMILAR REPORTS</span>
                  {duplicates.length === 0 ? (
                    <p className="muted-text">No statistically significant duplicate incidents found.</p>
                  ) : (
                    <div className="duplicates-list">
                      {duplicates.map((dup) => (
                        <div key={dup.report_id} className="duplicate-card">
                          <div className="dup-top">
                            <span className="dup-id">Case #{dup.report_id}</span>
                            <span className="dup-sim">{Math.round(dup.similarity * 100)}% Match</span>
                          </div>
                          <p className="dup-excerpt">{dup.excerpt}...</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="drawer-placeholder">
                <div className="placeholder-icon">📂</div>
                <p>Select a case dossier from the list to inspect ML triage telemetry and manage investigation status.</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Incident Clusters View */}
      {activeView === 'clusters' && (
        <div className="clusters-container glass-panel">
          <div className="clusters-header">
            <h3 className="section-title">Unsupervised ML Incident Clusters</h3>
            <p className="section-desc">
              K-Means embeddings automatically group correlated whistleblower reports into incident dossiers.
            </p>
          </div>

          {clusters.length === 0 ? (
            <div className="empty-state">
              Not enough reports to construct multi-case incident clusters yet.
            </div>
          ) : (
            <div className="clusters-grid">
              {clusters.map((c) => (
                <div key={c.cluster_id} className="cluster-card glass-panel">
                  <div className="cluster-card-header">
                    <span className="cluster-num">INCIDENT CLUSTER #{c.cluster_id}</span>
                    <span className="cluster-count">{c.case_count} Correlated Cases</span>
                  </div>
                  <span className={`cluster-cat-badge ${c.primary_category}`}>
                    Primary: {c.primary_category.toUpperCase()}
                  </span>
                  <div className="cluster-cases-list">
                    {c.cases.map((cs) => (
                      <div key={cs.report_id} className="cluster-case-item">
                        <strong className="item-id">Case #{cs.report_id}</strong>
                        <p className="item-excerpt">{cs.excerpt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && analytics && (
        <div className="analytics-container glass-panel">
          <h3 className="section-title">Executive Triage Analytics</h3>
          <p className="section-desc">Aggregate breakdown of organizational risk patterns and case distributions.</p>

          <div className="analytics-charts-grid">
            <div className="chart-box glass-panel">
              <h4 className="chart-title">Breakdown by Category</h4>
              <div className="bar-list">
                {Object.entries(analytics.by_category).map(([cat, count]) => {
                  const pct = Math.round((count / (analytics.total_reports || 1)) * 100);
                  return (
                    <div key={cat} className="bar-item">
                      <div className="bar-labels">
                        <span className="label-name">{cat.toUpperCase()}</span>
                        <span className="label-val">{count} ({pct}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="chart-box glass-panel">
              <h4 className="chart-title">Breakdown by Risk Severity</h4>
              <div className="bar-list">
                {Object.entries(analytics.by_severity).map(([sev, count]) => {
                  const pct = Math.round((count / (analytics.total_reports || 1)) * 100);
                  return (
                    <div key={sev} className="bar-item">
                      <div className="bar-labels">
                        <span className="label-name">{sev}</span>
                        <span className="label-val">{count} ({pct}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className={`bar-fill ${sev.toLowerCase()}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Closure Modal */}
      {closingCaseId && (
        <div className="modal-backdrop-overlay">
          <motion.div
            className="closure-modal glass-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h4 className="closure-modal-title">Permanently Close Case #{closingCaseId}</h4>
            <p className="closure-modal-desc">
              Permanent closure locks this report permanently. No further status changes or updates can be posted. Please provide an official closure rationale.
            </p>
            <textarea
              className="closure-reason-textarea"
              placeholder="State closure findings (e.g. Investigation completed, corrective actions deployed)..."
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              rows={4}
              required
            />
            <div className="closure-modal-actions">
              <button
                className="btn-secondary"
                onClick={() => { setClosingCaseId(null); setCloseReason(''); }}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                disabled={!closeReason.trim()}
                onClick={handleCloseCase}
              >
                Confirm Permanent Closure
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
