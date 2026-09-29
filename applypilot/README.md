# 🚀 ApplyPilot — 100% Free & Deterministic Job Application Platform

> **Free, Private & Offline-First Commercial SaaS Platform** for real-time job scraping, universal resume parsing (including LaTeX `.tex`), Resume-Worded-grade ATS Quality & Telemetry Scoring, deterministic job tailoring, and high-conversion application workflows across LinkedIn, Naukri, Greenhouse, Lever, Ashby, and Remote boards.
> 
> **Zero LLM Hallucinations · Zero Paid API Keys · 100% Deterministic & Private.**

---

## 🌟 Key Capabilities

### 1. 📊 Resume Studio & 16-Rule ATS Scorer (0–100)

ApplyPilot features a fully deterministic, offline ATS scorer inspired by Resume Worded:
- **Instant Compatibility Grading**: Accurate, reproducible score (0–100) based on mathematical rules.
- **4 Core ATS Telemetry Categories**:
  1. **Impact (35% weight)**: Analyzes quantifiable metrics (%, $, scale, users), strong action verbs, and flags passive/weak openers (`Responsible for`, `Worked on`, `Helped`).
  2. **Brevity (25% weight)**: Checks bullet lengths (8–30 words), bullets per role (3–6), and strips filler words (`in order to`, `various`, `successfully`).
  3. **Style (20% weight)**: Detects buzzwords (`synergy`, `rockstar`, `innovative mindset`), removes first-person pronouns (`I`, `my`), enforces tense consistency (present for current roles, past for previous roles), and monitors repetitive vocabulary.
  4. **Sections (20% weight)**: Verifies contact information (email, phone, location, LinkedIn/GitHub), essential sections (Experience, Education, Skills), and standard ATS headings.
- **1-Click Deterministic Fixes**: Fix weak openers, strip filler words, remove buzzwords, and add missing sections in one click with zero network delay and zero hallucinated credentials.

### 2. 🎯 Truth-Anchored Deterministic Tailoring Engine

- **Skills Taxonomy & Alias Mapping**: Pre-compiled dictionary recognizing 40+ canonical technologies and hundreds of aliases (`k8s` → `Kubernetes`, `ts` → `TypeScript`, `postgres` → `PostgreSQL`).
- **Keyword Gap Analytics**: Identifies matched skills and missing job requirements without calling any paid external APIs.
- **Truthful Bullet Alignment**: Re-ranks the candidate's authentic experience bullets by relevance to the target job description. Never invents facts, metrics, or employers.
- **Custom Cover Notes**: Generates concise, professional application notes tailored to the exact role and company using real resume data.

### 3. ⚡ Zero-Login Real-Time Multi-Platform Scrapers

- **LinkedIn Real-Time Guest Scraper**: Extracts live postings with sub-minute precision (`"just now"`, `"1m ago"`, `"15m ago"`, `"1h ago"`) without requiring any LinkedIn account credentials.
- **Naukri Real-Time Engine**: Dedicated aggregator & live scraper for tech hubs across India and remote postings.
- **Top ATS Direct APIs**: Parallel direct querying across Greenhouse, Lever, Ashby, RemoteOK, Remotive, and Himalayas.
- **Precision URL & JD Scraper**: 1-click scraper for any custom LinkedIn, Naukri, or job board URL / raw JD text.

### 4. 📡 Background Monitoring & SSE Streaming Engine

- **Automated Background Worker**: Runs background polling every 60 seconds.
- **Server-Sent Events (SSE)**: Streams live job alerts (`/api/monitor/stream`) and pushes new postings directly to the user's feed in real-time.

### 5. 📄 Universal Document Parser & Native LaTeX (`.tex`) Support

- **Universal Formats**: Ingests `.tex`, `.latex`, `.pdf`, `.docx`, `.doc`, `.txt`, `.md`, `.rtf`.
- **Intelligent TeX Sanitizer**: Strips LaTeX commands while preserving hyperlinks and bullet hierarchy.
- **Fast Local Parsing**: 100% offline, local parsing with sub-second response times.

### 6. 📄 Document Exporter

- **Export Formats**:
  - 🌟 **LaTeX Source (Jake's Resume)**: Clean single-column `.tex` code output favored by tech recruiters.
  - 📄 **Plain Text / DOCX**: Universal ATS-friendly format without complex tables or columns.
  - 🌐 **HTML Bundle**: Semantic web version.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion, Vite.
- **Backend**: Node.js, Express, TypeScript (via `tsx`), Server-Sent Events (SSE).
- **Scraping & Parsing**: Cheerio, Mammoth (DOCX), PDF-Parse, Custom TeX AST Sanitizer.
- **Scoring & Tailoring**: Local deterministic rule-based algorithms (`src/lib/resumeScore`, `src/lib/tailor`), skills taxonomy.
- **Database / Cache**: In-memory job cache + SQLite persistent store.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm

### Installation & Run

1. Clone the repository and navigate into `applypilot`:

```bash
cd applypilot
npm install
```

2. Start the application:

```bash
npm run dev
```

3. Open your browser:

```
http://localhost:3000
```

---

## 📡 API Endpoints Reference

### Resume & ATS Scoring
- `POST /api/resume/parse`: Universal parser (PDF, DOCX, LaTeX `.tex`, text) returning structured JSON.
- `GET /api/resume/ats`, `POST /api/resume/ats`: Evaluates ATS score (0–100), category breakdown, and improvement suggestions.

### Fit Scoring & Tailoring
- `POST /api/jobs/fit-score`: Computes deterministic candidate-job fit score (0–100).
- `POST /api/jobs/tailor`: Generates tailored resume bullets, cover note, and ATS optimization tips.

### Real-Time Scraping & Monitoring
- `POST /api/jobs/scrape-linkedin`: Scrapes live LinkedIn postings with zero credentials.
- `POST /api/jobs/scrape-naukri`: Real-time scraper for Naukri positions.
- `GET /api/jobs/stream-search`: Server-Sent Events (SSE) parallel multi-board streaming search.
- `POST /api/jobs/scrape-url`: Precision parser for custom job URLs or raw JD text.
- `GET /api/monitor/status`: Returns background monitoring worker status.
- `GET /api/monitor/stream`: Real-time SSE stream broadcasting newly discovered postings.

---

## 🛡️ Privacy, Security & Determinism

- **100% Free**: No subscriptions, no paid token costs, no hidden credit cards.
- **No Third-Party AI APIs**: Your resume data is never sent to OpenAI, Anthropic, Google, or any external LLM provider.
- **Truth Anchoring**: All suggestions and tailor actions preserve candidate truth without hallucinating metrics, companies, or credentials.
