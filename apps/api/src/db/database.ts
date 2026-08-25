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
  IncidentStatus,
  AuditEvent,
  DecisionEvent,
  PredictiveRiskState,
  PredictionEvent,
  ModelVersion,
  ActionDecision,
  ActionDelivery,
  ActionAcknowledgement,
  EscalationDecision,
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

    const actionCols = [
      'priority TEXT',
      'status TEXT',
      'risk_state_id TEXT',
      'prediction_id TEXT',
      'policy_id TEXT',
      'decision_mode TEXT',
      'approved_at TEXT',
      'dispatched_at TEXT',
      'ack_deadline TEXT',
      'completed_at TEXT',
      'override_by TEXT',
      'override_at TEXT',
      'idempotency_key TEXT',
      'delivery_id TEXT',
      'delivery_status TEXT',
      'reason_codes TEXT',
      'evidence_refs TEXT',
      'is_simulated INTEGER',
    ];
    for (const col of actionCols) {
      try {
        this.db.exec(`ALTER TABLE actions ADD COLUMN ${col};`);
      } catch (_) {}
    }

    const incidentCols = [
      'created_at TEXT',
      'updated_at TEXT',
      'affected_worker_count INTEGER DEFAULT 0',
      'common_reason_codes TEXT',
      'common_factors TEXT',
      'thermal_context TEXT',
      'prediction_context TEXT',
      'action_summary TEXT',
      'policy_id TEXT',
      'policy_version TEXT',
      'confidence REAL',
      'uncertainty TEXT',
      'resolution_note TEXT',
    ];
    for (const col of incidentCols) {
      try {
        this.db.exec(`ALTER TABLE incidents ADD COLUMN ${col};`);
      } catch (_) {}
    }

    // Initialize P3 & P4 Tables if not present
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_deliveries (
        delivery_id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        channel TEXT NOT NULL,
        recipient_ref TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL,
        sent_at TEXT NOT NULL,
        delivered_at TEXT,
        failed_at TEXT,
        failure_code TEXT,
        is_simulated INTEGER NOT NULL,
        FOREIGN KEY (action_id) REFERENCES actions(action_id)
      );

      CREATE TABLE IF NOT EXISTS action_acknowledgements (
        ack_id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_ref TEXT NOT NULL,
        acknowledged_at TEXT NOT NULL,
        source TEXT NOT NULL,
        note TEXT,
        FOREIGN KEY (action_id) REFERENCES actions(action_id)
      );

      CREATE TABLE IF NOT EXISTS escalations (
        escalation_id TEXT PRIMARY KEY,
        worker_id TEXT,
        site_id TEXT NOT NULL,
        action_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        reason_codes TEXT NOT NULL,
        policy_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        escalated_to TEXT,
        resolution_note TEXT,
        FOREIGN KEY (action_id) REFERENCES actions(action_id)
      );
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

  public getRecentObservations(limit: number = 50, siteId?: string): ThermalObservation[] {
    let sql = 'SELECT * FROM thermal_observations';
    const params: any[] = [];
    if (siteId) {
      sql += ' WHERE site_id = ?';
      params.push(siteId);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as ThermalObservation[];
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
        action_id, worker_id, site_id, action_type, priority, status,
        risk_state_id, prediction_id, policy_id, policy_version, decision_mode,
        issued_at, approved_at, dispatched_at, delivered_at, ack_deadline,
        acknowledged_at, completed_at, outcome, message, recommended_rest_minutes,
        actor, override_by, override_at, override_reason, idempotency_key,
        delivery_id, delivery_status, reason_codes, evidence_refs, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      action.action_id,
      action.worker_id ?? null,
      action.site_id,
      action.action_type,
      action.priority ?? 'MEDIUM',
      action.status ?? 'DELIVERED',
      action.risk_state_id ?? null,
      action.prediction_id ?? null,
      action.policy_id ?? 'demo-construction-v1',
      action.policy_version,
      action.decision_mode ?? 'AUTONOMOUS',
      action.issued_at,
      action.approved_at ?? null,
      action.dispatched_at ?? null,
      action.delivered_at ?? null,
      action.ack_deadline ?? null,
      action.acknowledged_at ?? null,
      action.completed_at ?? null,
      action.outcome ?? 'PENDING',
      action.message,
      action.recommended_rest_minutes ?? null,
      action.actor,
      action.override_by ?? null,
      action.override_at ?? null,
      action.override_reason ?? null,
      action.idempotency_key ?? null,
      action.delivery_id ?? null,
      action.delivery_status ?? null,
      action.reason_codes ? JSON.stringify(action.reason_codes) : null,
      action.evidence_refs ? JSON.stringify(action.evidence_refs) : null,
      action.is_simulated ? 1 : 0
    );
  }

  public getRecentActions(limit: number = 50): Action[] {
    return this.getActions({ limit });
  }

  public getActions(options?: {
    worker_id?: string;
    site_id?: string;
    status?: string;
    limit?: number;
  }): Action[] {
    let sql = 'SELECT * FROM actions WHERE 1=1';
    const params: any[] = [];

    if (options?.worker_id) {
      sql += ' AND worker_id = ?';
      params.push(options.worker_id);
    }
    if (options?.site_id) {
      sql += ' AND site_id = ?';
      params.push(options.site_id);
    }
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY issued_at DESC LIMIT ?';
    params.push(options?.limit || 50);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((r) => this.mapActionRow(r));
  }

  public getActionById(actionId: string): Action | null {
    const stmt = this.db.prepare('SELECT * FROM actions WHERE action_id = ?');
    const row = stmt.get(actionId) as any;
    return row ? this.mapActionRow(row) : null;
  }

  private mapActionRow(r: any): Action {
    return {
      ...r,
      is_simulated: Boolean(r.is_simulated),
      reason_codes: r.reason_codes ? JSON.parse(r.reason_codes) : [],
      evidence_refs: r.evidence_refs ? JSON.parse(r.evidence_refs) : {},
    };
  }

  public saveActionDelivery(delivery: ActionDelivery): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO action_deliveries (
        delivery_id, action_id, provider, channel, recipient_ref,
        status, attempt_count, sent_at, delivered_at, failed_at,
        failure_code, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      delivery.delivery_id,
      delivery.action_id,
      delivery.provider,
      delivery.channel,
      delivery.recipient_ref,
      delivery.status,
      delivery.attempt_count,
      delivery.sent_at,
      delivery.delivered_at ?? null,
      delivery.failed_at ?? null,
      delivery.failure_code ?? null,
      delivery.is_simulated ? 1 : 0
    );
  }

  public getDeliveriesForAction(actionId: string): ActionDelivery[] {
    const stmt = this.db.prepare('SELECT * FROM action_deliveries WHERE action_id = ? ORDER BY sent_at DESC');
    const rows = stmt.all(actionId) as any[];
    return rows.map((r) => ({
      ...r,
      is_simulated: Boolean(r.is_simulated),
    }));
  }

  public saveActionAcknowledgement(ack: ActionAcknowledgement): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO action_acknowledgements (
        ack_id, action_id, actor_type, actor_ref, acknowledged_at, source, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ack.ack_id,
      ack.action_id,
      ack.actor_type,
      ack.actor_ref,
      ack.acknowledged_at,
      ack.source,
      ack.note ?? null
    );
  }

  public getAcknowledgementsForAction(actionId: string): ActionAcknowledgement[] {
    const stmt = this.db.prepare('SELECT * FROM action_acknowledgements WHERE action_id = ? ORDER BY acknowledged_at DESC');
    return stmt.all(actionId) as ActionAcknowledgement[];
  }

  public saveEscalation(esc: EscalationDecision): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO escalations (
        escalation_id, worker_id, site_id, action_id, severity,
        reason_codes, policy_id, policy_version, created_at, status,
        escalated_to, resolution_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      esc.escalation_id,
      esc.worker_id ?? null,
      esc.site_id,
      esc.action_id,
      esc.severity,
      JSON.stringify(esc.reason_codes),
      esc.policy_id,
      esc.policy_version,
      esc.created_at,
      esc.status,
      esc.escalated_to ?? null,
      esc.resolution_note ?? null
    );
  }

  public getEscalations(limit: number = 50): EscalationDecision[] {
    const stmt = this.db.prepare('SELECT * FROM escalations ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      ...r,
      reason_codes: r.reason_codes ? JSON.parse(r.reason_codes) : [],
    }));
  }

  public getEscalationById(escalationId: string): EscalationDecision | null {
    const stmt = this.db.prepare('SELECT * FROM escalations WHERE escalation_id = ?');
    const row = stmt.get(escalationId) as any;
    if (!row) return null;
    return {
      ...row,
      reason_codes: row.reason_codes ? JSON.parse(row.reason_codes) : [],
    };
  }

  public updateEscalation(escalationId: string, status: EscalationDecision['status'], note?: string): EscalationDecision | null {
    const stmt = this.db.prepare(`
      UPDATE escalations
      SET status = ?, resolution_note = ?
      WHERE escalation_id = ?
    `);
    stmt.run(status, note ?? null, escalationId);
    return this.getEscalationById(escalationId);
  }

  public getIncidents(options?: {
    site_id?: string;
    zone_id?: string;
    status?: string;
    severity?: string;
    limit?: number;
  }): Incident[] {
    let sql = 'SELECT * FROM incidents WHERE 1=1';
    const params: any[] = [];

    if (options?.site_id) {
      sql += ' AND site_id = ?';
      params.push(options.site_id);
    }
    if (options?.zone_id) {
      sql += ' AND zone_id = ?';
      params.push(options.zone_id);
    }
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.severity) {
      sql += ' AND severity = ?';
      params.push(options.severity);
    }

    sql += ' ORDER BY opened_at DESC LIMIT ?';
    params.push(options?.limit || 50);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r) => this.mapIncidentRow(r));
  }

  public getIncidentById(incidentId: string): Incident | null {
    const stmt = this.db.prepare('SELECT * FROM incidents WHERE incident_id = ?');
    const row = stmt.get(incidentId) as any;
    return row ? this.mapIncidentRow(row) : null;
  }

  public saveIncident(inc: Incident): void {
    const workerIds = inc.worker_ids || inc.workers_affected || [];
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO incidents (
        incident_id, zone_id, site_id, severity, status, opened_at, created_at,
        updated_at, closed_at, affected_worker_count, workers_affected, summary,
        common_reason_codes, common_factors, thermal_context, prediction_context,
        action_summary, owner, policy_id, policy_version, confidence, uncertainty,
        resolution, resolution_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      inc.incident_id,
      inc.zone_id,
      inc.site_id,
      inc.severity,
      inc.status,
      inc.opened_at,
      inc.created_at || inc.opened_at,
      inc.updated_at || new Date().toISOString(),
      inc.closed_at ?? null,
      inc.affected_worker_count || workerIds.length,
      JSON.stringify(workerIds),
      inc.summary,
      inc.common_reason_codes ? JSON.stringify(inc.common_reason_codes) : JSON.stringify([]),
      inc.common_factors ? JSON.stringify(inc.common_factors) : JSON.stringify([]),
      inc.thermal_context ? JSON.stringify(inc.thermal_context) : null,
      inc.prediction_context ? JSON.stringify(inc.prediction_context) : null,
      inc.action_summary ? JSON.stringify(inc.action_summary) : null,
      inc.owner,
      inc.policy_id ?? null,
      inc.policy_version ?? null,
      inc.confidence ?? null,
      inc.uncertainty ? JSON.stringify(inc.uncertainty) : JSON.stringify([]),
      inc.resolution ?? null,
      inc.resolution_note ?? null
    );
  }

  public updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    resolution?: string,
    note?: string,
    owner?: string
  ): Incident | null {
    const now = new Date().toISOString();
    let sql = 'UPDATE incidents SET status = ?, updated_at = ?';
    const params: any[] = [status, now];

    if (resolution !== undefined) {
      sql += ', resolution = ?';
      params.push(resolution);
    }
    if (note !== undefined) {
      sql += ', resolution_note = ?';
      params.push(note);
    }
    if (owner !== undefined) {
      sql += ', owner = ?';
      params.push(owner);
    }
    if (status === 'RESOLVED' || status === 'CLOSED') {
      sql += ', closed_at = ?';
      params.push(now);
    }

    sql += ' WHERE incident_id = ?';
    params.push(incidentId);

    const stmt = this.db.prepare(sql);
    stmt.run(...params);

    return this.getIncidentById(incidentId);
  }

  private mapIncidentRow(r: any): Incident {
    const workerIds = r.workers_affected ? JSON.parse(r.workers_affected) : [];
    return {
      incident_id: r.incident_id,
      zone_id: r.zone_id,
      site_id: r.site_id,
      severity: r.severity,
      status: r.status,
      opened_at: r.opened_at,
      created_at: r.created_at || r.opened_at,
      updated_at: r.updated_at || r.opened_at,
      closed_at: r.closed_at || undefined,
      affected_worker_count: r.affected_worker_count ?? workerIds.length,
      worker_ids: workerIds,
      workers_affected: workerIds,
      summary: r.summary,
      common_reason_codes: r.common_reason_codes ? JSON.parse(r.common_reason_codes) : [],
      common_factors: r.common_factors ? JSON.parse(r.common_factors) : [],
      thermal_context: r.thermal_context ? JSON.parse(r.thermal_context) : undefined,
      prediction_context: r.prediction_context ? JSON.parse(r.prediction_context) : undefined,
      action_summary: r.action_summary ? JSON.parse(r.action_summary) : undefined,
      owner: r.owner,
      policy_id: r.policy_id || undefined,
      policy_version: r.policy_version || undefined,
      confidence: r.confidence !== null ? r.confidence : undefined,
      uncertainty: r.uncertainty ? JSON.parse(r.uncertainty) : [],
      resolution: r.resolution || undefined,
      resolution_note: r.resolution_note || undefined,
    };
  }

  public getWorkerTimeline(workerId: string, limit: number = 30): any[] {
    const timeline: any[] = [];

    // 1. Observations
    const obsRows = this.db
      .prepare('SELECT observation_id, timestamp, temperature_c, wet_bulb_c, humidity_pct FROM thermal_observations ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as any[];
    for (const obs of obsRows) {
      timeline.push({
        event_type: 'THERMAL_OBSERVATION',
        timestamp: obs.timestamp,
        title: `Thermal Observation: ${obs.temperature_c}°C`,
        description: `Wet-Bulb: ${obs.wet_bulb_c}°C, Humidity: ${obs.humidity_pct}%`,
        details: obs,
      });
    }

    // 2. Risk states
    const riskRows = this.db
      .prepare('SELECT * FROM risk_states WHERE worker_id = ? ORDER BY timestamp DESC LIMIT ?')
      .all(workerId, limit) as any[];
    for (const r of riskRows) {
      timeline.push({
        event_type: 'RISK_EVALUATION',
        timestamp: r.timestamp,
        title: `Risk State: ${r.risk_level} (${Math.round(r.score * 100)}%)`,
        description: `Reasons: ${r.reason_codes || 'Normal limits'}`,
        details: r,
      });
    }

    // 3. Actions
    const actRows = this.db
      .prepare('SELECT * FROM actions WHERE worker_id = ? ORDER BY issued_at DESC LIMIT ?')
      .all(workerId, limit) as any[];
    for (const a of actRows) {
      timeline.push({
        event_type: 'ACTION_ISSUED',
        timestamp: a.issued_at,
        title: `Action: ${a.action_type} (${a.status})`,
        description: a.message,
        details: a,
      });
      if (a.delivered_at) {
        timeline.push({
          event_type: 'ACTION_DELIVERED',
          timestamp: a.delivered_at,
          title: `Action Delivered: ${a.action_type}`,
          description: `Delivered to worker via simulated channel`,
          details: a,
        });
      }
      if (a.acknowledged_at) {
        timeline.push({
          event_type: 'ACTION_ACKNOWLEDGED',
          timestamp: a.acknowledged_at,
          title: `Action Acknowledged: ${a.action_type}`,
          description: `Acknowledged by ${a.actor || 'Worker'}`,
          details: a,
        });
      }
    }

    // Sort descending by timestamp
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return timeline.slice(0, limit);
  }

  public getIncidentTimeline(incidentId: string, limit: number = 30): any[] {
    const inc = this.getIncidentById(incidentId);
    if (!inc) return [];

    const timeline: any[] = [];

    timeline.push({
      event_type: 'INCIDENT_DETECTED',
      timestamp: inc.opened_at,
      title: `Incident Detected in ${inc.zone_id}`,
      description: inc.summary,
      details: { severity: inc.severity, affected_count: inc.affected_worker_count },
    });

    if (inc.status === 'MITIGATING' || inc.status === 'RESOLVED' || inc.status === 'CLOSED') {
      timeline.push({
        event_type: 'INCIDENT_MITIGATING',
        timestamp: inc.updated_at || inc.opened_at,
        title: `Mitigation In Progress`,
        description: `Supervisor assigned: ${inc.owner}`,
        details: { owner: inc.owner },
      });
    }

    if (inc.closed_at) {
      timeline.push({
        event_type: 'INCIDENT_RESOLVED',
        timestamp: inc.closed_at,
        title: `Incident Resolved`,
        description: inc.resolution || 'Resolution completed',
        details: { resolution: inc.resolution, note: inc.resolution_note },
      });
    }

    // Audit events for incident
    const auditRows = this.db
      .prepare('SELECT * FROM audit_events WHERE payload_ref = ? ORDER BY created_at DESC LIMIT ?')
      .all(incidentId, limit) as any[];
    for (const a of auditRows) {
      timeline.push({
        event_type: a.event_type,
        timestamp: a.created_at,
        title: `Audit: ${a.event_type}`,
        description: `Payload hash: ${a.payload_hash.slice(0, 16)}...`,
        details: JSON.parse(a.details),
      });
    }

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return timeline.slice(0, limit);
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
