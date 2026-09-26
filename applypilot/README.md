code# 🚀 ApplyPilot — Commercial AI Real-Time Job & Internship Automation Platform

> **Production-Ready Commercial SaaS Platform** for real-time job scraping, universal resume parsing (including LaTeX `.tex`), instant ATS Quality & Health Scoring, deterministic fit scoring, and high-conversion application workflows across LinkedIn, Naukri, Greenhouse, Lever, Ashby, and Remote boards.

---

## 🌟 Key Features

### 1. ⚡ Zero-Login Real-Time Multi-Platform Scrapers

- **LinkedIn Real-Time Guest Scraper**: Extracts live postings with sub-minute precision (`"just now"`, `"1m ago"`, `"15m ago"`, `"1h ago"`) and applicant counts without requiring any LinkedIn account credentials.
- **Naukri Real-Time Engine**: Dedicated aggregator & live scraper for tech hubs across India and remote postings.
- **Top ATS Direct APIs**: Parallel direct querying across Greenhouse, Lever, Ashby, RemoteOK, Remotive, and Himalayas.
- **Precision URL & JD Scraper**: 1-click scraper for any custom LinkedIn, Naukri, or job board URL / raw JD text.

### 2. 📡 Background Monitoring & SSE Streaming Engine

- **Automated Background Worker**: Runs background polling every 60 seconds.
- **Server-Sent Events (SSE)**: Streams live job alerts (`/api/monitor/stream`) and pushes new sub-minute postings directly to the user's feed in real-time.

### 3. 📄 Universal Document Parser & Native LaTeX (`.tex`) Support

- **Universal Formats**: Ingests `.tex`, `.latex`, `.pdf`, `.docx`, `.doc`, `.txt`, `.md`, `.rtf`, `.png`, `.jpg`.
- **Intelligent TeX Sanitizer**: Strips LaTeX commands (`\documentclass`, `\section`, `\textbf`, `\item`, `\begin{document}`, custom macros) while preserving hyperlinks (`\href{url}{text}`) and bullet hierarchy.
- **Hybrid AI + Heuristic Fallback**: 100% reliable extraction with sub-second response times even offline.

### 4. 📊 Real-Time ATS Resume Quality & Health Scorer (0–100)

- **Instant Compatibility Grading**: Assigns color-coded grades (`A+ Top 5% ATS Ready`, `A Strong ATS Compatibility`, `B`, `C`, `D`).
- **4 Comprehensive Grading Categories (Max 25 pts each)**:
  1. **ATS Contact & Structure (25 pts)**: Name, email, phone, location, LinkedIn, GitHub, education, and experience.
  2. **Action Verbs & Impact (25 pts)**: Detects high-impact engineering verbs (_Architected, Spearheaded, Optimized, Engineered, Scaled, Deployed_).
  3. **Quantifiable ROI & Metrics (25 pts)**: Scans for numbers, percentages (`%`), latency scale (`ms`), throughput, and user scale metrics.
  4. **Keywords & Tech Depth (25 pts)**: Analyzes hard skill coverage across languages, frameworks, databases, and developer tools.
- **Bullet-Level ATS Inspector & 1-Click Auto-Enhancer**: Automatically transforms passive bullets into active, metric-driven achievements for 98+ score.

### 5. ✏️ Interactive Resume Builder

- **Full Visual Editor**: Live CRUD editor for Personal Details, Contact Links, Experience, Education, Projects, and Categorized Skills.
- **Real-Time ATS Sync**: Instant recalculation of the ATS score on every keystroke.
- **Dynamic Content Modifiers**: 1-click bullet point add/remove with power verb suggestions.

### 6. 📄 Live Document Preview & Multi-Template Exporter

- **4 Professional Recruiter-Vetted Templates**:
  - 🌟 **Modern Tech**: Clean grid layout with skill badge pills.
  - 🏛️ **Harvard Classic**: Elegant academic serif formatting favored for finance, consulting, and research.
  - ⚡ **Silicon Valley**: High-density format preferred by top venture-backed startups.
  - 📑 **LaTeX Source**: Raw `.tex` code output for Overleaf with 1-click clipboard copy.
- **Export Options**: 1-Click **Download PDF / Print**, **Copy .tex Code**, and **Copy Markdown**.

### 7. 🎯 Local Machine Learning Job Tailoring Engine (No Paid APIs)

- **Inspired by `varunr89/resume-tailoring-skill`**:
  - **Sublinear TF-IDF Vectorizer & Cosine Similarity**: Computes semantic match scores between the candidate profile and target job descriptions locally.
  - **BM25 & 400+ Skill Dictionary**: 1-gram, 2-gram, and 3-gram skill extraction.
  - **Truthfulness-Guaranteed Bullet Tailoring**: Rephrases existing candidate achievements using target JD keywords without generating hallucinated credentials.
  - **Matched vs. Missing Keyword Analytics**: Visual interactive keyword chips with 1-click skill addition.

### 8. 🔍 Discovery Engine with Strict Filter Exclusivity & Dynamic Live Counters

- **Live Tab Counters**: Each filter tab computes and renders its live count dynamically (`All Jobs`, `Just Posted (<1h)`, `Past 24h`, `Few Applicants (<10)`, `Internships`).
- **Header Synchronization**: Subheader strictly mirrors active tab category and count.
- **Worldwide & Remote Presets**: `Anywhere / Global` and `Remote` presets query worldwide global listings and remote flags.

### 6. 🧠 6-Step End-to-End Workflow

1. **Resume**: Universal upload, LaTeX extraction, ATS quality scoring, and profile verification.
2. **Discovery**: Live multi-board search, sub-minute filters, and background monitoring.
3. **Scoring**: Deterministic 0–100 fit scoring based on skill overlap, recency, and experience.
4. **Tailor**: AI-tailored resume bullets and customized cover notes.
5. **Apply**: Fast apply packets, direct links, and pre-copied clipboard notes.
6. **Tracker**: Application tracking dashboard with status updates and timestamps.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend**: Node.js, Express, TypeScript (via `tsx`), Server-Sent Events (SSE).
- **Scraping & Parsing**: Cheerio, Mammoth (DOCX), PDF-Parse, Custom TeX AST Sanitizer.
- **AI & Scoring**: NVIDIA NIM, OpenRouter, and local deterministic heuristic algorithms.
- **Database / Cache**: In-memory 24h job cache + SQLite persistent store.

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

2. (Optional) Configure environment variables:
   Create a `.env` file in the `applypilot` directory:

```env
PORT=3000
OPENROUTER_API_KEY=your_openrouter_api_key   # Optional
NVIDIA_API_KEY=your_nvidia_api_key           # Optional
```

3. Start the application:

```bash
npm run dev
```

4. Open your browser:

```
http://localhost:3000
```

---

## 📡 API Endpoints Reference

### Resume & ATS Scoring

- `POST /api/resume/parse`: Universal parser (PDF, DOCX, LaTeX `.tex`, text, images) returning structured JSON + ATS Report.
- `POST /api/resume/ats-score`: Evaluates ATS score (0–100), category breakdown, strengths, and improvement suggestions.

### Real-Time Scraping & Monitoring

- `POST /api/jobs/scrape-linkedin`: Scrapes live LinkedIn postings with zero credentials.
- `POST /api/jobs/scrape-naukri`: Real-time scraper for Naukri positions.
- `GET /api/jobs/stream-search`: Server-Sent Events (SSE) parallel multi-board streaming search.
- `POST /api/jobs/scrape-url`: Precision parser for custom job URLs (LinkedIn, Naukri, Greenhouse, Lever, Ashby) or raw JD text.
- `GET /api/monitor/status`: Returns background monitoring worker status.
- `GET /api/monitor/stream`: Real-time SSE stream broadcasting newly discovered postings.
- `POST /api/monitor/trigger`: Manually triggers an immediate background scrape cycle.

### Fit Scoring & Tailoring

- `POST /api/jobs/fit-score`: Computes deterministic candidate-job fit score (0–100).
- `POST /api/jobs/tailor`: Generates tailored resume bullets, cover note, and ATS optimization tips.

---

## 🛡️ Security & Commercial Stability

- **Zero-Login Architecture**: All scraping operates safely via guest endpoints without credential risk.
- **Input Sanitization**: LaTeX macros, SQL characters, and oversized uploads (>20MB) are safely sanitized and bounded.
- **Rate-Limiting & Anti-Ban**: Exponential backoff retries, user-agent rotation, and request caching.
- **Truth-Anchored Fallback**: Every AI component has deterministic offline heuristic fallbacks to guarantee 100% uptime.

---

## 🧪 Testing & Validation

```bash
# Type-check TypeScript across the entire project
npx tsc --noEmit

# Run unit and integration tests
npm test
```

---

## 📄 License

MIT License © ApplyPilot Team. All rights reserved.
