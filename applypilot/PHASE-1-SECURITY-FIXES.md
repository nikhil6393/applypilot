# Phase 1 — Security Fixes (Detailed Implementation Guide)

> Complete each step in order. After every step, run tests before proceeding.

---

## Table of Contents

1. [Fix 1 — CORS: restrict to known origins](#fix-1--cors-restrict-to-known-origins)
2. [Fix 2 — Add authentication middleware](#fix-2--add-authentication-middleware)
3. [Fix 3 — Error handler: stop leaking internals](#fix-3--error-handler-stop-leaking-internals)
4. [Fix 4 — DB path: validate before use](#fix-4--db-path-validate-before-use)
5. [Fix 5 — Double .env loading](#fix-5--double-env-loading)
6. [Fix 6 — Unsafe type casts in job storage](#fix-6--unsafe-type-casts-in-job-storage)
7. [Fix 7 — Route collisions in Express app](#fix-7--route-collisions-in-express-app)
8. [Verify Phase 1](#verify-phase-1)

---

## Fix 1 — CORS: restrict to known origins

**File:** `server/app.ts:16`

### Current code (line 16):

```ts
app.use(cors());
```

### Problem:

`cors()` with no options allows **any** origin, **any** method, **any** header. Combined with no auth on endpoints, any website can make requests to your API using a user's browser session.

### Step-by-step fix:

**Step 1:** Open `server/app.ts` line 16.

**Step 2:** Replace `app.use(cors())` with a whitelist-based CORS config:

```ts
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (req, callback) => {
      if (!req.headers.origin || allowedOrigins.includes(req.headers.origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600,
  })
);
```

**Step 3:** Add `ALLOWED_ORIGINS=http://localhost:5173` to your `.env` file (frontend dev URL).

### Verification:

```bash
cd "E:\all projects\scrapjob\applypilot"
npx tsc --noEmit server/app.ts 2>&1 | head -20
```

No TypeScript errors expected.

---

## Fix 2 — Add authentication middleware

**File:** `server/app.ts` — need to wire up the existing `requireAuth` middleware from `server/security/auth.ts`

### Current state:

- `server/security/auth.ts` already exists with a full auth system (register, login, logout, session, Google OAuth)
- `requireAuth` middleware is exported from that file (line 221)
- **No route in `server/app.ts` actually uses it** — all APIs are wide open

### Step-by-step fix:

**Step 1:** Open `server/app.ts`.

**Step 2:** Add the auth middleware import at the top (add this line after line 11):

```ts
import { requireAuth } from './security/auth.js';
```

**Step 3:** Add a middleware block **before** route registration (insert between line 18 and line 20):

```ts
// Auth middleware — applies to all API routes except health and auth itself
app.use('/api', (req, _res, next) => {
  // Skip auth for health check and auth endpoints (register/login/google config)
  if (
    req.path.startsWith('/health') ||
    req.path.startsWith('/auth/') ||
    req.path.startsWith('/config/')
  ) {
    return next();
  }
  requireAuth(req as any, _res as any, next);
});
```

**Step 4:** Wire session cookie parsing if using cookies (optional but recommended). Add after the auth middleware block:

```ts
// Optional: parse session from cookie if you switch to cookie-based auth
// import { cookieParser } from 'cookie-parser';
// app.use(cookieParser());
```

**Step 5:** Verify the auth routes in `server/security/auth.ts` are registered. Check that `server/app.ts` has `authRouter` registered. If not, add this line **before** the `/api` middleware block (around line 19):

```ts
app.use('/api/auth', (await import('./security/auth.js')).authRouter);
```

**Step 6:** If `authRouter` is not yet imported, add this import at the top of `server/app.ts`:

```ts
import { authRouter } from './security/auth.js';
```

And change line 20 to:

```ts
app.use('/api/auth', authRouter);
```

### Verification:

1. Start the server and try to hit `http://localhost:3000/api/jobs` without a token → expect `401 Unauthorized`
2. Hit `http://localhost:3000/api/health` without token → expect `200 OK`
3. Login via `POST /api/auth/login` with demo credentials → get token
4. Hit `GET /api/jobs` with `Authorization: Bearer <token>` → expect `200 OK`

---

## Fix 3 — Error handler: stop leaking internals

**File:** `server/app.ts:30-33`

### Current code:

```ts
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});
```

### Problem:

`err.message` is sent directly to the client. In SQL errors, network errors, or validation errors, this leaks:

- Database paths and table names (SQLite errors)
- Internal API keys or URLs (if in error messages)
- Stack trace fragments

### Step-by-step fix:

**Step 1:** Open `server/app.ts` lines 30-33.

**Step 2:** Replace the error handler with:

```ts
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[error]', err);
  res.status(500).json({
    error: isProd ? 'internal server error' : err.message || 'internal error',
    ...(isProd ? {} : { stack: err.stack }),
  });
});
```

**Step 3:** Also audit individual route handlers for the same pattern. In `server/routes/scoring.ts:46`, change:

```ts
res.status(500).json({ error: 'fit-score failed', message: (err as Error).message });
```

to:

```ts
res.status(500).json({ error: 'fit-score failed' });
```

### Verification:

- Trigger a known error (e.g., malformed JSON body)
- Confirm response body does **not** contain stack traces, SQL queries, or file paths
- In production mode, response should be just `{"error":"internal server error"}`

---

## Fix 4 — DB path: validate before use

**File:** `server/config.ts:35`

### Current code:

```ts
dbPath: process.env.DB_PATH || (nodeEnv === 'test' ? './data/applypilot.test.db' : './data/applypilot.db'),
```

### Problem:

`DB_PATH` from environment variable is used directly without validation. An attacker could set `DB_PATH=/etc/passwd` to overwrite a system file, or use symlink attacks.

### Step-by-step fix:

**Step 1:** Open `server/config.ts`.

**Step 2:** Add a path validation helper **before** the `config` object (before line 31):

```ts
function validateDbPath(p: string): string {
  const resolved = path.resolve(p);
  const safeDir = path.resolve(process.cwd(), 'data');
  if (!resolved.startsWith(safeDir)) {
    console.warn(`[config] DB_PATH "${p}" escapes data directory, falling back to default`);
    return path.join(safeDir, nodeEnv === 'test' ? 'applypilot.test.db' : 'applypilot.db');
  }
  return resolved;
}
```

**Step 3:** Add `import path from 'node:path'` at the top of `server/config.ts` if not already present.

**Step 4:** Change line 35 from:

```ts
dbPath: process.env.DB_PATH || (nodeEnv === 'test' ? './data/applypilot.test.db' : './data/applypilot.db'),
```

to:

```ts
dbPath: process.env.DB_PATH ? validateDbPath(process.env.DB_PATH) : (nodeEnv === 'test' ? './data/applypilot.test.db' : './data/applypilot.db'),
```

### Verification:

```bash
DB_PATH=/etc/passwd node -e "require('./server/config').config" 2>&1
```

Should print a warning and use the default path instead.

---

## Fix 5 — Double .env loading

**File:** `server/config.ts:6-7`

### Current code:

```ts
loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../../.env') });
```

### Problem:

Loading from two different directories means:

- Values from the parent project (`../../.env`) silently overwrite project-specific values
- Secrets from another project leak into this process
- Debugging env issues becomes nearly impossible

### Step-by-step fix:

**Step 1:** Open `server/config.ts`.

**Step 2:** Remove line 7 entirely:

```ts
loadDotenv({ path: resolve(__dirname, '../../.env') });
```

**Step 3:** Change line 6 to use `override: true` only for the project's own `.env`:

```ts
loadDotenv({ path: resolve(__dirname, '../.env'), override: true });
```

**Step 4:** Add a safety check after loading to detect which `.env` was found:

```ts
import fs from 'node:fs';

const projectEnvPath = resolve(__dirname, '../.env');
if (fs.existsSync(projectEnvPath)) {
  loadDotenv({ path: projectEnvPath, override: true });
} else {
  console.warn('[config] No .env file found at project root');
}
```

**Step 5:** Verify the `.env` file exists at `E:\all projects\scrapjob\applypilot\.env`

### Verification:

```bash
grep -c "API_KEY" "E:\all projects\scrapjob\applypilot\.env"
```

Confirm only the correct project's secrets are loaded.

---

## Fix 6 — Unsafe type casts in job storage

**File:** `server/store/jobs.ts:137`

### Current code (line 137):

```ts
employmentType: r.employment_type as EmploymentType,
```

### Problem:

SQLite is dynamically typed. A value stored as `'freelance'` or `null` will pass through the `as` cast silently. Downstream code expects one of: `'full-time'`, `'part-time'`, `'contract'`, `'freelance'`, `'internship'`, `'temporary'`, `'volunteer'`. Any other value causes runtime errors.

### Step-by-step fix:

**Step 1:** Open `server/store/jobs.ts`.

**Step 2:** Add a validation helper **after** the `RawRow` interface (after line 110, before `rowToJob`):

```ts
const VALID_EMPLOYMENT_TYPES = new Set<string>([
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
  'temporary',
  'volunteer',
]);

function safeEmploymentType(value: string | null | undefined): EmploymentType {
  if (value && VALID_EMPLOYMENT_TYPES.has(value)) {
    return value as EmploymentType;
  }
  return 'unknown';
}
```

**Step 3:** Change line 137 from:

```ts
employmentType: r.employment_type as EmploymentType,
```

to:

```ts
employmentType: safeEmploymentType(r.employment_type),
```

**Step 4:** Add similar protection for `salaryMin` and `salaryMax` (lines 138-139). Change:

```ts
salaryMin: r.salary_min ?? undefined,
salaryMax: r.salary_max ?? undefined,
```

to:

```ts
salaryMin: typeof r.salary_min === 'number' && Number.isFinite(r.salary_min) ? r.salary_min : undefined,
salaryMax: typeof r.salary_max === 'number' && Number.isFinite(r.salary_max) ? r.salary_max : undefined,
```

### Verification:

```ts
// Run in Node to test the validator:
const { safeEmploymentType } = await import('./server/store/jobs.ts');
console.log(safeEmploymentType('full-time')); // 'full-time'
console.log(safeEmploymentType('freelance')); // 'freelance'
console.log(safeEmploymentType('hacker')); // 'unknown'
console.log(safeEmploymentType(null)); // 'unknown'
```

---

## Fix 7 — Route collisions in Express app

**File:** `server/app.ts:23-25`

### Current code:

```ts
app.use('/api/jobs', jobsRouter);
app.use('/api/jobs', scoringRouter);
app.use('/api/jobs', tailorRouter);
```

### Problem:

Three separate routers mounted on the same base path. While Express matches by both method and path (so a `POST /api/jobs/fit-score` goes to scoringRouter, not jobsRouter), this creates:

- Confusing code navigation (which router handles what?)
- Risk of accidental route shadowing if paths overlap
- Hard to reason about middleware order

### Step-by-step fix:

**Step 1:** Open `server/app.ts`.

**Step 2:** Change the three route registrations (lines 23-25) to use distinct prefixes:

```ts
app.use('/api/jobs', jobsRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/tailor', tailorRouter);
```

**Step 3:** Update all frontend and backend callers of the scoring/tailor endpoints. Find and update these references:

| File                                  | Old URL               | New URL                         |
| ------------------------------------- | --------------------- | ------------------------------- |
| `server/routes/scoring.ts` (internal) | N/A                   | No change needed (router-level) |
| `server/scoring/tailor.ts` (internal) | N/A                   | No change needed                |
| `src/api/endpoint.ts` (frontend)      | `/api/jobs/fit-score` | `/api/scoring/fit-score`        |
| `src/api/endpoint.ts` (frontend)      | `/api/jobs/tailor`    | `/api/tailor/tailor`            |
| Any test file                         | `/api/jobs/fit-score` | `/api/scoring/fit-score`        |
| Any test file                         | `/api/jobs/tailor`    | `/api/tailor/tailor`            |

**Step 4:** Search for all references to `/api/jobs/fit-score` and `/api/jobs/tailor`:

```bash
cd "E:\all projects\scrapjob\applypilot"
rg -n "/api/jobs/fit-score|/api/jobs/tailor|/api/jobs/batch-fit-score" .
```

**Step 5:** Update every match found in Step 4.

### Verification:

```bash
cd "E:\all projects\scrapjob\applypilot"
rg -n "/api/jobs/(fit-score|tailor|batch-fit-score)" src/ server/ tests/
```

Should return **zero** matches after the fix.

---

## Verify Phase 1

After completing all 7 fixes, run this checklist:

### Checklist

- [ ] `npm run build` succeeds with no errors
- [ ] `npm run test` passes (all existing tests)
- [ ] CORS only allows listed origins (test with a different origin → expect 403 or preflight rejection)
- [ ] API call without auth token → 401 (except health and auth endpoints)
- [ ] Error response in test mode includes stack; in production mode shows only "internal server error"
- [ ] `DB_PATH=/tmp/evil.db` → falls back to default `data/` directory
- [ ] `.env` loaded only once from project root
- [ ] Employment type `'invalid'` maps to `'unknown'` without crashing
- [ ] Salary fields with non-number values default to `undefined`
- [ ] `/api/jobs/fit-score` returns 404; `/api/scoring/fit-score` returns 200 or proper error
- [ ] `/api/jobs/tailor` returns 404; `/api/tailor/tailor` returns 200 or proper error

### Quick test command:

```bash
cd "E:\all projects\scrapjob\applypilot"
npm run build 2>&1 | tail -5
npm run test 2>&1 | tail -20
```

### Next step:

After Phase 1 passes, proceed to **Phase 2 — Stability Fixes** (route conflicts on SSE/CRUD, non-deterministic scoring, route collision impacts).

---

## Summary Table

| #   | Fix                     | File                   | Lines   | Risk if Not Fixed                 |
| --- | ----------------------- | ---------------------- | ------- | --------------------------------- |
| 1   | CORS whitelist          | `server/app.ts`        | 16      | Any website can attack your API   |
| 2   | Auth middleware         | `server/app.ts`        | 23-25   | All data exposed anonymously      |
| 3   | Error sanitization      | `server/app.ts`        | 30-33   | Internal paths/secrets leaked     |
| 4   | DB path validation      | `server/config.ts`     | 35      | Arbitrary file write via symlink  |
| 5   | Single .env load        | `server/config.ts`     | 6-7     | Cross-project secret leakage      |
| 6   | Type cast safety        | `server/store/jobs.ts` | 137-139 | Runtime crashes on bad data       |
| 7   | Route prefix separation | `server/app.ts`        | 23-25   | Confusing routing, shadowing risk |
