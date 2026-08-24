import { describe, it, expect } from 'vitest';
import { PolicyGuardrails, DEFAULT_PHOENIX_POLICY } from '../../packages/policy/src/index.js';
import { ThermalObservation, RiskState, Worker, Action } from '../../packages/schemas/src/contracts.js';

describe('Safety Policy & Deterministic Guardrails', () => {
  const guardrails = new PolicyGuardrails(DEFAULT_PHOENIX_POLICY);

  const mockWorker: Worker = {
    worker_id: 'WRK-0001',
    site_id: 'PHX-SITE-01',
    role: 'Laborer',
    shift_start: '06:00',
    shift_end: '14:30',
    task_intensity: 'HEAVY',
    channel: 'SMS_SIMULATED',
    consent_flags: { data_processing: true, notification_consent: true },
    risk_modifier: 'baseline',
  };

  it('detects stale data and applies confidence penalty', () => {
    const staleObservation: ThermalObservation = {
      observation_id: 'OBS-STALE',
      site_id: 'PHX-SITE-01',
      timestamp: new Date().toISOString(),
      temperature_c: 38.0,
      humidity_pct: 30,
      wet_bulb_c: 24,
      solar_irradiance: 500,
      source: 'simulation',
      freshness_seconds: 600, // Exceeds 300s limit
      confidence: 1.0,
    };

    const evalRes = guardrails.evaluateObservation(staleObservation);
    expect(evalRes.isStale).toBe(true);
    expect(evalRes.confidence).toBeLessThan(1.0);
    expect(evalRes.warnings[0]).toContain('DATA_STALE');
  });

  it('enforces mandatory work halt under critical thermal exposure', () => {
    const criticalObs: ThermalObservation = {
      observation_id: 'OBS-CRITICAL',
      site_id: 'PHX-SITE-01',
      timestamp: new Date().toISOString(),
      temperature_c: 46.5,
      humidity_pct: 18,
      wet_bulb_c: 28,
      solar_irradiance: 950,
      source: 'simulation',
      freshness_seconds: 10,
      confidence: 1.0,
    };

    const criticalRisk: RiskState = {
      worker_id: 'WRK-0001',
      site_id: 'PHX-SITE-01',
      timestamp: new Date().toISOString(),
      score: 0.92,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['EXTREME_AMBIENT_HEAT'],
      exposure_duration_mins: 240,
    };

    const evalRes = guardrails.checkEmergencyConditions(mockWorker, criticalRisk, criticalObs);
    expect(evalRes.passed).toBe(false); // Hard guardrail override
    expect(evalRes.enforcedAction).toBeDefined();
    expect(evalRes.enforcedAction?.action_type).toBe('STOP_WORK');
    expect(evalRes.requiresSupervisorAttention).toBe(true);
  });

  it('escalates unacknowledged critical actions', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const unackedAction: Action = {
      action_id: 'ACT-UNACKED',
      worker_id: 'WRK-0001',
      site_id: 'PHX-SITE-01',
      action_type: 'STOP_WORK',
      policy_version: '2.0.0',
      issued_at: tenMinutesAgo,
      outcome: 'PENDING',
      message: 'Stop work immediately',
      actor: 'AutonomousActionAgent',
    };

    const escalation = guardrails.checkEscalation(unackedAction, new Date().toISOString());
    expect(escalation.shouldEscalate).toBe(true);
    expect(escalation.reason).toContain('CRITICAL action unacknowledged');
  });
});
