# 🚀 ApplyPilot — AI Real-Time Job & Application Automation Platform

> **Modern Commercial SaaS Platform** for real-time job scraping, universal resume parsing (including PDF, DOCX, and LaTeX `.tex`), Resume-Worded-grade ATS Quality Scoring, AI-powered parsing using Google GenAI, and job tailoring workflows.

---

## 🌟 Key Capabilities

### 1. 📊 Resume Studio & 16-Rule ATS Scorer (0–100)
ApplyPilot features a robust, deterministic ATS scorer:
- **Instant Compatibility Grading**: Accurate, reproducible score (0–100) based on mathematical rules.
- **4 Core ATS Telemetry Categories**:
  1. **Impact**: Analyzes quantifiable metrics (%, $, scale, users), strong action verbs, and flags passive openers.
  2. **Brevity**: Checks bullet lengths, bullets per role, and strips filler words.
  3. **Style**: Detects buzzwords, removes first-person pronouns, enforces tense consistency, and monitors repetitive vocabulary.
  4. **Sections**: Verifies contact information, essential sections, and standard ATS headings.

### 2. 🤖 AI & Heuristic Document Parsing
- **Universal Formats**: Ingests PDFs (`pdf-parse`), DOCX (`mammoth`), TXT, and LaTeX (`.tex`).
- **Hybrid Approach**: Combines robust local deterministic parsing with advanced AI extraction via **Google Generative AI** (`@google/genai`) for structured data retrieval.

### 3. ⚡ High-Performance Scrapers & Queues
- **Multi-Platform Scrapers**: Extracts live postings from various boards (LinkedIn, Naukri, Greenhouse, Lever, Ashby, etc.) using lightweight `cheerio` scrapers and dynamic JS-rendered scraping using **Playwright**.
- **Background Task Queuing**: Utilizes **Redis** (`ioredis`) and **BullMQ** to manage robust background scraping workers and task polling.

### 4. 📡 Real-Time Monitoring & SSE Streaming Engine
- **Automated Background Worker**: Runs scheduled background polling.
- **Server-Sent Events (SSE)**: Streams live job alerts and pushes new postings directly to the client's feed in real-time.

### 5. 🎯 Deterministic Tailoring Engine
- **Skills Taxonomy**: Pre-compiled dictionary recognizing 40+ canonical technologies and hundreds of aliases.
- **Keyword Gap Analytics**: Identifies matched skills and missing job requirements offline.

### 6. 📄 Document Exporter
- **Export Formats**:
  - **LaTeX Source**: Clean `.tex` code output favored by tech recruiters.
  - **PDF Export**: Pixel-perfect PDF rendering powered internally by Playwright headless browsers.

---

## 🏗️ Architecture & Technology Stack

The project operates under a modern, highly modular monorepo-style architecture.

- **Frontend**: 
  - **Framework**: React 19, Vite.
  - **Styling**: Tailwind CSS v4, Framer Motion for animations, Lucide Icons.
  - **State**: Zustand & React Query.
- **Backend API**: 
  - Node.js, Express, TypeScript (via `tsx`).
  - **Bundling**: `esbuild` used to bundle the backend packages.
  - **Monorepo Packages**: Internal logic isolated into domain packages (`@applypilot/scraping`, `@applypilot/scoring`, `@applypilot/ai-local`, etc.).
- **Databases & Caching**: 
  - Local fast persistence via **SQLite** (`better-sqlite3`).
  - Production readiness via **PostgreSQL** (`pg`).
  - In-memory data store and queue management via **Redis** & **BullMQ**.
- **Automation & Scraping**: Playwright, Cheerio.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- Redis Server (Required for BullMQ task queues)

### Installation & Run

1. Clone the repository and navigate into `applypilot`:
```bash
cd applypilot
npm install
```

2. Setup Environment Variables:
Copy `.env.example` to `.env` and fill in necessary keys (e.g. Google GenAI key, Redis connection string).

3. Start the application (Frontend + Backend concurrently):
```bash
npm run dev
```

4. Open your browser:
```
http://localhost:3000
```

---

## 🧪 Testing
- **E2E Tests**: Fully configured Playwright end-to-end tests inside the `/tests` folder.
- **Unit & Integration**: Handled via **Vitest**.
```bash
npm run test
npm run test:watch
```

---

## 📄 License

MIT License © ApplyPilot Team. All rights reserved.
