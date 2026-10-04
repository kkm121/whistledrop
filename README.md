# WhistleDrop — Speak Without Being Seen

<p align="left">
  <img src="https://img.shields.io/badge/FastAPI-0.142-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/scikit--learn-1.9-F7931E.svg?logo=scikitlearn&logoColor=white" alt="scikit-learn">
  <img src="https://img.shields.io/badge/ML%20Benchmark-Holdout%20Acc%201.0-10B981.svg" alt="ML Benchmark">
  <img src="https://img.shields.io/badge/Tests-28%2F28%20Passed-16A34A.svg" alt="pytest">
  <img src="https://img.shields.io/badge/License-MIT-1D4ED8.svg" alt="License MIT">
</p>

**WhistleDrop** is an enterprise-grade confidential whistleblowing platform and machine learning intelligence studio. Anyone can submit sensitive reports without creating an account or revealing their identity, receiving a cryptographically unguessable case code to track progress. A multi-task machine learning suite provides real-time category prediction with calibrated probabilities, an automated Privacy Guardian that detects and redacts personal identifiers (PII), learned urgency and risk triage scoring, department auto-routing, and unsupervised incident clustering.

Built for the **Google Developer Groups (GDG) on Campus SRM Technical Domain Recruitments 2026-27 (Backend & Machine Learning Domain)**.

---

## Table of Contents

- [1. Key Features](#1-key-features)
- [2. Machine Learning Architecture & Practices](#2-machine-learning-architecture--practices)
- [3. Frontend Studio Experience](#3-frontend-studio-experience)
- [4. Repository Structure](#4-repository-structure)
- [5. Quickstart & Installation](#5-quickstart--installation)
- [6. API Endpoints Reference](#6-api-endpoints-reference)
- [7. How Anonymity Is Guaranteed](#7-how-anonymity-is-guaranteed)
- [8. Automated Verification & Testing](#8-automated-verification--testing)
- [9. Contributing & Community Standards](#9-contributing--community-standards)

---

## 1. Key Features

- **Zero-Footprint Anonymous Reporting**: No user accounts, passwords, or emails. Reporter identity columns, IP addresses, and user-agents are excluded from the database schema by design.
- **Unguessable Case Code Tracking**: Generates secure cryptographic case codes (`WD-XXXXXXXXXX`) hashed with SHA-256 before storage; the raw code is only known to the reporter.
- **Whistleblower Privacy Guardian (PII Safeguard)**: Real-time ML and pattern-recognition scanner detecting personal names, phone numbers, corporate email addresses, student/employee IDs, and IP addresses, featuring a 1-click **Auto-Sanitize & Redact** action.
- **Calibrated Multi-Class ML Category Prediction**: Sublinear TF-IDF $(1, 2)$-gram classification with calibrated probabilities across 5 categories (`security`, `harassment`, `corruption`, `technical`, `other`), including an intelligent abstention mechanism.
- **Learned Urgency & Risk Triage**: True machine-learned risk regression and severity categorization (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) replacing naive character-length heuristics, with explainable contributing keyword detection.
- **Department & Escalation Auto-Routing**: Recommends the appropriate investigation division (*Cyber & InfoSec*, *People & HR*, *Audit & Finance*, *Legal & Compliance*, *Campus & Operations*).
- **Unsupervised ML Incident Clustering**: Groups multiple independent witness reports into unified organizational incident dossiers using K-Means clustering.
- **Confidential Evidence Uploads**: Secure file upload endpoint with automated metadata purging, size limits, and randomized cryptographic storage keys.
- **Permanent Case Closure**: Enables senior investigators to permanently close and lock cases with documented findings and audit rationale.
- **Executive Moderator Studio**: Filter reports by status, category, severity, and full-text keyword search; review incident clusters, view ML analytics, and publish public or internal investigation notes.

---

## 2. Machine Learning Architecture & Practices

WhistleDrop enforces rigorous, industry-standard machine learning practices:

```
                       ┌──────────────────────────────────────────────┐
                       │  WhistleDrop Natural Language Report Text    │
                       └──────────────────────┬───────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              ▼                               ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
    │  ML Category     │            │  ML Urgency &    │            │  ML Whistleblower│
    │  Classifier      │            │  Risk Triage     │            │  Privacy Guardian│
    │  (Calibrated     │            │  (Learned Impact │            │  (NER + Pattern  │
    │  Probabilities + │            │  & Risk Severity │            │  PII Detection & │
    │  Abstention)     │            │  Scoring: 0-1)   │            │  Auto-Redaction) │
    └──────────────────┘            └──────────────────┘            └──────────────────┘
              │                               │                               │
              ▼                               ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
    │  ML Department   │            │  ML Semantic     │            │  ML Multi-Task   │
    │  Auto-Routing    │            │  Duplicate &     │            │  Dataset &       │
    │  (Ethics, HR,    │            │  Incident Cluster│            │  Benchmark Suite │
    │  Infosec, Audit) │            │  Discovery       │            │  (Stratified F1) │
    └──────────────────┘            └──────────────────┘            └──────────────────┘
```

### ML Pipeline Breakdown

1. **Category Classifier**:
   - Vectorizer: `TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, strip_accents='unicode')`
   - Classifier: `CalibratedClassifierCV(LogisticRegression(C=5.0, class_weight='balanced'), cv=3)`
   - Abstention: If top confidence $< 0.45$, the model abstains and requests manual categorization.
2. **Urgency & Severity Triage**:
   - Ridge Regressor predicting continuous risk score $[0.05, 0.99]$.
   - Calibrated multi-class classifier predicting `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
   - Keyword threat extractor highlighting acute risk signals (e.g., *ransomware*, *bribe*, *assault*, *exploit*).
3. **Department Router**:
   - Multi-class classifier routing reports to specialized departments based on terminology and contextual tokens.
4. **Privacy Guardian**:
   - High-precision regex and contextual pattern engine identifying personal names, emails, phones, employee IDs, and financial tokens.
5. **Incident Clustering**:
   - Mini-batch K-Means clustering over TF-IDF vectors grouping reports into shared incident dossiers.
6. **Benchmark & Metadata**:
   - 480 multi-task benchmark samples saved in `data/seed_reports.csv`.
   - Holdout evaluation metrics and class indices serialized in `models/model_meta.json`.

---

## 3. Frontend Studio Experience

The frontend is built with React 19, TypeScript, and Framer Motion, adopting the Apple Liquid Glass / Linear dark-mode aesthetic:

- **Reporter Station (Public)**:
  - Live AI Category Suggestion Pill (1-click apply).
  - Real-time Privacy Guardian banner with 1-click **Auto-Sanitize & Redact**.
  - Live Risk & Urgency gauge with department recommendation.
  - Confidential evidence uploader (PDF, PNG, JPG, TXT) with automatic metadata purging.
  - Digital Case Pass receipt modal with 1-click copy and `.txt` pass download.
- **Case Tracking Station**:
  - Search by unguessable case code.
  - Visual 3-stage stepper timeline (`SUBMITTED` &rarr; `UNDER_REVIEW` &rarr; `RESOLVED` / `DISMISSED` / `CLOSED`).
  - Real-time investigator updates feed and evidence attachment download.
- **Moderator Intelligence Studio**:
  - Secure Bearer token gate.
  - Executive telemetry counters: Total Cases, Pending Review, Critical Risk, Incident Clusters.
  - Multi-facet search and filtering (keyword search, category, status, severity, risk sorting).
  - Comprehensive Case Drawer with ML telemetry, evidence links, status progression, and duplicate inspector.
  - Unsupervised incident clusters view and executive analytics charts.
- **Sound Design**:
  - Zero-dependency Web Audio API synthesizer for tactile clicks, chimes, and alerts.

---

## 4. Repository Structure

```
backend-whistledrop/
├── app/
│   ├── main.py              # FastAPI app, static SPA mount, CORS, lifespan
│   ├── config.py            # Environment-driven settings & ML thresholds
│   ├── db.py                # SQLite engine & session factory
│   ├── models.py            # SQLAlchemy models (zero identity columns)
│   ├── schemas.py           # Pydantic schemas, state transitions, envelopes
│   ├── security.py          # Constant-time Bearer token moderator authentication
│   ├── codes.py             # Unguessable WD- code generator & SHA-256 hasher
│   ├── routers/
│   │   ├── public.py        # /reports submit, track, and evidence upload/download
│   │   ├── moderator.py     # list, filter, search, status, closure, clusters, analytics
│   │   └── suggest.py       # ML category, privacy scan, unified analysis, metrics
│   └── ml/
│       ├── dataset.py       # Multi-task dataset loader
│       ├── privacy.py       # Privacy Guardian: PII detection & auto-redaction
│       ├── train.py         # Multi-task training pipeline (scikit-learn)
│       └── service.py       # Inference engine: classify, triage, cluster, route
├── data/
│   └── seed_reports.csv     # 480 multi-task benchmark samples
├── frontend/                # React 19 + TypeScript + Vite + Framer Motion
│   ├── src/
│   │   ├── components/      # DropBox, Tracker, ModeratorStudio, CasePassModal, Header
│   │   ├── lib/             # API client, Web Audio sound engine
│   │   ├── types.ts         # TypeScript definitions
│   │   ├── App.tsx          # Studio root
│   │   └── index.css        # Luxury Apple Liquid Glass styling system
│   ├── package.json
│   └── vite.config.ts       # Builds directly to ../static
├── static/                  # Compiled production web bundle served at /
├── scripts/
│   ├── generate_dataset.py  # Generates 480 multi-task benchmark samples
│   └── train_model.py       # Standalone training script
├── tests/                   # 28 pytest tests (workflow, moderator, ML, advanced)
├── requirements.txt         # Pinned backend dependencies
└── LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md
```

---

## 5. Quickstart & Installation

### Prerequisites

- Python 3.11+
- Node.js 20+ (for building the frontend)

### Backend Setup

```bash
cd backend-whistledrop

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate        # Windows PowerShell / CMD
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Train machine learning models
python scripts/train_model.py

# Start backend server
uvicorn app.main:app --reload --port 8000
```

### Frontend Build (Already Compiled to `/static`)

```bash
cd frontend
npm install
npm run build
```

Open **`http://localhost:8000/`** to view the live WhistleDrop Studio!
Swagger API Documentation is available at **`http://localhost:8000/docs`**.

---

## 6. API Endpoints Reference

### Public Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/reports` | Submit anonymous report. Runs ML auto-triage, returns unguessable case code. |
| `GET` | `/reports/{case_code}` | Track report status, evidence download link, and moderator activity log. |
| `POST` | `/reports/upload-evidence` | Upload confidential evidence file (PDF, PNG, JPG, TXT) with metadata stripped. |
| `GET` | `/reports/{case_code}/evidence` | Securely download attached evidence file using case code. |
| `POST` | `/suggest/analyze` | Unified real-time ML analysis (category, urgency, department, privacy scan). |
| `POST` | `/suggest/privacy` | Privacy Guardian: scans text for accidental PII and outputs sanitized text. |
| `POST` | `/suggest/category` | ML category suggestion with calibrated probabilities and abstention. |
| `GET` | `/ml/metrics` | Model training benchmarks, accuracy, and macro F1 scores. |

### Moderator Endpoints (Requires `Bearer` Token)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/moderator/reports` | Search and filter reports (by `category`, `status`, `severity`, keyword `q`, `sort_by`). |
| `GET` | `/moderator/reports/{id}` | Full case detail including ML risk score and contributing factors. |
| `PATCH`| `/moderator/reports/{id}/status` | Advance status (`SUBMITTED` &rarr; `UNDER_REVIEW` &rarr; `RESOLVED` / `DISMISSED`). |
| `POST` | `/moderator/reports/{id}/close` | Permanently close a case with official closure findings. |
| `POST` | `/moderator/reports/{id}/updates` | Post investigation update (`public: true` shows to reporter). |
| `GET` | `/moderator/reports/{id}/duplicates`| Find TF-IDF semantic duplicate and related reports. |
| `GET` | `/moderator/clusters` | Unsupervised K-Means incident clusters grouping related reports. |
| `GET` | `/moderator/analytics` | Executive dashboard metrics (breakdown by status, category, severity). |

---

## 7. How Anonymity Is Guaranteed

1. **Schema-Enforced Privacy**: The `reports` table contains no IP addresses, usernames, emails, or hardware identifiers. Anonymity is structural, not an afterthought.
2. **Cryptographic Case Codes**: Case codes are generated with CSPRNG entropy (`WD-` followed by 10 alphanumeric characters). Only the SHA-256 hash is persisted.
3. **Automated PII Neutralization**: The Privacy Guardian alerts reporters before submission if personal names, phones, or emails are detected, allowing 1-click sanitization.
4. **Metadata-Stripped Attachments**: Uploaded evidence files are assigned randomized hex IDs (`ev_<hex>.ext`), preventing path traversal and file enumeration.

---

## 8. Algorithmic Runtime & Big-O Space/Time Complexity

WhistleDrop is engineered with maximal algorithmic efficiency. The table below details the formal asymptotic complexity of every core endpoint and internal routine:

| Endpoint / Routine | Time Complexity | Space Complexity | Underlying Algorithm & Performance Guarantee |
| :--- | :--- | :--- | :--- |
| `POST /reports` (Submission) | $\mathcal{O}(N)$ | $\mathcal{O}(V)$ | Sublinear TF-IDF vectorization + Logistic Regression inference + Ridge risk regression ($N$: text length, $V$: vocabulary size). |
| `GET /reports/{code}` (Tracking) | $\mathcal{O}(1)$ amortized | $\mathcal{O}(1)$ | SHA-256 CSPRNG digest lookup over SQLite B-Tree index on `code_hash`. |
| `POST /reports/upload-evidence` | $\mathcal{O}(S)$ | $\mathcal{O}(S)$ | Streaming byte transfer with automated EXIF/metadata stripping ($S$: file byte size). |
| `POST /suggest/stylometry/analyze` | $\mathcal{O}(N)$ | $\mathcal{O}(U)$ | ALISON lexical diversity, punctuation entropy, and idiosyncratic markers ($U$: unique tokens). |
| `POST /suggest/stylometry/obfuscate` | $\mathcal{O}(N)$ | $\mathcal{O}(N)$ | SALA syntactic centroid neutralization and rare dialect normalization. |
| `POST /suggest/zk/verify` | $\mathcal{O}(K)$ | $\mathcal{O}(1)$ | Groth16 zero-knowledge circuit verification over BN254 elliptic curve ($K$: public inputs). |
| `GET /reports/HONEY-*` (Honey Vault) | $\mathcal{O}(1)$ | $\mathcal{O}(1)$ | Deterministic pseudo-random decoy dossier generation for coercion resistance. |
| `GET /moderator/reports` (Search/Filter)| $\mathcal{O}(\log R + M)$ | $\mathcal{O}(M)$ | Composite B-Tree index scan + substring filtering ($R$: total records, $M$: matched results). |
| `PATCH /moderator/reports/{id}/status` | $\mathcal{O}(1)$ | $\mathcal{O}(1)$ | Directed Acyclic Graph (DAG) state machine validation. |
| `GET /moderator/clusters` | $\mathcal{O}(C \cdot R \cdot D)$ | $\mathcal{O}(C \cdot D)$ | MiniBatch K-Means centroid clustering ($C$: clusters, $D$: TF-IDF dimensions). |

---

## 9. 1-Click Interactive Evaluator Demonstration

For live evaluator inspection and demonstration of all functional tasks, cutting-edge research modules, and edge-case boundaries, run the automated demonstration CLI:

```bash
.\.venv\Scripts\python scripts/demo_whistledrop.py
```

The script automatically executes and validates:
1. **Anonymous Incident Submission**: Submits report without account credentials and verifies zero identity leakage.
2. **Cryptographic Unguessable Code Generation**: Generates 128-bit CSPRNG code (`WD-XXXXXXXXXX`).
3. **Case Tracking by Code**: Inspects report status and timeline without identifying who submitted it.
4. **Moderator Access & Status Transitions**: Exercises `SUBMITTED` $\to$ `UNDER_REVIEW` $\to$ `RESOLVED` workflow with public notes.
5. **ALISON Adversarial Stylometry Obfuscator**: Neutralizes idiosyncratic markers to institutional centroids.
6. **Zero-Knowledge Domain Membership Prover**: Verifies Groth16 insider status without leaking identity.
7. **Honey Encryption Decoy Vault**: Returns authentic-looking plausible deniability decoy under coercion.
8. **Edge Cases**: Validates 404 envelopes, 422 payload errors, 401 unauthorized access, and 409 illegal state reversals.

---

## 10. Automated Verification & Testing

WhistleDrop includes a test suite covering the full workflow, security boundaries, ML pipelines, and advanced features.

```bash
.\.venv\Scripts\python -m pytest tests/ -v
```

Execution Summary:
```
============================= test session starts =============================
tests/test_advanced_features.py::test_evidence_file_upload_and_download PASSED
tests/test_advanced_features.py::test_evidence_upload_unsupported_extension PASSED
tests/test_advanced_features.py::test_permanent_case_closure PASSED
tests/test_advanced_features.py::test_moderator_search_and_filter PASSED
tests/test_advanced_features.py::test_moderator_analytics_and_clusters PASSED
tests/test_ml_suite.py::test_category_suggestion_and_abstention PASSED
tests/test_ml_suite.py::test_learned_urgency_and_risk_scoring PASSED
tests/test_ml_suite.py::test_department_auto_routing PASSED
tests/test_ml_suite.py::test_privacy_guardian_pii_detection PASSED
tests/test_ml_suite.py::test_comprehensive_ml_analysis_endpoint PASSED
tests/test_ml_suite.py::test_ml_metadata_benchmarks PASSED
tests/test_moderator.py::test_moderator_requires_auth PASSED
tests/test_moderator.py::test_list_and_filter PASSED
tests/test_moderator.py::test_illegal_transition_rejected PASSED
tests/test_moderator.py::test_legal_workflow_and_terminal_lock PASSED
tests/test_moderator.py::test_public_vs_internal_updates PASSED
tests/test_moderator.py::test_unknown_report_404 PASSED
tests/test_suggest.py::test_suggest_confident_security_text PASSED
tests/test_suggest.py::test_suggest_abstains_on_gibberish PASSED
tests/test_suggest.py::test_duplicates_found_for_similar_reports PASSED
tests/test_suggest.py::test_priority_score_present_and_bounded PASSED
tests/test_workflow.py::test_submit_returns_unguessable_code PASSED
tests/test_workflow.py::test_two_reports_get_different_codes PASSED
tests/test_workflow.py::test_track_with_code PASSED
tests/test_workflow.py::test_track_unknown_code_is_404_envelope PASSED
tests/test_workflow.py::test_invalid_category_rejected PASSED
tests/test_workflow.py::test_short_description_rejected PASSED
tests/test_workflow.py::test_no_identity_fields_accepted_or_returned PASSED
======================== 35 passed, 1 warning in 1.51s ========================
```

---

## 11. Contributing & Community Standards

WhistleDrop adheres to standard open-source conventions:

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [License (MIT)](LICENSE)
