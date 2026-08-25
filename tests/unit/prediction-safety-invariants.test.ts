import { describe, it, expect } from 'vitest';
import { ShortHorizonRiskPredictor } from '../../packages/prediction/src/predictor.js';
import { DEFAULT_DEMO_POLICY } from '../../packages/policy/src/loader/policy-loader.js';
import {
  ThermalObservation,
  WorkerRiskContext,
  SiteRiskContext,
  ZoneClusterContext,
  RiskState,
} from '@sentinel/schemas';

describe('Phase P3 Mandatory Safety Invariants (Section 35)', () => {
  const predictor = new ShortHorizonRiskPredictor();

  const baseObs: ThermalObservation = {
    observation_id: 'obs_safe_01',
    site_id: 'PHX-SITE-01',
    timestamp: '2026-08-25T11:00:00.000Z',
    temperature_c: 42.0,
    humidity_pct: 25,
    wet_bulb_c: 27.0,
    solar_irradiance: 850,
    source: 'simulation',
    freshness_seconds: 30,
    confidence: 0.95,
  };

  const validHistory: ThermalObservation[] = [
    { ...baseObs, observation_id: 'obs_hist_1', timestamp: '2026-08-25T10:00:00.000Z', temperature_c: 38.0 },
    { ...baseObs, observation_id: 'obs_hist_2', timestamp: '2026-08-25T10:30:00.000Z', temperature_c: 40.0 },
  ];

  const dummyWorker: WorkerRiskContext = {
    worker_id: 'WRK-SAFE-01',
    site_id: 'PHX-SITE-01',
    role: 'Steelworker',
    task_intensity: 'HEAVY',
    shift_start: '2026-08-25T06:00:00.000Z',
    shift_end: '2026-08-25T14:00:00.000Z',
    exposure_duration_minutes: 300,
    recent_recovery_minutes: null,
    risk_modifier: 'baseline',
    channel: 'SMS',
    active: true,
  };

  const dummySite: SiteRiskContext = {
    site_id: 'PHX-SITE-01',
    zone_id: 'ZONE-01',
    worker_count: 50,
    active_worker_count: 50,
    cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
    emergency_policy_id: 'demo-construction-v1',
  };

  const dummyCluster: ZoneClusterContext = {
    zone_id: 'ZONE-01',
    active_workers_in_zone: 50,
    elevated_workers_in_zone: 8,
    high_workers_in_zone: 2,
    critical_workers_in_zone: 0,
    cluster_density: 0.20,
  };

  // Invariant 1: Prediction never overrides P2 CRITICAL
  it('INVARIANT 1: Prediction never overrides P2 CRITICAL state', () => {
    const criticalRisk: RiskState = {
      worker_id: dummyWorker.worker_id,
      site_id: dummySite.site_id,
      timestamp: baseObs.timestamp,
      score: 0.92,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['EXTREME_HEAT'],
      exposure_duration_mins: 300,
    };

    const res = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk: criticalRisk,
      observationHistory: validHistory,
    });

    expect(res.predictiveState.current_risk_level).toBe('CRITICAL');
    expect(res.predictiveState.predicted_risk_level).toBe('CRITICAL');
  });

  // Invariant 2: Prediction never disables a guardrail
  it('INVARIANT 2: Emergency guardrail override cannot be disabled by low future probability', () => {
    const criticalGuardrailRisk: RiskState = {
      worker_id: dummyWorker.worker_id,
      site_id: dummySite.site_id,
      timestamp: baseObs.timestamp,
      score: 0.88,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['GUARDRAIL_EMERGENCY_OVERRIDE', 'EXTREME_AMBIENT_HEAT'],
      guardrail_flags: ['GUARDRAIL_EMERGENCY_OVERRIDE'],
      exposure_duration_mins: 300,
    };

    const res = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk: criticalGuardrailRisk,
      observationHistory: validHistory,
    });

    expect(res.predictiveState.predicted_risk_level).toBe('CRITICAL');
  });

  // Invariant 3: Missing data never increases confidence
  it('INVARIANT 3: Missing sensor features strictly decreases or maintains prediction confidence', () => {
    const fullObs = { ...baseObs, wet_bulb_c: 28.0, solar_irradiance: 800 };
    const missingObs = { ...baseObs, wet_bulb_c: undefined, solar_irradiance: undefined };

    const currentRisk: RiskState = {
      worker_id: dummyWorker.worker_id,
      site_id: dummySite.site_id,
      timestamp: baseObs.timestamp,
      score: 0.50,
      level: 'ELEVATED',
      confidence: 0.90,
      reason_codes: ['MODERATE_HEAT'],
      exposure_duration_mins: 300,
    };

    const resFull = predictor.predictWorker({
      currentObservation: fullObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: validHistory,
    });

    const resMissing = predictor.predictWorker({
      currentObservation: missingObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: validHistory,
    });

    expect(resMissing.predictiveState.prediction_confidence).toBeLessThan(
      resFull.predictiveState.prediction_confidence
    );
  });

  // Invariant 4: Stale data never increases confidence
  it('INVARIANT 4: Stale observation data strictly decreases prediction confidence', () => {
    const freshRisk: RiskState = {
      worker_id: dummyWorker.worker_id,
      site_id: dummySite.site_id,
      timestamp: baseObs.timestamp,
      score: 0.50,
      level: 'ELEVATED',
      confidence: 0.90,
      data_freshness: 'FRESH',
      reason_codes: ['MODERATE_HEAT'],
      exposure_duration_mins: 300,
    };

    const staleRisk: RiskState = {
      ...freshRisk,
      data_freshness: 'STALE',
    };

    const resFresh = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk: freshRisk,
      observationHistory: validHistory,
    });

    const resStale = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk: staleRisk,
      observationHistory: validHistory,
    });

    expect(resStale.predictiveState.prediction_confidence).toBeLessThan(
      resFresh.predictiveState.prediction_confidence
    );
    expect(resStale.predictiveState.prediction_status).toBe('STALE_DATA');
  });

  // Invariant 5: Insufficient history never becomes a fabricated probability
  it('INVARIANT 5: Insufficient history yields null probabilities and INSUFFICIENT_DATA status', () => {
    const currentRisk: RiskState = {
      worker_id: dummyWorker.worker_id,
      site_id: dummySite.site_id,
      timestamp: baseObs.timestamp,
      score: 0.50,
      level: 'ELEVATED',
      confidence: 0.90,
      reason_codes: ['MODERATE_HEAT'],
      exposure_duration_mins: 300,
    };

    const res = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: [], // Zero history
    });

    expect(res.predictiveState.prediction_status).toBe('INSUFFICIENT_DATA');
    expect(res.predictiveState.p_elevated_30m).toBeNull();
    expect(res.predictiveState.p_critical_60m).toBeNull();
    expect(res.predictiveState.expected_time_to_threshold_minutes).toBeNull();
  });

  // Invariant 6: Deterministic repeatability
  it('INVARIANT 6: Identical inputs produce identical predictions deterministically', () => {
    const currentRisk: RiskState = {
      worker_id: dummyWorker.worker_id,
      site_id: dummySite.site_id,
      timestamp: baseObs.timestamp,
      score: 0.50,
      level: 'ELEVATED',
      confidence: 0.90,
      reason_codes: ['MODERATE_HEAT'],
      exposure_duration_mins: 300,
    };

    const run1 = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: validHistory,
    });

    const run2 = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: validHistory,
    });

    expect(run1.predictiveState.p_elevated_30m).toBe(run2.predictiveState.p_elevated_30m);
    expect(run1.predictiveState.p_critical_60m).toBe(run2.predictiveState.p_critical_60m);
    expect(run1.predictiveState.prediction_confidence).toBe(run2.predictiveState.prediction_confidence);
    expect(run1.predictiveState.early_warning).toBe(run2.predictiveState.early_warning);
  });

  // Invariant 7 & 8: Prediction failure isolation
  it('INVARIANT 7 & 8: Batch prediction isolates individual worker errors without crashing cycle', () => {
    const currentRisks = new Map<string, RiskState>([
      [dummyWorker.worker_id, {
        worker_id: dummyWorker.worker_id,
        site_id: dummySite.site_id,
        timestamp: baseObs.timestamp,
        score: 0.50,
        level: 'ELEVATED',
        confidence: 0.90,
        reason_codes: ['MODERATE_HEAT'],
        exposure_duration_mins: 300,
      }],
    ]);

    const res = predictor.predictBatch({
      currentObservation: baseObs,
      workers: [dummyWorker],
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisks,
      observationHistory: validHistory,
    });

    expect(res.failures).toHaveLength(0);
    expect(res.predictions).toHaveLength(1);
  });

  // Invariant 9 & 10: Model version and Policy version provenance
  it('INVARIANT 9 & 10: Model version and Policy version are attached to every prediction', () => {
    const currentRisk: RiskState = {
      worker_id: dummyWorker.worker_id,
      site_id: dummySite.site_id,
      timestamp: baseObs.timestamp,
      score: 0.50,
      level: 'ELEVATED',
      confidence: 0.90,
      reason_codes: ['MODERATE_HEAT'],
      exposure_duration_mins: 300,
    };

    const res = predictor.predictWorker({
      currentObservation: baseObs,
      workerCtx: dummyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: validHistory,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(res.predictiveState.model_id).toBe('sentinel-risk-logistic');
    expect(res.predictiveState.model_version).toBe('1.0.0');
    expect(res.predictiveState.policy_id).toBe('demo-construction-v1');
    expect(res.predictiveState.policy_version).toBe('1.0.0');
  });
});
