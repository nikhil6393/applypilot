# ApplyPilot — Evaluation Plan & Verification Benchmarks
## NSUT "Bridge the Gap" Challenge

---

## 1. Evaluation Objectives
The evaluation plan validates:
1. **Explainable Match Accuracy**: Direct citations are found for verified resume items; unmentioned skills are flagged without disqualifying the student.
2. **Eligibility Classification Reliability**: Correctly tags 4 states (`met`, `not_met`, `unknown`, `needs_confirmation`) across degrees, graduating cohorts, citizenship, and experience prerequisites.
3. **Truth Preservation & Anti-Hallucination**: Tailored resumes never introduce fake employers, degrees, certifications, or unearned metrics.
4. **Performance & Latency**: Resume parsing `< 250ms`, deterministic match scoring `< 25ms`.

---

## 2. Test Suites & Commands

| Suite Name | Path | What is Verified |
|---|---|---|
| **E2E Student Workflow** | `tests/e2e-student-workflow.test.ts` | 5-step journey: resume hygiene -> evidence match -> eligibility -> fit -> truthful tailoring. |
| **Opportunity Translator** | `tests/opportunity-translator.test.ts` | Requirement extraction, direct vs partial evidence, 4-state eligibility checks. |
| **Truth-Preserving Tailor** | `tests/tailor-engine.test.ts` | Anti-hallucination verification and rejection of unanchored entities. |
| **Deterministic Scoring** | `server/tests/fit.test.js` | Mathematical consistency of TF-IDF and Jaccard overlap. |
| **LaTeX & Document Parser** | `server/tests/resume-parser.test.js` | Parsing robustness across `.tex`, `.pdf`, `.docx`, and `.txt`. |

Run all tests:
```bash
cd applypilot
npm test
```
Current Status: **39 Test Suites Passed (100%) \| 351 Tests Passed \| 0 Failures**
