# Rollback & Recovery Procedures

> **Document Status:** Verified against repository code, database initialization, and deployment assets.  
> **Target System:** ApplyPilot Rollback Capabilities & Failure Recovery.

---

## 1. Current Rollback Capability Assessment

| Capability | Current State | Verification Detail |
| :--- | :--- | :--- |
| **Automated CD Rollback** | **NOT IMPLEMENTED** | No continuous delivery pipeline (GitHub Actions only has CI check `ci.yml`). There is no automated deployment rollback upon health check failure. |
| **Blue / Green Deployments** | **NOT IMPLEMENTED** | No routing proxy or orchestrator config exists for traffic shifting. |
| **Canary Releases** | **NOT IMPLEMENTED** | All traffic routes directly to the single active container instance. |
| **Database Down-Migrations** | **NOT IMPLEMENTED** | Schema management in `server/store/db.js` uses forward-only `CREATE TABLE IF NOT EXISTS` statements. No down-migration scripts or rollback mechanism exists. |
| **Container Image Rollback** | **SUPPORTED (MANUAL)** | If versioned Docker image tags are built and retained on the host or registry, the previous image tag can be redeployed manually. |
| **Database Backup & Restore** | **SUPPORTED (MANUAL)** | Because SQLite stores the entire state in a single file (`applypilot.db`), point-in-time recovery is achieved via standard file copies before deployment. |

---

## 2. Verified Recovery Process (Manual Container Rollback)

If a deployment of a new image tag fails in production, follow this recovery process:

### Step 1: Identify Last Known Stable Image
List available local Docker images:
```bash
docker images applypilot
```
Example output:
```
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
applypilot   1.0.1     a1b2c3d4e5f6   10 minutes ago  420MB  <-- FAILED
applypilot   1.0.0     f6e5d4c3b2a1   3 days ago      418MB  <-- STABLE
```

### Step 2: Stop and Remove Failed Container
```bash
docker stop applypilot-app
docker rm applypilot-app
```

### Step 3: Check Database Integrity
Prior to launching the previous image, verify that the SQLite database file in the persistent volume is not corrupted:
```bash
# Verify SQLite database file exists in volume
ls -lh /var/lib/docker/volumes/applypilot_data/_data/applypilot.db
# Or if using bind mount:
ls -lh ./data/applypilot.db
```

### Step 4: Launch Previous Stable Container
```bash
docker run -d \
  --name applypilot-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.stable \
  -v applypilot_data:/app/data \
  applypilot:1.0.0
```

### Step 5: Verify Health
Confirm the restored instance is healthy:
```bash
curl -f http://localhost:3000/health/live
curl -f http://localhost:3000/health/ready
```

---

## 3. Database Migration Considerations & Rollback Hazards

### 3.1 How Schema Migrations Work in ApplyPilot
Schema definitions are declared in `server/store/db.js` inside the synchronous `migrate(db)` function. When the application starts:
1. `initDb()` opens the SQLite database.
2. It sets pragmas: `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`, `foreign_keys = ON`.
3. It executes raw DDL statements containing `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

### 3.2 Critical Rollback Hazards:
1. **No Automatic Column Removal:** If a newer version added columns or altered table constraints, reverting to an older server binary will not roll back the schema.
2. **Missing `ALTER TABLE` Handling:** The existing `migrate()` function does not execute version-tracked migrations. If a release adds a new column, older code running against the modified table may encounter incompatible queries or constraint errors.
3. **Write-Ahead Log (WAL) Locks:** In SQLite WAL mode, `applypilot.db-wal` and `applypilot.db-shm` files exist alongside `applypilot.db`. Restoring a backup must include all three files, or the database must be backed up when no active writes are occurring.

### 3.3 Mandatory Pre-Deployment Database Snapshot Runbook
Before executing any release or container upgrade, take a backup snapshot of the SQLite database:

```bash
# 1. Gracefully pause or quiesce writes (or copy while WAL is in clean state)
# SQLite safe online backup via CLI:
sqlite3 /app/data/applypilot.db ".backup '/app/data/applypilot_predeploy_backup.db'"

# Or host-level volume copy:
cp ./data/applypilot.db ./data/applypilot.db.bak.$(date +%Y%m%d_%H%M%S)
```

To restore the snapshot if schema migration breaks:
```bash
docker stop applypilot-app
cp ./data/applypilot.db.bak.[TIMESTAMP] ./data/applypilot.db
rm -f ./data/applypilot.db-wal ./data/applypilot.db-shm
docker start applypilot-app
```

---

## 4. Configuration & Secrets Rollback

1. **Version Controlled Configuration:** Maintain a tagged or dated copy of `.env` before updating configuration:
   ```bash
   cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
   ```
2. **Reverting Configuration:**
   If a new environment variable causes startup failure (e.g., misconfigured `ALLOWED_ORIGINS` causing CORS rejections, invalid `PORT`, or bad API keys):
   ```bash
   cp .env.backup.[TIMESTAMP] .env
   docker compose restart app
   ```

---

## 5. Deployment Failure Recovery Matrix

| Failure Symptom | Root Cause | Immediate Recovery Action |
| :--- | :--- | :--- |
| **Container in CrashLoopBackOff / Exits Immediately** | Native compilation failure or missing `dist/server.cjs` bundle. | Check `docker logs applypilot-app`. Revert to previous image tag immediately. |
| **`GET /health/ready` returns 503** | SQLite database file locked or permission denied for non-root user `node`. | Verify ownership of mounted data directory: `chown -R 1000:1000 /host/path/data`. |
| **All logins fail with 401 Unauthorized** | `SESSION_SECRET` or `JWT_SECRET` was rotated without invalidating existing client tokens, or `ENABLE_DEMO_ACCOUNTS` was unset in production. | If using demo accounts, add `ENABLE_DEMO_ACCOUNTS=true` to `.env`. For genuine users, users must re-authenticate with their credentials. |
| **Port 3000 Conflict on Host** | Previous orphaned container or host process is holding port. | Identify process holding port (`netstat -ano | findstr :3000` on Windows, `lsof -i :3000` on Linux) and terminate it before restart. |
| **Outbound Scrapers Failing (504 / Empty Results)** | Host firewall blocking outbound HTTPS requests or scraper rate-limited. | Verify DNS and outbound HTTPS connectivity from within container: `docker exec -it applypilot-app wget -qO- https://boards-api.greenhouse.io`. |
