# ApplyPilot Deployment Guide & Workflow

This document explains how ApplyPilot is deployed on **Antideploy**, how the architecture works, and how to safely update the live deployment **only after you commit** your changes.

---

## 1. Live Deployment Details

- **Live URL**: [https://applypilot.antideploy.app](https://applypilot.antideploy.app)
- **Application ID**: `3a737fae-58b9-4eb9-a8af-89c893b1ef79`
- **Antideploy Account**: `nikhil900285@gmail.com (signs in with GitHub)`
- **Console Dashboard**: [https://antideploy.com/app/3a737fae-58b9-4eb9-a8af-89c893b1ef79](https://antideploy.com/app/3a737fae-58b9-4eb9-a8af-89c893b1ef79)
- **Administrator Account**:
  - **Email**: `nikhil900285@gmail.com`
  - **Password**: `nikhil123`
  - **Role**: `admin` *(Lead Cloud Architect)*

---

## 2. Commit-First Deployment Workflow

> **Key Rule**: Editing files locally on your computer does **NOT** change the live website. Your live site runs in an isolated container snapshot. Production only updates when you explicitly build and deploy a committed version.

### The Standard Everyday Workflow

```
[Local Editing & Testing] ➔ [Git Commit] ➔ [Deploy Trigger] ➔ [Live at applypilot.antideploy.app]
```

1. **Develop locally**: Run `npm run dev` and test your changes at `http://localhost:3000`.
2. **Review your diff**: `git status` / `git diff`.
3. **Commit your work**:
   ```bash
   git add .
   git commit -m "feat: updated job scraper and dashboard layout"
   ```
4. **Deploy the committed code** using one of the methods below.

---

## 3. How to Deploy After a Commit

### Method A: Deploy on `git push` (Automated GitHub CI/CD)

Once your GitHub repository (`nikhil6393/applypilot`) is linked in the Antideploy Dashboard with **Deploy on Push** turned on:

```bash
# 1. Commit your changes
git add .
git commit -m "Your commit message"

# 2. Push to GitHub — Antideploy automatically builds and deploys this commit
git push origin convert-to-javascript
```

- Antideploy automatically downloads the new commit.
- Runs the container build, runs health checks, and switches traffic with zero downtime.

---

### Method B: Deploy via CLI (API Push)

If you prefer to deploy directly from your local terminal after committing:

1. **Build the production bundle**:
   ```bash
   npm run build
   ```
2. **Archive and upload to Antideploy**:
   ```bash
   tar czf - --exclude=.git --exclude=node_modules . | curl -sS -X POST "https://antideploy.com/api/v1/deploy?applicationId=3a737fae-58b9-4eb9-a8af-89c893b1ef79" -H "authorization: Bearer $TOKEN" -F "archive=@-"
   ```
   *(Note: `$TOKEN` is read directly from `~/.antideploy/config.json`).*

---

### Method C: Deploy via AI Assistant

At any point after making commits, you can simply say in the chat:
> *"Deploy my latest changes"*

The assistant will build the project, create the archive, push it to Antideploy, and report back when the live URL is ready.

---

## 4. Why Antideploy (vs Serverless Platforms like Vercel)

ApplyPilot is designed to run in a dedicated, always-on container environment:

| Feature | Serverless (e.g. Vercel) | Antideploy (Containers) |
| :--- | :--- | :--- |
| **Database (`better-sqlite3`)** | ❌ Ephemeral disk wipes data on timeout |  Full disk persistence or attached Neon Postgres |
| **Background Job Scraper** | ❌ Serverless functions terminate in <60s |  `scrapeOrchestrator` runs continuously |
| **Live SSE Streaming** | ❌ Timeouts drop connections |  Long-lived SSE connections stay open |
| **Playwright / Headless Browser** | ❌ Exceeds 50MB function limit |  Full Linux runtime with Chromium installed |
| **In-Memory Cache (`jobCache`)** | ❌ Resets on cold starts |  Persistent memory across requests |

---

## 5. Useful Commands & Health Checks

- **Check Liveness Probe**:
  ```bash
  curl https://applypilot.antideploy.app/health/live
  ```
- **Check Database & Subsystem Readiness**:
  ```bash
  curl https://applypilot.antideploy.app/health/ready
  ```
- **View Live Container Logs**:
  ```bash
  curl -H "Authorization: Bearer <TOKEN>" "https://antideploy.com/api/v1/logs?applicationId=3a737fae-58b9-4eb9-a8af-89c893b1ef79"
  ```
- **Run Local Test Suite**:
  ```bash
  npm test
  ```
- **Local Development Server**:
  ```bash
  npm run dev
  ```
