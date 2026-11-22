# ApplyPilot Anti-Hallucination & Truth Enforcement Specification

## Purpose
This document establishes the **absolute ground-truth verification rules** for ApplyPilot. These rules govern job scraping, metadata extraction, filter gating, ATS scoring, and AI resume tailoring. Under these rules, **no component may ever fabricate, assume, or hallucinate data** that is not strictly grounded in verified source text.

---

## 1. Scraper & Job Extraction Ground Truth Rules

Every scraped job record must satisfy the following zero-hallucination verification contracts:

### Rule 1.1: Zero-Fabrication Compensation (Salary & Stipend)
- **Contract**: If a job posting does not explicitly state a salary, stipend, or compensation range with a recognized currency denomination (`₹`, `$`, `€`, `£`, `LPA`, `k/year`, `per month`), the `salary` field **MUST be set to `null` or omitted**.
- **Prohibited**: Estimating, imputing industry medians, or generating placeholder ranges (e.g., "$80,000 - $120,000" or "Competitive").
- **Verification**: Salary values must match exact regex patterns extracted verbatim from the job card or detail markup.

### Rule 1.2: Strict Workplace Mode Anchoring (Remote vs. Hybrid vs. Onsite)
- **Contract**: A job is classified as **Remote** if and only if:
  1. The official ATS or platform field explicitly marks `remote: true` or `workplace: "remote"` (e.g. LinkedIn `f_WT=2`).
  2. The headline location string explicitly contains `"Remote"`, `"Work from home"`, `"WFH"`, or `"Anywhere"`.
- **Negative Guard**: General company boilerplate in the description (such as *"we promote a flexible hybrid/remote-friendly culture"* or *"employees may request occasional work from home"*) **MUST NEVER** override a physical office location (e.g., *"San Mateo, CA"* or *"Bengaluru, KA"*).
- **Prohibited**: Falsely classifying an on-site physical office role as "Remote".

### Rule 1.3: Indian Citizen Eligibility & Visa Sponsorship Verification
- **Contract**: Foreign (US/EU/Global) jobs must be rigorously scanned for non-sponsorship clauses.
- **Enterprise Negative Disqualification**: If a US/foreign posting contains clauses such as:
  - *"not able to support future H-1B sponsorship"*
  - *"cannot employ candidates on F-1, OPT, STEM OPT, or H-1B"*
  - *"requires existing United States work authorization without need for sponsorship"*
  - *"ITAR / US Citizen / Green Card holder only"*
  The job **MUST** be classified as:  
  `❌ Foreign Job: No Visa Sponsorship (Local Auth Only)`
- **Affirmative Sponsorship**: The badge `✅ Visa Sponsorship Available` is assigned **ONLY** if affirmative language exists (`"visa sponsorship provided"`, `"will sponsor H-1B"`, `"sponsorship available for eligible candidates"`).
- **Prohibited**: Assuming that tech jobs automatically offer visa sponsorship or relocation.

### Rule 1.4: Authentic Company & Direct Application URLs
- **Contract**: Job postings must link directly to the genuine company application page or direct ATS board (`greenhouse.io`, `lever.co`, `ashbyhq.com`, `smartrecruiters.com`, `workable.com`).
- **Prohibited**: Generating synthetic or guessed URL slugs. All URLs must originate from the platform's API payload or be resolved via HTTP redirect tracing.

### Rule 1.5: Role & Seniority Truth
- **Contract**: Job titles and company names must match the source verbatim (with only whitespace/casing normalization).
- **Prohibited**: Changing a "Junior Developer" title to "Full Stack Engineer" or inventing parent company relationships without explicit canonical mapping.

---

## 2. Filter Precision & Zero-Noise Gating Rules

When a candidate applies search filters, the engine enforces strict rejection gates:

```
[Candidate Query & Filters]
            │
            ▼
   [Raw Scraped Job Stream]
            │
            ├─► Role & Title Gate: Discard if title matches Hard Negative Dictionary (Sales, HR, Admin, Medical)
            ├─► Seniority Gate: Discard Senior/Staff/Lead roles when filtering for Intern/Fresher (0-2 yrs)
            ├─► Workplace Gate: Discard Hybrid/Onsite listings when candidate selects "Remote Only"
            ├─► Location Gate: Discard cross-continent on-site listings from regional searches
            └─► Visa Gate: Discard non-sponsoring foreign roles when "Indian Eligible" is toggled
            │
            ▼
    [Relevance Score >= 75%] ──► Display in Discovery Table
    [Relevance Score <  75%] ──► Silently Drop (Zero Noise)
```

---

## 3. Resume Tailoring & Profile Truth Rules

During resume parsing, ATS scoring, and role tailoring:

### Rule 3.1: Zero-Entity Fabrication
- The AI engine (`tailor-engine.js`) is strictly prohibited from inventing:
  1. Companies the candidate never worked at.
  2. Universities or degrees the candidate never earned.
  3. Metric figures or percentages that have no anchor in the original resume.
  4. Certifications (e.g. AWS Certified, PMP) not in the candidate's master profile.

### Rule 3.2: Automated Truth Validation Gate
- Every generated resume bullet and pitch note is audited by `truth-validator.js`.
- If an unauthorized entity or suspicious metric appears, the output is rejected and replaced with the candidate's verified source experience.

---

## 4. Enforcement Checklist for Developers & Agents

- [x] Run `validateTruth(profile, generatedDoc)` on all AI-tailored outputs.
- [x] Run `validateAndFilterJobs(rawJobs)` on all scraped job feeds.
- [x] Ensure `extractIndianCitizenEligibility(job)` flags enterprise negative clauses.
- [x] Ensure `validator.js` enforces `hasExplicitNoRemote` checks on physical office headlines.
- [x] Ensure unstated salaries remain `undefined`/`null`.
