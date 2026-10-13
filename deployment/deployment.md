# Deployment Architecture & Execution Runbook

> **Document Status:** Verified against active Dockerfile, docker-compose.yml, and server runtime code.  
> **Target System:** ApplyPilot Production Container & Server Runbook.

---

## 1. Actual Deployment Architecture

ApplyPilot is architected as a **unified single-process container**:

```
                  ┌────────────────────────────────────────┐
                  │          Inbound Web Traffic           │
                  │             (Port 3000)                │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    Express HTTP Server (server.cjs)    │
                  │   Non-root user: node (UID 1000)       │
                  ├───────────────────┬────────────────────┤
                  │                   │                    │
                  ▼                   ▼                    ▼
          ┌──────────────┐     ┌──────────────┐    ┌──────────────┐
          │  Static SPA  │     │   API Core   │    │ Health Probes│
          │ (Vite /dist) │     │   (/api/*)   │    │  (/health/*) │
          └──────────────┘     └──────┬───────┘    └──────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
   ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
   │ SQLite Database │       │ Background Live │       │ Bulk Tailoring  │
   │  applypilot.db  │       │ Scraping Engine │       │ In-Memory Queue │
   │ (/app/data vol) │       │ (180s interval) │       │ (EventEmitter)  │
   └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Key Architectural Characteristics:
1. **Single Entrypoint:** Both the frontend Single-Page Application (React 19) and the backend API (Express) are served by the same Node process running on port 3000.
2. **Reverse Proxy Friendly:** All API routes are prefixed under `/api/*` and health probes under `/health/*` (or `/api/health/*`), while all other routes fall back to `dist/index.html` via Express SPA routing.
3. **Local-First SQLite Persistence:** The primary operational database is an embedded SQLite file (`/app/data/applypilot.db` in Docker) accessed via `better-sqlite3`.
4. **Autonomous In-Process Background Workers:**
   - Background job scraping is driven by `scrapeOrchestrator.start(180000)` running inside `server.js` every 3 minutes.
   - Bulk tailoring runs through an in-process EventEmitter worker queue (`bulkTailorQueue`).
5. **Zero Mandatory External Cloud Services:** The app boots and provides complete ATS scoring, heuristic parsing, and job matching without third-party network dependencies.

---

## 2. Deployment Prerequisites

Before deploying the container or service, ensure the following are available on the host:
- **Docker Engine:** Version `>= 24.0` with Docker Compose v2.
- **Persistent Storage Directory:** A directory on the host to mount to `/app/data` (ensuring SQLite data and uploaded files survive container recreation).
- **Available Port:** Host port 3000 (or custom mapped port).
- **Network Access:** Outbound HTTPS access (TCP 443) for scraper adapters to access job board feeds (Greenhouse, Lever, Ashby, LinkedIn guest API).

---

## 3. Verified Deployment Procedures

### Method 1: Docker Compose (Standard Production — Recommended)

The repository provides a pre-configured `docker-compose.yml` in the `applypilot/` directory:

```bash
# 1. Clone repository and navigate to applypilot directory
cd applypilot

# 2. Prepare environment file
cp .env.example .env
# Edit .env with production secrets (SESSION_SECRET, JWT_SECRET, etc.)

# 3. Build and launch standalone container
docker compose up -d --build app

# 4. Inspect container status and logs
docker compose ps
docker compose logs -f app
```

#### Optional: Enterprise Topology (Postgres + Redis + Ollama)
If using the enterprise profile defined in `docker-compose.yml`:
```bash
docker compose --profile full up -d --build
```
This launches:
- `applypilot-app` (Port 3000)
- `applypilot-postgres` (PostgreSQL 16 on Port 5432)
- `applypilot-redis` (Redis 7 on Port 6379)
- `applypilot-ollama` (Ollama AI server on Port 11434)

---

### Method 2: Standalone Docker Run

If running without Docker Compose:

```bash
# 1. Build image
cd applypilot
docker build -t applypilot:1.0.0 .

# 2. Create persistent volume
docker volume create applypilot_data

# 3. Run container
docker run -d \
  --name applypilot-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DB_PATH=/app/data/applypilot.db \
  -e SESSION_SECRET="your-high-entropy-session-secret" \
  -e JWT_SECRET="your-high-entropy-jwt-secret-min-32-chars" \
  -v applypilot_data:/app/data \
  applypilot:1.0.0
```

---

### Method 3: Bare Metal / Virtual Machine (Systemd / Node)

If running without Docker on a Linux server:

1. Install Node.js 20 or 22, python3, make, and g++.
2. Clone repository and install dependencies:
   ```bash
   cd applypilot
   npm ci
   npm run build
   ```
3. Create systemd service `/etc/systemd/system/applypilot.service`:
   ```ini
   [Unit]
   Description=ApplyPilot Job Platform
   After=network.target

   [Service]
   Type=simple
   User=applypilot
   WorkingDirectory=/opt/applypilot
   Environment=NODE_ENV=production
   Environment=PORT=3000
   Environment=DB_PATH=/opt/applypilot/data/applypilot.db
   EnvironmentFile=/opt/applypilot/.env
   ExecStart=/usr/bin/node dist/server.cjs
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
4. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now applypilot
   ```

---

## 4. Health Checks & Verification Steps

The server implements native liveness and readiness probes defined in `server/routes/health.js` and wired into the `Dockerfile`:

### 4.1 Liveness Probe (`GET /health/live`)
- **URL:** `http://localhost:3000/health/live` (also mirrored at `/api/health/live`).
- **Expected Status:** `200 OK`.
- **Response Format:**
  ```json
  { "status": "live", "timestamp": "2026-10-07T17:35:58.000Z" }
  ```
- **Used by:** Docker container `HEALTHCHECK` directive (interval 30s, timeout 5s, retries 3).

### 4.2 Readiness Probe (`GET /health/ready`)
- **URL:** `http://localhost:3000/health/ready` (also mirrored at `/api/health/ready`).
- **Checks:** Verifies SQLite database responsiveness by issuing `SELECT 1`.
- **Expected Status:** `200 OK` (returns `503 Service Unavailable` if database connection fails).
- **Response Format:**
  ```json
  {
    "status": "ready",
    "timestamp": "2026-10-07T17:35:58.000Z",
    "subsystems": {
      "database": "connected",
      "queue": "ready",
      "aiLocal": "ready"
    }
  }
  ```

### 4.3 Deep Health Probe (`GET /health` or `GET /api/health`)
- **Checks:** Uptime, memory usage, SQLite connectivity, and LinkedIn guest scraper circuit-breaker status.
- **Expected Status:** `200 OK` (returns `503` if LinkedIn is down and DB is disconnected).

---

## 5. Critical Deployment Failure Points Found in the Project

The following specific failure modes were identified during project audit:

### 1. Missing Volume Mount Wipes SQLite Database on Every Redeploy
- **Issue:** SQLite database resides at `/app/data/applypilot.db`.
- **Failure:** If the operator runs `docker run` without `-v /host/path:/app/data` or `applypilot_data:/app/data`, all user accounts, saved resumes, tracker entries, and scrape cache will be deleted whenever the container is updated or restarted.

### 2. Static File Resolution Bug in `server.js` Line 1671
- **Code:**
  ```javascript
  const distPath = fs.existsSync(path.join(APP_ROOT, 'index.html'))
    ? APP_ROOT
    : fs.existsSync(path.join(APP_ROOT, 'dist', 'index.html'))
      ? path.join(APP_ROOT, 'dist')
      : path.join(process.cwd(), 'dist');
  ```
- **Failure:** If someone runs `NODE_ENV=production node server.js` from the `applypilot/` directory, `APP_ROOT` is `applypilot/` which contains the *unbundled* Vite source `index.html`. The server will attempt to serve unbundled JSX and root files directly rather than `dist/`.
- **Mitigation:** Always run via compiled entrypoint `node dist/server.cjs` (as done in `Dockerfile`).

### 3. Demo Accounts Locked Out by Default in Production
- **Issue:** `server/security/auth.js` explicitly blocks demo account seeding when `NODE_ENV=production`:
  ```javascript
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_ACCOUNTS !== 'true') return;
  ```
- **Failure:** Operators expecting demo credentials (`nikhil900285@gmail.com` / `nikhil123` or `demo@applypilot.io`) to work in production will receive 401 Unauthorized unless `ENABLE_DEMO_ACCOUNTS=true` is set in the environment.

### 4. Readme Credential Mismatch
- **Issue:** `README.md` documents demo password as `nikhil12`.
- **Reality:** In `server/security/auth.js`, the seeded password for `nikhil900285@gmail.com` is `nikhil123`.

### 5. Alpine Native Compilation (`better-sqlite3`)
- **Issue:** `better-sqlite3` requires pre-compilation during `npm ci` using `python3`, `make`, and `g++`.
- **Failure:** Custom Dockerfiles omitting build tools will crash on `npm ci` with node-gyp compilation errors. The existing multi-stage `Dockerfile` handles this correctly.

### 6. Background Monitor Port / Memory Leak if Container Not Handled Cleanly
- **Issue:** The scrape orchestrator runs a `setInterval` timer (180s) and SSE manager maintains open HTTP client streams.
- **Handling:** `server.js` contains a `gracefulShutdown` handler on `SIGINT` and `SIGTERM` with a 3-second timeout that calls `scrapeOrchestrator.stop()`, `monitorSseManager.close()`, and `closeDb()`. Ensure orchestration engines (Docker, K8s) send `SIGTERM` and give at least 5s grace period before `SIGKILL`.
