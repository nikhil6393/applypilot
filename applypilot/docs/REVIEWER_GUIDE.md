# ApplyPilot — NSUT "Bridge the Gap" Reviewer Guide
*Connecting Students to Opportunities with Honest Translation, Verifiable Evidence, and Ban-Proof Automation*

---

## 1. The Core Problem & The Two Sides

### Theme: Bridge the Gap
In technical hiring, a massive barrier separates college students from corporate employers:

- **Side A — College Students**:
  Students have genuine project experience, foundational coursework, and potential, but struggle to:
  - Decipher corporate jargon in enterprise job listings.
  - Determine whether they meet opaque eligibility criteria (degree, batch, graduation year, citizenship).
  - Understand which specific parts of their resume satisfy employer requirements.
  - Avoid making false claims or falling for AI hallucination traps.

- **Side B — Opportunities & Employers**:
  Postings specify complex technical stacks, automated ATS filtering rules, and hard constraints (citizenship authorization, graduation batch year, minimum prerequisites).

### The Bridge — ApplyPilot as the Opportunity Translator
ApplyPilot translates complex job requisitions into plain language, provides **evidence-based matching** citing exact resume proof, evaluates **mandatory eligibility in 4 distinct states**, and guides **truth-preserving tailoring** where zero skills or metrics are invented.

---

## 2. Core Implemented Differentiators

| Feature | Typical Job Board / AI Tool | ApplyPilot (The Opportunity Translator) |
|---|---|---|
| **Matching Explanation** | Shows an unexplained percentage (e.g., "78% Match") | **Evidence Matrix**: Categorizes requirements into *Direct Evidence* (with resume citations), *Partial Evidence* (skills mentioned without projects), and *Unmentioned* (with verification prompts). |
| **Eligibility Checks** | Ignores eligibility or gives a binary yes/no | **4-State Eligibility Evaluator**: Evaluates Degree, Cohort Batch, Work Authorization, and Experience Level as `Met`, `Not Met`, `Unknown`, or `Needs Confirmation`. |
| **Resume Tailoring** | Generic ChatGPT prompts that invent metrics & unearned skills | **Truth-Preserving Tailoring**: Rephrases genuine experiences; rejects unverified skills and never fabricates accomplishments. |
| **LaTeX Support** | Chokes on raw `.tex` files or corrupts URLs | **Native LaTeX AST Sanitizer**: Ingests `.tex` files in <250ms, stripping macros while preserving hyperlinks. |
| **Application Velocity** | Risky headless bots that get accounts banned | **Ban-Proof 1-Click Dispatch**: Opens official portal with pre-copied clipboard notes for 100% account safety. |

---

## 3. Step-by-Step Reproducible Demo Script

### Step 1: Boot the Application
Run the one-click launcher from the workspace root:
```bash
# Terminal 1 (or double click START_SERVER.bat)
npm run dev
```
Navigate to: `http://localhost:3000`

### Step 2: Resume Ingestion & Evidence Baseline
1. Click **Resume Studio** on the navigation bar.
2. Upload any technical resume (`.tex`, `.pdf`, or `.docx`).
3. Notice the **instant extraction (<250ms)** and transparent 4-category 100-point formatting hygiene score.

### Step 3: Discover Opportunities
1. Navigate to **Job Discovery Feed**.
2. Click the filter `⚡ Just Posted (<1h)` or `🎓 Internships`.
3. Notice live postings extracted via zero-login guest endpoints (LinkedIn, Greenhouse, Lever, Ashby) without credentials.

### Step 4: The Opportunity Translator in Action
1. Click on any job card to open the **Job Detail Drawer** (or Split-Pane mode).
2. The **Opportunity Translator** tab opens automatically:
   - **Plain English Breakdown**: Reads what the employer is actually building.
   - **Evidence Matrix**: Cites where your resume proves required skills (e.g., Python project citation).
   - **Mandatory Eligibility**: Shows Degree and Batch status (`Condition Met`, `Needs Confirmation`, `Student Confirmed`).
   - **Practical Next Steps**: Guides what coursework or projects to confirm.

### Step 5: Truth-Preserving Tailoring
1. Click **Improve Resume Honestly For This Role**.
2. Notice the **Truth-Preserving Policy Banner**:
   - Rephrases your authentic experience to align with job keywords.
   - Does **not** inject unverified technologies into your profile.
3. Review and copy the tailored bullets or export to clean PDF / LaTeX.

### Step 6: Application Tracking
1. Click **1-Click Apply**.
2. The official job portal opens in a new tab, and your tailored cover pitch is copied to your clipboard.
3. The job is automatically saved to your **Application Kanban Pipeline** with UTC audit timestamps.

---

## 4. Verification & Testing Evidence

All functionality is backed by an automated test suite:
```bash
cd applypilot
npm test
```
**Results Verified**:
- **38 Test Files Passed (100%)**
- **346 Total Unit and Integration Tests Passed**
- **Zero Failures**

Key test files:
- `tests/opportunity-translator.test.ts`: Evidence categorization and 4-state eligibility checks.
- `server/tests/resume-parser.test.js`: Universal document & LaTeX parsing.
- `server/tests/fit.test.js`: Deterministic TF-IDF and Jaccard scoring.
- `tests/tailor-engine.test.ts`: Truth-preservation and anti-hallucination validation.
