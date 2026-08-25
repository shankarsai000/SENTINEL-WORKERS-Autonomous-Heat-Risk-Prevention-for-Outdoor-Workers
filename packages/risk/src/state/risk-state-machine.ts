import { RiskLevel } from '@sentinel/schemas';
import { REASON_CODES } from '../scoring/reason-codes.js';

export type TransitionType = 'ESCALATION' | 'DEESCALATION' | 'STABLE' | 'EMERGENCY_OVERRIDE';

export interface StateTransitionResult {
  previous_state: RiskLevel;
  new_state: RiskLevel;
  transition_type: TransitionType;
  transition_reason_codes: string[];
  timestamp: string;
}

const LEVEL_SEVERITY: Record<RiskLevel, number> = {
  GREEN: 0,
  WATCH: 1,
  ELEVATED: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export class RiskStateMachine {
  public static evaluateTransition(
    previousLevel: RiskLevel | undefined,
    targetLevel: RiskLevel,
    guardrailOverride: boolean = false,
    timestamp: string = new Date().toISOString()
  ): StateTransitionResult {
    const prev = previousLevel || 'GREEN';

    if (guardrailOverride && targetLevel === 'CRITICAL' && prev !== 'CRITICAL') {
      return {
        previous_state: prev,
        new_state: 'CRITICAL',
        transition_type: 'EMERGENCY_OVERRIDE',
        transition_reason_codes: [REASON_CODES.GUARDRAIL_EMERGENCY_OVERRIDE, REASON_CODES.RISK_ESCALATION],
        timestamp,
      };
    }

    const prevSev = LEVEL_SEVERITY[prev];
    const targetSev = LEVEL_SEVERITY[targetLevel];

    if (targetSev > prevSev) {
      return {
        previous_state: prev,
        new_state: targetLevel,
        transition_type: 'ESCALATION',
        transition_reason_codes: [REASON_CODES.RISK_ESCALATION],
        timestamp,
      };
    }

    if (targetSev < prevSev) {
      return {
        previous_state: prev,
        new_state: targetLevel,
        transition_type: 'DEESCALATION',
        transition_reason_codes: [REASON_CODES.RISK_DEESCALATION],
        timestamp,
      };
    }

    return {
      previous_state: prev,
      new_state: targetLevel,
      transition_type: 'STABLE',
      transition_reason_codes: [],
      timestamp,
    };
  }
}
