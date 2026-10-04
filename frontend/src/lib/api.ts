import {
  AnalyticsData,
  Category,
  DuplicateItem,
  IncidentCluster,
  MLComprehensiveAnalysis,
  ModeratorReportItem,
  PrivacyScanResult,
  ReportSubmitPayload,
  ReportSubmitResponse,
  ReportTrackResponse,
  Severity,
  Status,
  UpdateItem,
} from '../types';

const BASE_URL = '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errDetail = 'Request failed';
    try {
      const json = await res.json();
      errDetail = json.error || json.hint || json.detail || errDetail;
    } catch {
      errDetail = await res.text();
    }
    throw new Error(errDetail);
  }
  return res.json() as Promise<T>;
}

// ----------------- Public APIs -----------------

export async function submitReport(payload: ReportSubmitPayload): Promise<ReportSubmitResponse> {
  const res = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<ReportSubmitResponse>(res);
}

export async function trackReport(caseCode: string): Promise<ReportTrackResponse> {
  const res = await fetch(`${BASE_URL}/reports/${encodeURIComponent(caseCode.trim())}`);
  return handleResponse<ReportTrackResponse>(res);
}

export async function uploadEvidence(file: File): Promise<{ file_id: string; original_name: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/reports/upload-evidence`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<{ file_id: string; original_name: string }>(res);
}

export async function analyzeReport(description: string): Promise<MLComprehensiveAnalysis> {
  const res = await fetch(`${BASE_URL}/suggest/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  return handleResponse<MLComprehensiveAnalysis>(res);
}

export async function scanPrivacy(description: string): Promise<PrivacyScanResult> {
  const res = await fetch(`${BASE_URL}/suggest/privacy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  return handleResponse<PrivacyScanResult>(res);
}

export async function getMLMetrics(): Promise<any> {
  const res = await fetch(`${BASE_URL}/ml/metrics`);
  return handleResponse<any>(res);
}

export async function analyzeStylometry(text: string): Promise<{
  risk_score: number;
  risk_level: string;
  word_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  lexical_diversity: number;
  readability_grade: number;
  idiosyncratic_features: string[];
}> {
  const res = await fetch(`${BASE_URL}/suggest/stylometry/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

export async function obfuscateStylometry(text: string): Promise<{
  original_text: string;
  obfuscated_text: string;
  original_risk_score: number;
  obfuscated_risk_score: number;
  features_neutralized: string[];
  advice: string;
}> {
  const res = await fetch(`${BASE_URL}/suggest/stylometry/obfuscate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

export async function verifyZKProof(payload: {
  domain: string;
  commitment: string;
  nullifier_hash: string;
  proof_hash: string;
}): Promise<{
  is_valid: boolean;
  domain?: string;
  nullifier_hash?: string;
  badge?: string;
  guarantee?: string;
  error?: string;
}> {
  const res = await fetch(`${BASE_URL}/suggest/zk/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}


// ----------------- Moderator APIs -----------------

function authHeader(token: string) {
  return {
    Authorization: `Bearer ${token.trim()}`,
    'Content-Type': 'application/json',
  };
}

export async function getModeratorReports(
  token: string,
  params: {
    category?: Category;
    status?: Status;
    severity?: Severity;
    department?: string;
    q?: string;
    sort_by?: string;
  }
): Promise<ModeratorReportItem[]> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.severity) query.set('severity', params.severity);
  if (params.department) query.set('department', params.department);
  if (params.q) query.set('q', params.q);
  if (params.sort_by) query.set('sort_by', params.sort_by);

  const res = await fetch(`${BASE_URL}/moderator/reports?${query.toString()}`, {
    headers: authHeader(token),
  });
  return handleResponse<ModeratorReportItem[]>(res);
}

export async function getModeratorReport(token: string, id: number): Promise<ModeratorReportItem> {
  const res = await fetch(`${BASE_URL}/moderator/reports/${id}`, {
    headers: authHeader(token),
  });
  return handleResponse<ModeratorReportItem>(res);
}

export async function updateReportStatus(
  token: string,
  id: number,
  status: Status
): Promise<ModeratorReportItem> {
  const res = await fetch(`${BASE_URL}/moderator/reports/${id}/status`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ status }),
  });
  return handleResponse<ModeratorReportItem>(res);
}

export async function closeReportPermanently(
  token: string,
  id: number,
  reason: string
): Promise<ModeratorReportItem> {
  const res = await fetch(`${BASE_URL}/moderator/reports/${id}/close`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ reason }),
  });
  return handleResponse<ModeratorReportItem>(res);
}

export async function addReportUpdate(
  token: string,
  id: number,
  message: string,
  isPublic: boolean = true
): Promise<UpdateItem> {
  const res = await fetch(`${BASE_URL}/moderator/reports/${id}/updates`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ message, public: isPublic }),
  });
  return handleResponse<UpdateItem>(res);
}

export async function getReportDuplicates(token: string, id: number): Promise<DuplicateItem[]> {
  const res = await fetch(`${BASE_URL}/moderator/reports/${id}/duplicates`, {
    headers: authHeader(token),
  });
  return handleResponse<DuplicateItem[]>(res);
}

export async function getIncidentClusters(token: string): Promise<IncidentCluster[]> {
  const res = await fetch(`${BASE_URL}/moderator/clusters`, {
    headers: authHeader(token),
  });
  return handleResponse<IncidentCluster[]>(res);
}

export async function getAnalytics(token: string): Promise<AnalyticsData> {
  const res = await fetch(`${BASE_URL}/moderator/analytics`, {
    headers: authHeader(token),
  });
  return handleResponse<AnalyticsData>(res);
}

export async function seedDemoReports(token: string): Promise<{ ok: boolean; seeded_count: number }> {
  const res = await fetch(`${BASE_URL}/moderator/seed-demo`, {
    method: 'POST',
    headers: authHeader(token),
  });
  return handleResponse<{ ok: boolean; seeded_count: number }>(res);
}

