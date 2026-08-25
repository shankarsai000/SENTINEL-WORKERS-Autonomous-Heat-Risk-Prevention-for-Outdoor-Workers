import {
  DerivedEnvironmentFeatures,
  WorkerRiskContext,
  RiskLevel,
  ActionType,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { REASON_CODES } from '../scoring/reason-codes.js';
import { getEligibleActions } from './policy-evaluator.js';

export interface GuardrailEvaluationOptions {
  env: DerivedEnvironmentFeatures;
  workerCtx: WorkerRiskContext;
  preliminaryScore: number;
  preliminaryLevel: RiskLevel;
  policy: SafetyPolicy;
  isUnacknowledgedCritical?: boolean;
}

export interface GuardrailEvaluationResult {
  final_score: number;
  final_level: RiskLevel;
  guardrail_flags: string[];
  escalation_required: boolean;
  action_eligibility: ActionType[];
  override_applied: boolean;
}

export class GuardrailEngine {
  public static evaluate(options: GuardrailEvaluationOptions): GuardrailEvaluationResult {
    const {
      env,
      preliminaryScore,
      preliminaryLevel,
      policy,
      isUnacknowledgedCritical = false,
    } = options;

    const guardrailFlags: string[] = [];
    let finalScore = preliminaryScore;
    let finalLevel = preliminaryLevel;
    let overrideApplied = false;
    let escalationRequired = false;

    // Rule 1: Extreme Ambient Heat Override (>= 45°C)
    if (env.current_temperature >= policy.guardrails.extreme_temperature_c) {
      finalLevel = 'CRITICAL';
      finalScore = Math.max(finalScore, 0.88);
      guardrailFlags.push(REASON_CODES.GUARDRAIL_EMERGENCY_OVERRIDE, REASON_CODES.EXTREME_AMBIENT_HEAT);
      overrideApplied = true;
    }

    // Rule 2: Extreme Wet Bulb Override (>= 31.0°C)
    if (
      policy.guardrails.extreme_wet_bulb_c &&
      env.current_wet_bulb &&
      env.current_wet_bulb >= policy.guardrails.extreme_wet_bulb_c
    ) {
      finalLevel = 'CRITICAL';
      finalScore = Math.max(finalScore, 0.88);
      guardrailFlags.push(REASON_CODES.GUARDRAIL_EMERGENCY_OVERRIDE, REASON_CODES.HIGH_THERMAL_LOAD);
      overrideApplied = true;
    }

    // Rule 3: Stale Data Quality Guardrail
    if (env.data_quality === 'STALE') {
      guardrailFlags.push(REASON_CODES.DATA_STALE);
    } else if (env.data_quality === 'AGING') {
      guardrailFlags.push(REASON_CODES.DATA_AGING);
    }

    // Rule 4: Unacknowledged Critical Worker Escalation
    if (finalLevel === 'CRITICAL' && isUnacknowledgedCritical) {
      escalationRequired = true;
      guardrailFlags.push(REASON_CODES.UNACKNOWLEDGED_CRITICAL_ESCALATION);
    }

    const actionEligibility = getEligibleActions(finalLevel, policy);

    return {
      final_score: Math.round(finalScore * 100) / 100,
      final_level: finalLevel,
      guardrail_flags: Array.from(new Set(guardrailFlags)),
      escalation_required: escalationRequired,
      action_eligibility: actionEligibility,
      override_applied: overrideApplied,
    };
  }
}
