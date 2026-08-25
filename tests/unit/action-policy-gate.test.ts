import { describe, it, expect } from 'vitest';
import { PolicyGate } from '../../packages/actions/src/policy/policy-gate.js';
import { DEFAULT_DEMO_POLICY } from '@sentinel/policy';
import { RiskState, WorkerRiskContext, SiteRiskContext } from '@sentinel/schemas';
import { ActionOption } from '../../packages/actions/src/planner/action-options.js';

describe('Phase P4 PolicyGate Unit Tests', () => {
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

  it('allows emergency STOP_WORK when risk state is CRITICAL with EMERGENCY_AUTO mode', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T13:00:00Z',
      score: 0.90,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['EXTREME_HEAT_LOAD'],
      exposure_duration_mins: 180,
    };

    const candidate: ActionOption = {
      action_type: 'STOP_WORK',
      priority: 'EMERGENCY',
      reason_codes: ['CRITICAL_LIMIT'],
      requires_acknowledgement: true,
      reversible: false,
      policy_basis: 'policy#guardrails',
      message_template: 'Mandatory stop work.',
    };

    const gate = PolicyGate.evaluate({
      candidate,
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(gate.allowed).toBe(true);
    expect(gate.decision_mode).toBe('EMERGENCY_AUTO');
    expect(gate.requires_acknowledgement).toBe(true);
    expect(gate.cooldown_minutes).toBe(0);
  });

  it('restricts autonomous execution to SUPERVISOR_REQUIRED on STALE data', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T12:00:00Z',
      score: 0.75,
      level: 'HIGH',
      confidence: 0.40,
      data_freshness: 'STALE',
      reason_codes: ['HIGH_TEMP'],
      exposure_duration_mins: 180,
    };

    const candidate: ActionOption = {
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      reason_codes: ['HIGH_HEAT'],
      requires_acknowledgement: true,
      reversible: true,
      policy_basis: 'policy#action_eligibility',
      message_template: 'Take a recovery break.',
    };

    const gate = PolicyGate.evaluate({
      candidate,
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
      freshness: 'STALE',
      confidence: 0.40,
    });

    expect(gate.allowed).toBe(true);
    expect(gate.decision_mode).toBe('SUPERVISOR_REQUIRED');
  });

  it('rejects ineligible action types under active policy', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T07:00:00Z',
      score: 0.15,
      level: 'GREEN',
      confidence: 0.95,
      reason_codes: ['SAFE_THERMAL_MARGIN'],
      exposure_duration_mins: 15,
    };

    const candidate: ActionOption = {
      action_type: 'STOP_WORK',
      priority: 'EMERGENCY',
      reason_codes: ['INELIGIBLE_TEST'],
      requires_acknowledgement: true,
      reversible: false,
      policy_basis: 'policy#test',
      message_template: 'Stop work.',
    };

    const gate = PolicyGate.evaluate({
      candidate,
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(gate.allowed).toBe(false);
    expect(gate.rejected_reason).toContain('not eligible');
  });
});
