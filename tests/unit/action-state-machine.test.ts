import { describe, it, expect } from 'vitest';
import { ActionStateMachine } from '../../packages/actions/src/execution/action-state-machine.js';

describe('Phase P4 ActionStateMachine Unit Tests', () => {
  it('allows legal execution pipeline state transitions', () => {
    expect(ActionStateMachine.canTransition('PROPOSED', 'POLICY_REVIEW')).toBe(true);
    expect(ActionStateMachine.canTransition('POLICY_REVIEW', 'APPROVED')).toBe(true);
    expect(ActionStateMachine.canTransition('APPROVED', 'DISPATCHING')).toBe(true);
    expect(ActionStateMachine.canTransition('DISPATCHING', 'DELIVERED')).toBe(true);
    expect(ActionStateMachine.canTransition('DELIVERED', 'ACK_PENDING')).toBe(true);
    expect(ActionStateMachine.canTransition('ACK_PENDING', 'ACKNOWLEDGED')).toBe(true);
    expect(ActionStateMachine.canTransition('ACKNOWLEDGED', 'COMPLETED')).toBe(true);
  });

  it('allows escalation and override pathways', () => {
    expect(ActionStateMachine.canTransition('ACK_PENDING', 'ESCALATED')).toBe(true);
    expect(ActionStateMachine.canTransition('ESCALATED', 'ACKNOWLEDGED')).toBe(true);
    expect(ActionStateMachine.canTransition('ACK_PENDING', 'OVERRIDDEN')).toBe(true);
    expect(ActionStateMachine.canTransition('OVERRIDDEN', 'COMPLETED')).toBe(true);
  });

  it('rejects illegal state transitions with descriptive error in validateTransition', () => {
    expect(ActionStateMachine.canTransition('COMPLETED', 'DISPATCHING')).toBe(false);
    expect(ActionStateMachine.canTransition('PROPOSED', 'COMPLETED')).toBe(false);
    expect(ActionStateMachine.canTransition('REJECTED', 'APPROVED')).toBe(false);

    expect(() => {
      ActionStateMachine.validateTransition('act-123', 'COMPLETED', 'DISPATCHING');
    }).toThrow(/Invalid Action state transition/);
  });
});
