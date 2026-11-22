# ApplyPilot — Known Limitations & Honest Disclosures
## NSUT "Bridge the Gap" Challenge

*In keeping with the project's core principle of trust and transparency, this document records known engineering boundaries, intentional design tradeoffs, and areas planned for future development.*

---

## 1. Intentional Architectural Boundaries

### 1.1 No Automated Headless Form Submissions
- **Why**: Headless browser automation (Puppeteer/Selenium) triggers anti-bot detectors (Cloudflare Turnstile, reCAPTCHA v3) and leads to permanent candidate account bans on LinkedIn and Workday.
- **Current Behavior**: ApplyPilot uses **Assisted 1-Click Application Dispatch**, opening the verified career portal in the user's authentic browser with all tailored content pre-copied to clipboard.

### 1.2 No Prediction of Hiring Probabilities
- **Why**: Algorithmic match scores measure document similarity and keyword coverage—they cannot predict recruiter interview selections, internal referrals, or cultural fit.
- **Current Behavior**: Fit scores are clearly labeled as **Text & Skill Alignment Ratios**, accompanied by an explicit educational disclaimer.

### 1.3 Local-First Single User Custody
- **Why**: Resumes and applications contain sensitive Personally Identifiable Information (PII). ApplyPilot runs on embedded SQLite locally to maintain strict GDPR/CCPA privacy.
- **Limitation**: Multi-device synchronization across phones and laptops requires manual database file transfer or cloud sync tooling.

---

## 2. Ingestion & Scraping Caveats

### 2.1 Public Guest Endpoints Only
- **Limitation**: Postings that require candidate login or active recruiter session cookies to view are not indexed by public guest endpoints.
- **Mitigation**: Users can paste any custom job URL or raw job description directly into the **Precision URL Parser** (`POST /api/jobs/scrape-url`) for instant analysis.

### 2.2 Scanned Image PDF Resumes
- **Limitation**: Resumes that are purely flat raster images (scanned JPG/PNG without selectable text layers) require local Tesseract OCR, which is not bundled by default to maintain minimal binary size.
- **Mitigation**: Supported vector PDFs, `.tex`, `.docx`, and raw `.txt` parse with sub-second latency.
