import {
  ActionType,
  RiskState,
  PredictiveRiskState,
  WorkerRiskContext,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';

export interface ActionExplanation {
  what: string;
  why: string;
  evidence: {
    current_risk_level: string;
    current_risk_score: number;
    predicted_risk_level?: string;
    expected_time_to_threshold_minutes?: number | null;
    exposure_duration_mins: number;
    task_intensity: string;
    data_freshness?: string;
  };
  policy: {
    policy_id: string;
    policy_version: string;
    policy_basis: string;
  };
  confidence: number;
  reason_codes: string[];
}

export class ActionExplanationBuilder {
  public static build(
    actionType: ActionType,
    currentRisk: RiskState,
    predictedRisk: PredictiveRiskState | null | undefined,
    workerCtx: WorkerRiskContext,
    policy: SafetyPolicy,
    policyBasis: string
  ): ActionExplanation {
    let why = `Action '${actionType}' selected based on ${currentRisk.level} risk assessment and site safety policy.`;

    if (predictedRisk?.early_warning) {
      why = `Pre-emptive action '${actionType}' selected because predictive trajectory indicates transition to ${predictedRisk.predicted_risk_level} risk within ~${predictedRisk.expected_time_to_threshold_minutes ?? 30} minutes.`;
    } else if (currentRisk.level === 'CRITICAL') {
      why = `MANDATORY SAFETY HALT: Thermal conditions and worker exposure exceeded critical limit (${policy.guardrails.extreme_temperature_c}°C threshold).`;
    } else if (currentRisk.level === 'HIGH') {
      why = `High contextual heat stress from active ${workerCtx.task_intensity} labor and cumulative ${Math.floor(workerCtx.exposure_duration_minutes / 60)}h ${workerCtx.exposure_duration_minutes % 60}m shift exposure.`;
    }

    return {
      what: actionType.replace(/_/g, ' '),
      why,
      evidence: {
        current_risk_level: currentRisk.level,
        current_risk_score: currentRisk.score,
        predicted_risk_level: predictedRisk?.predicted_risk_level,
        expected_time_to_threshold_minutes: predictedRisk?.expected_time_to_threshold_minutes,
        exposure_duration_mins: workerCtx.exposure_duration_minutes,
        task_intensity: workerCtx.task_intensity,
        data_freshness: currentRisk.data_freshness,
      },
      policy: {
        policy_id: policy.policy_id,
        policy_version: policy.version,
        policy_basis: policyBasis,
      },
      confidence: currentRisk.confidence,
      reason_codes: currentRisk.reason_codes,
    };
  }
}
