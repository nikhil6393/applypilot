# ApplyPilot Feature Audit and Fix Plan

**Audit date:** 2026-11-18  
**Scope:** The signed-out landing/auth experience, authenticated screens reachable from `App.jsx`, their visible controls, backend endpoints used by those screens, and prominent product claims.  
**Method:** Static UI-to-handler-to-route tracing, plus read-only checks against the already-running local service (`/api/health`, Google auth configuration, LinkedIn auth URL, and LinkedIn sync). No source app files were edited.

## What I could verify

- The existing local service returned health `ok` and reported a connected database. This confirms the service responds; it does not establish that every scraper/provider currently returns jobs.
- The live service reports Google sign-in as not configured. LinkedIn OAuth URL generation is configured, but the sync endpoint returned HTTP 501 with an explicit “not implemented” response.
- The project's dependencies do not include a Playwright browser runner, and the shared local port 3000 was already occupied. So this pass traces UI behavior from source and probes APIs; it did not click through screens in a real browser. UI layout, keyboard behavior, mobile breakpoints, and external provider success remain unverified.
- The worktree already had many unrelated changes. I preserved them and added only this audit document.

## Status definitions

- **Working in code:** A path and implementation exist. This is not proof that all providers or production configuration work.
- **Broken / fake:** The control is wired to a stub, hardcoded content, an incorrect request, an unreachable component, or behavior that reports success without doing what its label promises.
- **Partial / unverified:** Some core code exists, but end-to-end runtime behavior or production configuration was not established.

## Feature-by-feature audit

| Area / visible feature | Finding | Evidence and user impact | Priority |
|---|---|---|---|
| Register with email/password | **Backend path exists; not browser-verified.** Registration is wired to `/api/auth/register`, password hashing and session issuance exist. | `AuthContext.jsx`, `server/security/auth.js`. Password minimum is six characters in the modal; confirm-email/verification flow is absent. | P1 |
| Email/password login and session restore | **Implemented in code; not browser-verified.** | Login posts to backend and boot verifies `/api/auth/me`. Demo account seed exists. The README demo email/password do not match the current client/backend demo credentials, so the published quickstart login is stale. | P1 |
| One-click demo | **Backend-backed, but credentials/docs are inconsistent.** | Client attempts `demo@applypilot.io` / `DemoPass123!`; root README advertises a different account. It may work through the seeded demo in this local environment, but was not submitted during this audit. | P1 |
| Forgot password | **Misleading / incomplete.** UI promises an email, but backend only creates a one-hour token and returns the same generic “instructions sent” response. No mail delivery is implemented. | `AuthModal.jsx`; `/api/auth/forgot-password` in `server/security/auth.js`. User receives no token or email and cannot complete the flow through the UI. | P1 |
| Reset password | **Broken request contract.** Client sends `{ token, password }`; backend reads `{ token, newPassword }`. | `AuthContext.resetPassword`; `/api/auth/reset-password`. The request is rejected as missing new password. Also no email delivery supplies a token. | P1 |
| Change password in Profile Settings | **Fake success.** Form checks values locally, clears them, shows a success banner, and never calls a password-change API. | `ProfileSettingsScreen.handlePasswordChange`; there is no authenticated change-password route. | P1 |
| Google sign-in | **Not available in the UI; disabled on the running service.** Backend handler exists but no AuthModal control calls `loginWithGoogle`; live config returned `enabled: false`. | `AuthContext.jsx`, `AuthModal.jsx`, `/api/auth/google/config`. | P2 |
| LinkedIn OAuth/connect | **Incomplete/stubbed.** Running service can build a LinkedIn authorize URL, but no callback route is present; profile sync explicitly returns 501. Disconnect only clears client state and always reports success. | `LinkedInConnectModal.jsx`; LinkedIn routes in `server/security/auth.js`. OAuth button may open a flow that cannot finish. | P1 |
| LinkedIn internship search button | **Broken / mismatched endpoint.** UI calls `/api/linkedin/find-internships`, but no such route is mounted; job scrapers are under `/api/jobs/...`. | `App.jsx` handler `handleFindLinkedInInternships`; `server/app.js`; `server/routes/jobs.js`. | P1 |
| Privacy and account data separation | **P0 security/data-isolation issue.** The global `/api` auth gate explicitly bypasses `/resume`, `/tracker`, `/profile`, and other core routes. Those routes permit missing/invalid auth and fall back to the shared `default` profile/user ID. Multiple accounts can therefore read or write shared default data. | `server/app.js` allowlist; `server/routes/resume.js`, `profile.js`, `tracker.js`, `dashboard.js`. Registration does not currently establish private end-to-end ownership for all core resources. | P0 |
| Past Scraped Archive delete | **Dangerous unguarded global action.** Screen offers delete; `/api/jobs/:id` deletes from the shared jobs corpus, and the route has no admin/auth middleware. | `PastScrapedScreen.jsx`; `server/routes/jobs.js`. Any caller can remove a shared listing, affecting every user. | P0 |
| Resume upload / paste / parse | **Real parser path exists; full format coverage unverified.** Resume Studio posts files/text to `/api/resume/parse`; parser handles text, PDF and DOCX branches and saves a shared fallback resume when session ownership is absent. | `ResumeStep.jsx`, `ExactResumeStudio.jsx`, `server/routes/resume.js`. Oversized/unsupported files and scanned-image OCR behavior were not tested. | P1 |
| Sample resume load | **Broken/fake.** The sample button only sets a hardcoded filename and runs the extraction animation; it never loads/parses sample resume content. | `ExactResumeStudio.handleLoadSample`. A blank user reaches an empty studio after a fake scan. | P1 |
| “Neural Scan” / extraction animation | **Visual simulation.** Progress and “20+ checks” advance on timers independently of parser completion. The actual parser is separately called, but the animation is not telemetry from that work. | `Resume3DExtractorModal.jsx`, `ExactResumeStudio.jsx`. | P2 |
| ATS score and resume hygiene findings | **Real deterministic scoring code exists.** The score is local and computed from resume content. Its numeric score is a formatting heuristic, not a recruiter/ATS outcome prediction. | `ResumeStep.jsx`, `src/lib/resumeScore`, backend scorer. UI copy should consistently label it as a heuristic/readability score. | P2 |
| One-click resume “fix” for missing metrics | **Fabricates facts.** It appends canned numbers such as 35%, 10,000 users, 99.9% uptime, or 2.5x to the user's bullets. | `ExactResumeStudio.handleApplyFix` (`metricSamples`). Can put false claims directly into a resume. | P0 |
| Job keyword tailor (from feed) | **Fabricates facts and qualifications.** “Tailor all keywords” adds missing job skills to the candidate's skill list, rewrites bullets to claim those skills and invented uptime/impact metrics, and can claim 100% tailored. | `JobKeywordTailorModal.handleAutoTailorAllKeywords`. This contradicts the product's truth-preserving promise. | P0 |
| Compare JD “Bridge Skill Gap” fix | **Adds unsupported skills and claims.** Adds every missing skill to the resume and appends statements about using it to experience bullets, then hardcodes success to 94%/all skills. | `JobDescriptionComparatorModal.handleApplyFix`. | P0 |
| Resume bullet “AI” rewrite | **Rule-based, not AI; fallback invents a metric.** Backend `/api/resume/magic-write` is deterministic, but UI calls it “AI”. If the request fails, client adds “boosting performance by 25%.” | `ResumeStep.handleAIBulletEnhance`; `server/routes/resume.js`. Online success can be safe-ish but fallback is not truth-preserving. | P0 |
| TailorStep flow | **Implemented backend/client code is unreachable from the primary app.** `App.jsx` lazy-loads it but does not render it; `tailor` is redirected to `ResumeStep`. | `App.jsx`; `TailorStep.jsx`. | P2 |
| Resume exports | **Mixed.** PDF action in primary ResumeStep opens the browser print dialog rather than generating a server PDF. Word export writes HTML content with a `.doc` extension, not DOCX. A separate exact studio does call server PDF/DOCX exporters. LaTeX/JSON/HTML client downloads are generated locally. | `ResumeStep.jsx`; `RightDocumentSheet.jsx`; `/api/resume/export/*`. Labels should state actual format/action. | P1 |
| Profile name, contact, role and skills | **Seeded defaults can masquerade as user data.** Empty user/profile states fall back to “Nikhil Singh”, phone, Noida, generic role/headline and a fixed tech skills list. | `ProfileSettingsScreen.jsx`; `DashboardHome.jsx`; `SidebarLayout.jsx`. | P1 |
| Profile email editing | **Does not persist as shown.** Form allows changing email, but `/api/auth/update-profile` explicitly strips email; backend retains old account email and overwrites local user after save. Resume contact can then disagree with account email. | `ProfileSettingsScreen.handleSaveAll`; `AuthContext.updateProfile`; `server/security/auth.js`. | P1 |
| Save profile success state | **Can report success when server rejected update.** `updateProfile` swallows non-OK responses and `handleSaveAll` then shows a success toast. | `AuthContext.updateProfile`; `ProfileSettingsScreen.handleSaveAll`. | P1 |
| Export Data | **Partial despite broad label.** Download contains only the current profile fields, guardrails, and scraper preferences; it omits resume body, saved jobs, application history, and notifications. | `ProfileSettingsScreen.handleExportData`. | P2 |
| Scraper source toggles/preferences | **Persist as profile preferences but do not drive the live query.** Discovery builds source parameters from its own UI filter; it does not read the saved `scraperPrefs` board toggles. Indeed is offered despite no Indeed adapter in the current stream route. | `ProfileSettingsScreen.jsx`; `DiscoveryStep.jsx`; `server/routes/jobs.js`. | P1 |
| Scraper telemetry panel | **Mostly fake.** Initial health, last run, counts, rate-limit hits and cron times are hardcoded. Toggle only changes local Zustand state. “Run” hits `/api/jobs/scrape?source=<panel id>`; route results do not refresh per-source state accurately, and current IDs such as `linkedin_guest` do not match canonical source keys. | `appStore.js` `DEFAULT_SCRAPERS`/`triggerScraperRun`; `ScraperStatusPanel.jsx`; jobs route. No live telemetry endpoint is wired into this panel. | P1 |
| Scraper status screen reachability | **Not linked from current sidebar.** `scraper_status` is rendered by `App.jsx`, but current nav has no item that selects it. | `SidebarLayout.jsx`, `App.jsx`. | P2 |
| Dashboard summary/chart/schedule | **Several values are fabricated/static.** Weekly activity is a fixed array, three “confirmed” interviews are hardcoded stale October dates, core skills are fixed, profile completion is fixed 92%, and no dashboard API is called. Recommendation cards fall back to static jobs and fill missing fields with plausible salaries/locations/experience. | `DashboardHome.jsx`. | P1 |
| Dashboard name/avatar/tier badges | **Static fallbacks and inflated status.** Sidebar/header and profile screen fall back to a sample name/avatar and show PRO status with no billing/subscription integration. | `SidebarLayout.jsx`, `ProfileSettingsScreen.jsx`, auth default profile. | P2 |
| Notifications | **Seeded demo notifications, not live telemetry; state is session-only.** Store starts with two canned notices. Nothing in Discovery adds actual stream events to the notification store. Main mobile bell navigates to Dashboard; actual drawer trigger is in a different unused topbar component. | `appStore.js`; `NotificationDrawer.jsx`; `SidebarLayout.Topbar`; unused `AppTopBar.jsx`. Mark-read/clear resets on refresh. | P1 |
| Bookmarks / Saved Jobs | **Works locally, but not per-account or server-persisted.** IDs are in browser localStorage only. Saved page filters current discovered feed, so bookmarks whose jobs are no longer loaded disappear from the list. Cards show fallback Remote/Hybrid and Full-time for missing metadata. | `appStore.js`; `SavedJobsScreen.jsx`; `App.jsx`. | P1 |
| Apply Now / Applied state | **External link only; “Applied” is misleading.** It marks a job applied immediately when the link is clicked, before the external site confirms anything. It writes localStorage, not the application tracker. The actual backend tracker routes have no user-facing tracker screen wired here. | `DiscoveryStep.jsx`, `DashboardHome.jsx`, `appStore.js`; `server/routes/tracker.js`. Assisted external application should be labeled as opening the employer site, not submitted. | P1 |
| Opportunity eligibility and evidence | **Utilities exist; primary Skill Gap screen is disconnected from them.** App routes `scoring` to `SkillGapExact`, which shows hardcoded company scores/skills/salary instead of the resume-specific evidence and eligibility utilities. | `App.jsx`; `SkillGapExact.jsx` static `COMPANIES_DATA`; `opportunityEvidence.js`, `jobEligibility.js`. | P1 |
| Opportunity Translator / job detail | **Partially implemented.** Detail components include a translator, but no browser pass confirmed all tabs/actions, and fallback data can fill missing details elsewhere. | `JobDetailDrawer.jsx`, `JobDetailSplitPane.jsx`, `OpportunityTranslator.jsx`. | P2 |
| Interview Armor | **Mostly templated and can invent candidate achievements.** If no metric bullets exist, it inserts fabricated high-throughput systems and metrics; STAR situation/action/trade-offs are generic templates selected by keyword, not evidence from the candidate. | `InterviewArmorModal.jsx`. Needs prominent “example prompts” labeling and no invented resume bullets. | P0 |
| Recruiter Gaze Heatmap | **Clearly a visual reference simulation, not eye tracking.** Component does disclose it is a guide. | `RecruiterGazeHeatmap.jsx`. Keep disclosure visible. | P2 |
| Feedback form | **Wired to a backend route; not browser-verified.** | `FeedbackWidget.jsx`, `/api/feedback`. | P2 |
| Admin UI / `/admin` | **README claim does not match current app.** Admin API exists and uses admin-role middleware, but App has no `/admin` route and admin screen components are deleted in the current worktree. | Root `README.md`, `App.jsx`, `server/routes/admin.js`. Admin APIs are not evidence of an available admin UI. | P2 |
| Landing page interactive “live” product demo | **Static demonstration data.** Listed jobs, match scores, transformations, polling badge, testimonials and “real results” are constants, not results from the signed-in user's data or live services. | `LandingPage.jsx` (`PIPELINE_JOBS`, `TESTIMONIALS`, demo section). Label as sample/demo content and verify testimonial provenance. | P1 |
| Main app navigation / small controls | **Several routes/components are dormant or mismatched.** `SettingsModal` has state but no opener; `UserProfileSettingsModal` opener is in the unused Navbar; App's main sidebar omits scraper status, archive, and notification open action. The mobile bell routes to analytics. | `App.jsx`, `SidebarLayout.jsx`, `Navbar.jsx`, `AppTopBar.jsx`. | P2 |
| UI accessibility/responsive behavior | **Not verified in a browser.** Many icon-only/visual click targets and div-based controls need keyboard, focus, label and touch-target checks. | Static source review only; browser pass required. | P2 |

## Recommended fix plan

### Phase 0 — Stop data leakage and false resume claims (P0)

1. Enforce authentication and ownership on resume/profile/tracker/dashboard writes and reads; remove the shared `default` fallback for signed-in users. Keep public job discovery explicitly public if intended.
2. Restrict job deletion to an authenticated admin route; remove deletion from the candidate archive or replace it with a user-local hide action.
3. Remove all automatic insertion of missing skills, metrics, uptime, performance percentages, or experience bullets. Replace with editable prompts asking the user to supply verified facts. Preserve an explicit before/after diff and require approval.
4. Make Interview Armor draw only from actual resume text. When there is no evidence, show questions/templates clearly marked as examples and never manufacture a candidate achievement.
5. Remove the fabricated `25%` fallback from bullet rewrite; return a clear error or a fact-preserving deterministic suggestion.

**Acceptance:** Two synthetic accounts cannot see or mutate one another's resume/profile/tracker data; anonymous requests cannot access personal records; candidate requests cannot delete shared jobs; every automated resume change is traceable to source text or is an uncommitted suggestion with user-supplied facts.

### Phase 1 — Make core account and application workflows honest (P1)

1. Finish password reset end to end: use one field contract, issue a one-time token, deliver it through a configured email provider or expose a development-only safe test channel, and handle expiry/revocation in UI.
2. Implement server-side password change with current-password verification and session revocation; do not show success before server confirmation.
3. Either finish LinkedIn OAuth callback/state and sync, or disable/rename the connect/import/internship actions. Wire internship search to a real existing job route.
4. Make profile fields derive from saved user data; use empty values instead of fabricated sample identity/skills/contact details. Decide whether email is immutable or implement verified email changes.
5. Wire saved source preferences into the actual search request and only show sources with real adapters.
6. Replace fake dashboard metrics/interviews/skills/recommendations and scraper telemetry with API-derived values; show empty states when no data exists. Remove stale sidebar counts.
7. Connect saved jobs and application tracking to authenticated persistent records. Mark a job “applied” only after explicit user confirmation; opening an employer URL alone should remain “opened” or “application started.”
8. Wire Skill Gap to selected job + current resume and the existing evidence/eligibility utilities; remove static company scores and guessed salaries.
9. Correct resume export labels/formats and report the actual result; verify real PDF and DOCX files can be opened.
10. Correct the demo credentials in docs and clearly label the landing page product demo/testimonials as samples unless they have verified provenance.

**Acceptance:** A new account can register, log in, save a profile, upload/edit/parse a resume, recover/reset its password, save a job, record application status, and log out/in without losing account-owned data. Each visible action has a real request/state transition or is removed/disabled with an explanation.

### Phase 2 — Complete navigation and user-facing polish (P2)

1. Audit every reachable button, badge, bell, close control, empty state, card action, filter, modal and menu at desktop and mobile widths. Remove dead controls and connect intended destinations.
2. Show honest loading, empty, success and error states; never convert failed requests into success toasts.
3. Keep notifications in a persistent server-backed source or remove “live telemetry” language; wire actual events and notification drawer access.
4. Review labels, keyboard focus/order, Escape behavior, ARIA names, touch targets, reduced motion, contrast and mobile overflow.
5. Update README and feature-status docs only after the implementation and runtime checks pass.

**Acceptance:** Every navigation target is reachable; no visible control is a no-op; keyboard-only and mobile checks cover each main flow; no generated UI value is presented as the user's own data or as live telemetry unless it came from a real source.

## Verification checklist for implementation

- Auth: register, duplicate email, login success/failure, reload/session expiry, logout, forgot/reset success/expiry/reuse, password change, configured/unconfigured Google and LinkedIn states.
- Isolation: two users and anonymous access across profile, resume, bookmarks, tracker, dashboard, exports, and job deletion.
- Resume: sample data, PDF/DOCX/TXT/LaTeX parsing, parse failure, content edit/save/reload, no-fabrication checks for every fix/tailor path, and export file signatures.
- Jobs: live search, partial provider failures, filters with missing metadata, detail tabs, save/remove/reload, employer-link open, confirmed application tracking, archive filters/delete permissions.
- Dashboard and UI: empty/real data states, every menu/button/modal, notification source and persistence, scraper panel IDs/API result/error paths, responsive and keyboard behavior.
- Build and targeted test suites after fixes; run a browser-based end-to-end pass against a clean local test database before calling the audit closed.

## Explicitly not established in this audit

I did not verify actual third-party scraper availability, live posting freshness, Cloudinary uploads, PDF rendering in a real browser, Google/LinkedIn provider callbacks, screen-reader behavior, mobile layouts, or production deployment. Those require configured credentials/services and browser-based execution.

## Personalized Fit and Skill Path Design

**Status:** Design accepted; implementation pending user approval.

### Understanding

- Simplify job details by removing only the “Opportunity Translator” banner, while retaining concise plain-language, evidence, and eligibility content.
- Score discovered jobs against the active resume, falling back to genuine profile data when no usable resume exists.
- Show transparent 0–100 fit scores and rank every scoreable job in Recommended, highest first, without a score cutoff.
- Replace Skill Gap’s toast-only action with a detailed, personalized learning roadmap for the selected company.
- Keep the selected sidebar destinations; remove Source Health.

### Assumptions and Constraints

- Score up to 250 discovered jobs in one bounded same-origin API request, not one request per job.
- Send the active resume only to ApplyPilot’s own scoring endpoint for that request. Do not call the external AI embedding scorer, persist the request resume, or log request-body contents.
- Show no score when candidate or job evidence is insufficient. Do not use the generated empty-resume shell as candidate evidence.
- Keep posting freshness separate from fit scoring. Do not add a course-provider API or other dependency.
- Roadmap durations are estimates. Use a vetted course/resource link where mapped and clearly labeled official documentation for unmapped skills.

### Decision Log

1. **Use a same-origin API for scoring.** The current `/api/scoring/batch` UI path uses a hard-coded heuristic; replace it with the deterministic fit engine. The separate embedding-based scoring path is not used because it may send resume text to an external provider.
2. **Use a transparent fit score.** Score components: 50% skill overlap, 20% demonstrated experience/project evidence, 20% target-role alignment, and 10% explicit location/work-type preferences. Exclude posting age. Do not count unavailable evidence as a match; renormalize only comparable components and identify the available evidence.
3. **Rank all scoreable jobs.** Recommended shows scores in descending order with no hidden cutoff; preserve source order for ties and list unscored jobs afterward with a reason.
4. **Personalize Skill Gap from the active resume.** Return neutral company-advertised skills and posting frequency from the company endpoint; compare those with the active resume in the UI instead of relying on the server’s potentially stale saved-resume snapshot.
5. **Use an honest learning-resource fallback.** Provide ordered topics, vetted course/resource links, estimated time, and official documentation links for skills without a mapped course; never invent a course.
6. **Keep UI changes narrow.** Remove only the Opportunity Translator banner. Keep Dashboard, Job Feed, Skill Gap, Resume Studio, Saved Jobs, Settings, Notifications, and the Resume Studio promo button; remove Source Health.

### Implementation Plan

1. Normalize resume/profile and job inputs for scoring, including grouped legacy skill objects. Update the deterministic scorer and `/api/scoring/batch` contract with bounded input validation, evidence details, and explicit unavailable results.
2. Integrate one batch request into the Job Feed. Show score badges, loading/error/retry states, and a clear insufficient-data state. Rank Recommended by score; keep unscored jobs visible below scored jobs.
3. Update company skill-gap data to include all advertised skills and their frequency. Compare it with the active resume using the shared skill taxonomy, then replace the toast action with an accessible roadmap view and a static vetted resource catalog.
4. Remove the Opportunity Translator banner and Source Health sidebar item without removing other evidence content or the user-selected navigation items.
5. Add focused scorer, route-validation, recommendation-ordering, active-resume gap, resource-link, and UI regression tests. Run relevant tests and the production build; verify the UI in a browser if a usable runtime is available.

### Acceptance Criteria

- Scores are deterministic, personalized, and traceable to real resume/profile and job evidence; no generic fallback score is shown.
- Recommended ranks all scoreable jobs highest to lowest, displays scores, and does not hide lower-scoring jobs behind a cutoff.
- The roadmap is based on the active resume and selected company’s advertised skills, with topics, links, and estimated time.
- Missing data, scoring/API failures, and unavailable resources are communicated explicitly.
- Resume details are not sent to an external AI/course provider or persisted by the scoring request.
- Only the requested detail banner and Source Health sidebar item are removed; the selected sidebar actions remain.
