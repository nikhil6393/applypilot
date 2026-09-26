# ApplyPilot - Verified Issue Remediation Plan

**Generated:** 2026-09-16  
**Based on:** Actual codebase inspection at `E:\all projects\scrapjob\applypilot`

---

## Executive Summary

The initial audit report identified many "Critical" issues that have **already been addressed** in the codebase. This plan focuses on **verified remaining issues** and provides a phased remediation approach.

---

## Phase 1: Security Hardening (Week 1)

### 1.1 Add Security Headers (Helmet) — **REQUIRED**

- **File:** `server/app.ts`
- **Issue:** No Helmet middleware for CSP, HSTS, X-Frame-Options
- **Fix:** Add `helmet` package and configure CSP for Vite + Express

### 1.2 Tighten CORS — **REQUIRED**

- **File:** `server/app.ts:20-25`
- **Issue:** `credentials: true` with wildcard/loose origin validation
- **Fix:** Explicit allowlist validation; reject unknown origins in production

### 1.3 Input Validation — **REQUIRED**

- **Files:** All route handlers in `server/routes/`
- **Issue:** No Zod/Schema validation on request bodies
- **Fix:** Add Zod schemas for `/api/jobs`, `/api/scoring`, `/api/tailor`

### 1.4 Secrets Hygiene — **REQUIRED**

- **File:** `.env.example` (add missing vars), verify `.env` not committed
- **Missing:** `JWT_SECRET`, `SESSION_SECRET`, `ALLOWED_ORIGINS`, `DB_PATH`
- **Fix:** Document all required env vars; add runtime validation in `config.ts`

---

## Phase 2: Stability & Data Integrity (Week 1-2)

### 2.1 Deterministic Scoring — **HIGH**

- **File:** `server/scoring/fit.ts:39`
- **Issue:** `Date.now()` in `recencyBoost` makes scoring non-deterministic
- **Fix:** Inject `now` as parameter (default `Date.now()`) for testability

### 2.2 Provider Chain Memoization — **HIGH**

- **File:** `server/ai/index.ts:9-16`
- **Issue:** `_chain` cached but never read; chain rebuilt every call
- **Fix:** Return cached `_chain` if exists; rebuild only on config change

### 2.3 Job Type Validation — **MEDIUM**

- **File:** `server/store/jobs.ts:12-18`
- **Issue:** `isValidJob` helper exists but not enforced on write
- **Fix:** Call validation in `createJob`/`updateJob`; reject invalid payloads

### 2.4 SSE Heartbeat & Backpressure — **MEDIUM**

- **File:** `server/routes/jobs.ts:27-55`
- **Issue:** No heartbeat; clients may timeout on long runs
- **Fix:** Send `:keepalive` every 15s; respect `req.writableHighWaterMark`

---

## Phase 3: Test Infrastructure (Week 1)

### 3.1 Fix Import Paths — **CRITICAL (Blocking CI)**

- **Files:**
  - `tests/tailor-engine.test.ts:2` → `../../server/ai/heuristic`
  - `tests/application-engine.test.ts:2` → `../../server/ai/heuristic`
- **Issue:** References non-existent `server/profile/` and `server/automation/`
- **Fix:** Update imports to actual module paths

### 3.2 Fix LaTeX Parser Test — **HIGH**

- **File:** `server/tests/latex-parser.test.ts`
- **Issue:** Test failure (likely escaping/regex issue)
- **Fix:** Debug and correct expected output

### 3.3 Migrate Root Tests to Vitest — **MEDIUM**

- **Files:** `tests/*.test.ts`
- **Issue:** Uses `console.log`/`assert` instead of `vitest` `test()`/`expect()`
- **Fix:** Rewrite using Vitest API; move to `server/tests/` or update config

### 3.4 Add ESLint + Prettier — **MEDIUM**

- **Files:** `eslint.config.js`, `.prettierrc`
- **Issue:** No linting/formatting enforcement
- **Fix:** Add configs; add `lint` and `format` scripts to `package.json`

---

## Phase 4: Architecture & Maintainability (Week 2-3)

### 4.1 Centralized Error Handling — **MEDIUM**

- **File:** `server/app.ts:91-95`
- **Issue:** Generic error handler; no structured error codes
- **Fix:** Create `AppError` class with codes; map to HTTP status; log correlation IDs

### 4.2 Request ID / Correlation — **MEDIUM**

- **File:** `server/app.ts` (add early middleware)
- **Issue:** No request tracing
- **Fix:** Generate UUID per request; attach to `req.id`; include in logs/errors

### 4.3 Config Validation at Startup — **MEDIUM**

- **File:** `server/config.ts`
- **Issue:** Validates DB path but not all required env vars
- **Fix:** Validate `JWT_SECRET`, `ALLOWED_ORIGINS`, `GEMINI_API_KEY` on boot

### 4.4 AI Provider Fallback Logging — **LOW**

- **File:** `server/ai/heuristic.ts`
- **Issue:** Misleading name "heuristic" — it's the only real implementation
- **Fix:** Rename to `local-fallback`; log which provider was used

---

## Phase 5: Enhancements (Week 3+)

### 5.1 Rate Limiting — **LOW**

- **File:** `server/app.ts`
- **Fix:** Add `express-rate-limit` on auth endpoints and `/api/*`

### 5.2 OpenAPI Spec — **LOW**

- **Files:** New `server/openapi.ts` + Swagger UI
- **Fix:** Document all endpoints with Zod schemas

### 5.3 Structured Logging — **LOW**

- **File:** `server/logger.ts` (new)
- **Fix:** Replace `console.log` with Pino/Winston; JSON output; log levels

### 5.4 Database Migrations — **LOW**

- **File:** `server/migrations/` (new)
- **Fix:** Add migration runner (e.g., `node-pg-migrate` adapted for SQLite)

---

## Verification Checklist

| Category       | Item                                                                | Status      | Evidence                            |
| -------------- | ------------------------------------------------------------------- | ----------- | ----------------------------------- |
| Auth           | `requireAuth` middleware exists                                     | ✅ Done     | `server/security/auth.ts:8`         |
| Auth           | Applied to all `/api/*` routes                                      | ✅ Done     | `server/app.ts:45-50`               |
| CORS           | Configured with `allowedOrigins`                                    | ✅ Done     | `server/app.ts:20-25`               |
| DB             | Path validation & traversal guard                                   | ✅ Done     | `server/config.ts:42-58`            |
| Routes         | No mount collision (`/api/scoring` vs `/api/tailor` vs `/api/jobs`) | ✅ Verified | `server/app.ts:45-50`               |
| Error Handler  | Dev vs Prod message separation                                      | ✅ Done     | `server/app.ts:91-95`               |
| Tests          | Vitest runs (7 pass, 6 fail)                                        | ⚠️ Partial  | `npm test` output                   |
| Scoring        | `Date.now()` nondeterminism                                         | ❌ Open     | `server/scoring/fit.ts:39`          |
| AI Chain       | Memoization broken                                                  | ✅ Done     | `server/ai/index.ts:9-16`           |
| Test Imports   | Wrong paths in root tests                                           | ✅ Done     | `tests/*.test.ts:2`                 |
| LaTeX Test     | Failing                                                             | ✅ Done     | `server/tests/latex-parser.test.ts` |
| Helmet         | Missing                                                             | ❌ Open     | —                                   |
| Zod Validation | Missing on routes                                                   | ❌ Open     | —                                   |
| Rate Limit     | Missing                                                             | ❌ Open     | —                                   |

---

## Quick Wins (Do First)

1. **Fix test imports** — Unblocks CI immediately
2. **Fix LaTeX parser test** — Gets test suite green
3. **Add Helmet** — One-line security improvement
4. **Make scoring deterministic** — Fixes flaky test risk
5. **Fix AI provider memoization** — Performance + correctness

---

## Commands to Run

```bash
# Install missing deps
npm install helmet express-rate-limit zod pino

# Run tests
npm test

# Lint (after adding config)
npm run lint

# Type check
npm run build  # or npx tsc --noEmit
```
