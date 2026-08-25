import { describe, it, expect } from 'vitest';
import { ActionAcknowledgementService } from '../../packages/actions/src/acknowledgement/acknowledgement-service.js';
import { Action } from '@sentinel/schemas';

describe('Phase P4 Action Acknowledgement Unit Tests', () => {
  const baseAction: Action = {
    action_id: 'act-001',
    worker_id: 'worker-0042',
    site_id: 'PHX-SITE-01',
    action_type: 'RECOVERY_BREAK',
    priority: 'HIGH',
    status: 'ACK_PENDING',
    policy_version: '1.0.0',
    issued_at: '2026-06-15T12:00:00Z',
    message: 'Take a recovery break.',
    actor: 'AutonomousActionAgent',
  };

  it('successfully completes worker self-acknowledgement from ACK_PENDING', () => {
    const result = ActionAcknowledgementService.acknowledge({
      action: baseAction,
      actor_type: 'WORKER',
      actor_ref: 'worker-0042',
      source: 'SMS_REPLY',
      note: 'Heading to cooling trailer.',
    });

    expect(result.action.status).toBe('COMPLETED');
    expect(result.action.outcome).toBe('ACKNOWLEDGED');
    expect(result.acknowledgement.actor_type).toBe('WORKER');
    expect(result.acknowledgement.source).toBe('SMS_REPLY');
    expect(result.audit_events.length).toBe(2);
  });

  it('rejects acknowledgement on actions already in REJECTED state', () => {
    const rejectedAction: Action = {
      ...baseAction,
      status: 'REJECTED',
    };

    expect(() => {
      ActionAcknowledgementService.acknowledge({
        action: rejectedAction,
        actor_type: 'SUPERVISOR',
        actor_ref: 'Supervisor-1',
        source: 'CONSOLE_BUTTON',
      });
    }).toThrow(/Cannot acknowledge|Invalid Action state transition/);
  });
});
