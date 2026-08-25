import { describe, it, expect } from 'vitest';
import { ActionPlanner } from '../../packages/actions/src/planner/action-planner.js';
import { DEFAULT_DEMO_POLICY } from '@sentinel/policy';
import { RiskState, PredictiveRiskState, WorkerRiskContext, SiteRiskContext } from '@sentinel/schemas';

describe('Phase P4 ActionPlanner Unit Tests', () => {
  const dummyWorkerCtx: WorkerRiskContext = {
    worker_id: 'worker-0042',
    site_id: 'PHX-SITE-01',
    role: 'Laborer',
    task_intensity: 'HEAVY',
    shift_start: '06:00',
    shift_end: '14:00',
    exposure_duration_minutes: 180,
    recent_recovery_minutes: null,
    risk_modifier: 'baseline',
    channel: 'SMS_SIMULATED',
    active: true,
  };

  const dummySiteCtx: SiteRiskContext = {
    site_id: 'PHX-SITE-01',
    zone_id: 'ZONE-A',
    worker_count: 50,
    active_worker_count: 50,
    cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
    emergency_policy_id: 'demo-construction-v1',
  };

  it('ranks STOP_WORK as top EMERGENCY priority for CRITICAL risk state', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T13:00:00Z',
      score: 0.92,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['EXTREME_HEAT_LOAD'],
      exposure_duration_mins: 180,
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(plan.recommended_action.action_type).toBe('STOP_WORK');
    expect(plan.recommended_action.priority).toBe('EMERGENCY');
    expect(plan.recommended_action.requires_acknowledgement).toBe(true);
  });

  it('recommends RECOVERY_BREAK for HIGH risk state', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T12:00:00Z',
      score: 0.78,
      level: 'HIGH',
      confidence: 0.90,
      reason_codes: ['LONG_EXPOSURE', 'HEAVY_WORK'],
      exposure_duration_mins: 180,
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(plan.recommended_action.action_type).toBe('RECOVERY_BREAK');
    expect(plan.recommended_action.priority).toBe('HIGH');
    expect(plan.recommended_action.recommended_rest_minutes).toBe(20);
  });

  it('promotes pre-emptive RECOVERY_BREAK on P3 early warning during WATCH state', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T10:30:00Z',
      score: 0.42,
      level: 'WATCH',
      confidence: 0.88,
      reason_codes: ['RISING_TEMP'],
      exposure_duration_mins: 90,
    };

    const predictedRisk: PredictiveRiskState = {
      prediction_id: 'pred-123',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T10:30:00Z',
      current_risk_level: 'WATCH',
      current_risk_score: 0.42,
      p_elevated_30m: 0.92,
      p_critical_60m: 0.81,
      expected_time_to_threshold_minutes: 28,
      predicted_risk_level: 'HIGH',
      predictive_state: 'PREDICTED_HIGH',
      prediction_confidence: 0.85,
      uncertainty_band: 'LOW',
      prediction_status: 'AVAILABLE',
      prediction_source: 'TREND_EXTRAPOLATION',
      early_warning: true,
      predictive_reason_codes: ['RISING_THERMAL_TREND', 'LONG_EXPOSURE_ACCUMULATION'],
      feature_contributions: {},
      model_id: 'sentinel-risk-logistic',
      model_version: '1.0.0',
      source_observation_ids: ['obs-1', 'obs-2', 'obs-3'],
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      predictedRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(plan.recommended_action.action_type).toBe('RECOVERY_BREAK');
    expect(plan.recommended_action.reason_codes).toContain('PREDICTIVE_EARLY_WARNING');
  });

  it('recommends MONITOR or HYDRATION_REMINDER for baseline GREEN state', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T07:00:00Z',
      score: 0.20,
      level: 'GREEN',
      confidence: 0.95,
      reason_codes: ['SAFE_THERMAL_MARGIN'],
      exposure_duration_mins: 30,
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(plan.recommended_action.action_type).toBe('MONITOR');
    expect(plan.recommended_action.priority).toBe('LOW');
  });
});
