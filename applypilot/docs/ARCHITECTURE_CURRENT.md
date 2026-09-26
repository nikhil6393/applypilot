# ApplyPilot — Current Architecture & Baseline Inventory

> **Document Version:** 1.0.0 (Phase 1 Baseline Audit)  
> **Date:** September 18, 2026  
> **Specification Reference:** ApplyPilot Production Architecture & Build Plan v2.0 (§1–§38)  
> **Status:** FROZEN REGRESSION BASELINE — All 18 Test Suites (128 Tests) Passing Green

---

## 1. Executive Summary & Non-Negotiable Constraints

ApplyPilot is a local-first, free, and open-source job & internship intelligence platform. This document establishes the complete structural audit and regression baseline for **Phase 1** prior to any schema, adapter, or micro-package refactoring.

### Non-Negotiable Core Rules:
1. **Zero Mandatory API Keys:** Every feature (discovery, parsing, deterministic scoring, tailoring, tracking) must function locally without any cloud AI or paid API key.
2. **Determinism Over Vibes:** Scoring formulas (ATS Score v2, Fit Score, Deterministic Fit) are versioned mathematical algorithms. LLMs never decide eligibility, dates, or numeric scores.
3. **Preserve, Don't Replace:** All existing user journeys, UI styles, SSE streaming, and REST endpoints remain backward-compatible throughout all migration phases.
4. **Isolate Blast Radius:** Scraper failures must never bring down the web app or other sources. Failures must be explicit, not fabricated.

---

## 2. Frontend Application Map

The user interface is built with **React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, and Motion (Motion 12)**.

### Primary Workflow Navigation (`src/App.tsx` & `src/components/Navbar.tsx`)

| Tab ID | Component | User Journey & Key Capabilities |
| :--- | :--- | :--- |
| `discovery` | `src/components/DiscoveryStep.tsx` | Multi-source real-time search, live SSE stream updates, filters (remote, internships, time window 1h/4h/12h/24h/7d, source toggles, batch filtering), job detail drawer, bookmarking, and bulk-selection. |
| `scoring` | `src/components/ScoringStep.tsx` | Batch deterministic fit evaluation against user resume, score breakdown, auto-select high match postings, guardrail thresholds. |
| `tailor` | `src/components/TailorStep.tsx` | Precision bullet tailoring, targeted keyword matching, LaTeX resume compilation, side-by-side diff review. |
| `apply` | `src/components/ApplyStep.tsx` | Application dispatch, EasyApply bot execution, Playwright autofill automation, batch dispatch celebration. |
| `resume` | `src/components/ResumeStep.tsx` | Multi-format upload (PDF, DOCX, LaTeX, TXT), instant deterministic ATS scoring, keyword cloud, bullet feedback. |
| `tracker` | `src/components/TrackerStep.tsx` | Application kanban/list tracker with status pipeline (`saved`, `applied`, `interviewing`, `offered`, `rejected`). |
| `analytics` | `src/components/AnalyticsDashboard.tsx` | KPI cards, animated SVG skill distribution charts, application funnels, score trajectory visualizers. |
| `settings` | `src/components/SettingsStep.tsx` | Local engine configuration, Ollama endpoint setup, telemetry toggles, export/import data. |

### Supporting UI Elements:
- `JobDetailDrawer.tsx`: Spring-animated slide-over drawer with deep metadata display (salary, visa sponsorship, batch eligibility, full JD).
- `Navbar.tsx`: Spring physics tab switcher with active layout pill, real-time live feed counter, and status indicator.
- `index.css`: Design token architecture, dark mode palette (`--bg-primary: #090d16`, `--accent-primary: #8b5cf6`), and GPU-accelerated motion keyframes.

---

## 3. Comprehensive API Endpoint Contract Map

Mounted in `server/app.ts` and `server.ts` on port 3000:

### 3.1 System, Auth & Configuration
- `GET /api/health` — System status, uptime, server timestamp (`{ status: 'ok', timestamp }`).
- `GET /api/config` — Provider status flags (`hasNvidiaKey`, `hasOpenRouterKey`, `fitThreshold`).
- `POST /api/auth/register` — Local user registration.
- `POST /api/auth/login` — Session authentication.
- `GET /api/auth/session` — Active user session.
- `GET /api/auth/linkedin/url` — LinkedIn OAuth login URL.
- `GET /api/auth/linkedin/callback` — OAuth code exchange.
- `POST /api/auth/linkedin/login` — Direct headless LinkedIn authentication.
- `POST /api/auth/linkedin/disconnect` — Clear LinkedIn session.

### 3.2 Jobs & Discovery
- `GET /api/jobs` — Paginated job listings from database with source, remote, query, and freshness filters.
- `GET /api/jobs/:id` — Retrieve single job posting by canonical ID.
- `GET /api/jobs/stream-search` — Real-time Server-Sent Events (SSE) discovery stream from all active sources.
- `POST /api/jobs/scrape-linkedin` — Direct LinkedIn guest scraper endpoint with time-window, remote, and experience parameters.
- `POST /api/jobs/scrape-naukri` — Direct Naukri search endpoint.
- `POST /api/jobs/scrape-url` — Precision single URL scraper (Greenhouse, Lever, Ashby, or generic ATS).
- `POST /api/jobs/ingest` — Ingestion endpoint for external scrapers (`received`, `valid`, `inserted`).
- `GET /api/jobs/background/status` — Status of background scraping orchestrator and TTL cache stats.
- `POST /api/jobs/background/start` — Start background recurring scrape cycles.
- `POST /api/jobs/background/stop` — Stop background scraping.
- `POST /api/jobs/background/trigger` — Trigger immediate asynchronous multi-source scrape.

### 3.3 Resume Intelligence & ATS Scoring
- `POST /api/resume/parse` — Parse resume from text, base64 PDF, DOCX, or LaTeX; sanitizes and normalizes into `ParsedResume`.
- `GET /api/resume` — Get currently uploaded active candidate resume.
- `POST /api/resume/ats` / `POST /api/resume/ats-score` — Deterministic ATS resume evaluation returning score (0–100), categories, action verb count, and metrics feedback.
- `GET /api/resume/ats` — Score currently loaded resume in session.
- `POST /api/resume/score/full` — Deep ATS audit report.
- `GET /api/resume/templates` — List available ATS-compliant resume templates.
- `POST /api/resume/targeted-match` — TF-IDF cosine similarity between resume and job description.
- `POST /api/resume/magic-write` — Power-verb and bullet phrasing assistant.
- `POST /api/resume/autofix` — Truth-anchored resume improvement diff (never auto-saved).

### 3.4 Fit Scoring & Tailoring
- `POST /api/scoring/fit-score` — Compute match score and skill overlap for single job against active resume.
- `POST /api/scoring/batch-fit-score` — Batch scoring across multiple jobs.
- `POST /api/tailor/tailor` — Generate tailored bullets and LaTeX document for target job.
- `POST /api/resume/tailor/bulk` — Start bulk-tailoring queue batch.
- `GET /api/resume/tailor/bulk/:batchId/stream` — SSE stream for bulk-tailoring progress.
- `GET /api/resume/tailor/bulk/:batchId` — Fetch bulk-tailoring batch results.

### 3.5 Applications Tracker & Automation
- `GET /api/tracker` — List tracked applications (`{ items, count }`).
- `POST /api/tracker` — Create new application record.
- `PATCH /api/tracker/:id` — Update application status (`saved`, `applied`, `interviewing`, etc.).
- `DELETE /api/tracker/:id` — Remove application record.
- `POST /api/apply/easy-apply` — Headless LinkedIn Easy Apply execution.
- `POST /api/apply/autofill` — Playwright browser form autofill.
- `POST /api/apply/submit` — Submit application package.
- `GET /api/audit-logs` — Audit log trail of all automated actions.

---

## 4. Multi-Source Scraping Layer Map

ApplyPilot integrates 13 live sources using isolated scraping adapters:

| Source ID | Implementation File | Extraction Mechanism | Rate Limit & Polling Policy |
| :--- | :--- | :--- | :--- |
| `linkedin` | `server/scrape/linkedin-realtime.ts` | Public guest endpoint (`/jobs-guest/jobs/api/seeMoreJobPostings/search`), exact `f_TPR`, `sortBy=DD`, `f_E` mapping. | Circuit breaker: 5 consecutive failures triggers backoff; TTL cache 3m. |
| `naukari` | `server/scrape/naukri-advanced.ts` | High-throughput JSON API integration (`naukri.com/jobapi/v3/search`). | 1.5s delay between pages; max 50 jobs per query. |
| `greenhouse` | `server/scrape/greenhouse.ts` | Official public boards API (`boards-api.greenhouse.io/v1/boards/{company}/jobs`). | Chunked batches of 10 parallel boards; 6s timeout. |
| `lever` | `server/scrape/lever.ts` | Official postings API (`api.lever.co/v0/postings/{company}`). | Chunked batches of 8 parallel companies; 6s timeout. |
| `ashby` | `server/scrape/ashby.ts` | Official posting API (`api.ashbyhq.com/posting-api/job-board/{company}`). | Chunked batches of 8 parallel companies; 6s timeout. |
| `weworkremotely`| `server/scrape/weworkremotely.ts` | Live RSS XML feed parser (`weworkremotely.com/categories/...rss`). | 3m TTL cache; parsed with Cheerio. |
| `yc` | `server/scrape/yc.ts` | Official Hacker News / Y Combinator Firebase API (`jobstories.json`). | Top 30 stories fetched in parallel chunks of 10. |
| `remoteok` | `server/scrape/remoteok.ts` | Public JSON endpoint (`remoteok.com/api`). | Cached 3m TTL; user-agent headers. |
| `remotive` | `server/scrape/remotive.ts` | Public API (`remotive.com/api/remote-jobs`). | Cached 3m TTL; category filtering. |
| `arbeitnow` | `server/scrape/arbeitnow.ts` | Public API (`arbeitnow.com/api/job-board-api`). | Cached 3m TTL. |
| `himalayas` | `scraper_daemon.py` / orchestrator | Himalayas public remote API. | 5m TTL. |
| `jobicy` | `server/scrape/jobicy.ts` | Public API feed. | 5m TTL. |
| `freehire` | `server/scrape/freehire.ts` | Public job feed. | 5m TTL. |

---

## 5. Document Parsers & Normalization Engine

1. **DOCX Parser:** Uses `mammoth` to extract clean semantic HTML and plain text from Word documents.
2. **PDF Parser:** Uses `pdf-parse` (pdf.js binary engine) to extract raw text buffers.
3. **LaTeX Sanitizer:** `server/ai/resume-parser.ts` (`latexToPlainText`) strips TeX formatting commands while preserving hyperlinks, subheadings, and bullet hierarchies (`\href`, `\item`, `\section`).
4. **Heuristic Resume Parser:** Regular expressions and dictionary lookups extract emails, phones, URLs, dates, GitHub/LinkedIn links, institutions, degrees, and technical skills without requiring external APIs.
5. **Job Normalizer (`server/scrape/normalize.ts`):** Normalizes raw postings into canonical structures; extracts seniority (`principal`, `senior`, `mid`, `entry`), benefits (health, 401k, remote, PTO), experience requirements, and salary ranges.
6. **Metadata Extractor (`server/scrape/metadata-extractor.ts`):** Universal regex engine detecting visa sponsorship policy and student graduation batches (`2024`–`2028`).

---

## 6. Database, Persistence & Caching

### SQLite Engine (`better-sqlite3` + `drizzle-orm`)
- **Database Path:** Configurable via `process.env.DB_PATH` (defaults to `./data/applypilot.db`, test isolated to `./data/test-*.db`).
- **Core Tables:**
  - `jobs`: Cached and ingested job postings with unique constraints on source + URL.
  - `candidate_profiles`: User profile data and preferences.
  - `resume_versions`: Historical snapshots of resumes and scores.
  - `ats_scores`: Versioned audit scores.
  - `applications`: Tracked job applications and state machine history.
  - `audit_events`: Security and operational audit log.

### Caching Architecture
- **In-Memory TTL Scrape Cache (`server/scrape/cache.ts`):** Thread-safe LRU cache with SHA-1 parameter keys, 3-minute default TTL, hit/miss metrics, and automatic memory eviction.
- **Job Cache:** 24-hour retention in SQLite for historical job queries.

---

## 7. Environment Variables Map

| Variable Name | Default Value | Purpose & Constraints |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port for unified Vite + Express application. |
| `NODE_ENV` | `development` | Set to `production` for containerized runs or `test` for Vitest runs. |
| `DB_PATH` | `./data/applypilot.db` | Local SQLite database file path. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | CORS allowed origins. |
| `SCRAPE_TIMEOUT_MS` | `15000` | Outbound request timeout for scraping adapters. |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local self-hosted Ollama AI endpoint (optional enhancement). |
| `OLLAMA_MODEL` | `llama3.2:latest` | Default local LLM model name. |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Default local embedding model name. |
| `NVIDIA_API_KEY` | *(optional)* | Fallback cloud AI key (NEVER required; system runs 100% offline). |
| `OPENROUTER_API_KEY` | *(optional)* | Fallback cloud AI key (NEVER required; system runs 100% offline). |

---

## 8. Complete Test Inventory (Regression Suite)

As of Phase 1 Freeze, **18 test files (128 tests)** run and pass 100% green via `npx vitest run`:

| # | Test File Path | Tests | Covered Capabilities |
| :---: | :--- | :---: | :--- |
| 1 | `server/tests/characterization.test.ts` | 14 | **Phase 1 Endpoints Freeze:** `/health`, `/config`, `/jobs`, `/jobs/background/status`, `/jobs/ingest`, `/resume/parse`, `/resume/ats`, `/scoring/fit-score`, `/scoring/batch-fit-score`, `/tailor/tailor`, `/tracker`, `/profile`. |
| 2 | `server/tests/scrapers.test.ts` | 21 | Canonical ID extraction, zero-fake-data integrity, TTL scrape cache, metadata extractor (visa/cohort), WWR RSS, YC Firebase API, and background orchestrator controls. |
| 3 | `server/tests/advanced-filters.test.ts` | 38 | Scrape request filtering, keywords exclusion, skill matching, seniority precedence, salary bounds, benefits regex, experience extraction, and sorting. |
| 4 | `server/tests/filter-enforcement.test.ts` | 8 | Strict validation of location, remote-only, posting age, and internship tags. |
| 5 | `server/tests/validator.test.ts` | 6 | Job posting schema sanitization, mandatory field validation, and metadata preservation. |
| 6 | `server/tests/routes.test.ts` | 6 | Base route integration for health, config, resume parsing, fit scoring, and jobs listing. |
| 7 | `server/tests/tailor-and-routes.test.ts` | 5 | End-to-end resume tailoring against real JD, skill extraction, and route integration. |
| 8 | `server/tests/store.test.ts` | 3 | SQLite persistence, job upsertion, and deduplication keys. |
| 9 | `server/tests/fit.test.ts` | 5 | Deterministic Fit Score v1 calculation, weights, and skill overlap. |
| 10 | `server/tests/tfidf.test.ts` | 5 | Tokenization, TF-IDF vectorization, and cosine similarity calculations. |
| 11 | `server/tests/ai-heuristic.test.ts` | 4 | Offline heuristic fallback chain for resume parsing and analysis. |
| 12 | `server/tests/latex-parser.test.ts` | 1 | LaTeX tag stripping while preserving links and section hierarchies. |
| 13 | `server/tests/latex-resume.test.ts` | 1 | LaTeX resume document compilation and rendering. |
| 14 | `server/tests/resume-parser.test.ts` | 4 | Multi-format resume parsing across text, PDF, and DOCX buffers. |
| 15 | `server/tests/normalize.test.ts` | 1 | Normalization pipeline and UUID assignment. |
| 16 | `tests/deterministic-scoring.test.ts` | 2 | Standalone deterministic ATS scoring verification. |
| 17 | `tests/application-engine.test.ts` | 3 | Application status transitions and submission engine. |
| 18 | `tests/tailor-engine.test.ts` | 1 | Truth-anchored tailoring validation without hallucinated facts. |

---

## 9. Phase 1 Sign-Off & Verification

- **TypeScript Compilation:** `npm run typecheck` exits 0 (0 errors).
- **Unit & Integration Tests:** `npx vitest run` exits 0 (128/128 passed).
- **Runtime Dev Server:** Running on `http://localhost:3000` with active Vite HMR and background monitoring.
- **Regression Freeze Status:** APPROVED. Ready for Phase 2 Domain Contracts (`packages/domain` and `packages/config`).
