import { describe, it, expect } from 'vitest';
import { IncidentStateMachine } from '../../apps/api/src/services/incident-engine.js';

describe('IncidentStateMachine — Operational State Transitions', () => {
  it('allows valid forward lifecycle transitions: DETECTED -> TRIAGED -> ACTIVE -> MITIGATING -> RESOLVED -> CLOSED', () => {
    expect(IncidentStateMachine.canTransition('DETECTED', 'TRIAGED')).toBe(true);
    expect(IncidentStateMachine.canTransition('DETECTED', 'ACTIVE')).toBe(true);
    expect(IncidentStateMachine.canTransition('TRIAGED', 'ACTIVE')).toBe(true);
    expect(IncidentStateMachine.canTransition('TRIAGED', 'MITIGATING')).toBe(true);
    expect(IncidentStateMachine.canTransition('ACTIVE', 'MITIGATING')).toBe(true);
    expect(IncidentStateMachine.canTransition('ACTIVE', 'RESOLVED')).toBe(true);
    expect(IncidentStateMachine.canTransition('MITIGATING', 'RESOLVED')).toBe(true);
    expect(IncidentStateMachine.canTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('allows reopening transitions when conditions deteriorate', () => {
    expect(IncidentStateMachine.canTransition('RESOLVED', 'ACTIVE')).toBe(true);
    expect(IncidentStateMachine.canTransition('CLOSED', 'ACTIVE')).toBe(true);
  });

  it('rejects invalid or unsafe skipping transitions', () => {
    expect(IncidentStateMachine.canTransition('CLOSED', 'MITIGATING')).toBe(false);
    expect(IncidentStateMachine.canTransition('CLOSED', 'TRIAGED')).toBe(false);
    expect(IncidentStateMachine.canTransition('RESOLVED', 'TRIAGED')).toBe(false);
  });

  it('throws an informative error on invalid transition via validateTransition', () => {
    expect(() => {
      IncidentStateMachine.validateTransition('INC-001', 'CLOSED', 'TRIAGED');
    }).toThrow(/Invalid Incident state transition/);
  });
});
