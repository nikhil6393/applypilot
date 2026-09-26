# ApplyPilot (PRO MAX) — Complete Project Documentation

> **AI-Powered Real-Time Job & Internship Automation Platform**  
> Discovers live openings, computes ATS compatibility, tailors resumes with truth-anchored AI, auto-applies with guardrails, and tracks applications end-to-end.

---

## 1. Executive Summary

**ApplyPilot** solves the most critical pain points in modern tech job hunting and internship discovery:
1. **Scraper Blindspots Solved**: Replaces naive keyword matching with hierarchical geo-resolution (Bangalore, Pune, Hyderabad, NCR ↔ India) and anti-authwall search dorking.
2. **Career Page Retention**: Decouples strict 24h limits from company ATS boards (Greenhouse, Lever, Ashby) so active internships (open 2–6 weeks) are never discarded.
3. **100% Privacy & Zero-Login Scraping**: Connects directly to public endpoints and index caches without requiring user account credentials, cookies, or passwords.
4. **Local Deterministic AI**: Resume scoring, TF-IDF cosine relevancy, and XYZ bullet tailoring run locally without sending candidate data to external third-party LLMs.

---

## 2. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript 5.8 |
| **Styling & Design System** | Tailwind CSS v4, Vanilla CSS Custom Properties, 3D Glassmorphism |
| **Animation & 3D WebGL** | Motion (Framer Motion 12), Three.js 0.186, Lucide React Icons |
| **Build & Dev Tooling** | Vite 6.2, TSX (Node.js TypeScript execution), ESLint 9 |
| **Backend Server** | Express 4.21, Server-Sent Events (SSE), Cheerio, Better-SQLite3 |
| **Database & ORM** | SQLite (`data/applypilot.db`), Drizzle ORM |
| **Testing** | Vitest 5.0 (30 suites, 230 tests passing), Playwright |

---

## 3. End-to-End User Workflow (6 Core Modules)

ApplyPilot guides the candidate through a seamless 6-step lifecycle:

```
[ 1. Dashboard ] ➔ [ 2. Live Jobs ] ➔ [ 3. Fit Score ] ➔ [ 4. Bulk Tailor ] ➔ [ 5. Auto Apply ] ➔ [ 6. Tracker ]
```

### Module 1: Dashboard & Market Intelligence (`AnalyticsDashboard.tsx`)
- **Live Hiring Radar**: Dynamic real-time nodes displaying hiring velocity and active scraping status.
- **Application Metrics**: Total discovered jobs, submissions, interview conversion rate, and 7-day velocity.
- **Fit-Score Distribution**: Interactive distribution curves (90%+ Super Match, 80–89% Strong Match, <80%).
- **Salary Benchmarks**: Market compensation bands for Indian tech hubs (INR/month) and US/Global remote ($/yr).

### Module 2: Multi-Platform Live Discovery Engine (`DiscoveryStep.tsx`)
- **Real-Time SSE Streaming**: Jobs stream in one-by-one from live background scrapers.
- **Hierarchical Regional Hot Hubs**:
  - `🇮🇳 India (All)`: Discovers jobs in Bangalore, Hyderabad, Pune, Mumbai, Delhi NCR, Gurgaon, Noida, Chennai, Kolkata.
  - `📍 Bangalore`, `📍 Hyderabad`, `📍 Delhi NCR`, `📍 Pune`
  - `🌐 Remote Worldwide`
  - `🇺🇸 United States`: SF Bay Area, NYC, Seattle, Austin, etc.
- **Multi-Source Ingestion**:
  - *LinkedIn Live*, *Internshala Live*, *Unstop Campus*, *Simplify / Tech Intern*, *Naukri Live*, *Greenhouse*, *Lever*, *Ashby*, *RemoteOK*, *Himalayas*, *Jobicy*, *Arbeitnow*, *YC / HackerNews*.
- **Freshness Tagging**:
  - `⚡ Just Now` (<1 min, animated pulse)
  - `⚡ X min ago` (1–59 min)
  - `🕒 X hrs ago` (1–23 hr)
  - `📅 X days ago` (1–45 days active hiring)
- **Precision Custom Scraper**: Paste any raw URL or job description text to parse and ingest instantly.

### Module 3: Matchmaking & ATS Fit-Scoring (`ScoringStep.tsx`)
- **4-Vector Fit Algorithm**:
  1. Hard Skill Keyword Match (40% weight)
  2. Experience Level & College Batch (25% weight)
  3. Domain & Tech Stack Alignment (20% weight)
  4. Education & Certifications (15% weight)
- **Keyword Gap Visualizer**: Pinpoints exact missing keywords required for 95%+ ATS compatibility.
- **Batch Selection**: One-click select of all high-match positions for automated tailoring.

### Module 4: Resume Studio & Tailoring (`TailorStep.tsx` / `ResumeBuilderEditor.tsx`)
- **Anti-Hallucination Engine**: Strictly restructures candidate facts without inventing experiences or skills.
- **Google XYZ Achievement Formula**: Formats bullets as: *"Accomplished [X], as measured by [Y], by doing [Z]"*.
- **Interactive Action-Verb Rewriter**: Suggests high-impact engineering verbs (*Orchestrated*, *Engineered*, *Scaled*).
- **LaTeX Compiler**: Outputs single-column, ATS-proof LaTeX code ready for Overleaf sync or instant PDF download.

### Module 5: Auto-Apply Dispatcher (`ApplyStep.tsx`)
- **Safety Guardrails**: Configurable minimum match score (e.g. 80%) and batch limit (e.g. 15 jobs/batch).
- **Automated Cover Pitch**: Drafts personalized emails highlighting relevant skills for hiring managers.
- **LinkedIn Easy Apply Integration**: Pre-fills fields for supported platforms.

### Module 6: Application Tracker (`TrackerStep.tsx`)
- **Dual Views**: Kanban Drag-and-Drop Board and dense sortable Table.
- **Lifecycle Stages**: `Discovered` ➔ `Applied` ➔ `Interviewing` ➔ `Offered` ➔ `Rejected` ➔ `Archived`.
- **Management**: Track interview dates, recruiter contacts, salary offers, and follow-up notes.

---

## 4. Scraping & Ingestion Architecture

```
server/scrape/
├── geo-resolver.ts         # Hierarchical city-state-country-remote location resolver
├── company-directory.ts    # 350+ top tech companies (Indian unicorns & global tech leaders)
├── linkedin-realtime.ts    # Real-time LinkedIn guest API scraper with circuit breaker
├── linkedin-dork.ts        # Search engine index dorking fallback (site:linkedin.com/jobs/view/)
├── internshala.ts          # Internshala tech internship scraper (Web, Python, AI/ML, Mobile)
├── unstop.ts               # Unstop campus drives & hiring challenges scraper
├── simplify-jobs.ts        # SimplifyJobs / PittCSC verified direct career page internships
├── greenhouse.ts           # Greenhouse ATS API integration (relaxed 45d window)
├── lever.ts                # Lever Board scraper (relaxed 45d window)
├── ashby.ts                # Ashby API scraper (relaxed 45d window)
├── naukri-advanced.ts      # Naukri search API scraper
├── himalayas.ts            # Himalayas remote tech jobs API
├── jobicy.ts               # Jobicy remote jobs feed
├── remoteok.ts             # RemoteOK live API
├── arbeitnow.ts            # Arbeitnow European & remote tech jobs
├── weworkremotely.ts       # WeWorkRemotely RSS feed
├── yc.ts                   # Y Combinator / HackerNews hiring feed
├── validator.ts            # Data integrity, student role classification, schema validation
└── orchestrator.ts         # Central scraper runner & background polling coordinator
```

### Core Innovations:
- **Hierarchical Geo-Resolver**: Normalizes locations so searching "India" matches Bangalore, Pune, Hyderabad, Mumbai, etc.
- **Authwall Evasion**: If LinkedIn returns HTTP 429 or authwall, the system automatically falls back to search engine caches (`site:linkedin.com/jobs/view/`).
- **Decoupled ATS Lifetime**: Recognizes that enterprise internship postings remain active for weeks; classifies them with freshness badges rather than dropping them.
- **Expanded Student Taxonomy**: Matches *Graduate Engineer Trainee*, *Associate SDE - Campus*, *Apprentice*, *Fellow*, and *Working Student*.

---

## 5. Monorepo Package Breakdown

```
packages/
├── domain/        # Core interfaces and Zod schemas (JobPosting, ParsedResume, TailoredDocument)
├── parsing/       # PDF, DOCX, TXT, LaTeX resume parser extracting contact info, skills, experience
├── scoring/       # ATS scoring engine, TF-IDF cosine relevancy, skill gap analysis, XYZ formula
├── ai-local/      # Privacy-first local heuristics for bullet rewriting & resume tailoring
├── scraping/      # Shared scraper contracts and adapter interfaces
├── security/      # Rate-limiting, request sanitization, and salted scrypt password hashing
├── db/            # Drizzle ORM schema definitions and Better-SQLite3 connection
└── config/        # Environment and global configuration tokens
```

---

## 6. Server REST & Streaming API Endpoints

### Job Endpoints (`server/routes/jobs.ts`)
- `GET /api/jobs/stream-search` — Server-Sent Events (SSE) live streaming search.
- `GET /api/jobs` — Retrieve stored jobs with filter, search, and pagination.
- `POST /api/jobs/scrape-linkedin` — Trigger LinkedIn real-time scraper.
- `POST /api/jobs/scrape-naukri` — Trigger Naukri real-time scraper.
- `POST /api/jobs/scrape-url` — Extract and ingest job from direct URL or pasted text.
- `GET /api/jobs/sources/health` — Check latency and operational health of all scrapers.

### Resume & Tailoring Endpoints (`server/routes/resume.ts`, `scoring.ts`, `tailor.ts`)
- `POST /api/resume/parse` — Parse resume files into structured JSON.
- `GET /api/resume/ats` — Calculate 100/100 ATS compatibility score.
- `POST /api/resume/targeted-match` — Compute TF-IDF match score against a job.
- `POST /api/resume/export/latex` — Export resume to sanitized LaTeX code.
- `POST /api/scoring/fit-score` — Score a single job against resume.
- `POST /api/scoring/batch-fit-score` — Score multiple jobs in batch.
- `POST /api/tailor/tailor` — Generate tailored resume bullet points.

### Application Tracker Endpoints (`server/routes/tracker.ts`)
- `GET /api/tracker` — List all tracked applications.
- `POST /api/tracker` — Add application record.
- `PATCH /api/tracker/:id` — Update stage, status, dates, or notes.
- `DELETE /api/tracker/:id` — Remove an application record.

---

## 7. Verification & Quality Assurance

- **Vitest Unit & Integration Suites**: **30 test files, 230 tests passing (100% Green)**.
- **Advanced Scraper Test Suite**: **11 / 11 tests passing** (`server/tests/scrapers-advanced.test.ts`).
- **TypeScript Typecheck**: `tsc --noEmit` passing with **0 errors**.
- **ESLint Quality Check**: Passing with **0 warnings and 0 errors**.
- **Browser Runtime Testing**: Verified in **Brave Browser** (`brave.exe`), successfully discovering **60 live postings** across LinkedIn, Unstop, Tech Interns, Direct ATS, and Naukri.

---

## 8. How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the local server & Vite development frontend
npm run dev
# -> Server running on http://localhost:3000

# 3. Run typecheck
npm run typecheck

# 4. Run automated test suites
npm test

# 5. Build production bundle
npm run build
```
