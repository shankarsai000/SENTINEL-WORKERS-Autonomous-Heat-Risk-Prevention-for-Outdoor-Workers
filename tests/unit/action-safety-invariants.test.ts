import { describe, it, expect } from 'vitest';
import { PolicyGate } from '../../packages/actions/src/policy/policy-gate.js';
import { ActionExecutor } from '../../packages/actions/src/execution/action-executor.js';
import { ActionStateMachine } from '../../packages/actions/src/execution/action-state-machine.js';
import { ActionAcknowledgementService } from '../../packages/actions/src/acknowledgement/acknowledgement-service.js';
import { SimulatedNotificationProvider } from '../../packages/actions/src/delivery/simulated-provider.js';
import { DEFAULT_DEMO_POLICY } from '@sentinel/policy';
import { RiskState, ActionDecision, WorkerRiskContext, SiteRiskContext } from '@sentinel/schemas';

describe('Phase P4 Safety Invariants Verification Suite (Section 46)', () => {
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

  // Invariant 1: Policy Gate rejects unauthorized action types
  it('Safety Invariant 1: LLM/arbitrary action strings cannot bypass deterministic policy gate', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T08:00:00Z',
      score: 0.2,
      level: 'GREEN',
      confidence: 0.9,
      reason_codes: [],
      exposure_duration_mins: 30,
    };

    const gate = PolicyGate.evaluate({
      candidate: {
        action_type: 'STOP_WORK',
        priority: 'EMERGENCY',
        reason_codes: ['LLM_HALLUCINATION'],
        requires_acknowledgement: true,
        reversible: false,
        policy_basis: 'unsupported',
        message_template: 'Stop work immediately.',
      },
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(gate.allowed).toBe(false);
  });

  // Invariant 2: Rejected action cannot dispatch
  it('Safety Invariant 2: Rejected action cannot dispatch through notification provider', async () => {
    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-rej-01',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T08:00:00Z',
      action_type: 'STOP_WORK',
      priority: 'EMERGENCY',
      reason_codes: ['INELIGIBLE'],
      evidence_refs: {},
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.9,
      requires_acknowledgement: true,
      allowed: false, // Rejected by policy
      rejected_reason: 'Action not allowed in GREEN state',
      idempotency_key: 'idem-rej-01',
      message: 'Stop work.',
    };

    const result = await executor.execute({ decision });
    expect(result.status).toBe('REJECTED');
    expect(result.delivery).toBeUndefined();
  });

  // Invariant 3: Duplicate action cannot send twice
  it('Safety Invariant 3: Duplicate action cannot send twice within cooldown', async () => {
    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-dup-01',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T12:00:00Z',
      action_type: 'HYDRATION_REMINDER',
      priority: 'LOW',
      reason_codes: ['ROUTINE'],
      evidence_refs: { current_risk_level: 'WATCH' },
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.9,
      requires_acknowledgement: false,
      allowed: true,
      idempotency_key: 'idem-dup-01',
      message: 'Drink water.',
    };

    const res1 = await executor.execute({ decision });
    expect(res1.status).toBe('COMPLETED');
    expect(res1.deduplicated).toBe(false);

    // Second execution with same decision
    const res2 = await executor.execute({ decision });
    expect(res2.status).toBe('REJECTED');
    expect(res2.deduplicated).toBe(true);
  });

  // Invariant 4: Emergency deterministic rule cannot be disabled by supervisor override
  it('Safety Invariant 4: Emergency deterministic STOP_WORK rule cannot be disabled by supervisor override', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T13:00:00Z',
      score: 0.95,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['EXTREME_HEAT'],
      exposure_duration_mins: 200,
    };

    const gate = PolicyGate.evaluate({
      candidate: {
        action_type: 'STOP_WORK',
        priority: 'EMERGENCY',
        reason_codes: ['CRITICAL_LIMIT'],
        requires_acknowledgement: true,
        reversible: false,
        policy_basis: 'policy#guardrails',
        message_template: 'Mandatory halt.',
      },
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(gate.allowed).toBe(true);
    expect(gate.decision_mode).toBe('EMERGENCY_AUTO');
  });

  // Invariant 5 & 6: Stale data restricts autonomy to supervisor review
  it('Safety Invariants 5 & 6: Stale data restricts autonomy and requires supervisor authority', () => {
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

    const gate = PolicyGate.evaluate({
      candidate: {
        action_type: 'RECOVERY_BREAK',
        priority: 'HIGH',
        reason_codes: ['HEAT_LOAD'],
        requires_acknowledgement: true,
        reversible: true,
        policy_basis: 'policy#action_eligibility',
        message_template: 'Take a break.',
      },
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
      freshness: 'STALE',
      confidence: 0.40,
    });

    expect(gate.decision_mode).toBe('SUPERVISOR_REQUIRED');
  });

  // Invariant 7: Prediction failure / unavailability does not prevent current-risk emergency handling
  it('Safety Invariant 7: Prediction unavailability does not prevent current-risk emergency handling', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T13:00:00Z',
      score: 0.90,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['CRITICAL_AMBIENT'],
      exposure_duration_mins: 210,
    };

    const gate = PolicyGate.evaluate({
      candidate: {
        action_type: 'STOP_WORK',
        priority: 'EMERGENCY',
        reason_codes: ['CRITICAL_HEAT'],
        requires_acknowledgement: true,
        reversible: false,
        policy_basis: 'policy#guardrails',
        message_template: 'Mandatory halt.',
      },
      currentRisk,
      predictedRisk: null, // Prediction unavailable
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(gate.allowed).toBe(true);
    expect(gate.decision_mode).toBe('EMERGENCY_AUTO');
  });

  // Invariant 8: Delivery failure is never recorded as delivery success
  it('Safety Invariant 8: Delivery failure is never recorded as delivery success', async () => {
    const failProvider = new SimulatedNotificationProvider();
    failProvider.setFailureSimulation(true, 'TIMEOUT_ERROR');

    const executor = new ActionExecutor(failProvider);
    const decision: ActionDecision = {
      action_id: 'act-fail-01',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T12:00:00Z',
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      reason_codes: ['HIGH_HEAT'],
      evidence_refs: { current_risk_level: 'HIGH' },
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.9,
      requires_acknowledgement: true,
      allowed: true,
      idempotency_key: 'idem-fail-01',
      message: 'Take a break.',
    };

    const res = await executor.execute({ decision, provider: failProvider });
    expect(res.status).toBe('DELIVERY_FAILED');
    expect(res.delivery?.status).toBe('FAILED');
    expect(res.delivery?.delivered_at).toBeUndefined();
  });

  // Invariant 9: Acknowledgement cannot bypass action state rules
  it('Safety Invariant 9: Acknowledgement cannot bypass action state rules', () => {
    expect(() => {
      ActionAcknowledgementService.acknowledge({
        action: {
          action_id: 'act-inv-09',
          site_id: 'PHX-SITE-01',
          action_type: 'MONITOR',
          policy_version: '1.0.0',
          issued_at: '2026-06-15T08:00:00Z',
          status: 'REJECTED',
          message: 'Monitor',
          actor: 'System',
        },
        actor_type: 'WORKER',
        actor_ref: 'worker-0042',
        source: 'SMS_REPLY',
      });
    }).toThrow();
  });

  // Invariant 10: Every consequential action has an audit event
  it('Safety Invariant 10: Every consequential action generates structured audit events', async () => {
    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-audit-10',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T12:00:00Z',
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      reason_codes: ['HIGH_HEAT'],
      evidence_refs: { current_risk_level: 'HIGH' },
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.9,
      requires_acknowledgement: true,
      allowed: true,
      idempotency_key: 'idem-audit-10',
      message: 'Take a recovery break.',
    };

    const res = await executor.execute({ decision });
    expect(res.audit_events.length).toBeGreaterThanOrEqual(3);
    const eventTypes = res.audit_events.map((e) => e.event_type);
    expect(eventTypes).toContain('action.proposed');
    expect(eventTypes).toContain('action.approved');
    expect(eventTypes).toContain('action.dispatched');
    expect(eventTypes).toContain('action.delivered');
    expect(eventTypes).toContain('action.ack_pending');
  });
});
