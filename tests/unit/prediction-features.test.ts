import { describe, it, expect } from 'vitest';
import { computeTrendFeatures } from '../../packages/prediction/src/features/trend-features.js';
import { computeProjectedExposureFeatures } from '../../packages/prediction/src/features/exposure-features.js';
import { PredictionFeatureBuilder } from '../../packages/prediction/src/features/feature-builder.js';
import { DEFAULT_DEMO_POLICY } from '../../packages/policy/src/loader/policy-loader.js';
import { ThermalObservation, WorkerRiskContext, SiteRiskContext, ZoneClusterContext, RiskState } from '@sentinel/schemas';

describe('Prediction Feature Engineering & Window Validation', () => {
  const baseObs: ThermalObservation = {
    observation_id: 'obs_003',
    site_id: 'PHX-SITE-01',
    timestamp: '2026-08-25T11:00:00.000Z',
    temperature_c: 41.0,
    humidity_pct: 25,
    wet_bulb_c: 26.5,
    solar_irradiance: 850,
    source: 'simulation',
    freshness_seconds: 30,
    confidence: 0.95,
  };

  const historyObs: ThermalObservation[] = [
    {
      ...baseObs,
      observation_id: 'obs_001',
      timestamp: '2026-08-25T10:00:00.000Z', // 60m ago
      temperature_c: 37.0,
    },
    {
      ...baseObs,
      observation_id: 'obs_002',
      timestamp: '2026-08-25T10:30:00.000Z', // 30m ago
      temperature_c: 39.2,
    },
  ];

  const dummyWorkerCtx: WorkerRiskContext = {
    worker_id: 'WRK-0010',
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

  const dummySiteCtx: SiteRiskContext = {
    site_id: 'PHX-SITE-01',
    zone_id: 'ZONE-01',
    worker_count: 50,
    active_worker_count: 50,
    cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
    emergency_policy_id: 'demo-construction-v1',
  };

  const dummyClusterCtx: ZoneClusterContext = {
    zone_id: 'ZONE-01',
    active_workers_in_zone: 50,
    elevated_workers_in_zone: 8,
    high_workers_in_zone: 2,
    critical_workers_in_zone: 0,
    cluster_density: 0.20,
  };

  const dummyRiskState: RiskState = {
    worker_id: 'WRK-0010',
    site_id: 'PHX-SITE-01',
    timestamp: '2026-08-25T11:00:00.000Z',
    score: 0.62,
    level: 'ELEVATED',
    confidence: 0.90,
    reason_codes: ['ELEVATED_HEAT'],
    exposure_duration_mins: 300,
  };

  it('computes trend features including rate of change and EWMA', () => {
    const trend = computeTrendFeatures(baseObs, historyObs);

    expect(trend.trend_direction).toBe('RISING');
    expect(trend.delta_30m).toBeGreaterThan(1.0);
    expect(trend.rate_of_change_c_per_min).toBeGreaterThan(0.04);
    expect(trend.ewma_temperature_c).toBeGreaterThan(37.0);
  });

  it('computes projected exposure features with shift bounding', () => {
    const exp = computeProjectedExposureFeatures(dummyWorkerCtx, '2026-08-25T11:00:00.000Z');

    expect(exp.current_exposure_mins).toBe(300);
    expect(exp.projected_exposure_30m_mins).toBe(330);
    expect(exp.projected_exposure_60m_mins).toBe(360);
    expect(exp.normalized_projected_30m).toBeGreaterThan(0.8);
  });

  it('assembles normalized feature vector when historical window has >= 3 observations', () => {
    const res = PredictionFeatureBuilder.buildFeatures(
      baseObs,
      dummyWorkerCtx,
      dummySiteCtx,
      dummyClusterCtx,
      dummyRiskState,
      DEFAULT_DEMO_POLICY,
      historyObs
    );

    expect(res.status).toBe('AVAILABLE');
    expect(res.features).toBeDefined();
    expect(res.features?.x1_current_risk_score).toBe(0.62);
    expect(res.features?.x2_env_trend_rate).toBeGreaterThan(0);
    expect(res.feature_snapshot_id).toMatch(/^feat_[a-f0-9]{16}$/);
  });

  it('returns INSUFFICIENT_DATA when history contains fewer than minimum required observations', () => {
    const res = PredictionFeatureBuilder.buildFeatures(
      baseObs,
      dummyWorkerCtx,
      dummySiteCtx,
      dummyClusterCtx,
      dummyRiskState,
      DEFAULT_DEMO_POLICY,
      [] // Only 1 observation total
    );

    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.features).toBeUndefined();
    expect(res.status_reason).toContain('Insufficient historical observations');
  });
});
