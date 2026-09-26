# Phase 4 — Architecture & Performance (Detailed Implementation Guide) [✅ COMPLETED]

> Focuses on externalizing LaTeX templates, robust SSE disconnect handling, AI provider chain memoization, and cleaning tsconfig files.

---

## Table of Contents

1. [Fix 1 — Externalize Hardcoded LaTeX Templates](#fix-1--externalize-hardcoded-latex-templates)
2. [Fix 2 — SSE Error Handling & Heartbeat Protocol](#fix-2--sse-error-handling--heartbeat-protocol)
3. [Fix 3 — Memoize AI Provider Chain](#fix-3--memoize-ai-provider-chain)
4. [Fix 4 — Clean tsconfig.json & Remove Dead Configs](#fix-4--clean-tsconfigjson--remove-dead-configs)
5. [Verify Phase 4](#verify-phase-4)

---

## Fix 1 — Externalize Hardcoded LaTeX Templates

**Files:** `server/store/db.ts`, `server/templates/`

### Problem:

Large multiline LaTeX resume templates were embedded directly inside source TypeScript files (`db.ts`), cluttering business logic and preventing template reusability/customization.

### Step-by-Step Fix:

1. Create a dedicated templates directory:
   ```bash
   mkdir -p server/templates
   ```
2. Extract LaTeX contents into standalone template assets:
   - `server/templates/classic.tex`
   - `server/templates/modern.tex`
3. Create a template loader utility `server/templates/index.ts`:
   ```ts
   import fs from 'node:fs';
   import path from 'node:path';

   const TEMPLATES_DIR = path.join(process.cwd(), 'server', 'templates');

   export function getLatexTemplate(name: 'classic' | 'modern'): string {
     const filePath = path.join(TEMPLATES_DIR, `${name}.tex`);
     if (fs.existsSync(filePath)) {
       return fs.readFileSync(filePath, 'utf-8');
     }
     throw new Error(`LaTeX template '${name}' not found at ${filePath}`);
   }
   ```
4. Replace embedded strings in `server/store/db.ts` with calls to `getLatexTemplate('classic')`.

---

## Fix 2 — SSE Error Handling & Heartbeat Protocol

**File:** `server/routes/jobs.ts`

### Problem:

Server-Sent Events (SSE) streaming connections had no disconnect handler (`req.on('close')`), unhandled `res.write()` errors on dropped sockets, or keep-alive ping interval.

### Step-by-Step Fix:

1. Open `server/routes/jobs.ts`.
2. Add a robust SSE setup helper:
   ```ts
   export function setupSSEHeaders(res: Response): void {
     res.setHeader('Content-Type', 'text/event-stream');
     res.setHeader('Cache-Control', 'no-cache, no-transform');
     res.setHeader('Connection', 'keep-alive');
     res.setHeader('X-Accel-Buffering', 'no');
     res.flushHeaders?.();
   }
   ```
3. Add heartbeat and disconnect handler in SSE route:
   ```ts
   // Send keepalive comment every 15 seconds
   const heartbeatInterval = setInterval(() => {
     try {
       res.write(':keepalive\n\n');
     } catch (err) {
       clearInterval(heartbeatInterval);
     }
   }, 15000);

   // Clean up stream listeners on client abort
   req.on('close', () => {
     clearInterval(heartbeatInterval);
     res.end();
   });
   ```

---

## Fix 3 — Memoize AI Provider Chain

**File:** `server/ai/index.ts`

### Problem:

`_chain` variable was assigned but never reused, causing `getProviderChain()` to reconstruct array objects and configuration objects on every AI completion request.

### Step-by-Step Fix:

1. Open `server/ai/index.ts`.
2. Update provider chain caching:
   ```ts
   let cachedChain: AIProvider[] | null = null;

   export function getProviderChain(): AIProvider[] {
     if (cachedChain && cachedChain.length > 0) {
       return cachedChain;
     }

     const chain: AIProvider[] = [];
     if (process.env.NVIDIA_NIM_API_KEY) chain.push(nvidiaProvider);
     if (process.env.OPENROUTER_API_KEY) chain.push(openrouterProvider);
     if (process.env.GEMINI_API_KEY) chain.push(geminiProvider);
     chain.push(heuristicProvider);

     cachedChain = chain;
     return cachedChain;
   }

   export function invalidateProviderChain(): void {
     cachedChain = null;
   }
   ```

---

## Fix 4 — Clean tsconfig.json & Remove Dead Configs

**Files:** `tsconfig.json`, `tsconfig.base.json`

### Problem:

`tsconfig.json` contained legacy options (`experimentalDecorators`, `useDefineForClassFields`) for non-existent class decorators, and `tsconfig.base.json` was an unreferenced dead configuration file.

### Step-by-Step Fix:

1. Delete unreferenced `tsconfig.base.json`:
   ```bash
   rm tsconfig.base.json
   ```
2. Clean `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "NodeNext",
       "moduleResolution": "NodeNext",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "jsx": "react-jsx",
       "strict": true,
       "skipLibCheck": true,
       "allowJs": true,
       "noEmit": true,
       "isolatedModules": true
     },
     "include": ["src", "server", "shared"]
   }
   ```

---

## Verify Phase 4

Verify TypeScript compilation and test suite:

```bash
npx tsc --noEmit
npm test
```
