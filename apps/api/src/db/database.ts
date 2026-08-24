import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  Site,
  Worker,
  ThermalObservation,
  RiskState,
  Action,
  Incident,
  AuditEvent,
} from '@sentinel/schemas';
import { PHOENIX_CONSTRUCTION_SITES, generateSyntheticWorkers } from '@sentinel/simulation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SentinelDatabase {
  public db: Database.Database;

  constructor(dbPath: string = process.env.DATABASE_PATH || './sentinel.db') {
    const resolvedPath = path.resolve(process.cwd(), dbPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initializeSchema();
    this.seedInitialData();
  }

  private initializeSchema(): void {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      this.db.exec(sql);
    } else {
      // Fallback inline schema
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sites (
          site_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          zone_id TEXT NOT NULL,
          worker_count INTEGER NOT NULL,
          cooling_resources TEXT NOT NULL,
          emergency_policy_id TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS workers (
          worker_id TEXT PRIMARY KEY,
          site_id TEXT NOT NULL,
          role TEXT NOT NULL,
          shift_start TEXT NOT NULL,
          shift_end TEXT NOT NULL,
          task_intensity TEXT NOT NULL,
          channel TEXT NOT NULL,
          consent_flags TEXT NOT NULL,
          risk_modifier TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS thermal_observations (
          observation_id TEXT PRIMARY KEY,
          site_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          temperature_c REAL NOT NULL,
          humidity_pct REAL NOT NULL,
          wet_bulb_c REAL NOT NULL,
          apparent_temperature_c REAL,
          solar_irradiance REAL NOT NULL,
          source TEXT NOT NULL,
          freshness_seconds INTEGER NOT NULL,
          confidence REAL NOT NULL,
          activity_id TEXT
        );
        CREATE TABLE IF NOT EXISTS risk_states (
          worker_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          score REAL NOT NULL,
          level TEXT NOT NULL,
          confidence REAL NOT NULL,
          reason_codes TEXT NOT NULL,
          forecast_breach_time TEXT,
          exposure_duration_mins INTEGER NOT NULL,
          PRIMARY KEY (worker_id, timestamp)
        );
        CREATE TABLE IF NOT EXISTS actions (
          action_id TEXT PRIMARY KEY,
          worker_id TEXT,
          site_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          policy_version TEXT NOT NULL,
          issued_at TEXT NOT NULL,
          delivered_at TEXT,
          acknowledged_at TEXT,
          outcome TEXT NOT NULL,
          message TEXT NOT NULL,
          recommended_rest_minutes INTEGER,
          actor TEXT NOT NULL,
          override_reason TEXT
        );
        CREATE TABLE IF NOT EXISTS incidents (
          incident_id TEXT PRIMARY KEY,
          zone_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          severity TEXT NOT NULL,
          opened_at TEXT NOT NULL,
          workers_affected TEXT NOT NULL,
          owner TEXT NOT NULL,
          closed_at TEXT,
          resolution TEXT,
          summary TEXT NOT NULL,
          status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS decision_events (
          event_id TEXT PRIMARY KEY,
          actor TEXT NOT NULL,
          input_refs TEXT NOT NULL,
          decision TEXT NOT NULL,
          explanation TEXT NOT NULL,
          policy_version TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit_events (
          event_id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          payload_hash TEXT NOT NULL,
          payload_ref TEXT NOT NULL,
          details TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS api_usage (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          activity_id TEXT,
          credits_estimate REAL NOT NULL,
          status TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `);
    }
  }

  public seedInitialData(): void {
    const siteCount = this.db.prepare('SELECT count(*) as count FROM sites').get() as { count: number };
    if (siteCount.count === 0) {
      const insertSite = this.db.prepare(`
        INSERT INTO sites (site_id, name, latitude, longitude, zone_id, worker_count, cooling_resources, emergency_policy_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertManySites = this.db.transaction((sites: Site[]) => {
        for (const s of sites) {
          insertSite.run(
            s.site_id,
            s.name,
            s.latitude,
            s.longitude,
            s.zone_id,
            s.worker_count,
            JSON.stringify(s.cooling_resources),
            s.emergency_policy_id
          );
        }
      });

      insertManySites(PHOENIX_CONSTRUCTION_SITES);
    }

    const workerCount = this.db.prepare('SELECT count(*) as count FROM workers').get() as { count: number };
    if (workerCount.count === 0) {
      const syntheticWorkers = generateSyntheticWorkers({ seed: 42 });
      const insertWorker = this.db.prepare(`
        INSERT INTO workers (worker_id, site_id, role, shift_start, shift_end, task_intensity, channel, consent_flags, risk_modifier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertManyWorkers = this.db.transaction((workers: Worker[]) => {
        for (const w of workers) {
          insertWorker.run(
            w.worker_id,
            w.site_id,
            w.role,
            w.shift_start,
            w.shift_end,
            w.task_intensity,
            w.channel,
            JSON.stringify(w.consent_flags),
            w.risk_modifier
          );
        }
      });

      insertManyWorkers(syntheticWorkers);
    }
  }

  // --- Helper Query Methods ---

  public getSites(): Site[] {
    const rows = this.db.prepare('SELECT * FROM sites').all() as any[];
    return rows.map((r) => ({
      ...r,
      cooling_resources: JSON.parse(r.cooling_resources),
    }));
  }

  public getWorkers(siteId?: string): Worker[] {
    const query = siteId
      ? 'SELECT * FROM workers WHERE site_id = ?'
      : 'SELECT * FROM workers';
    const rows = (siteId
      ? this.db.prepare(query).all(siteId)
      : this.db.prepare(query).all()) as any[];

    return rows.map((r) => ({
      ...r,
      consent_flags: JSON.parse(r.consent_flags),
    }));
  }

  public saveObservation(obs: ThermalObservation): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO thermal_observations (
        observation_id, site_id, timestamp, temperature_c, humidity_pct,
        wet_bulb_c, apparent_temperature_c, solar_irradiance, source,
        freshness_seconds, confidence, activity_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      obs.observation_id,
      obs.site_id,
      obs.timestamp,
      obs.temperature_c,
      obs.humidity_pct,
      obs.wet_bulb_c,
      obs.apparent_temperature_c ?? null,
      obs.solar_irradiance,
      obs.source,
      obs.freshness_seconds,
      obs.confidence,
      obs.activity_id ?? null
    );
  }

  public saveRiskStates(states: RiskState[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO risk_states (
        worker_id, site_id, timestamp, score, level, confidence,
        reason_codes, forecast_breach_time, exposure_duration_mins
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTx = this.db.transaction((items: RiskState[]) => {
      for (const s of items) {
        stmt.run(
          s.worker_id,
          s.site_id,
          s.timestamp,
          s.score,
          s.level,
          s.confidence,
          JSON.stringify(s.reason_codes),
          s.forecast_breach_time ?? null,
          s.exposure_duration_mins
        );
      }
    });

    insertTx(states);
  }

  public getLatestRiskStates(): RiskState[] {
    const stmt = this.db.prepare(`
      SELECT r.* FROM risk_states r
      INNER JOIN (
        SELECT worker_id, MAX(timestamp) as max_ts
        FROM risk_states
        GROUP BY worker_id
      ) latest ON r.worker_id = latest.worker_id AND r.timestamp = latest.max_ts
      ORDER BY r.score DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      ...r,
      reason_codes: JSON.parse(r.reason_codes),
    }));
  }

  public saveAction(action: Action): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO actions (
        action_id, worker_id, site_id, action_type, policy_version,
        issued_at, delivered_at, acknowledged_at, outcome, message,
        recommended_rest_minutes, actor, override_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      action.action_id,
      action.worker_id ?? null,
      action.site_id,
      action.action_type,
      action.policy_version,
      action.issued_at,
      action.delivered_at ?? null,
      action.acknowledged_at ?? null,
      action.outcome ?? 'PENDING',
      action.message,
      action.recommended_rest_minutes ?? null,
      action.actor,
      action.override_reason ?? null
    );
  }

  public getRecentActions(limit: number = 50): Action[] {
    const stmt = this.db.prepare(`
      SELECT * FROM actions
      ORDER BY issued_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Action[];
  }

  public getIncidents(): Incident[] {
    const stmt = this.db.prepare('SELECT * FROM incidents ORDER BY opened_at DESC');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      ...r,
      workers_affected: JSON.parse(r.workers_affected),
    }));
  }

  public saveIncident(inc: Incident): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO incidents (
        incident_id, zone_id, site_id, severity, opened_at,
        workers_affected, owner, closed_at, resolution, summary, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      inc.incident_id,
      inc.zone_id,
      inc.site_id,
      inc.severity,
      inc.opened_at,
      JSON.stringify(inc.workers_affected),
      inc.owner,
      inc.closed_at ?? null,
      inc.resolution ?? null,
      inc.summary,
      inc.status
    );
  }

  public close(): void {
    this.db.close();
  }
}
