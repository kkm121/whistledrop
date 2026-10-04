import React, { useState, useEffect, useCallback } from 'react';
import {
  getModeratorReports,
  getModeratorReport,
  updateReportStatus,
  closeReportPermanently,
  addReportUpdate,
  getReportDuplicates,
  getIncidentClusters,
  getAnalytics,
  seedDemoReports,
} from '../lib/api';
import { sounds } from '../lib/sound';
import {
  Category,
  Status,
  Severity,
  ModeratorReportItem,
  DuplicateItem,
  IncidentCluster,
  AnalyticsData,
} from '../types';
import {
  ShieldIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  LockIcon,
  FileTextIcon,
  SearchIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  LayersIcon,
  BarChartIcon,
  SparklesIcon,
  RefreshCwIcon,
  DownloadIcon,
  RotateCwIcon,
  FlameIcon,
  BuildingIcon,
  RadioIcon,
  TagIcon,
} from './Icons';

interface Props {
  token: string;
  setToken: (t: string) => void;
  flashNotice: (msg: string) => void;
}

export const ModeratorStudio: React.FC<Props> = ({ token, setToken, flashNotice }) => {
  const [authInput, setAuthInput] = useState(token);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(token));
  const [reports, setReports] = useState<ModeratorReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ModeratorReportItem | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [clusters, setClusters] = useState<IncidentCluster[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [drawerFlipped, setDrawerFlipped] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [sortBy, setSortBy] = useState('risk_desc');
  const [activeView, setActiveView] = useState<'cases' | 'clusters' | 'analytics'>('cases');

  // Drawer Form State
  const [updateMessage, setUpdateMessage] = useState('');
  const [isUpdatePublic, setIsUpdatePublic] = useState(true);
  const [closingCaseId, setClosingCaseId] = useState<number | null>(null);
  const [closureReason, setClosureReason] = useState('');

  const fetchReports = useCallback(async () => {
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
      if (selectedReport) {
        const refreshed = data.find((r) => r.id === selectedReport.id);
        if (refreshed) setSelectedReport(refreshed);
      }
    } catch (err: any) {
      flashNotice(err.message || 'Failed to load investigation cases');
      if (err.message?.includes('401') || err.message?.includes('Clearance')) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, [token, categoryFilter, statusFilter, severityFilter, searchQuery, sortBy, selectedReport, flashNotice]);

  const fetchClusters = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getIncidentClusters(token);
      setClusters(data);
    } catch {
      /* ignore */
    }
  }, [token]);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAnalytics(token);
      setAnalytics(data);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
      fetchClusters();
      fetchAnalytics();
    }
  }, [isAuthenticated, fetchReports, fetchClusters, fetchAnalytics]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authInput.trim()) return;
    setToken(authInput.trim());
    setIsAuthenticated(true);
    sounds.playSuccess();
    flashNotice('Moderator clearance session active.');
  };

  const handleSelectReport = async (r: ModeratorReportItem) => {
    sounds.playTap();
    setSelectedReport(r);
    setDrawerFlipped(false);
    try {
      const full = await getModeratorReport(token, r.id);
      setSelectedReport(full);
      const dups = await getReportDuplicates(token, r.id);
      setDuplicates(dups);
    } catch {
      /* fallback to basic */
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (!selectedReport) return;
    sounds.playTap();
    try {
      const updated = await updateReportStatus(token, selectedReport.id, newStatus);
      setSelectedReport(updated);
      sounds.playSuccess();
      flashNotice(`Status updated to ${newStatus}`);
      fetchReports();
      fetchAnalytics();
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Status transition rejected');
    }
  };

  const handleCloseCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !closureReason.trim()) return;
    sounds.playTap();
    try {
      const updated = await closeReportPermanently(token, selectedReport.id, closureReason.trim());
      setSelectedReport(updated);
      setClosingCaseId(null);
      setClosureReason('');
      sounds.playSuccess();
      flashNotice('Case permanently closed with archived rationale.');
      fetchReports();
      fetchAnalytics();
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Case closure failed');
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
      flashNotice('Investigation notice recorded.');
      // Refresh report
      const full = await getModeratorReport(token, selectedReport.id);
      setSelectedReport(full);
      fetchReports();
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Failed to post update');
    }
  };

  const handleSeedDemos = async () => {
    setSeeding(true);
    sounds.playTap();
    try {
      const res = await seedDemoReports(token);
      sounds.playSuccess();
      flashNotice(`Successfully seeded ${res.seeded_count} demonstration incident dossiers.`);
      await fetchReports();
      await fetchClusters();
      await fetchAnalytics();
    } catch (err: any) {
      sounds.playAlert();
      flashNotice(err.message || 'Demonstration seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleResetFilters = () => {
    sounds.playTap();
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('');
    setSeverityFilter('');
    setSortBy('risk_desc');
  };

  if (!isAuthenticated) {
    return (
      <div className="moderator-auth-gate glass-panel">
        <div className="auth-shield-icon">
          <ShieldAlertIcon size={44} />
        </div>
        <h3 className="auth-gate-title">Moderator Security Clearance</h3>
        <p className="auth-gate-desc">
          Enter your Moderator Bearer API Key to access triage telemetry, investigative dossiers, and machine learning analytics.
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
            Authenticate Clearance Session →
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
          <span className="telemetry-lbl">TOTAL INCIDENT REPORTS</span>
          <strong className="telemetry-val">{analytics?.total_reports || reports.length}</strong>
        </div>
        <div className="telemetry-box glass-panel">
          <span className="telemetry-lbl">PENDING INVESTIGATION</span>
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
          <span className="telemetry-lbl">RESOLVED / ARCHIVED</span>
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
            onClick={() => {
              sounds.playTap();
              setActiveView('cases');
            }}
          >
            <FileTextIcon size={14} />
            <span>Case Dossiers ({reports.length})</span>
          </button>
          <button
            className={`sub-tab-btn ${activeView === 'clusters' ? 'active' : ''}`}
            onClick={() => {
              sounds.playTap();
              setActiveView('clusters');
            }}
          >
            <LayersIcon size={14} />
            <span>ML Clusters ({clusters.length})</span>
          </button>
          <button
            className={`sub-tab-btn ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => {
              sounds.playTap();
              setActiveView('analytics');
            }}
          >
            <BarChartIcon size={14} />
            <span>Analytics & Trends</span>
          </button>
        </div>

        {activeView === 'cases' && (
          <div className="search-filter-controls">
            <div className="search-input-wrap">
              <SearchIcon size={14} className="search-icon-field" />
              <input
                type="text"
                className="mod-search-input"
                placeholder="Search descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
              />
            </div>

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

            <button
              className="btn-seed-demo"
              onClick={handleSeedDemos}
              disabled={seeding}
              title="Seed realistic demonstration reports for live evaluation"
            >
              <SparklesIcon size={14} />
              <span>{seeding ? 'Seeding...' : 'Seed Demos'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area based on View Mode */}
      {activeView === 'cases' && (
        <div className="cases-split-layout">
          {/* Table / List */}
          <div className="cases-list-card glass-panel">
            {loading ? (
              <div className="loading-state-scanner">
                <RefreshCwIcon size={24} className="spin-slow" />
                <span>Fetching investigation records...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-state-luxury">
                <div className="radar-reticle-graphic">
                  <RadioIcon size={44} className="radar-ping-icon" />
                  <div className="radar-ring radar-ring-1" />
                  <div className="radar-ring radar-ring-2" />
                </div>
                <h4 className="empty-state-title">No Incident Dossiers Match Criteria</h4>
                <p className="empty-state-desc">
                  The active investigation queue is currently empty or no reports match the applied filters.
                </p>
                <div className="empty-state-action-row">
                  <button className="btn-secondary" onClick={handleResetFilters}>
                    Reset All Filters
                  </button>
                  <button className="btn-primary" onClick={handleSeedDemos} disabled={seeding}>
                    <SparklesIcon size={15} />
                    <span>Seed Demonstration Incident Dossiers</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Incident Excerpt</th>
                      <th>Risk Triage</th>
                      <th>Department</th>
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

          {/* 3D Flip Case Detail Drawer */}
          <aside className="case-detail-drawer glass-panel">
            {selectedReport ? (
              <div className="drawer-flip-stage">
                <div className={`drawer-flip-inner ${drawerFlipped ? 'is-flipped' : ''}`}>
                  
                  {/* FRONT: Case Overview & Workflow */}
                  <div className="drawer-face drawer-front">
                    <div className="drawer-content">
                      <div className="drawer-header">
                        <div>
                          <span className="drawer-tag">CASE DOSSIER #{selectedReport.id}</span>
                          <h3 className="drawer-title">{selectedReport.category.toUpperCase()}</h3>
                        </div>

                        <div className="drawer-top-actions">
                          <button
                            type="button"
                            className="btn-flip-drawer"
                            onClick={() => {
                              sounds.playTap();
                              setDrawerFlipped(true);
                            }}
                            title="3D Flip to inspect ML diagnostics and duplicate detection"
                          >
                            <RotateCwIcon size={13} />
                            <span>ML Diagnostics</span>
                          </button>
                        </div>
                      </div>

                      <div className="drawer-meta-strip">
                        <div className="meta-badge-item">
                          <span className="badge-lbl">Risk Triage</span>
                          <strong className={`badge-val ${selectedReport.severity.toLowerCase()}`}>
                            {selectedReport.severity} ({Math.round(selectedReport.priority_score * 100)}%)
                          </strong>
                        </div>
                        <div className="meta-badge-item">
                          <span className="badge-lbl">Status</span>
                          <strong className="badge-val">{selectedReport.status}</strong>
                        </div>
                        <div className="meta-badge-item">
                          <span className="badge-lbl">Routing</span>
                          <strong className="badge-val">{selectedReport.department || 'Operations'}</strong>
                        </div>
                      </div>

                      <div className="drawer-body-box">
                        <span className="section-label">CONFIDENTIAL INCIDENT STATEMENT</span>
                        <p className="report-full-description">{selectedReport.description}</p>
                      </div>

                      {/* Evidence Files */}
                      {selectedReport.evidence_file && (
                        <div className="drawer-evidence-box">
                          <span className="section-label">SECURE EVIDENCE ATTACHMENT</span>
                          <div className="evidence-download-card">
                            <FileTextIcon size={18} />
                            <span className="evidence-filename">
                              {selectedReport.evidence_file_name || 'Sanitized_Evidence_Document'}
                            </span>
                            <span className="evidence-badge-purged">Metadata Purged</span>
                          </div>
                        </div>
                      )}

                      {/* Closure Notice */}
                      {selectedReport.status === 'CLOSED' && (
                        <div className="drawer-closure-box">
                          <div className="closure-box-header">
                            <LockIcon size={16} />
                            <strong>Permanently Closed Investigation</strong>
                          </div>
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
                                Move to Under Review →
                              </button>
                            )}
                            {selectedReport.status === 'UNDER_REVIEW' && (
                              <>
                                <button
                                  className="btn-action success"
                                  onClick={() => handleStatusChange('RESOLVED')}
                                >
                                  <CheckCircleIcon size={14} />
                                  <span>Mark as Resolved</span>
                                </button>
                                <button
                                  className="btn-action danger"
                                  onClick={() => handleStatusChange('DISMISSED')}
                                >
                                  Dismiss Case
                                </button>
                              </>
                            )}
                            {(selectedReport.status === 'RESOLVED' ||
                              selectedReport.status === 'DISMISSED' ||
                              selectedReport.status === 'UNDER_REVIEW') && (
                              <button
                                className="btn-action dark"
                                onClick={() => {
                                  sounds.playTap();
                                  setClosingCaseId(selectedReport.id);
                                }}
                              >
                                <LockIcon size={14} />
                                <span>Permanently Close Case</span>
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
                            placeholder="Enter official investigation notice (e.g. Investigation underway with legal department)..."
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
                              <span>Make update visible to anonymous case tracker</span>
                            </label>
                            <button type="submit" className="post-update-btn">
                              Post Notice
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Investigation History Timeline */}
                      <div className="drawer-history-box">
                        <span className="section-label">CASE TIMELINE ({selectedReport.updates.length})</span>
                        {selectedReport.updates.length === 0 ? (
                          <span className="no-updates-note">No status updates logged yet.</span>
                        ) : (
                          <div className="timeline-items-list">
                            {selectedReport.updates.map((u, i) => (
                              <div key={i} className="timeline-item">
                                <div className="timeline-dot" />
                                <div className="timeline-body">
                                  <div className="timeline-top">
                                    <span className="timeline-date">
                                      {new Date(u.created_at).toLocaleString()}
                                    </span>
                                    <span className={`vis-tag ${u.public ? 'public' : 'internal'}`}>
                                      {u.public ? 'Public' : 'Internal'}
                                    </span>
                                  </div>
                                  <p className="timeline-msg">{u.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BACK: ML Diagnostics & Duplicates */}
                  <div className="drawer-face drawer-back">
                    <div className="drawer-content">
                      <div className="drawer-header">
                        <div>
                          <span className="drawer-tag">ML INTELLIGENCE TELEMETRY</span>
                          <h3 className="drawer-title">Incident Diagnostics #{selectedReport.id}</h3>
                        </div>

                        <button
                          type="button"
                          className="btn-flip-drawer return"
                          onClick={() => {
                            sounds.playTap();
                            setDrawerFlipped(false);
                          }}
                          title="Return to case workflow"
                        >
                          <RotateCwIcon size={13} />
                          <span>Return to Case</span>
                        </button>
                      </div>

                      <div className="drawer-ml-diagnostics">
                        <div className="diag-section-box">
                          <span className="diag-label">
                            <FlameIcon size={14} />
                            <span>URGENCY & RISK PROFILE</span>
                          </span>
                          <div className="risk-metric-strip">
                            <div className="metric-pill">
                              <span className="metric-num">
                                {Math.round(selectedReport.priority_score * 100)}%
                              </span>
                              <span className="metric-tag">Triage Priority</span>
                            </div>
                            <div className="metric-pill">
                              <span className={`metric-num ${selectedReport.severity.toLowerCase()}`}>
                                {selectedReport.severity}
                              </span>
                              <span className="metric-tag">Model Severity</span>
                            </div>
                            <div className="metric-pill">
                              <span className="metric-num">
                                {selectedReport.department || 'Operations'}
                              </span>
                              <span className="metric-tag">Routed Unit</span>
                            </div>
                          </div>
                        </div>

                        {/* Duplicates */}
                        <div className="diag-section-box" style={{ marginTop: '1rem' }}>
                          <span className="diag-label">
                            <SearchIcon size={14} />
                            <span>SIMILARITY & DUPLICATE DETECTION ({duplicates.length})</span>
                          </span>
                          {duplicates.length === 0 ? (
                            <span className="no-dups-note">No duplicate incidents detected in corpus.</span>
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
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="drawer-placeholder-luxury">
                <div className="reticle-container">
                  <ShieldCheckIcon size={48} className="shield-reticle-icon" />
                  <div className="reticle-line reticle-h" />
                  <div className="reticle-line reticle-v" />
                </div>
                <h4 className="placeholder-title">Select an Incident Dossier</h4>
                <p className="placeholder-text">
                  Choose a case from the investigation table to inspect ML triage telemetry, verify cryptographic status, and manage investigation workflow.
                </p>
                <div className="placeholder-telemetry-tag">
                  <span>ACTIVE TELEMETRY MONITORS ENGAGED</span>
                </div>
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
              K-Means feature clustering automatically synthesizes correlated whistleblower submissions into linked incident dossiers.
            </p>
          </div>

          {clusters.length === 0 ? (
            <div className="empty-state-luxury">
              <LayersIcon size={36} />
              <h4>Not Enough Reports for Incident Clusters</h4>
              <p>Clustering requires multiple submissions. Seed demonstration reports to visualize.</p>
              <button className="btn-primary" onClick={handleSeedDemos} disabled={seeding}>
                <SparklesIcon size={14} />
                <span>Seed Demonstration Dossiers</span>
              </button>
            </div>
          ) : (
            <div className="clusters-grid">
              {clusters.map((c) => (
                <div key={c.cluster_id} className="cluster-card glass-panel">
                  <div className="cluster-card-header">
                    <span className="cluster-num">INCIDENT CLUSTER #{c.cluster_id}</span>
                    <span className="cluster-count">{c.case_count} Correlated Cases</span>
                  </div>
                  <div className="cluster-top-terms">
                    <span className="terms-lbl">Primary Category:</span>
                    <div className="terms-tags">
                      <span className="term-pill">{c.primary_category.toUpperCase()}</span>
                      {(c.top_terms || []).map((t, i) => (
                        <span key={i} className="term-pill">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="cluster-case-ids">
                    <span className="case-ids-lbl">Correlated Reports:</span>
                    <div className="case-id-badges">
                      {c.cases.map((cs) => (
                        <span key={cs.report_id} className="case-id-badge">
                          #{cs.report_id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Executive Analytics View */}
      {activeView === 'analytics' && analytics && (
        <div className="analytics-container glass-panel">
          <div className="analytics-header">
            <h3 className="section-title">Executive Triage Intelligence</h3>
            <p className="section-desc">Distribution analytics across incident categories, severities, and workflow stages.</p>
          </div>

          <div className="analytics-charts-grid">
            <div className="chart-card glass-panel">
              <h4 className="chart-title">Incident Category Distribution</h4>
              <div className="dist-bars-list">
                {Object.entries(analytics.by_category || {}).map(([cat, count]) => (
                  <div key={cat} className="dist-row">
                    <div className="dist-info">
                      <span className="dist-name">{cat.toUpperCase()}</span>
                      <span className="dist-count">{count}</span>
                    </div>
                    <div className="dist-bar-track">
                      <div
                        className={`dist-bar-fill ${cat}`}
                        style={{
                          width: `${Math.round((count / (analytics.total_reports || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card glass-panel">
              <h4 className="chart-title">Incident Severity Matrix</h4>
              <div className="dist-bars-list">
                {Object.entries(analytics.by_severity || {}).map(([sev, count]) => (
                  <div key={sev} className="dist-row">
                    <div className="dist-info">
                      <span className="dist-name">{sev}</span>
                      <span className="dist-count">{count}</span>
                    </div>
                    <div className="dist-bar-track">
                      <div
                        className={`dist-bar-fill ${sev.toLowerCase()}`}
                        style={{
                          width: `${Math.round((count / (analytics.total_reports || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Case Closure */}
      {closingCaseId && (
        <div className="modal-backdrop-overlay">
          <div className="case-closure-modal glass-panel">
            <div className="modal-badge-row">
              <span className="secure-pass-tag">FINAL CASE DISPOSITION</span>
              <button
                className="modal-close-x"
                onClick={() => setClosingCaseId(null)}
                title="Cancel closure"
              >
                ×
              </button>
            </div>
            <h3 className="modal-title">Permanently Close Case #{closingCaseId}</h3>
            <p className="modal-desc">
              Permanent case closure locks this report against further workflow status edits. Document the legal or investigative rationale below for compliance archives.
            </p>
            <form onSubmit={handleCloseCase}>
              <textarea
                className="closure-input"
                placeholder="Document closure justification (e.g. Investigation complete, corrective disciplinary and security actions enforced)..."
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                rows={4}
                required
              />
              <div className="closure-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setClosingCaseId(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-danger">
                  Confirm Permanent Closure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
