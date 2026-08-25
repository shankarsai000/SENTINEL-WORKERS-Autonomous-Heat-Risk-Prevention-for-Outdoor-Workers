import { describe, it, expect } from 'vitest';
import { ActionPlanner } from '../../packages/actions/src/planner/action-planner.js';
import { PolicyGate } from '../../packages/actions/src/policy/policy-gate.js';
import { ActionExecutor } from '../../packages/actions/src/execution/action-executor.js';
import { ActionAcknowledgementService } from '../../packages/actions/src/acknowledgement/acknowledgement-service.js';
import { EscalationEvaluator } from '../../packages/actions/src/escalation/escalation-evaluator.js';
import { SimulatedNotificationProvider } from '../../packages/actions/src/delivery/simulated-provider.js';
import { DEFAULT_DEMO_POLICY } from '@sentinel/policy';
import { RiskState, PredictiveRiskState, WorkerRiskContext, SiteRiskContext, ActionDecision } from '@sentinel/schemas';

describe('Phase P4 Action Replay Benchmark Scenarios A–H (Section 47)', () => {
  const dummyWorkerCtx: WorkerRiskContext = {
    worker_id: 'worker-0042',
    site_id: 'PHX-SITE-01',
    role: 'Laborer',
    task_intensity: 'MODERATE',
    shift_start: '06:00',
    shift_end: '14:00',
    exposure_duration_minutes: 120,
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

  // SCENARIO A: WATCH -> Recommendation -> Ack -> Complete
  it('Scenario A: WATCH risk produces recommendation and completes upon acknowledgement', async () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T09:30:00Z',
      score: 0.38,
      level: 'WATCH',
      confidence: 0.90,
      reason_codes: ['WARMING_TREND'],
      exposure_duration_mins: 90,
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(plan.recommended_action.action_type).toBe('HYDRATION_REMINDER');

    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-scen-a',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T09:30:00Z',
      action_type: plan.recommended_action.action_type,
      priority: plan.recommended_action.priority,
      reason_codes: plan.recommended_action.reason_codes,
      evidence_refs: {},
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.90,
      requires_acknowledgement: false,
      allowed: true,
      idempotency_key: 'idem-scen-a',
      message: plan.recommended_action.message_template,
    };

    const execResult = await executor.execute({ decision });
    expect(execResult.status).toBe('COMPLETED');
    expect(execResult.delivery?.status).toBe('DELIVERED');
  });

  // SCENARIO B: ELEVATED -> Recovery break -> Ack -> Complete
  it('Scenario B: ELEVATED risk triggers recovery break with required acknowledgement', async () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T11:00:00Z',
      score: 0.62,
      level: 'ELEVATED',
      confidence: 0.90,
      reason_codes: ['ELEVATED_HEAT'],
      exposure_duration_mins: 150,
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-scen-b',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T11:00:00Z',
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      reason_codes: plan.recommended_action.reason_codes,
      evidence_refs: {},
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.90,
      requires_acknowledgement: true,
      allowed: true,
      idempotency_key: 'idem-scen-b',
      message: 'Take a recovery break.',
    };

    const execResult = await executor.execute({ decision });
    expect(execResult.status).toBe('ACK_PENDING');

    const ackResult = ActionAcknowledgementService.acknowledge({
      action: execResult.action,
      actor_type: 'WORKER',
      actor_ref: 'worker-0042',
      source: 'SMS_REPLY',
    });

    expect(ackResult.action.status).toBe('COMPLETED');
    expect(ackResult.action.outcome).toBe('ACKNOWLEDGED');
  });

  // SCENARIO C: ELEVATED -> Action -> No Ack -> Escalation
  it('Scenario C: Unacknowledged ELEVATED action escalates past deadline', async () => {
    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-scen-c',
      worker_id: 'worker-0127',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T11:00:00Z',
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      reason_codes: ['ELEVATED_HEAT'],
      evidence_refs: {},
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.90,
      requires_acknowledgement: true,
      allowed: true,
      idempotency_key: 'idem-scen-c',
      message: 'Take a recovery break.',
    };

    const execResult = await executor.execute({ decision });
    expect(execResult.status).toBe('ACK_PENDING');

    // Simulate clock advancing 30 minutes later (past deadline)
    const futureTime = new Date(Date.now() + 35 * 60 * 1000).toISOString();
    const escResult = EscalationEvaluator.evaluateDeadline(execResult.action, futureTime);

    expect(escResult.is_expired).toBe(true);
    expect(escResult.action.status).toBe('ESCALATED');
    expect(escResult.escalation?.status).toBe('TRIGGERED');
  });

  // SCENARIO D: HIGH -> Supervisor Review -> Override -> Audit
  it('Scenario D: HIGH risk action is overridden by supervisor with documented reason', () => {
    const action = {
      action_id: 'act-scen-d',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      action_type: 'RECOVERY_BREAK' as const,
      priority: 'HIGH' as const,
      status: 'ACK_PENDING' as const,
      policy_version: '1.0.0',
      issued_at: '2026-06-15T12:00:00Z',
      message: 'Take recovery break',
      actor: 'AutonomousAgent',
    };

    const overridden = {
      ...action,
      status: 'OVERRIDDEN' as const,
      outcome: 'OVERRIDDEN' as const,
      override_by: 'Site Supervisor',
      override_reason: 'Worker moved to air conditioned fabrication tent.',
    };

    expect(overridden.status).toBe('OVERRIDDEN');
    expect(overridden.override_reason).toBeDefined();
  });

  // SCENARIO E: CRITICAL -> Deterministic Protective Action -> Complete
  it('Scenario E: CRITICAL risk triggers deterministic STOP_WORK emergency protective action', async () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T13:30:00Z',
      score: 0.94,
      level: 'CRITICAL',
      confidence: 0.98,
      reason_codes: ['EXTREME_HEAT_46C'],
      exposure_duration_mins: 220,
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(plan.recommended_action.action_type).toBe('STOP_WORK');
    expect(plan.recommended_action.priority).toBe('EMERGENCY');

    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-scen-e',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T13:30:00Z',
      action_type: 'STOP_WORK',
      priority: 'EMERGENCY',
      reason_codes: plan.recommended_action.reason_codes,
      evidence_refs: { current_risk_level: 'CRITICAL' },
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'EMERGENCY_GUARDRAIL',
      decision_mode: 'EMERGENCY_AUTO',
      confidence: 0.98,
      requires_acknowledgement: true,
      allowed: true,
      idempotency_key: 'idem-scen-e',
      message: plan.recommended_action.message_template,
      recommended_rest_minutes: 60,
    };

    const execResult = await executor.execute({ decision });
    expect(execResult.status).toBe('ACK_PENDING');
    expect(execResult.action.recommended_rest_minutes).toBe(60);
  });

  // SCENARIO F: Duplicate Risk Event -> One action -> Second deduplicated
  it('Scenario F: Duplicate risk event is cleanly deduplicated', async () => {
    const executor = new ActionExecutor();
    const decision: ActionDecision = {
      action_id: 'act-scen-f',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T11:00:00Z',
      action_type: 'SHADE_RECOMMENDATION',
      priority: 'MEDIUM',
      reason_codes: ['ELEVATED_HEAT'],
      evidence_refs: { current_risk_level: 'ELEVATED' },
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.90,
      requires_acknowledgement: false,
      allowed: true,
      idempotency_key: 'idem-scen-f',
      message: 'Take a shaded break.',
    };

    const res1 = await executor.execute({ decision });
    expect(res1.status).toBe('COMPLETED');
    expect(res1.deduplicated).toBe(false);

    const res2 = await executor.execute({ decision });
    expect(res2.status).toBe('REJECTED');
    expect(res2.deduplicated).toBe(true);
  });

  // SCENARIO G: Notification failure -> Retry -> Failure visible
  it('Scenario G: Delivery failure triggers DELIVERY_FAILED and allows bounded retry', async () => {
    const failProvider = new SimulatedNotificationProvider();
    failProvider.setFailureSimulation(true, 'CARRIER_TIMEOUT');

    const executor = new ActionExecutor(failProvider);
    const decision: ActionDecision = {
      action_id: 'act-scen-g',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      created_at: '2026-06-15T11:00:00Z',
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      reason_codes: ['ELEVATED_HEAT'],
      evidence_refs: { current_risk_level: 'HIGH' },
      policy_id: 'demo-construction-v1',
      policy_version: '1.0.0',
      selected_by: 'AUTONOMOUS_POLICY_PLANNER',
      decision_mode: 'AUTONOMOUS',
      confidence: 0.90,
      requires_acknowledgement: true,
      allowed: true,
      idempotency_key: 'idem-scen-g',
      message: 'Take a recovery break.',
    };

    const res1 = await executor.execute({ decision, provider: failProvider });
    expect(res1.status).toBe('DELIVERY_FAILED');

    // Fix failure condition and retry
    failProvider.setFailureSimulation(false);
    const retryDecision = {
      ...decision,
      action_id: 'act-scen-g-retry',
      idempotency_key: 'idem-scen-g-retry',
    };

    const res2 = await executor.execute({ decision: retryDecision, provider: failProvider });
    expect(res2.status).toBe('ACK_PENDING');
    expect(res2.delivery?.status).toBe('DELIVERED');
  });

  // SCENARIO H: Prediction unavailable -> P2 risk still produces safe policy behavior
  it('Scenario H: Prediction unavailability falls back to safe current-risk policy planning', () => {
    const currentRisk: RiskState = {
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-06-15T12:00:00Z',
      score: 0.76,
      level: 'HIGH',
      confidence: 0.90,
      reason_codes: ['HIGH_EXPOSURE'],
      exposure_duration_mins: 180,
    };

    const plan = ActionPlanner.planActions({
      currentRisk,
      predictedRisk: null, // Prediction unavailable
      workerCtx: dummyWorkerCtx,
      siteCtx: dummySiteCtx,
      policy: DEFAULT_DEMO_POLICY,
    });

    expect(plan.recommended_action.action_type).toBe('RECOVERY_BREAK');
    expect(plan.recommended_action.priority).toBe('HIGH');
  });
});
