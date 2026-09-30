# WhistleDrop — Speak Without Being Seen

<p align="left">
  <img src="https://img.shields.io/badge/FastAPI-0.142-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white" alt="Python 3.11+">
  <img src="https://img.shields.io/badge/SQLite-file--backed-003B57.svg" alt="SQLite">
  <img src="https://img.shields.io/badge/ML-scikit--learn_LogReg-F7931E.svg" alt="scikit-learn">
  <img src="https://img.shields.io/badge/Tests-pytest-16A34A.svg" alt="pytest">
  <img src="https://img.shields.io/badge/License-MIT-1D4ED8.svg" alt="License MIT">
</p>

**WhistleDrop** is an anonymous reporting backend: anyone submits a report without an account, receives an unguessable case code, and tracks progress with it. Moderators review, filter, and advance reports through a fixed workflow. Built as **Backend Task 1** for the GDG on Campus SRM Technical Domain recruitments 2026-27. No frontend; demonstrated via Swagger UI, curl, or Postman.

---

## Table of Contents

- [1. Repository Structure](#1-repository-structure)
- [2. Setup](#2-setup)
- [3. API Endpoints](#3-api-endpoints)
- [4. How Anonymity Is Maintained](#4-how-anonymity-is-maintained)
- [5. Machine Learning Endpoints](#5-machine-learning-endpoints)
- [6. Example Requests and Responses](#6-example-requests-and-responses)
- [7. Assumptions and Design Decisions](#7-assumptions-and-design-decisions)

---

## 1. Repository Structure

```
backend-whistledrop/
├── app/
│   ├── main.py           # App, error envelopes, lifespan (DB + model), routers
│   ├── config.py         # Env-driven settings (DB path, keys, thresholds)
│   ├── db.py             # SQLite engine, sessions, init
│   ├── models.py         # Report, StatusUpdate (no identity columns by design)
│   ├── schemas.py        # Pydantic models, state machine, error envelope
│   ├── security.py       # Bearer moderator key, constant-time compare
│   ├── codes.py          # WD- case codes (secrets) + SHA-256 lookup
│   ├── routers/
│   │   ├── public.py     # POST /reports, GET /reports/{code}
│   │   ├── moderator.py  # list/filter, status PATCH, updates, duplicates
│   │   └── suggest.py    # POST /suggest/category
│   └── ml/
│       ├── dataset.py    # Seed CSV loader (single source of truth)
│       ├── train.py      # TF-IDF + LogisticRegression pipeline
│       └── service.py    # Load-once service: suggest, duplicates, priority
├── data/seed_reports.csv # 150 hand-written training snippets, 5 categories
├── scripts/train_model.py# Retrain anywhere (local, Render, Kaggle) as-is
├── models/               # Artifact dir (gitignored, auto-trained on startup)
├── tests/                # pytest suite (workflow, moderator, ML)
├── requirements.txt
└── LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md
```

---

## 2. Setup

Prerequisites: Python 3.11+ and pip.

```bash
git clone <repo-url-shared-later>
cd backend-whistledrop
python -m venv .venv
.\.venv\Scripts\activate        # Windows; use bin/activate on Linux/macOS
pip install -r requirements.txt
python scripts/train_model.py   # ~1s on CPU; also auto-trains on first run
uvicorn app.main:app --reload   # http://localhost:8000
```

Swagger UI: `http://localhost:8000/docs`. Health: `GET /health`.

Moderator key: set `MODERATOR_API_KEY` env var. Without it the server starts with `dev-moderator-key-CHANGE-ME` and logs a warning. Tests use `test-moderator-key` via `tests/conftest.py`.

Run tests: `python -m pytest tests/ -q` (17 tests, all passing).

---

## 3. API Endpoints

| Method | Path | Auth | Purpose |
| :--- | :--- | :---: | :--- |
| POST | `/reports` | — | Submit anonymously. Body: `category`, `description` (10-5000 chars), optional `evidence_url`. Returns the case code **once** (201). |
| GET | `/reports/{case_code}` | — | Track status + public updates. Unknown code → 404 envelope (no enumeration). |
| GET | `/moderator/reports?category=&status=&limit=&offset=` | Bearer | List/filter/paginate. Includes heuristic `priority_score`. |
| GET | `/moderator/reports/{id}` | Bearer | Full report detail. |
| PATCH | `/moderator/reports/{id}/status` | Bearer | Advance workflow. Illegal moves → 409. |
| POST | `/moderator/reports/{id}/updates` | Bearer | Add note (`public` true/false). Only public notes show to reporters. |
| GET | `/moderator/reports/{id}/duplicates` | Bearer | TF-IDF similar reports above threshold. |
| POST | `/suggest/category` | — | ML category suggestion with abstention. |
| GET | `/health`, `/`, `/docs` | — | Meta and Swagger UI. |

Workflow: `SUBMITTED → UNDER_REVIEW → RESOLVED | DISMISSED`. Terminal states are final. Errors use a uniform envelope: `{ "error": ..., "code": ..., "hint": ... }` with correct codes (400/401/404/409/422).

---

## 4. How Anonymity Is Maintained

- The schema has **no reporter columns at all** — no names, emails, IPs, or user agents are stored or logged. Anonymity is structural, not policy.
- The raw case code is returned once and **never stored**; only its SHA-256 hash is kept for lookup. Codes are `WD-` + 10 characters from `secrets` (~62^10 space), so guessing is infeasible.
- Tracking reveals only status, category, timestamp, and moderator-marked-public notes. Internal notes stay hidden.
- There is no list/search endpoint without the moderator key, and unknown codes get an identical 404, so codes cannot be enumerated.

---

## 5. Machine Learning Endpoints

A TF-IDF + LogisticRegression classifier trained on the committed `data/seed_reports.csv` (150 snippets, 30 per category). Measured holdout accuracy (20% split, seed 42): **0.667**. Training takes ~1 second on CPU; the same script runs on Kaggle unchanged.

- `POST /suggest/category` returns `{ label, confidence }`, and **abstains** (`label: null`) below the 0.55 confidence threshold instead of guessing.
- Duplicates use TF-IDF cosine similarity (threshold 0.72, top 3).
- `priority_score` is a documented transparent heuristic (status + length + activity), not a learned value.
- Suggestions never mutate reports. Limits are stated plainly: small seed corpus, short-text domain, retrain with `python scripts/train_model.py` after extending the CSV.

---

## 6. Example Requests and Responses

Submit (anonymous):

```bash
curl -X POST http://localhost:8000/reports \
  -H 'Content-Type: application/json' \
  -d '{"category":"corruption","description":"The tender was awarded to a bidder who quoted double the estimated cost"}'
# 201 {"case_code":"WD-5mYwiXvTwf","status":"SUBMITTED","category":"corruption","created_at":"..."}
```

Track (no identity needed):

```bash
curl http://localhost:8000/reports/WD-5mYwiXvTwf
# 200 {"status":"SUBMITTED","category":"corruption","created_at":"...","updates":[]}
```

Moderate:

```bash
AUTH="Authorization: Bearer $MODERATOR_API_KEY"
curl "http://localhost:8000/moderator/reports?status=SUBMITTED" -H "$AUTH"
curl -X PATCH http://localhost:8000/moderator/reports/1/status \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"UNDER_REVIEW"}'
curl -X POST http://localhost:8000/moderator/reports/1/updates \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"message":"Procurement logs requested.","public":true}'
```

Illegal transition:

```bash
curl -X PATCH http://localhost:8000/moderator/reports/1/status \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"RESOLVED"}'
# 409 {"error":"Illegal transition SUBMITTED -> RESOLVED.","code":"illegal_transition","hint":"Allowed from SUBMITTED: ['UNDER_REVIEW']."}
```

ML suggestion:

```bash
curl -X POST http://localhost:8000/suggest/category \
  -H 'Content-Type: application/json' \
  -d '{"description":"The CCTV camera covering the parking exit has been offline since Tuesday"}'
# 200 {"label":"security","confidence":0.8013,"abstained":false,"hint":"Machine suggestion only; ..."}
```

---

## 7. Assumptions and Design Decisions

- **SQLite file DB**: zero-setup and reviewable; on Render's free tier the disk is ephemeral, so production would point `DATABASE_URL` at persistent Postgres — the SQLAlchemy layer needs no code change.
- **Single moderator key over per-user accounts**: matches the brief (secure moderator access without reporter accounts); rotation = env change. Documented as suitable for recruitment scale, not multi-org RBAC.
- **No pagination on tracking, paginated moderator list**: reporters fetch one case; moderators page through many.
- **Evidence is a URL, not a file upload**: avoids storing user files and keeps anonymityHygiene; upload is listed as a future enhancement.
- **Heuristic priority, learned category**: ranking stays explainable; only classification is learned, and it abstains honestly.
- **Tests use an isolated DB file and key** (`tests/conftest.py`); dev DB (`whistledrop.db`) and artifacts (`models/`) are gitignored.

---

<p align="center">
  <b>WhistleDrop</b> — GDG on Campus SRM Technical Domain, Backend Task 1<br>
  Anonymous by schema, moderated by workflow, assisted by ML
</p>
