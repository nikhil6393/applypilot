# Phase 2 — Stability Fixes (Detailed Implementation Guide)

> Focuses on fixing route collisions, unsafe type casts, non-deterministic scoring, and test import mismatches.

---

## Table of Contents

1. [Fix 1 — Fix Route Collisions in Express App](#fix-1--fix-route-collisions-in-express-app)
2. [Fix 2 — Unsafe Type Casts in Job Storage](#fix-2--unsafe-type-casts-in-job-storage)
3. [Fix 3 — Non-Deterministic Scoring Function](#fix-3--non-deterministic-scoring-function)
4. [Fix 4 — Test Import Path Mismatches](#fix-4--test-import-path-mismatches)
5. [Fix 5 — Route Conflicts: SSE Stream & Scrape Endpoints](#fix-5--route-conflicts-sse-stream--scrape-endpoints)
6. [Verify Phase 2](#verify-phase-2)

---

## Fix 1 — Fix Route Collisions in Express App

**File:** `server/app.ts`

### Problem:

Multiple routers (e.g. `scoringRouter`, `tailorRouter`, `jobsRouter`) were mounted on overlapping base paths (`/api/jobs`), causing Express route ambiguity and endpoint shadowing.

### Step-by-Step Fix:

1. Open `server/app.ts`.
2. Update router mounting to use dedicated, non-overlapping base paths:
   ```ts
   app.use('/api/jobs', jobsRouter);
   app.use('/api/scoring', scoringRouter);
   app.use('/api/tailor', tailorRouter);
   app.use('/api/agent', agentRouter);
   app.use('/api/monitor', monitorRouter);
   ```
3. Update client fetch calls in `src/components/` if necessary to match the distinct base paths (e.g. `/api/scoring/fit-score`, `/api/tailor/resume`).

---

## Fix 2 — Unsafe Type Casts in Job Storage

**File:** `server/store/jobs.ts`

### Problem:

Database rows were cast using `as EmploymentType` without runtime validation. Invalid database records (e.g. `null` or unexpected strings) caused silent runtime failures downstream.

### Step-by-Step Fix:

1. Open `server/store/jobs.ts`.
2. Add a runtime type guard:
   ```ts
   const VALID_EMPLOYMENT_TYPES: EmploymentType[] = [
     'full-time',
     'part-time',
     'contract',
     'internship',
     'unknown',
   ];

   function sanitizeEmploymentType(val: unknown): EmploymentType {
     if (typeof val === 'string' && VALID_EMPLOYMENT_TYPES.includes(val as EmploymentType)) {
       return val as EmploymentType;
     }
     return 'unknown';
   }
   ```
3. Use `sanitizeEmploymentType(r.employment_type)` when constructing `JobPosting` objects from database queries.

---

## Fix 3 — Non-Deterministic Scoring Function

**File:** `server/scoring/fit.ts`

### Problem:

`Date.now()` was called inside `scoreJob()` or recency boost logic, causing identical job inputs to yield different scores depending on execution time.

### Step-by-Step Fix:

1. Open `server/scoring/fit.ts`.
2. Modify function signatures to accept an optional `now` timestamp:
   ```ts
   export function computeRecencyScore(postedDate?: string, now: number = Date.now()): number {
     if (!postedDate) return 0.5;
     const postedMs = new Date(postedDate).getTime();
     if (isNaN(postedMs)) return 0.5;
     const hoursAgo = (now - postedMs) / (1000 * 60 * 60);
     if (hoursAgo <= 1) return 1.0;
     if (hoursAgo <= 24) return 0.9;
     if (hoursAgo <= 168) return 0.7;
     return 0.4;
   }
   ```
3. In test suites, pass fixed timestamp constants (e.g. `1700000000000`) for reproducible, deterministic tests.

---

## Fix 4 — Test Import Path Mismatches

**Files:** `tests/tailor-engine.test.ts`, `tests/application-engine.test.ts`

### Problem:

Tests imported from outdated/non-existent paths like `../server/profile/tailor-engine.js` and `../server/automation/application-engine.js`, causing test runner crashes.

### Step-by-Step Fix:

1. Update imports to reference existing engine modules:
   - `server/ai/heuristic.ts` for heuristic fallback algorithms.
   - `server/automation/playwright-apply.ts` for application automation.
2. Ensure relative paths use `.js` extension when importing TypeScript modules under Node Next ESM resolution.

---

## Fix 5 — Route Conflicts: SSE Stream & Scrape Endpoints

**File:** `server/routes/jobs.ts`

### Problem:

`GET /stream` (Server-Sent Events) and `POST /scrape` were mixed on ambiguous path patterns without clear endpoint separation.

### Step-by-Step Fix:

1. Explicitly register distinct paths:
   - `GET /api/jobs/stream-search` for SSE search streaming.
   - `POST /api/jobs/scrape-linkedin` for on-demand LinkedIn scraping.
   - `POST /api/jobs/scrape-naukri` for on-demand Naukri scraping.
2. Set explicit SSE headers on `stream-search`:
   ```ts
   res.setHeader('Content-Type', 'text/event-stream');
   res.setHeader('Cache-Control', 'no-cache');
   res.setHeader('Connection', 'keep-alive');
   ```

---

## Verify Phase 2

Run full build and test suite to ensure stability fixes pass:

```bash
npx tsc --noEmit
npm test
```
