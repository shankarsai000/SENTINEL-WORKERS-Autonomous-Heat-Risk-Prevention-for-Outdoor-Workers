import { describe, it, expect } from 'vitest';
import { RiskStateMachine } from '../../packages/risk/src/state/risk-state-machine.js';
import { REASON_CODES } from '../../packages/risk/src/scoring/reason-codes.js';

describe('Deterministic Risk State Machine Transitions', () => {
  it('correctly records escalation transitions', () => {
    const res = RiskStateMachine.evaluateTransition('GREEN', 'WATCH');
    expect(res.transition_type).toBe('ESCALATION');
    expect(res.previous_state).toBe('GREEN');
    expect(res.new_state).toBe('WATCH');
    expect(res.transition_reason_codes).toContain(REASON_CODES.RISK_ESCALATION);
  });

  it('correctly records de-escalation transitions', () => {
    const res = RiskStateMachine.evaluateTransition('HIGH', 'ELEVATED');
    expect(res.transition_type).toBe('DEESCALATION');
    expect(res.previous_state).toBe('HIGH');
    expect(res.new_state).toBe('ELEVATED');
    expect(res.transition_reason_codes).toContain(REASON_CODES.RISK_DEESCALATION);
  });

  it('handles EMERGENCY_OVERRIDE jump directly to CRITICAL', () => {
    const res = RiskStateMachine.evaluateTransition('GREEN', 'CRITICAL', true);
    expect(res.transition_type).toBe('EMERGENCY_OVERRIDE');
    expect(res.previous_state).toBe('GREEN');
    expect(res.new_state).toBe('CRITICAL');
    expect(res.transition_reason_codes).toContain(REASON_CODES.GUARDRAIL_EMERGENCY_OVERRIDE);
  });

  it('records STABLE transition when risk level remains unchanged', () => {
    const res = RiskStateMachine.evaluateTransition('WATCH', 'WATCH');
    expect(res.transition_type).toBe('STABLE');
    expect(res.transition_reason_codes).toHaveLength(0);
  });
});
