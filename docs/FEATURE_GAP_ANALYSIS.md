# ApplyPilot — Feature Gap Analysis
## NSUT "Bridge the Gap" Challenge — Comprehensive Technical Audit

*Document generated: October 2026*  
*Baseline test status: **37 test files passed | 341 tests passed | 0 failures***

---

## 1. Executive Summary & Audit Context

ApplyPilot is being refined for the **NSUT "Bridge the Gap" Challenge**, functioning as an **Opportunity Translator** that connects:
- **Side A (Students)**: Aspiring technical talent with coursework, personal projects, and potential, but limited industry navigation experience.
- **Side B (Opportunities & Employer Requirements)**: Complex, jargon-heavy job descriptions containing prerequisite skills, strict eligibility constraints, and applicant tracking screening filters.

This document records the exact code-level audit of the existing repository, categorizing every major feature into:
- **ALREADY WORKING**
- **NEEDS IMPROVEMENT**
- **MISSING**
- **BLOCKED / UNVERIFIED**

---

## 2. Comprehensive Feature Matrix

| # | Feature Name | Current Status | Priority | Primary Source Files / Components | Verification Evidence |
|---|---|---|---|---|---|
| 1 | **Resume Ingestion & Parsing** | ALREADY WORKING | P1 | `server/ai/resume-parser.js`<br>`server/routes/resume.js`<br>`packages/parsing/src/index.ts` | 5 unit tests in `server/tests/resume-parser.test.js` + 1 test in `latex-parser.test.js` passed. Ingests `.tex`, `.pdf`, `.docx`, `.txt`. |
| 2 | **Resume ATS Quality Feedback** | NEEDS IMPROVEMENT | P2 | `server/scoring/ats-scorer.js`<br>`src/components/ResumeStep.jsx`<br>`src/lib/resumeScore/` | 53 unit tests in `score.test.ts` passed. Mathematical 100-pt score works. Needs: tone down exaggerated claims ("Top 5% ATS Ready"), emphasize transparent student improvement guidance. |
| 3 | **Job Discovery & Multi-Source Ingestion** | ALREADY WORKING | P1 | `server/scrape/orchestrator.js`<br>`server/scrape/linkedin-realtime.js`<br>`server/scrape/greenhouse.js`, etc. | 32 tests passed across `scrapers.test.js` and `scrapers-advanced.test.js`. Parallel zero-login scraping across 10+ providers. |
| 4 | **Deterministic Job Fit Calculation** | ALREADY WORKING | P1 | `server/scoring/fit.js`<br>`server/scoring/tfidf.js`<br>`packages/scoring/src/fit-engine.ts` | 5 tests in `fit.test.js` + 13 tests in `packages/scoring/` passed. Hybrid TF-IDF, Jaccard overlap, and recency decay. |
| 5 | **Explainable Matching With Resume Evidence** | NEEDS IMPROVEMENT | P1 | `server/scoring/skill-gap.js`<br>`src/components/ScoringStep.jsx`<br>`src/components/JobDetailDrawer.jsx` | Currently displays matched vs missing keywords as simple tags. Missing: explicit categorization into Direct Evidence, Inferred/Project Evidence, and Unmentioned (with prompt to confirm). |
| 6 | **Opportunity Eligibility Checker** | NEEDS IMPROVEMENT | P1 | `src/utils/jobEligibility.js`<br>`src/components/JobDetailDrawer.jsx` | 2028 batch check and Indian citizen checks exist, but lacks structured 4-state classification (`Met`, `Not Met`, `Unknown`, `Needs Confirmation`) and student self-confirmation. |
| 7 | **Truth-Preserving Resume Tailoring** | ALREADY WORKING | P1 | `server/profile/tailor-engine.js`<br>`server/profile/truth-validator.js`<br>`src/components/TailorStep.jsx` | Anti-hallucination tests pass in `tests/tailor-engine.test.ts`. Needs: explicit diff view explaining *why* each bullet was refined and warning against unverified additions. |
| 8 | **Application Tracker & Persistence** | ALREADY WORKING | P1 | `server/routes/tracker.js`<br>`server/store/db.js`<br>`src/components/SavedJobsScreen.jsx` | Full SQLite persistence verified in `tailor-and-routes.test.js`. Allows status changes (`saved`, `applied`, `interview`, `offer`, `rejected`). |
| 9 | **Job Freshness & Source Attribution** | ALREADY WORKING | P2 | `server/scrape/metadata-extractor.js`<br>`server/scrape/linkedin-realtime.js` | Sub-hour (`<1h`), 24h, and multi-day time windows with exact relative timestamps (`"15m ago"`, `"just now"`) and source attribution badges. |
| 10 | **Background Polling & SSE Alerts** | ALREADY WORKING | P2 | `server/sse/monitor-sse.js`<br>`server/routes/jobs.js` | 6 tests passed in `server/tests/sse.test.js`. 60-second polling worker broadcasting over `/api/monitor/stream`. |
| 11 | **AI Integrations & Deterministic Fallbacks** | ALREADY WORKING | P2 | `packages/ai-local/src/index.ts`<br>`server/scoring/deterministic.js` | 7 tests passed in `ai-local.test.ts`. Runs 100% offline via local heuristics and TF-IDF without mandatory API keys. |
| 12 | **Security, Privacy & Secrets Handling** | ALREADY WORKING | P0 | `server/security/`<br>`server/observability/`<br>`server/app.js` | 9 tests passed in `security-observability.test.js`. Helmet, CORS, RateLimiter, Request Correlation IDs, parameterized SQL. |
| 13 | **Accessibility & Responsive Interface** | NEEDS IMPROVEMENT | P2 | `src/components/`<br>`src/index.css` | Keyboard drawer close (Escape key) works. Needs: explicit ARIA labels on icon buttons, improved mobile touch targets, and student-first explanatory microcopy. |
| 14 | **Opportunity Translation Plain Language** | NEEDS IMPROVEMENT | P1 | `src/components/JobDetailDrawer.jsx`<br>`src/components/JobDetailSplitPane.jsx` | Role summary and tech tags exist, but lacks plain-language breakdown into: "What You Will Do", "Core Requirements", "Preferred Qualifications", and "Actionable Next Steps". |

---

## 3. Deep-Dive Gap Analysis by Feature

### 3.1 Explainable Job Matching with Resume Evidence
- **Current Status**: NEEDS IMPROVEMENT
- **Source Files**: 
  - [`applypilot/server/scoring/fit.js`](file:///e:/all%20projects/scrapjob/applypilot/server/scoring/fit.js)
  - [`applypilot/packages/scoring/src/fit-engine.ts`](file:///e:/all%20projects/scrapjob/applypilot/packages/scoring/src/fit-engine.ts)
  - [`applypilot/src/components/ScoringStep.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/ScoringStep.jsx)
  - [`applypilot/src/components/JobDetailDrawer.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/JobDetailDrawer.jsx)
- **What Currently Works**:
  - Compares candidate skills against job requirements.
  - Generates numerical fit score (0–100%) and categorizes skills into `matched` and `missing`.
- **What is Broken or Missing**:
  - The UI does not distinguish **direct resume evidence** (e.g., "Python used in 2 projects and coursework") from **unmentioned skills** (e.g., "SQL is not mentioned in resume").
  - Students might assume that a missing skill means they are disqualified. The system must explicitly state: *"Missing from resume does not mean you lack the skill—confirm if you have coursework or projects using this."*
- **User Impact**: Students feel discouraged by a raw percentage score without understanding *why* they matched or what specific evidence was found.
- **Smallest Justified Improvement**:
  - Augment the matching output with an **Evidence Matrix**:
    1. **Direct Evidence**: Requirements explicitly demonstrated in experience/projects.
    2. **Partial / Inferred Evidence**: Related frameworks/tools detected.
    3. **Unmentioned in Resume**: Requirements not detected, with an action prompt to verify.
    4. **Actionable Next Steps**: What the student should verify or clarify before applying.
- **Priority**: **P1 (Core Differentiator)**

---

### 3.2 Opportunity Eligibility Checker
- **Current Status**: NEEDS IMPROVEMENT
- **Source Files**:
  - [`applypilot/src/utils/jobEligibility.js`](file:///e:/all%20projects/scrapjob/applypilot/src/utils/jobEligibility.js)
  - [`applypilot/src/components/JobDetailDrawer.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/JobDetailDrawer.jsx)
- **What Currently Works**:
  - Checks if a posting mentions the 2028 batch or internship keywords.
  - Checks if a posting restricts candidates without US citizenship.
- **What is Broken or Missing**:
  - Does not provide a formal 4-state eligibility classification:
    - **Met**: Clear evidence exists in candidate profile/resume.
    - **Not Met**: Posting specifies hard constraint the student does not satisfy.
    - **Unknown**: Listing does not specify or resume omits the detail.
    - **Needs User Confirmation**: Ambiguous criteria requiring student input.
  - Missing student criteria checks: Degree status (e.g., B.Tech / BE), graduation year/batch, geographic location, and work authorization.
- **User Impact**: Students waste hours applying for roles where they are disqualified due to degree prerequisites, or avoid roles because they are unsure if interns are accepted.
- **Smallest Justified Improvement**:
  - Implement a structured `evaluateEligibility(job, candidateProfile)` function returning a 4-state breakdown with transparent rationale and student confirmation checkboxes.
- **Priority**: **P1 (Core Differentiator)**

---

### 3.3 Opportunity Translation (Plain-Language Requirement Decomposition)
- **Current Status**: NEEDS IMPROVEMENT
- **Source Files**:
  - [`applypilot/src/components/JobDetailDrawer.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/JobDetailDrawer.jsx)
  - [`applypilot/server/scrape/metadata-extractor.js`](file:///e:/all%20projects/scrapjob/applypilot/server/scrape/metadata-extractor.js)
- **What Currently Works**:
  - Displays job title, company, location, employment type, salary (if available), applicant count, and raw job description.
- **What is Broken or Missing**:
  - Job descriptions are often walls of corporate jargon. The "Opportunity Translator" theme requires breaking down the posting into digestible student-friendly sections:
    1. **Role Overview in Plain English**
    2. **Core Must-Have Requirements**
    3. **Nice-to-Have / Preferred Skills**
    4. **Day-to-Day Responsibilities**
    5. **Student Action Checklist**
- **User Impact**: First- and second-year college students get intimidated by 5-page enterprise job descriptions and fail to identify core skills.
- **Smallest Justified Improvement**:
  - Add a dedicated "Opportunity Translator" tab/view in `JobDetailDrawer.jsx` and `JobDetailSplitPane.jsx` that presents decomposed, categorized requirements with plain-language student annotations.
- **Priority**: **P1 (Core Differentiator)**

---

### 3.4 Truth-Preserving Resume Tailoring
- **Current Status**: ALREADY WORKING (Backend) / NEEDS ENHANCEMENT (UI)
- **Source Files**:
  - [`applypilot/server/profile/tailor-engine.js`](file:///e:/all%20projects/scrapjob/applypilot/server/profile/tailor-engine.js)
  - [`applypilot/server/profile/truth-validator.js`](file:///e:/all%20projects/scrapjob/applypilot/server/profile/truth-validator.js)
  - [`applypilot/src/components/TailorStep.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/TailorStep.jsx)
- **What Currently Works**:
  - `truth-validator.js` inspects generated bullets and rejects fabricated entities (e.g. unverified universities or tech).
  - Ranks candidate's genuine bullets by keyword relevance and formats them with strong action verbs.
- **What is Broken or Missing**:
  - The UI presents tailored bullets without an explicit side-by-side "Original vs. Tailored" comparison with clear rationales for why each bullet was rephrased.
  - Lacks an explicit disclaimer: *"ApplyPilot never invents experience. Review and approve all wording to ensure it matches what you actually did."*
- **User Impact**: Students may worry that automated suggestions could be considered dishonest in an interview.
- **Smallest Justified Improvement**:
  - Render an "Honest Review" banner and bullet-by-bullet comparison in `TailorStep.jsx` showing the exact modification rationale and confirmation button.
- **Priority**: **P1 (Core Differentiator)**

---

### 3.5 Resume Feedback Tone & Realistic Claims
- **Current Status**: NEEDS IMPROVEMENT
- **Source Files**:
  - [`applypilot/src/components/ResumeStep.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/ResumeStep.jsx)
  - [`applypilot/server/scoring/ats-scorer.js`](file:///e:/all%20projects/scrapjob/applypilot/server/scoring/ats-scorer.js)
- **What Currently Works**:
  - Calculates transparent score across Contact, Verbs, Metrics, and Tech Breadth.
- **What is Broken or Missing**:
  - Uses commercial marketing phrases like *"Top 5% ATS Ready"* or implies that a 95+ score guarantees recruiter screening.
- **User Impact**: Gives students false confidence and misrepresents how hiring works.
- **Smallest Justified Improvement**:
  - Reframe labels to: *"Formatting & Hygiene Score (0-100)"*, *"ATS Readability Assessment"*, and add note: *"A high score ensures your resume can be accurately parsed by recruiter systems; it does not guarantee an interview."*
- **Priority**: **P2**

---

## 4. Five Highest-Priority Changes (Implementation Roadmap)

1. **P1 — Opportunity Translator Component (`JobOpportunityTranslator.jsx`)**:
   - Decomposes job listings into: Plain-English Summary, Mandatory Requirements, Preferred Skills, and What You Will Do.
   - Provides clear student-first explanations of corporate jargon.
2. **P1 — Evidence-Based Match Inspector (`EvidenceMatchView.jsx`)**:
   - Evaluates resume text against job requirements to produce:
     - **Supported by Evidence** (with citation to candidate resume).
     - **Partial / Inferred Evidence**.
     - **Unmentioned in Resume** (with note: *"Confirm if you have experience with this"*).
     - **Suggested Next Steps**.
3. **P1 — 4-State Eligibility Evaluator (`EligibilityChecker.jsx` & utility)**:
   - Evaluates: Degree status, graduation batch, work authorization/location, and experience prerequisites.
   - Outputs: `Met`, `Not Met`, `Unknown`, `Needs User Confirmation`, and allows student self-confirmation.
4. **P1 — Truth-Preserving Tailoring Guardrails & Diff Reviewer**:
   - Enhances `TailorStep.jsx` with an explicit side-by-side diff, transparent edit rationale, and strict anti-fabrication guidelines.
5. **P2 — Grounded Realistic Framing & Accessibility Polish**:
   - Replaces exaggerated ATS marketing claims with educational, student-first hygiene guidance and improves keyboard navigation.

---

## 5. Potential Regressions & Prevention Measures

| Area | Potential Regression | Prevention Measure |
|---|---|---|
| **Fit Scoring Formula** | Modifying match display could break existing `scoreJob` and `scoreJobs` contract. | Keep `fit.js` mathematical formula intact; add evidence decomposition as an additive property (`evidence`, `eligibility`) without altering existing fields. |
| **Test Suite Stability** | Changes to scoring or parsing could fail existing 341 tests. | Run `npm test` after each incremental edit. Do not delete or weaken tests. |
| **Fast Refresh / React HMR** | Exporting non-component helpers alongside React components breaks HMR in Vite. | Keep pure utility functions in `src/utils/` and pure UI components in `src/components/`. |
| **Database Schema** | Adding eligibility fields could corrupt existing SQLite store. | Use optional fields and safe migrations with `IF NOT EXISTS` or JSON metadata fields. |

---

## 6. Phased Implementation Plan

- **Phase 0 (Complete)**: Baseline audit and test verification (341 tests passing).
- **Phase 1 (In Progress)**: Core Differentiators — Opportunity Translation, Evidence-Based Matching, and 4-State Eligibility Checker.
- **Phase 2**: Truth-Preserving Tailoring review UI and grounded student feedback copy.
- **Phase 3**: Verification tests, reviewer documentation (`docs/REVIEWER_GUIDE.md`), and demo script alignment.
