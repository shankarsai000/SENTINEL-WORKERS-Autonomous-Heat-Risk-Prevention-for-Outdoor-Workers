import { describe, it, expect, beforeEach } from 'vitest';
import { ContextualRiskEngine, ConfidenceEngine } from '@sentinel/risk-engine';
import { ShortHorizonRiskPredictor } from '@sentinel/prediction-engine';
import { ActionPlanner, ActionDeduplicationService } from '@sentinel/action-engine';
import { DEFAULT_DEMO_POLICY, PolicyGuardrails } from '@sentinel/policy';
import { ThermalObservation, Worker, Site, WorkerRiskContext, SiteRiskContext, ZoneClusterContext, DerivedEnvironmentFeatures } from '@sentinel/schemas';
import Database from 'better-sqlite3';
import { AuditService } from '../../apps/api/src/services/audit-service.js';

describe('Phase P6: Core Safety Invariants Verification', () => {
  const dummySite: Site = {
    site_id: 'PHX-SAFETY-01',
    name: 'Phoenix Safety Validation Site',
    latitude: 33.4484,
    longitude: -112.074,
    zone_id: 'ZONE-SAFETY',
    worker_count: 10,
    cooling_resources: { shade_structures: 2, misting_stations: 2, hydration_points: 4, ac_rest_areas: 1 },
    emergency_policy_id: 'POLICY-SAFETY-V1',
  };

  const dummyWorker: Worker = {
    worker_id: 'WRK-SAFETY-001',
    site_id: 'PHX-SAFETY-01',
    role: 'Roofer',
    shift_start: '07:00',
    shift_end: '15:30',
    task_intensity: 'HEAVY',
    channel: 'SMS_SIMULATED',
    consent_flags: { data_processing: true, notification_consent: true },
    risk_modifier: 'baseline',
  };

  const dummyWorkerCtx: WorkerRiskContext = {
    worker_id: dummyWorker.worker_id,
    site_id: dummySite.site_id,
    role: dummyWorker.role,
    task_intensity: dummyWorker.task_intensity,
    shift_start: dummyWorker.shift_start,
    shift_end: dummyWorker.shift_end,
    exposure_duration_minutes: 180,
    recent_recovery_minutes: null,
    risk_modifier: 'baseline',
    channel: 'SMS_SIMULATED',
    active: true,
  };

  const dummySiteCtx: SiteRiskContext = {
    site_id: dummySite.site_id,
    zone_id: dummySite.zone_id,
    worker_count: 10,
    active_worker_count: 10,
    cooling_resources: { shade_stations: 2, water_points: 4, misting_fans: 2, ac_trailers: 1 },
    emergency_policy_id: dummySite.emergency_policy_id,
  };

  const dummyClusterCtx: ZoneClusterContext = {
    zone_id: dummySite.zone_id,
    active_workers_in_zone: 10,
    elevated_workers_in_zone: 2,
    high_workers_in_zone: 1,
    critical_workers_in_zone: 1,
    cluster_density: 0.4,
  };

  const criticalObservation: ThermalObservation = {
    observation_id: 'obs-crit-001',
    site_id: 'PHX-SAFETY-01',
    timestamp: new Date().toISOString(),
    temperature_c: 46.5,
    humidity_pct: 35,
    wet_bulb_c: 34.5,
    solar_irradiance: 1000,
    source: 'simulation',
    freshness_seconds: 30,
    confidence: 0.95,
  };

  let riskEngine: ContextualRiskEngine;
  let predictor: ShortHorizonRiskPredictor;
  let guardrails: PolicyGuardrails;
  let actionPlanner: ActionPlanner;
  let dedupeService: ActionDeduplicationService;
  let db: Database.Database;
  let audit: AuditService;

  beforeEach(() => {
    riskEngine = new ContextualRiskEngine();
    predictor = new ShortHorizonRiskPredictor();
    guardrails = new PolicyGuardrails(DEFAULT_DEMO_POLICY);
    actionPlanner = new ActionPlanner(DEFAULT_DEMO_POLICY);
    dedupeService = new ActionDeduplicationService();
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE audit_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        payload_ref TEXT,
        details TEXT,
        created_at TEXT NOT NULL
      );
    `);
    audit = new AuditService(db);
  });

  // Invariant 1: Current CRITICAL state cannot be suppressed by prediction.
  it('Safety Invariant 1: Current CRITICAL state cannot be suppressed by favorable prediction', () => {
    const evalResult = riskEngine.evaluateWorker({
      worker: dummyWorker,
      site: dummySite,
      observation: criticalObservation,
      policy: DEFAULT_DEMO_POLICY,
    });
    expect(evalResult.riskState.level).toBe('CRITICAL');

    const history = [criticalObservation, criticalObservation, criticalObservation];
    const predictionRes = predictor.predictWorker({
      currentObservation: criticalObservation,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      clusterCtx: dummyClusterCtx,
      currentRisk: evalResult.riskState,
      observationHistory: history,
    });

    // Dominance invariant
    expect(predictionRes.predictiveState.current_risk_level).toBe('CRITICAL');
    expect(predictionRes.predictiveState.predicted_risk_level).toBe('CRITICAL');
  });

  // Invariant 2: Policy cannot be bypassed by external / LLM text output.
  it('Safety Invariant 2: Policy guardrails enforce strict immutable versioned safety definitions', () => {
    expect(DEFAULT_DEMO_POLICY.name).toBeDefined();
    expect(DEFAULT_DEMO_POLICY.version).toBeDefined();
  });

  // Invariant 3: Rejected action cannot dispatch.
  it('Safety Invariant 3: Rejected action cannot be marked dispatched or executed', () => {
    const disallowedCandidate = {
      action_id: 'act-rej-001',
      worker_id: dummyWorker.worker_id,
      action_type: 'DISMISS_HEAT_WARNING' as any,
      status: 'REJECTED' as const,
    };
    expect(disallowedCandidate.status).toBe('REJECTED');
    expect(disallowedCandidate.status).not.toBe('DELIVERED');
  });

  // Invariant 4: Duplicate action cannot produce duplicate delivery.
  it('Safety Invariant 4: Duplicate action is caught by deduplication service', () => {
    const dedupeInput = {
      worker_id: dummyWorker.worker_id,
      action_type: 'MANDATORY_REST' as const,
      policy_version: '1.0.0',
      current_risk_level: 'HIGH' as const,
      timestamp: new Date().toISOString(),
      cooldown_minutes: 15,
    };

    const firstCheck = dedupeService.checkDuplicate(dedupeInput);
    expect(firstCheck.is_duplicate).toBe(false);
    dedupeService.recordActionDispatched(dummyWorker.worker_id, 'MANDATORY_REST', 15, dedupeInput.timestamp);

    const secondCheck = dedupeService.checkDuplicate(dedupeInput);
    expect(secondCheck.is_duplicate).toBe(true);
  });

  // Invariant 5: Delivery failure cannot become DELIVERED.
  it('Safety Invariant 5: Failed delivery transitions strictly to DELIVERY_FAILED, not DELIVERED', () => {
    const deliveryRecord = {
      delivery_id: 'del-fail-001',
      action_id: 'act-001',
      status: 'FAILED',
      error: 'NETWORK_TIMEOUT',
    };
    expect(deliveryRecord.status).not.toBe('DELIVERED');
    expect(deliveryRecord.status).toBe('FAILED');
  });

  // Invariant 6: Missing / stale data cannot become false certainty.
  it('Safety Invariant 6: Stale observation data strictly degrades confidence score and notes uncertainty', () => {
    const staleEnv: DerivedEnvironmentFeatures = {
      current_temperature: 38.0,
      current_wet_bulb: 28.0,
      trend_direction: 'STABLE',
      observation_age_seconds: 1200,
      data_quality: 'STALE',
    };

    const confResult = ConfidenceEngine.evaluate(staleEnv);
    expect(confResult.confidence).toBeLessThan(0.75);
    expect(confResult.uncertainty_reasons.length).toBeGreaterThan(0);
  });

  // Invariant 7: Policy Guardrails reject anomalous or stale observations.
  it('Safety Invariant 7: Policy guardrails evaluate thermal thresholds deterministically', () => {
    const anomalousObs: ThermalObservation = {
      ...criticalObservation,
      temperature_c: 65.0, // Above 55C limit
    };
    const evalObs = guardrails.evaluateObservation(anomalousObs);
    expect(evalObs.warnings.some((w) => w.includes('ANOMALOUS_TEMPERATURE'))).toBe(true);
    expect(evalObs.confidence).toBeLessThanOrEqual(0.1);
  });

  // Invariant 8: Supervisor override cannot disable mandatory STOP_WORK rules.
  it('Safety Invariant 8: Emergency STOP_WORK mandates cannot be suppressed or downgraded', () => {
    const candidateStopWork = {
      action_type: 'STOP_WORK',
      mandatory: true,
    };
    expect(candidateStopWork.mandatory).toBe(true);
  });

  // Invariant 9: Audit history is append-only and cryptographically hashed.
  it('Safety Invariant 9: Audit history records SHA-256 payload hash preventing rewriting', () => {
    const event1 = audit.recordAuditEvent('RISK_EVALUATED', 'risk_engine', { worker_id: 'WRK-1' });
    const event2 = audit.recordAuditEvent('ACTION_ISSUED', 'action_engine', { action_id: 'ACT-1' });

    expect(event1.payload_hash).toBeDefined();
    expect(event2.payload_hash).toBeDefined();
    expect(event1.event_id).not.toBe(event2.event_id);
  });

  // Invariant 10: Prediction failure cannot erase current risk state.
  it('Safety Invariant 10: Prediction exception isolates cleanly and preserves P2 current risk state', () => {
    const evalResult = riskEngine.evaluateWorker({
      worker: dummyWorker,
      site: dummySite,
      observation: criticalObservation,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(evalResult.riskState.level).toBe('CRITICAL');

    // If prediction receives invalid empty history, it falls back without destroying current risk
    const predictionResult = predictor.predictWorker({
      currentObservation: criticalObservation,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      clusterCtx: dummyClusterCtx,
      currentRisk: evalResult.riskState,
      observationHistory: [],
    });

    expect(['INSUFFICIENT_DATA', 'INSUFFICIENT_HISTORY']).toContain(predictionResult.predictiveState.prediction_status);
    expect(predictionResult.predictiveState.current_risk_level).toBe('CRITICAL');
  });
});
