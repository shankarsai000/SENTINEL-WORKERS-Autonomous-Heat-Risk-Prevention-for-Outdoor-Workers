import { describe, it, expect } from 'vitest';
import { calculateContextualScore } from '../../packages/risk/src/scoring/contextual-score.js';
import { ScoreNormalizer } from '../../packages/risk/src/scoring/score-normalizer.js';
import { DEFAULT_DEMO_POLICY } from '../../packages/policy/src/loader/policy-loader.js';
import {
  DerivedEnvironmentFeatures,
  WorkerRiskContext,
  ZoneClusterContext,
} from '@sentinel/schemas';

describe('Contextual Risk Scoring & Invariant Property Tests', () => {
  const baseEnv: DerivedEnvironmentFeatures = {
    current_temperature: 35.0,
    current_wet_bulb: 24.0,
    humidity: 30,
    solar_irradiance: 600,
    trend_direction: 'STABLE',
    observation_age_seconds: 60,
    data_quality: 'FRESH',
  };

  const baseWorker: WorkerRiskContext = {
    worker_id: 'WRK-0001',
    site_id: 'PHX-SITE-01',
    role: 'Carpenter',
    task_intensity: 'MODERATE',
    shift_start: '2026-08-25T06:00:00Z',
    shift_end: '2026-08-25T14:00:00Z',
    exposure_duration_minutes: 120,
    recent_recovery_minutes: null,
    risk_modifier: 'baseline',
    channel: 'SMS',
    active: true,
  };

  const baseCluster: ZoneClusterContext = {
    zone_id: 'ZONE-1',
    active_workers_in_zone: 20,
    elevated_workers_in_zone: 2,
    high_workers_in_zone: 0,
    critical_workers_in_zone: 0,
    cluster_density: 0.1,
  };

  it('calculates baseline contextual score within normalized 0.0 - 1.0 bounds', () => {
    const result = calculateContextualScore(baseEnv, baseWorker, baseCluster, DEFAULT_DEMO_POLICY);
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(1.0);
    expect(result.breakdown.environment.normalized_value).toBeGreaterThan(0);
    expect(result.breakdown.exposure.normalized_value).toBeGreaterThan(0);
  });

  // Property Invariant 1: Environmental monotonicity
  it('PROPERTY INVARIANT: Increasing temperature strictly does not decrease environmental component', () => {
    const lowTempEnv = { ...baseEnv, current_temperature: 30.0, current_wet_bulb: 20.0 };
    const highTempEnv = { ...baseEnv, current_temperature: 42.0, current_wet_bulb: 28.0 };

    const lowScore = ScoreNormalizer.normalizeEnvironment(lowTempEnv, DEFAULT_DEMO_POLICY);
    const highScore = ScoreNormalizer.normalizeEnvironment(highTempEnv, DEFAULT_DEMO_POLICY);

    expect(highScore.normalized_value).toBeGreaterThan(lowScore.normalized_value);
  });

  // Property Invariant 2: Exposure monotonicity
  it('PROPERTY INVARIANT: Increasing active exposure duration strictly does not decrease exposure component', () => {
    const w1 = { ...baseWorker, exposure_duration_minutes: 60 };
    const w2 = { ...baseWorker, exposure_duration_minutes: 240 };

    const score1 = ScoreNormalizer.normalizeExposure(w1, DEFAULT_DEMO_POLICY);
    const score2 = ScoreNormalizer.normalizeExposure(w2, DEFAULT_DEMO_POLICY);

    expect(score2.normalized_value).toBeGreaterThan(score1.normalized_value);
  });

  // Property Invariant 3: Task intensity monotonicity
  it('PROPERTY INVARIANT: Task intensity progression LIGHT <= MODERATE <= HEAVY is monotonic', () => {
    const wLight = { ...baseWorker, task_intensity: 'LIGHT' as const };
    const wMod = { ...baseWorker, task_intensity: 'MODERATE' as const };
    const wHeavy = { ...baseWorker, task_intensity: 'HEAVY' as const };

    const sLight = ScoreNormalizer.normalizeTaskIntensity(wLight, DEFAULT_DEMO_POLICY).normalized_value;
    const sMod = ScoreNormalizer.normalizeTaskIntensity(wMod, DEFAULT_DEMO_POLICY).normalized_value;
    const sHeavy = ScoreNormalizer.normalizeTaskIntensity(wHeavy, DEFAULT_DEMO_POLICY).normalized_value;

    expect(sLight).toBeLessThanOrEqual(sMod);
    expect(sMod).toBeLessThanOrEqual(sHeavy);
  });

  // Recovery mitigation effect
  it('reduces overall contextual score when explicit recovery is applied', () => {
    const workerNoRec = { ...baseWorker, recent_recovery_minutes: null };
    const workerWithRec = { ...baseWorker, recent_recovery_minutes: 30 };

    const scoreNoRec = calculateContextualScore(baseEnv, workerNoRec, baseCluster, DEFAULT_DEMO_POLICY).score;
    const scoreWithRec = calculateContextualScore(baseEnv, workerWithRec, baseCluster, DEFAULT_DEMO_POLICY).score;

    expect(scoreWithRec).toBeLessThan(scoreNoRec);
  });
});
