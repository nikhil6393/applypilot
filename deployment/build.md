# Build System & Artifact Compilation

> **Document Status:** Verified via live command execution against repository build scripts.  
> **Target System:** ApplyPilot Frontend (Vite) + Backend (esbuild / Node.js).

---

## 1. Prerequisites

### 1.1 Core Tools & Runtime
- **Node.js:** `v20.x` or `v22.x` (LTS recommended; tested with Node.js 22 on Alpine and Node.js on Windows).
- **npm:** `v10.x` or higher.
- **Python:** `python3` (Mandatory for compiling native C++ bindings for `better-sqlite3` via `node-gyp`).
- **C/C++ Build Tools:**
  - **Linux / Alpine:** `make`, `g++`, `gcc` (installed via `apk add --no-cache python3 make g++` in Dockerfile).
  - **Windows:** Visual Studio C++ Build Tools (`windows-build-tools` or Desktop development with C++).
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`).

---

## 2. Dependency Installation

The repository contains a monorepo workspace layout located in the `applypilot/` directory with sub-packages under `applypilot/packages/*`.

### 2.1 Standard Installation (From Subdirectory)
```bash
cd applypilot
npm install
```

### 2.2 Clean Production Installation (CI / Container)
```bash
cd applypilot
npm ci
```

### 2.3 Workspace Hierarchy & Internal Packages
The project manages 8 internal TypeScript packages linked into the main build:
- `@applypilot/domain` (`packages/domain`)
- `@applypilot/config` (`packages/config`)
- `@applypilot/scraping` (`packages/scraping`)
- `@applypilot/db` (`packages/db`)
- `@applypilot/scoring` (`packages/scoring`)
- `@applypilot/ai-local` (`packages/ai-local`)
- `@applypilot/parsing` (`packages/parsing`)
- `@applypilot/security` (`packages/security`)

*Note:* When installing dependencies in Docker, the root `package.json` and each package's individual `package.json` are copied prior to running `npm ci` to leverage Docker layer caching.

---

## 3. Verified Build Commands

The primary production build command is declared in `applypilot/package.json`:

```bash
npm run build
```

This command executes a two-phase compilation chain:

```bash
vite build && esbuild server.js --bundle --platform=node --format=cjs --packages=external --alias:@applypilot/scraping=./packages/scraping/src/index.ts --alias:@applypilot/parsing=./packages/parsing/src/index.ts --alias:@applypilot/scoring=./packages/scoring/src/index.ts --alias:@applypilot/security=./packages/security/src/index.ts --alias:@applypilot/db=./packages/db/src/index.ts --alias:@applypilot/domain=./packages/domain/src/index.ts --alias:@applypilot/config=./packages/config/src/index.ts --alias:@applypilot/ai-local=./packages/ai-local/src/index.ts --sourcemap --outfile=dist/server.cjs
```

### Phase 1: Frontend SPA Compilation (`vite build`)
- Compiles React 19, TypeScript, and Tailwind CSS v4 assets.
- Transforms 2,100+ modules into static web bundles.
- Emits hashed JavaScript chunks, CSS bundles, and an entry `dist/index.html`.

### Phase 2: Backend Bundling (`esbuild server.js`)
- **Entry point:** `server.js` (Express server).
- **Target Platform:** Node.js (`--platform=node`).
- **Format:** CommonJS (`--format=cjs`).
- **External Dependencies:** Preserved as external node_modules (`--packages=external`).
- **Monorepo Aliases:** Resolves internal package aliases (`@applypilot/*`) directly to TypeScript sources (`./packages/*/src/index.ts`).
- **Output Artifacts:** `dist/server.cjs` (approx. 650 KB) and source map `dist/server.cjs.map` (approx. 1.2 MB).

### 3.1 Auxiliary Scripts
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run start` | `node dist/server.cjs` | Runs the compiled production server. |
| `npm run preview` | `vite preview` | Previews the static Vite frontend locally. |
| `npm run clean` | `node -e "const fs = require('fs'); ['dist'].forEach(p => fs.rmSync(p, { recursive: true, force: true }))"` | Removes compiled `dist/` artifacts. |
| `npm run typecheck` | `tsc --noEmit` | Validates TypeScript types across the project. *(See Known Build Issues below).* |
| `npm test` | `vitest run` | Executes unit and integration test suites. |

---

## 4. Generated Artifacts Inventory

Following a successful `npm run build`, the following directory structure is produced in `applypilot/dist/`:

```
dist/
├── index.html                    # Root SPA entrypoint (~2.3 KB)
├── server.cjs                    # Compiled Express backend (~650 KB)
├── server.cjs.map                # Backend source map (~1.2 MB)
├── favicon.png                   # Favicon icon
├── applypilot-logo.png           # Brand asset
├── dashboard-hero.webp           # Dashboard graphic
└── assets/
    ├── index-[hash].js           # Main React SPA chunk (~526 KB)
    ├── index-[hash].css          # Global Tailwind CSS bundle (~172 KB)
    ├── DiscoveryStep-[hash].js   # Job discovery view chunk
    ├── DiscoveryStep-[hash].css  # Job discovery styles
    ├── ResumeStep-[hash].js      # Resume studio view chunk
    ├── TailorStep-[hash].js      # Tailoring engine view chunk
    ├── AdminLayout-[hash].js     # Admin control panel chunk
    └── [icon/util chunks].js     # Dynamically imported utility modules
```

Additionally, an archive file `applypilot_deploy.tar.gz` (15.8 MB) exists in the repository root of `applypilot`. Its contents represent a snapshot packaging of the project files.

---

## 5. Platform-Specific Build Instructions

### 5.1 Docker Container Build (Recommended for Production)
The repository includes a production-ready, multi-stage `Dockerfile`:

```bash
cd applypilot
docker build -t applypilot:latest .
```

- **Stage 1 (builder):** Installs native build tools (`python3`, `make`, `g++`), copies manifests, executes `npm ci`, copies source files, and runs `npm run build`.
- **Stage 2 (runner):** Minimal runtime image based on `node:22-alpine`. Installs only production dependencies via `npm ci --omit=dev`, copies built `dist/` and server assets from builder, creates `/app/data` with permissions for non-root user `node`, and sets up health check.

### 5.2 Windows Local Host Build
1. Open PowerShell or Command Prompt.
2. Ensure C++ build tools and Python are accessible on `PATH`.
3. Run:
   ```cmd
   cd applypilot
   npm install
   npm run build
   ```
4. Verify artifacts in `applypilot\dist`.

### 5.3 Linux / macOS Bare Metal Build
```bash
sudo apt-get install -y python3 make g++ # (Ubuntu/Debian)
cd applypilot
npm ci
npm run build
```

---

## 6. Critical Build Gaps & Known Failures Found

During live audit execution, the following discrepancies and build failures were identified:

### 1. `npm run typecheck` (`tsc --noEmit`) Exits with Code 1
When executing `tsc --noEmit`, TypeScript compilation fails with 7 module resolution errors:
- `packages/db/src/client.ts(2,25): error TS2307: Cannot find module 'drizzle-orm/node-postgres'`
- `packages/db/src/schema/*.ts: error TS2307: Cannot find module 'drizzle-orm/pg-core'` (5 schema files)
- `packages/scraping/src/adapters/naukri.adapter.ts(4,32): error TS2307: Cannot find module '../../../../server/scrape/naukri-advanced.js'`

**Root Cause:**
- `drizzle-orm` is listed in `package.json` under `packages/db/package.json` or as a peer, but is **missing** from root `applypilot/package.json` `dependencies` (only `drizzle-kit` is in devDependencies).
- Relative import path in `naukri.adapter.ts` has an extra parent step `../../../../server` that does not resolve cleanly under root `tsconfig.json`.

**Impact on CI/CD:**
The current GitHub Actions pipeline (`.github/workflows/ci.yml`) executes `run: npx tsc --noEmit` on Step 26. **Any push or pull request currently triggers a failure at this step** unless TypeScript errors are resolved or excluded.

### 2. `esbuild` Warnings on `import.meta` in CommonJS Mode
When running `npm run build`, esbuild outputs warnings:
```
▲ [WARNING] "import.meta" is not available with the "cjs" output format and will be empty [empty-import-meta]
```
**Impact:** Safe at runtime because `server.js` guards `import.meta` behind checks like `typeof __dirname !== 'undefined' ? __dirname : ...`. However, setting the esbuild output format or refactoring to native ESM would eliminate the warning.

### 3. Missing `server.cjs` in Clean Clones
In a fresh repository clone before `npm run build` is executed, `dist/` only contains static frontend files. Running `npm run start` without running `npm run build` first will fail with `Cannot find module 'dist/server.cjs'`.
