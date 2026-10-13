# Pre-Release & Deployment Checklist

> **Document Status:** Verified against active repository implementation.  
> **Target Release Team:** ApplyPilot Engineering & Operations.

This checklist must be executed sequentially before shipping any new release or image tag of ApplyPilot to production.

---

## 1. Code & Build Validation

- [ ] **Clean Git Working Tree:** Confirm no uncommitted edits or unintended temporary files exist in the repository (`git status`).
- [ ] **Dependency Audit:** Verify no extraneous or unregistered packages were introduced. Check `applypilot/package.json`.
- [ ] **Production Build Execution:** Run the full build command from the `applypilot` directory:
  ```bash
  npm run build
  ```
  - [ ] Exit code is `0`.
  - [ ] Vite emitted `dist/index.html` and bundled assets in `dist/assets/`.
  - [ ] esbuild generated `dist/server.cjs` and `dist/server.cjs.map`.
- [ ] **TypeScript Check Notice:**
  *Note:* Currently `npm run typecheck` (`tsc --noEmit`) fails due to missing `drizzle-orm` in root dependencies and relative import path in `naukri.adapter.ts`. Do not block release on this until resolved, provided `npm run build` succeeds cleanly.
- [ ] **Automated Test Run:**
  ```bash
  npm test
  ```
  - [ ] Core characterization, security, and packaging test suites pass.
  - [ ] Verify `server/tests/production-packaging.test.js` passes (4/4 green).

---

## 2. Environment Configuration & Secrets

- [ ] **Production Flag Set:** Confirm `NODE_ENV=production` is exported.
- [ ] **Session & JWT Secrets Configured:**
  - [ ] `SESSION_SECRET` is set to a cryptographically strong, random string (not default or placeholder).
  - [ ] `JWT_SECRET` is set to a cryptographically strong string (minimum 32 characters).
- [ ] **Demo Accounts Policy:**
  - [ ] If demo logins (`nikhil900285@gmail.com` / `nikhil123`) are required in production for QA or evaluation, set `ENABLE_DEMO_ACCOUNTS=true`.
  - [ ] If deploying a secure live customer environment, confirm `ENABLE_DEMO_ACCOUNTS` is omitted or set to `false`.
- [ ] **CORS Configuration:**
  - [ ] Ensure `ALLOWED_ORIGINS` reflects the production frontend domain (e.g. `https://applypilot.example.com`).
- [ ] **Cloud Storage & AI Keys (Optional):**
  - [ ] Cloudinary keys configured if resume hosting is needed (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
  - [ ] LLM fallback keys configured if cloud AI fallback is desired (`OPENROUTER_API_KEY` or `NVIDIA_API_KEY`).
  - [ ] Ollama URL set to accessible network endpoint (`http://ollama:11434` or host address) if local LLM is enabled.

---

## 3. Database & Storage Preparation

- [ ] **SQLite Backup Created:** Prior to container update, create a dated backup copy of the current database file:
  ```bash
  cp ./data/applypilot.db ./data/applypilot.db.pre_release_$(date +%Y%m%d_%H%M%S)
  ```
- [ ] **Volume Persistence Checked:** Confirm Docker deployment mounts host storage to `/app/data`:
  - `applypilot_data:/app/data` (Docker named volume) or `-v /host/path/data:/app/data`.
- [ ] **Permissions Verified:** Ensure target volume directory is writable by UID `1000` (user `node`):
  ```bash
  chown -R 1000:1000 /host/path/data
  ```
- [ ] **Schema Review:** Review `server/store/db.js` for any breaking changes to existing SQLite tables (`jobs`, `candidate_profiles`, `resume_versions`, `users`, `sessions`, `tracker`).

---

## 4. API & Frontend/Backend Compatibility

- [ ] **Route Prefix Integrity:** Confirm all API endpoints remain mounted under `/api/*`.
- [ ] **SPA Catch-All Routing:** Confirm non-API routes resolve to `dist/index.html` via Express static fallback.
- [ ] **Health Endpoint Routing:** Confirm `/health/live`, `/health/ready`, and `/api/health` remain unauthenticated and exempt from maintenance mode guards.
- [ ] **SSE Streaming Channels:** Verify `/api/jobs/stream-search` and `/api/monitor/stream` use standard SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`).

---

## 5. Container Build & Release Dispatch

- [ ] **Build Versioned Docker Image:**
  ```bash
  docker build -t applypilot:<version_tag> -t applypilot:latest .
  ```
- [ ] **Inspect Built Image Layers:**
  - [ ] Image uses unprivileged `node` user (`USER node`).
  - [ ] Exposes port 3000.
  - [ ] Built-in health check probe targeting `/health/live` is active.
- [ ] **Deploy Container:**
  ```bash
  docker compose up -d --no-deps --build app
  # Or standalone:
  docker run -d --name applypilot-app ... applypilot:<version_tag>
  ```

---

## 6. Post-Deployment Verification & Smoke Testing

- [ ] **Liveness Verification:**
  ```bash
  curl -I http://localhost:3000/health/live
  ```
  *Expected:* `HTTP/1.1 200 OK` with JSON `{"status": "live"}`.
- [ ] **Readiness & DB Connectivity Verification:**
  ```bash
  curl -I http://localhost:3000/health/ready
  ```
  *Expected:* `HTTP/1.1 200 OK` with JSON `{"status": "ready", "subsystems": {"database": "connected"}}`.
- [ ] **Frontend Asset Delivery:**
  - [ ] Load root URL (`http://localhost:3000`) in browser.
  - [ ] Check DevTools Console: zero 404s on script chunks or CSS bundles.
- [ ] **Authentication Smoke Test:**
  - [ ] Test user login or registration flow (`/api/auth/login`).
  - [ ] Verify JWT / session token returned and accepted by `/api/auth/me`.
- [ ] **Live Scraping Smoke Test:**
  - [ ] Perform a job search query in Discovery view.
  - [ ] Verify at least one real scraper adapter (Greenhouse, Lever, Ashby, or LinkedIn guest) returns records without 500 errors.
- [ ] **ATS Scorer & Resume Parser Smoke Test:**
  - [ ] Test sample resume upload or paste into Resume Studio (`/api/resume/parse`).
  - [ ] Verify instant ATS Quality Score is computed and returned (0–100).
- [ ] **Background Worker Verification:**
  - [ ] Check logs for scraper orchestrator initiation: `[monitor] Scrape cycle completed`.
  ```bash
  docker logs applypilot-app --tail 50
  ```

---

## 7. Rollback Readiness Sign-Off

- [ ] Previous stable Docker image tag is stored and verified on the host.
- [ ] Pre-release database snapshot timestamp is documented and accessible.
- [ ] Rollback runbook in `deployment/rollback.md` is reviewed by the deploying engineer.
- [ ] On-call engineer confirmed and available for post-release monitoring window (minimum 30 minutes).
