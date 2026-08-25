# SRE Runbook: SQLite Database Lock or Failure

## 1. What Happened?
SQLite database engine encountered a lock contention, write timeout, or filesystem constraint.

## 2. How to Confirm?
1. Check `GET /api/health/dependencies`: `database` status reports `UNAVAILABLE` or `DEGRADED`.
2. Inspect server logs for `SqliteError: database is locked` or `SQLITE_BUSY`.

## 3. What Does Sentinel Do Automatically?
- Retries write transactions up to `busy_timeout = 5000ms`.
- Returns structured HTTP 503 Service Unavailable without crashing the Node.js process.
- All write failures roll back atomicity boundaries to prevent half-written records.

## 4. Operator Action Required
- Ensure no external process has locked the `.db` file (e.g. SQLite CLI viewer with open transaction).
- Restart API service: SQLite WAL files (`.db-wal`, `.db-shm`) will automatically checkpoint on restart.

## 5. Recovery Verification
1. Call `GET /api/health/ready`: Verify returns `200 OK` and `{ status: "HEALTHY", database: "connected" }`.
2. Query `GET /api/workers`: Verify all worker records return cleanly.
