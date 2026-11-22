# ApplyPilot — Feature Status Ledger
## NSUT "Bridge the Gap" Challenge

*Last Verified: October 2026*  
*Test Status: **38 Suites Passed \| 346 Unit & Integration Tests Passed \| 0 Failures \| TypeScript 0 Errors***

---

## 1. Phase Completion Summary

### ✅ Phase 0 — In-Depth Repository Audit
- **Status**: COMPLETE
- **Deliverables**: Verified baseline test suite (341 tests passing), generated [`docs/FEATURE_GAP_ANALYSIS.md`](file:///e:/all%20projects/scrapjob/docs/FEATURE_GAP_ANALYSIS.md), confirmed working technology stack without introducing unneeded dependencies.

### ✅ Phase 1 — Core Theme Differentiators ("Opportunity Translator")
- **Status**: COMPLETE
- **Deliverables**:
  1. **Evidence-Based Matching Engine** ([`applypilot/src/utils/opportunityEvidence.js`](file:///e:/all%20projects/scrapjob/applypilot/src/utils/opportunityEvidence.js)): Direct citations to student experience/projects vs partial vs unmentioned (with clarification prompts).
  2. **4-State Eligibility Evaluator** ([`applypilot/src/utils/jobEligibility.js`](file:///e:/all%20projects/scrapjob/applypilot/src/utils/jobEligibility.js)): Evaluates Degree, Graduation Batch (2025–2028), Location/Citizenship, and Experience level as `Met`, `Not Met`, `Unknown`, or `Needs Confirmation` with student self-confirmation.
  3. **Opportunity Translator View** ([`applypilot/src/components/OpportunityTranslator.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/OpportunityTranslator.jsx)): Plain English translation of enterprise requisitions into digestible sections.
  4. **Multi-View Integration**: Integrated into [`JobDetailDrawer.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/JobDetailDrawer.jsx), [`JobDetailSplitPane.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/JobDetailSplitPane.jsx), and [`ScoringStep.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/ScoringStep.jsx).
  5. **Truth-Preserving Tailoring Guardrails** ([`applypilot/src/components/TailorStep.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/TailorStep.jsx)): Removed unverified skill auto-injection, added honest policy banner.

### ✅ Phase 2 — Reliability, Trust & Accessibility Polish
- **Status**: COMPLETE
- **Deliverables**:
  1. **Resume Score Hygiene Grounding** ([`applypilot/server/scoring/scoring-rules.json`](file:///e:/all%20projects/scrapjob/applypilot/server/scoring/scoring-rules.json) & [`ats-scorer.js`](file:///e:/all%20projects/scrapjob/applypilot/server/scoring/ats-scorer.js)): Replaced commercial claims ("Top 5% ATS Ready") with honest formatting hygiene labels and added an explicit educational disclaimer.
  2. **Accessibility (a11y)**: Added visible focus outlines, cursor pointer utilities, and explicit `aria-label` attributes on icon buttons.
  3. **Saved Opportunities Quick Access** ([`applypilot/src/components/SavedJobsScreen.jsx`](file:///e:/all%20projects/scrapjob/applypilot/src/components/SavedJobsScreen.jsx)): Added 1-click Opportunity Translation from bookmarked cards.

---

## 2. Feature Verification Ledger

| Feature | Verified Status | Verification Mechanism |
|---|---|---|
| **Universal Resume Parsing** | ✅ ALREADY WORKING | `server/tests/resume-parser.test.js`, `server/tests/latex-parser.test.js` |
| **Evidence-Based Matching** | ✅ IMPLEMENTED & VERIFIED | `tests/opportunity-translator.test.ts` (5 tests passing) |
| **4-State Eligibility Evaluator** | ✅ IMPLEMENTED & VERIFIED | `tests/opportunity-translator.test.ts` (degree, batch, location, exp) |
| **Truth-Preserving Tailoring** | ✅ IMPLEMENTED & VERIFIED | `tests/tailor-engine.test.ts`, `src/lib/tailor/__tests__/tailor.test.ts` |
| **Zero-Login Scrapers** | ✅ ALREADY WORKING | `server/tests/scrapers.test.js`, `server/tests/scrapers-advanced.test.js` |
| **Deterministic Fit Scoring** | ✅ ALREADY WORKING | `server/tests/fit.test.js`, `server/tests/tfidf.test.js` |
| **SSE Real-Time Stream** | ✅ ALREADY WORKING | `server/tests/sse.test.js` |
| **Application Tracker & Persistence** | ✅ ALREADY WORKING | `server/tests/tailor-and-routes.test.js`, SQLite `applications` table |
| **Security & Observability** | ✅ ALREADY WORKING | `server/tests/security-observability.test.js` |
