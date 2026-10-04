export type Category = 'security' | 'harassment' | 'corruption' | 'technical' | 'other';

export type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'CLOSED';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReportSubmitPayload {
  category: Category;
  description: string;
  evidence_url?: string | null;
  evidence_file_id?: string | null;
}

export interface ReportSubmitResponse {
  case_code: string;
  status: Status;
  category: Category;
  severity: Severity;
  department?: string | null;
  created_at: string;
}

export interface UpdateItem {
  message: string;
  created_at: string;
  public: boolean;
}

export interface ReportTrackResponse {
  status: Status;
  category: Category;
  severity: Severity;
  department?: string | null;
  created_at: string;
  evidence_url?: string | null;
  evidence_file_name?: string | null;
  closure_reason?: string | null;
  updates: UpdateItem[];
}

export interface ModeratorReportItem {
  id: number;
  category: Category;
  description: string;
  evidence_url?: string | null;
  evidence_file?: string | null;
  evidence_file_name?: string | null;
  status: Status;
  severity: Severity;
  department?: string | null;
  closure_reason?: string | null;
  created_at: string;
  updated_at: string;
  priority_score: number;
  updates: UpdateItem[];
}

export interface PrivacyEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  severity: string;
}

export interface PrivacyScanResult {
  has_pii: boolean;
  risk_level: string;
  entity_count: number;
  entities: PrivacyEntity[];
  sanitized_text: string;
  advice: string;
}

export interface MLComprehensiveAnalysis {
  category: {
    label: Category | null;
    confidence: number;
    abstained: boolean;
    hint: string;
    top_candidates: Array<{ category: Category; probability: number }>;
  };
  probabilities?: Record<string, number>;
  urgency: {
    risk_score: number;
    severity: Severity;
    contributing_keywords: string[];
    urgency?: Severity;
    explanation?: string;
  };
  department: {
    department: string;
    confidence: number;
    suggested_department?: string;
  };
  threat_keywords?: string[];
  privacy: PrivacyScanResult;
}

export interface DuplicateItem {
  report_id: number;
  category: Category;
  similarity: number;
  excerpt: string;
}

export interface IncidentCluster {
  cluster_id: number;
  case_count: number;
  primary_category: string;
  top_terms?: string[];
  report_ids?: number[];
  cases: Array<{
    report_id: number;
    category: string;
    excerpt: string;
  }>;
}


export interface AnalyticsData {
  total_reports: number;
  pending_review: number;
  resolved_reports: number;
  closed_reports: number;
  critical_reports: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
}
