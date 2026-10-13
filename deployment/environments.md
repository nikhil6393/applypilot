# Environment & Configuration Specification

> **Document Status:** Verified against active repository code and runtime analysis.  
> **Target System:** ApplyPilot (Single-service Express API + Vite SPA Frontend).

---

## 1. Environment Topologies

The repository defines two runtime environments in code and configuration, with a theoretical staging tier that does not exist in code:

| Environment | Verification Status | Architecture & Setup |
| :--- | :--- | :--- |
| **Development** | **VERIFIED** | Local machine run (`npm run dev` via `tsx server.js`). Vite runs as Express middleware (`createViteServer` with HMR). Database defaults to local SQLite (`./data/applypilot.db`). In-process background workers and event emitter queues. Windows launcher scripts (`START_SERVER.bat`, `run.bat`, `run.ps1`) auto-kill port 3000 conflicts and launch Google Chrome. |
| **Staging** | **UNKNOWN / NOT IMPLEMENTED** | No staging configuration, Docker profile, deployment target, or CI pipeline exists in the codebase. Staging must be mirrored manually if required. |
| **Production** | **VERIFIED** | Multi-stage Docker build (`node:22-alpine` builder & runner). Backend bundled via `esbuild` to `dist/server.cjs`. Frontend pre-compiled via `vite build` into static assets in `dist/`. Unified Express server serves static assets and API routes on port 3000. Standalone runs utilize persistent SQLite volume (`/app/data`). Compose file supports optional `enterprise`/`full` profiles (PostgreSQL 16, Redis 7, Ollama). |

---

## 2. Complete Environment Variables Specification

The table below catalogs all environment variables referenced across the codebase (`server.js`, `server/**/*.js`, `packages/config/src/index.ts`, `Dockerfile`, `docker-compose.yml`, and `.env.example`).

### 2.1 Core Network & Server Runtime

| Variable | Type | Default | Required? | Purpose & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Integer | `3000` (or `5000` in `applypilot/.env.example`) | No | HTTP listener port. `Dockerfile` exposes `3000`. Windows scripts target `3000`. |
| `NODE_ENV` | String | `'development'` | Yes | `'development'`, `'production'`, or `'test'`. When set to `'production'`, Vite dev middleware is disabled and static SPA files from `dist/` are served. Also controls demo account seeding. |
| `ALLOWED_ORIGINS` / `CORS_ORIGINS` | CSV String | `http://localhost:5173,http://localhost:3000` | No | Comma-separated CORS allowed origins. Handled in `packages/config` and Express CORS middleware. |
| `APP_URL` | URL | `http://localhost:3000` | No | Base application URL used for OAuth callbacks (LinkedIn OAuth redirect URL). |
| `LOG_FORMAT` | String | `'json'` (in Docker) | No | Logging format (`'json'` vs text logs). Set in `Dockerfile` and `docker-compose.yml`. |
| `LOG_LEVEL` | String | `'info'` (in Docker) | No | Minimum logging verbosity (`'debug'`, `'info'`, `'warn'`, `'error'`). |
| `AUTO_OPEN` | Boolean String | `undefined` (false) | No | When set to `'true'`, `server.js` attempts to automatically launch the host browser (Chrome/Chromium) upon server startup. (Disabled by default in containers). |

### 2.2 Persistence & Database Configuration

| Variable | Type | Default | Required? | Purpose & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `DB_PATH` | File Path | `./data/applypilot.db` | No | Filepath to local SQLite database. In Docker, set to `/app/data/applypilot.db`. |
| `APPLYPILOT_DB_PATH` | File Path | `undefined` | No | Secondary fallback alias for `DB_PATH` checked in `server/store/db.js`. |
| `DATABASE_URL` | Connection URI | `undefined` | Optional | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`). Used by `@applypilot/db` (`packages/db/src/client.ts`). **Note:** Active production server (`server.js`) uses SQLite; PostgreSQL is only leveraged by internal packages / enterprise compose profile. |
| `REDIS_URL` | Connection URI | `undefined` | Optional | Redis connection string. Parsed in `packages/config`. **Note:** Redis is not currently imported in active runtime paths. |

### 2.3 Security, Authentication & Session Secrets

| Variable | Type | Default | Required in Prod? | Purpose & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `SESSION_SECRET` | String | `undefined` | **YES** | Secret key for signing session tokens and state parameters. Must be high-entropy in production. |
| `JWT_SECRET` | String | `undefined` | **YES** | Secret key for signing candidate JWT tokens (minimum 32 characters recommended). |
| `ENABLE_DEMO_ACCOUNTS` | Boolean String | `'false'` in prod | No | When `NODE_ENV=production`, demo accounts (e.g., `nikhil900285@gmail.com`) are **blocked** from seeding unless `ENABLE_DEMO_ACCOUNTS=true` is explicitly provided. |
| `GOOGLE_CLIENT_ID` | String | `undefined` | Optional | Google OAuth 2.0 Client ID for Google Sign-In verification in `server/security/auth.js`. |
| `LINKEDIN_CLIENT_ID` | String | `undefined` | Optional | LinkedIn OAuth 2.0 Client ID for official user authorization flow. |
| `LINKEDIN_CLIENT_SECRET` | String | `undefined` | Optional | LinkedIn OAuth 2.0 Client Secret for exchanging authorization codes. |

### 2.4 Cloud AI & Storage Credentials (Fallbacks / Add-ons)

*Core discovery, heuristic parsing, and ATS v2 scoring function 100% offline without any API keys.*

| Variable | Type | Default | Required? | Purpose & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | Secret String | `undefined` | No | Optional API key for cloud LLM reasoning (`meta-llama/llama-3.3-70b-instruct`). |
| `OPENROUTER_MODEL` | String | `meta-llama/llama-3.3-70b-instruct` | No | Model name override for OpenRouter calls. |
| `NVIDIA_API_KEY` / `NVIDIA_NIM_API_KEY` | Secret String | `undefined` | No | Optional fallback API key for NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`). |
| `GEMINI_API_KEY` | Secret String | `undefined` | No | Optional Google Gemini key used for semantic embeddings in `server/scoring/semantic.js`. |
| `OLLAMA_BASE_URL` | URL | `http://127.0.0.1:11434` (or `http://ollama:11434` in Docker) | No | Self-hosted Ollama server endpoint for zero-cloud AI execution. |
| `OLLAMA_MODEL` | String | `llama3.2:latest` | No | Default local Ollama LLM model. |
| `EMBEDDING_MODEL` | String | `nomic-embed-text` | No | Local Ollama embedding model name. |
| `CLOUDINARY_CLOUD_NAME` | String | `undefined` | Optional | Cloudinary cloud identifier for resume PDF & profile photo storage. Without this, resumes are parsed but not permanently hosted in cloud; photos fall back to SQLite base64. |
| `CLOUDINARY_API_KEY` | String | `undefined` | Optional | Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | Secret String | `undefined` | Optional | Cloudinary API Secret. Guarded in `server/routes/resume.js`. |

### 2.5 Operational & Tuning Variables

| Variable | Type | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `SCRAPE_TIMEOUT_MS` | Integer | `15000` | HTTP timeout (milliseconds) for scraper fetches (LinkedIn guest, Greenhouse, Lever, Ashby). |
| `FIT_THRESHOLD` | Integer | `60` | Minimum score threshold (0–100) for high-match candidate recommendations. |
| `STORAGE_MODE` | String | `'local'` | `'local'` or `'s3'`. Currently local disk persistence is implemented. |
| `UPLOAD_DIR` | File Path | `./data/uploads` | Directory for staged resume uploads. |
| `MAX_UPLOAD_MB` | Integer | `20` | Max file upload limit in megabytes. |

---

## 3. Configuration & Behavioral Differences

| Feature / Behavior | Development (`NODE_ENV=development`) | Production (`NODE_ENV=production`) |
| :--- | :--- | :--- |
| **Frontend Serving** | Vite Dev Server with instant Hot Module Replacement (HMR) via middleware. | Pre-compiled static assets served from `dist/` with immutable caching headers. |
| **Demo User Seeding** | Auto-seeded on every boot (`nikhil900285@gmail.com`, `demo@applypilot.io`). | **Disabled** by default unless `ENABLE_DEMO_ACCOUNTS=true` is set in environment. |
| **CORS Policy** | Permissive for `localhost:5173` (Vite dev port) and `localhost:3000`. | Strictly bound to configured `ALLOWED_ORIGINS`. |
| **Container User** | N/A (runs under developer host user). | Enforced unprivileged `USER node` (UID 1000) inside container. |
| **Browser Auto-Open** | Triggered by Windows launcher scripts and `AUTO_OPEN=true`. | Suppressed (`AUTO_OPEN` defaults to unset). |
| **Rate Limiting** | Active but generous across auth and application endpoints. | Strictly enforced (auth: 20 per 15 min; apply: 30 per 15 min). |

---

## 4. Secrets Handling & Storage

- **Local Storage:** Handled exclusively via `.env` loaded via `dotenv.config()` at server initialization in `server.js`.
- **Repository Safety:** `.env` and `.env.local` are strictly ignored in `.gitignore` and `.dockerignore`.
- **Production Injection:** In containerized environments, secrets must be passed via Docker environment files (`--env-file`) or Docker Compose environment blocks.
- **Current Limitation / Gap:** There is no integration with secret management services (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, or Kubernetes Secrets). Environment variables reside in process memory.

---

## 5. Required Services & Dependencies

### 5.1 Hard Runtime Requirements (Standalone Production)
1. **Node.js Runtime:** Version `>= 20.0.0` (Docker image uses `node:22-alpine`).
2. **C/C++ Build Toolchain (Build Time Only):** `python3`, `make`, `g++` required during `npm ci` for native compilation of `better-sqlite3`.
3. **Writable Volume:** Mounted directory at `/app/data` (must be owned by UID `1000:1000` / `node:node`) for SQLite database `applypilot.db` and upload staging.

### 5.2 Optional / Auxiliary Services
1. **Ollama Service:** Required only if local LLM inference is enabled instead of heuristic fallbacks.
2. **PostgreSQL 16 & Redis 7:** Defined in `docker-compose.yml` under `enterprise` and `full` profiles; not required for standalone core application operations.
3. **Cloudinary Service:** Required only if cloud CDN hosting of candidate resume files and avatars is required.

---

## 6. Verified vs Unknown Matrix

| Aspect | Status | Details |
| :--- | :--- | :--- |
| Standalone Docker Setup | **VERIFIED** | Multi-stage Dockerfile builds and runs cleanly with non-root user. |
| SQLite Persistence Path | **VERIFIED** | Verified in `server/store/db.js` (`DB_PATH` or `/app/data/applypilot.db`). |
| In-Process Background Workers | **VERIFIED** | Scrape orchestrator runs on 180s timer; bulk tailor uses in-memory EventEmitter. |
| Staging Environment Configuration | **UNKNOWN / NEEDS CONFIRMATION** | No staging environment or configuration template exists. |
| Remote Cloud Hosting Provider | **UNKNOWN / NEEDS CONFIRMATION** | No cloud target (AWS ECS, GCP Cloud Run, Azure Container Apps, Render, Railway, Fly.io) has committed infrastructure-as-code or manifests. |
| PostgreSQL Migration in Active Runtime | **UNKNOWN / NEEDS CONFIRMATION** | Drizzle schemas exist in `packages/db`, but runtime server does not bind them to API requests. |
