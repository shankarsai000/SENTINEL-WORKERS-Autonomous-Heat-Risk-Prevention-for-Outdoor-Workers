import { describe, it, expect } from 'vitest';
import { GuardrailEngine } from '../../packages/risk/src/guardrails/guardrail-engine.js';
import { DEFAULT_DEMO_POLICY } from '../../packages/policy/src/loader/policy-loader.js';
import { DerivedEnvironmentFeatures, WorkerRiskContext } from '@sentinel/schemas';
import { REASON_CODES } from '../../packages/risk/src/scoring/reason-codes.js';

describe('Hard Safety Guardrails Engine', () => {
  const dummyWorker: WorkerRiskContext = {
    worker_id: 'WRK-0002',
    site_id: 'PHX-SITE-01',
    role: 'Laborer',
    task_intensity: 'LIGHT',
    shift_start: '2026-08-25T06:00:00Z',
    shift_end: '2026-08-25T14:00:00Z',
    exposure_duration_minutes: 30,
    recent_recovery_minutes: 20,
    risk_modifier: 'baseline',
    channel: 'SMS',
    active: true,
  };

  it('forces CRITICAL level and emergency guardrail override when ambient temp >= 45°C', () => {
    const extremeEnv: DerivedEnvironmentFeatures = {
      current_temperature: 45.8,
      current_wet_bulb: 28.0,
      trend_direction: 'RISING',
      observation_age_seconds: 60,
      data_quality: 'FRESH',
    };

    const result = GuardrailEngine.evaluate({
      env: extremeEnv,
      workerCtx: dummyWorker,
      preliminaryScore: 0.35, // Low preliminary score
      preliminaryLevel: 'WATCH',
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(result.final_level).toBe('CRITICAL');
    expect(result.final_score).toBeGreaterThanOrEqual(0.88);
    expect(result.override_applied).toBe(true);
    expect(result.guardrail_flags).toContain(REASON_CODES.GUARDRAIL_EMERGENCY_OVERRIDE);
    expect(result.guardrail_flags).toContain(REASON_CODES.EXTREME_AMBIENT_HEAT);
  });

  it('flags DATA_STALE guardrail when environmental observation is stale', () => {
    const staleEnv: DerivedEnvironmentFeatures = {
      current_temperature: 36.0,
      trend_direction: 'STABLE',
      observation_age_seconds: 1200, // 20m old
      data_quality: 'STALE',
    };

    const result = GuardrailEngine.evaluate({
      env: staleEnv,
      workerCtx: dummyWorker,
      preliminaryScore: 0.40,
      preliminaryLevel: 'WATCH',
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(result.guardrail_flags).toContain(REASON_CODES.DATA_STALE);
  });

  it('marks escalation_required: true when critical worker is unacknowledged', () => {
    const extremeEnv: DerivedEnvironmentFeatures = {
      current_temperature: 46.0,
      trend_direction: 'STABLE',
      observation_age_seconds: 60,
      data_quality: 'FRESH',
    };

    const result = GuardrailEngine.evaluate({
      env: extremeEnv,
      workerCtx: dummyWorker,
      preliminaryScore: 0.90,
      preliminaryLevel: 'CRITICAL',
      policy: DEFAULT_DEMO_POLICY,
      isUnacknowledgedCritical: true,
    });

    expect(result.escalation_required).toBe(true);
    expect(result.guardrail_flags).toContain(REASON_CODES.UNACKNOWLEDGED_CRITICAL_ESCALATION);
  });
});
