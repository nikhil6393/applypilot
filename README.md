# 🚀 ApplyPilot — Commercial AI Real-Time Job & Internship Automation Platform

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
  2. **Action Verbs & Impact (25 pts)**: Detects high-impact engineering verbs (*Architected, Spearheaded, Optimized, Engineered, Scaled, Deployed*).
  3. **Quantifiable ROI & Metrics (25 pts)**: Scans for numbers, percentages (`%`), latency scale (`ms`), throughput, and user scale metrics.
  4. **Keywords & Tech Depth (25 pts)**: Analyzes hard skill coverage across languages, frameworks, databases, and developer tools.
- **Actionable Improvement Recommendations**: Lists identified strengths, flags weak bullets, and suggests concrete power verbs to reach 98+ score.

### 5. 🎯 Discovery Engine with Strict Filter Exclusivity & Dynamic Live Counters
- **Live Tab Counters**: Each filter tab computes and renders its live count dynamically:
  - `All Jobs (N)`
  - `⚡ Just Posted (<1h) (N)`
  - `🕒 Past 24h (N)`
  - `📅 Past Few Days (N)`
  - `🔥 Few Applicants (<10) (N)`
  - `🎓 Internships (N)`
- **Header Synchronization**: The subheader `Showing X live positions (Category)` strictly mirrors the active filter tab and exact visible count with zero discrepancy.
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

## 🚀 Getting Started (Easy 1-Click Launch)

### Option 1: One-Click Desktop / Folder Launch (Easiest)
Simply **double-click** either:
- **`START_SERVER.bat`** (or `run.bat`) in the root folder.
> 💡 *Automatically frees port 3000 conflicts, boots both frontend & backend, and opens Google Chrome to `http://localhost:3000` automatically.*

### Option 2: Terminal / Command Prompt (From Root or ApplyPilot Folder)
You can now run directly from the root workspace or `applypilot`:
```bash
npm run dev
# or
npm start
```

### Option 3: PowerShell
```powershell
.\run.ps1
```

---

### 🔑 Demo Login Credentials
- **URL**: `http://localhost:3000`
- **Email**: `nikhil900285@gmail.com`
- **Password**: `nikhil12`
- **Role**: Administrator / Lead Cloud Architect

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
