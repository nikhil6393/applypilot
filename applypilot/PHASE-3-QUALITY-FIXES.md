# Phase 3 — Quality & Developer Experience (Detailed Implementation Guide)

> Focuses on adding ESLint, Prettier, `.env.example`, `.gitignore`, and consolidating test configurations.

---

## Table of Contents

1. [Fix 1 — Add ESLint Configuration](#fix-1--add-eslint-configuration)
2. [Fix 2 — Add Prettier Configuration](#fix-2--add-prettier-configuration)
3. [Fix 3 — Environment Variables Documentation (.env.example)](#fix-3--environment-variables-documentation-envexample)
4. [Fix 4 — Add Proper Root .gitignore](#fix-4--add-proper-root-gitignore)
5. [Fix 5 — Consolidate Test Suite & Vitest Setup](#fix-5--consolidate-test-suite--vitest-setup)
6. [Verify Phase 3](#verify-phase-3)

---

## Fix 1 — Add ESLint Configuration

**File:** `eslint.config.js` (Flat Config format)

### Problem:

Codebase lacked automated linting rules, resulting in inconsistent code style and undetected dead code / unused variables.

### Step-by-Step Fix:

1. Install ESLint dependencies:
   ```bash
   npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
   ```
2. Create `eslint.config.js` in project root:
   ```js
   import tsParser from '@typescript-eslint/parser';
   import tsPlugin from '@typescript-eslint/eslint-plugin';

   export default [
     {
       files: ['**/*.ts', '**/*.tsx'],
       languageOptions: {
         parser: tsParser,
         parserOptions: {
           ecmaVersion: 'latest',
           sourceType: 'module',
         },
       },
       plugins: {
         '@typescript-eslint': tsPlugin,
       },
       rules: {
         '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
         '@typescript-eslint/no-explicit-any': 'warn',
         'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
       },
     },
   ];
   ```
3. Add scripts to `package.json`:
   ```json
   "scripts": {
     "lint": "eslint .",
     "lint:fix": "eslint . --fix"
   }
   ```

---

## Fix 2 — Add Prettier Configuration

**File:** `.prettierrc`

### Problem:

Inconsistent formatting (tabs vs spaces, single vs double quotes) across frontend and server files.

### Step-by-Step Fix:

1. Create `.prettierrc` in project root:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "tabWidth": 2,
     "trailingComma": "es5",
     "printWidth": 100,
     "arrowParens": "always"
   }
   ```
2. Create `.prettierignore`:
   ```
   dist
   node_modules
   coverage
   *.json
   ```
3. Add format script to `package.json`:
   ```json
   "scripts": {
     "format": "prettier --write ."
   }
   ```

---

## Fix 3 — Environment Variables Documentation (.env.example)

**File:** `.env.example`

### Problem:

Developers and CI pipelines lacked documentation for required runtime environment variables.

### Step-by-Step Fix:

1. Create/update `.env.example` with documented keys and defaults:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

   # Database Path
   APPLYPILOT_DB_PATH=./data/applypilot.db

   # Security & Auth
   JWT_SECRET=replace_with_a_secure_random_jwt_secret_min_32_chars
   SESSION_SECRET=replace_with_a_secure_session_secret

   # AI Provider API Keys
   NVIDIA_NIM_API_KEY=
   OPENROUTER_API_KEY=
   GEMINI_API_KEY=
   ```

---

## Fix 4 — Add Proper Root .gitignore

**File:** `.gitignore`

### Problem:

Temporary logs, build artifacts, and scraped job data risks being accidentally committed into git repository.

### Step-by-Step Fix:

Create or verify `.gitignore`:

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment and Secrets
.env
.env.local
*.pem

# Database & Runtime Data
data/*.db
data/*.db-journal
scraped_jobs.json
found_response.json
found_line.json
linkedin-login-debug.html
linkedin-login-debug.png

# Logs & Temporary files
*.log
scratch/
test-results/
.DS_Store
```

---

## Fix 5 — Consolidate Test Suite & Vitest Setup

**File:** `vitest.config.ts`

### Problem:

Tests were split across `tests/` and `server/tests/` without a single unified test config or coverage runner.

### Step-by-Step Fix:

1. Install Vitest:
   ```bash
   npm install --save-dev vitest
   ```
2. Create `vitest.config.ts`:
   ```ts
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       include: ['tests/**/*.test.ts', 'server/tests/**/*.test.ts'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
       },
     },
   });
   ```
3. Update `package.json` test script:
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest"
   }
   ```

---

## Verify Phase 3

Execute quality tools to verify formatting and linting pass clean:

```bash
npm run lint
npm run format
npm test
```
