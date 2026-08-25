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
  DecisionEvent,
  PredictiveRiskState,
  PredictionEvent,
  ModelVersion,
} from '@sentinel/schemas';
import { LogisticRegressionPredictionModel } from '@sentinel/prediction-engine';
import { BaselineDeterministicModel } from '@sentinel/prediction-engine';
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
          policy_id TEXT,
          policy_version TEXT,
          reason_codes TEXT NOT NULL,
          explanation TEXT,
          environment_score REAL,
          exposure_score REAL,
          task_score REAL,
          zone_score REAL,
          worker_modifier_score REAL,
          recovery_score REAL,
          data_freshness TEXT,
          missing_features TEXT,
          guardrail_flags TEXT,
          action_eligibility TEXT,
          escalation_required INTEGER,
          source_observation_ids TEXT,
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
          worker_id TEXT,
          actor TEXT NOT NULL,
          input_refs TEXT NOT NULL,
          risk_score REAL,
          risk_level TEXT,
          confidence REAL,
          reason_codes TEXT,
          policy_version TEXT,
          guardrail_result TEXT,
          decision TEXT NOT NULL,
          explanation TEXT NOT NULL,
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
          activity_id TEXT NOT NULL,
          submitted_at TEXT NOT NULL,
          completed_at TEXT,
          status TEXT NOT NULL,
          cache_hit INTEGER NOT NULL,
          estimated_credit_cost REAL,
          error_code TEXT
        );
      `);
    }

    // Safe column migrations for existing database files
    const decisionCols = [
      'worker_id TEXT',
      'risk_score REAL',
      'risk_level TEXT',
      'confidence REAL',
      'reason_codes TEXT',
      'guardrail_result TEXT',
    ];
    for (const col of decisionCols) {
      try {
        this.db.exec(`ALTER TABLE decision_events ADD COLUMN ${col};`);
      } catch (_) {}
    }

    const riskCols = [
      'policy_id TEXT',
      'policy_version TEXT',
      'explanation TEXT',
      'environment_score REAL',
      'exposure_score REAL',
      'task_score REAL',
      'zone_score REAL',
      'worker_modifier_score REAL',
      'recovery_score REAL',
      'data_freshness TEXT',
      'missing_features TEXT',
      'guardrail_flags TEXT',
      'action_eligibility TEXT',
      'escalation_required INTEGER',
      'source_observation_ids TEXT',
    ];
    for (const col of riskCols) {
      try {
        this.db.exec(`ALTER TABLE risk_states ADD COLUMN ${col};`);
      } catch (_) {}
    }

    const modelCols = [
      'model_type TEXT',
      'feature_schema_version TEXT',
      'status TEXT',
      'created_at TEXT',
    ];
    for (const col of modelCols) {
      try {
        this.db.exec(`ALTER TABLE model_versions ADD COLUMN ${col};`);
      } catch (_) {}
    }

    // Initialize P3 Tables if not present
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS predictive_risk_states (
        prediction_id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        current_risk_level TEXT NOT NULL,
        current_risk_score REAL NOT NULL,
        p_elevated_30m REAL,
        p_critical_60m REAL,
        expected_time_to_threshold_minutes INTEGER,
        predicted_risk_level TEXT NOT NULL,
        predictive_state TEXT NOT NULL,
        prediction_confidence REAL NOT NULL,
        uncertainty_band TEXT NOT NULL,
        prediction_status TEXT NOT NULL,
        prediction_source TEXT NOT NULL,
        early_warning INTEGER NOT NULL,
        predictive_reason_codes TEXT NOT NULL,
        feature_contributions TEXT NOT NULL,
        feature_snapshot_id TEXT,
        model_id TEXT NOT NULL,
        model_version TEXT NOT NULL,
        source_risk_state_id TEXT,
        source_observation_ids TEXT NOT NULL,
        policy_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
        FOREIGN KEY (site_id) REFERENCES sites(site_id)
      );

      CREATE TABLE IF NOT EXISTS prediction_events (
        event_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        prediction_status TEXT NOT NULL,
        predicted_level TEXT NOT NULL,
        p_elevated_30m REAL,
        p_critical_60m REAL,
        expected_time_to_threshold_minutes INTEGER,
        early_warning INTEGER NOT NULL,
        model_id TEXT NOT NULL,
        model_version TEXT NOT NULL,
        feature_snapshot_id TEXT,
        reason_codes TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS model_versions (
        model_id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        model_type TEXT NOT NULL,
        feature_schema_version TEXT NOT NULL,
        training_data_ref TEXT NOT NULL,
        metrics TEXT NOT NULL,
        created_at TEXT,
        deployed_at TEXT NOT NULL,
        status TEXT NOT NULL
      );
    `);
  }

  public seedInitialData(): void {
    // Seed model versions
    const modelCount = this.db.prepare('SELECT count(*) as count FROM model_versions').get() as { count: number };
    if (modelCount.count === 0) {
      const insertModel = this.db.prepare(`
        INSERT INTO model_versions (model_id, version, model_type, feature_schema_version, training_data_ref, metrics, created_at, deployed_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const logistic = new LogisticRegressionPredictionModel().metadata;
      const baseline = new BaselineDeterministicModel().metadata;

      insertModel.run(
        logistic.model_id,
        logistic.version,
        logistic.model_type,
        logistic.feature_schema_version,
        logistic.training_data_ref,
        JSON.stringify(logistic.metrics),
        logistic.created_at ?? new Date().toISOString(),
        logistic.deployed_at,
        logistic.status
      );

      insertModel.run(
        baseline.model_id,
        baseline.version,
        baseline.model_type,
        baseline.feature_schema_version,
        baseline.training_data_ref,
        JSON.stringify(baseline.metrics),
        baseline.created_at ?? new Date().toISOString(),
        baseline.deployed_at,
        baseline.status
      );
    }
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
        policy_id, policy_version, reason_codes, explanation,
        environment_score, exposure_score, task_score, zone_score,
        worker_modifier_score, recovery_score, data_freshness,
        missing_features, guardrail_flags, action_eligibility,
        escalation_required, source_observation_ids, forecast_breach_time,
        exposure_duration_mins
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          s.policy_id ?? null,
          s.policy_version ?? null,
          JSON.stringify(s.reason_codes),
          s.explanation ? JSON.stringify(s.explanation) : null,
          s.environment_score ?? null,
          s.exposure_score ?? null,
          s.task_score ?? null,
          s.zone_score ?? null,
          s.worker_modifier_score ?? null,
          s.recovery_score ?? null,
          s.data_freshness ?? null,
          s.missing_features ? JSON.stringify(s.missing_features) : null,
          s.guardrail_flags ? JSON.stringify(s.guardrail_flags) : null,
          s.action_eligibility ? JSON.stringify(s.action_eligibility) : null,
          s.escalation_required ? 1 : 0,
          s.source_observation_ids ? JSON.stringify(s.source_observation_ids) : null,
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
    return rows.map((r) => this.mapRiskStateRow(r));
  }

  public getWorkerRiskHistory(workerId: string, limit: number = 20): RiskState[] {
    const stmt = this.db.prepare(`
      SELECT * FROM risk_states
      WHERE worker_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(workerId, limit) as any[];
    return rows.map((r) => this.mapRiskStateRow(r));
  }

  private mapRiskStateRow(r: any): RiskState {
    return {
      ...r,
      reason_codes: r.reason_codes ? JSON.parse(r.reason_codes) : [],
      explanation: r.explanation ? JSON.parse(r.explanation) : undefined,
      missing_features: r.missing_features ? JSON.parse(r.missing_features) : undefined,
      guardrail_flags: r.guardrail_flags ? JSON.parse(r.guardrail_flags) : undefined,
      action_eligibility: r.action_eligibility ? JSON.parse(r.action_eligibility) : undefined,
      source_observation_ids: r.source_observation_ids ? JSON.parse(r.source_observation_ids) : undefined,
      escalation_required: Boolean(r.escalation_required),
    };
  }

  public saveDecisionEvent(ev: DecisionEvent): void {
    this.saveDecisionEvents([ev]);
  }

  public saveDecisionEvents(events: DecisionEvent[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO decision_events (
        event_id, worker_id, actor, input_refs, risk_score, risk_level,
        confidence, reason_codes, policy_version, guardrail_result,
        decision, explanation, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTx = this.db.transaction((items: DecisionEvent[]) => {
      for (const ev of items) {
        stmt.run(
          ev.event_id,
          ev.worker_id ?? null,
          ev.actor,
          JSON.stringify(ev.input_refs),
          ev.risk_score ?? null,
          ev.risk_level ?? null,
          ev.confidence ?? null,
          ev.reason_codes ? JSON.stringify(ev.reason_codes) : null,
          ev.policy_version ?? null,
          ev.guardrail_result ?? null,
          ev.decision,
          ev.explanation,
          ev.timestamp || new Date().toISOString()
        );
      }
    });

    insertTx(events);
  }

  public getDecisionEvents(limit: number = 50): DecisionEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM decision_events
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      ...r,
      input_refs: JSON.parse(r.input_refs),
      reason_codes: r.reason_codes ? JSON.parse(r.reason_codes) : [],
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

  // --- Phase P3 Predictive Risk State Persistence & Queries ---

  public savePredictiveRiskStates(states: PredictiveRiskState[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO predictive_risk_states (
        prediction_id, worker_id, site_id, timestamp, current_risk_level,
        current_risk_score, p_elevated_30m, p_critical_60m,
        expected_time_to_threshold_minutes, predicted_risk_level,
        predictive_state, prediction_confidence, uncertainty_band,
        prediction_status, prediction_source, early_warning,
        predictive_reason_codes, feature_contributions, feature_snapshot_id,
        model_id, model_version, source_risk_state_id, source_observation_ids,
        policy_id, policy_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTx = this.db.transaction((items: PredictiveRiskState[]) => {
      for (const s of items) {
        stmt.run(
          s.prediction_id,
          s.worker_id,
          s.site_id,
          s.timestamp,
          s.current_risk_level,
          s.current_risk_score,
          s.p_elevated_30m ?? null,
          s.p_critical_60m ?? null,
          s.expected_time_to_threshold_minutes ?? null,
          s.predicted_risk_level,
          s.predictive_state,
          s.prediction_confidence,
          s.uncertainty_band,
          s.prediction_status,
          s.prediction_source,
          s.early_warning ? 1 : 0,
          JSON.stringify(s.predictive_reason_codes),
          JSON.stringify(s.feature_contributions),
          s.feature_snapshot_id ?? null,
          s.model_id,
          s.model_version,
          s.source_risk_state_id ?? null,
          JSON.stringify(s.source_observation_ids),
          s.policy_id,
          s.policy_version
        );
      }
    });

    insertTx(states);
  }

  public getLatestPredictiveRiskStates(): PredictiveRiskState[] {
    const stmt = this.db.prepare(`
      SELECT p.* FROM predictive_risk_states p
      INNER JOIN (
        SELECT worker_id, MAX(timestamp) as max_ts
        FROM predictive_risk_states
        GROUP BY worker_id
      ) latest ON p.worker_id = latest.worker_id AND p.timestamp = latest.max_ts
      ORDER BY p.p_critical_60m DESC, p.p_elevated_30m DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapPredictiveRiskStateRow(r));
  }

  public getWorkerPredictiveHistory(workerId: string, limit: number = 20): PredictiveRiskState[] {
    const stmt = this.db.prepare(`
      SELECT * FROM predictive_risk_states
      WHERE worker_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(workerId, limit) as any[];
    return rows.map((r) => this.mapPredictiveRiskStateRow(r));
  }

  private mapPredictiveRiskStateRow(r: any): PredictiveRiskState {
    return {
      ...r,
      early_warning: Boolean(r.early_warning),
      predictive_reason_codes: r.predictive_reason_codes ? JSON.parse(r.predictive_reason_codes) : [],
      feature_contributions: r.feature_contributions ? JSON.parse(r.feature_contributions) : {},
      source_observation_ids: r.source_observation_ids ? JSON.parse(r.source_observation_ids) : [],
    };
  }

  public savePredictionEvents(events: PredictionEvent[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO prediction_events (
        event_id, timestamp, worker_id, site_id, event_type,
        prediction_status, predicted_level, p_elevated_30m,
        p_critical_60m, expected_time_to_threshold_minutes, early_warning,
        model_id, model_version, feature_snapshot_id, reason_codes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTx = this.db.transaction((items: PredictionEvent[]) => {
      for (const ev of items) {
        stmt.run(
          ev.event_id,
          ev.timestamp,
          ev.worker_id,
          ev.site_id,
          ev.event_type,
          ev.prediction_status,
          ev.predicted_level,
          ev.p_elevated_30m ?? null,
          ev.p_critical_60m ?? null,
          ev.expected_time_to_threshold_minutes ?? null,
          ev.early_warning ? 1 : 0,
          ev.model_id,
          ev.model_version,
          ev.feature_snapshot_id ?? null,
          JSON.stringify(ev.reason_codes)
        );
      }
    });

    insertTx(events);
  }

  public getPredictionEvents(limit: number = 50): PredictionEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM prediction_events
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      ...r,
      early_warning: Boolean(r.early_warning),
      reason_codes: r.reason_codes ? JSON.parse(r.reason_codes) : [],
    }));
  }

  public getModelVersions(): ModelVersion[] {
    const stmt = this.db.prepare(`
      SELECT * FROM model_versions
      ORDER BY deployed_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      ...r,
      metrics: JSON.parse(r.metrics),
    }));
  }

  public close(): void {
    this.db.close();
  }
}
