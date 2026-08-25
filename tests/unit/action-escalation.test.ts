import { describe, it, expect } from 'vitest';
import { EscalationEvaluator } from '../../packages/actions/src/escalation/escalation-evaluator.js';
import { Action } from '@sentinel/schemas';

describe('Phase P4 Action Escalation Unit Tests', () => {
  it('triggers escalation when currentTime exceeds ack_deadline', () => {
    const action: Action = {
      action_id: 'act-001',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      status: 'ACK_PENDING',
      policy_version: '1.0.0',
      issued_at: '2026-06-15T12:00:00Z',
      ack_deadline: '2026-06-15T12:20:00Z',
      message: 'Take a recovery break.',
      actor: 'AutonomousActionAgent',
    };

    // Current time is past deadline (12:25)
    const result = EscalationEvaluator.evaluateDeadline(action, '2026-06-15T12:25:00Z');

    expect(result.is_expired).toBe(true);
    expect(result.action.status).toBe('ESCALATED');
    expect(result.escalation).toBeDefined();
    expect(result.escalation?.status).toBe('TRIGGERED');
    expect(result.escalation?.severity).toBe('HIGH');
  });

  it('does not escalate when currentTime is before ack_deadline', () => {
    const action: Action = {
      action_id: 'act-001',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      action_type: 'RECOVERY_BREAK',
      priority: 'HIGH',
      status: 'ACK_PENDING',
      policy_version: '1.0.0',
      issued_at: '2026-06-15T12:00:00Z',
      ack_deadline: '2026-06-15T12:20:00Z',
      message: 'Take a recovery break.',
      actor: 'AutonomousActionAgent',
    };

    // Current time is before deadline (12:10)
    const result = EscalationEvaluator.evaluateDeadline(action, '2026-06-15T12:10:00Z');

    expect(result.is_expired).toBe(false);
    expect(result.action.status).toBe('ACK_PENDING');
    expect(result.escalation).toBeUndefined();
  });
});
