import { RiskLevel, PredictiveState } from '@sentinel/schemas';

const RISK_LEVEL_SEVERITY: Record<RiskLevel, number> = {
  GREEN: 0,
  WATCH: 1,
  ELEVATED: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export class PredictiveStateMachine {
  /**
   * Evaluates predictive state from current and predicted risk levels.
   */
  public static evaluatePredictiveState(
    currentLevel: RiskLevel,
    predictedLevel: RiskLevel,
    pCritical60m: number | null
  ): PredictiveState {
    const currSev = RISK_LEVEL_SEVERITY[currentLevel];
    const predSev = RISK_LEVEL_SEVERITY[predictedLevel];

    if (predSev === 4 || (pCritical60m !== null && pCritical60m >= 0.60)) {
      return 'PREDICTED_CRITICAL';
    }
    if (predSev === 3 || (pCritical60m !== null && pCritical60m >= 0.40)) {
      return 'PREDICTED_HIGH';
    }
    if (predSev === 2) {
      return 'PREDICTED_ELEVATED';
    }
    if (predSev > currSev) {
      return 'DETERIORATING';
    }
    return 'STABLE';
  }

  /**
   * Determines whether an operational Early Warning is triggered.
   */
  public static evaluateEarlyWarning(
    currentLevel: RiskLevel,
    predictedLevel: RiskLevel,
    pElevated30m: number | null,
    pCritical60m: number | null
  ): boolean {
    const currSev = RISK_LEVEL_SEVERITY[currentLevel];
    const predSev = RISK_LEVEL_SEVERITY[predictedLevel];

    // Case 1: Predicted severity strictly exceeds current severity by at least 1 band and reaches ELEVATED/HIGH/CRITICAL
    if (predSev > currSev && predSev >= 2) {
      return true;
    }

    // Case 2: High probability of elevated transition from GREEN/WATCH
    if (currSev <= 1 && pElevated30m !== null && pElevated30m >= 0.65) {
      return true;
    }

    // Case 3: High probability of critical transition from ELEVATED/HIGH
    if (currSev >= 2 && pCritical60m !== null && pCritical60m >= 0.50) {
      return true;
    }

    return false;
  }

  /**
   * CRITICAL SAFETY INVARIANT:
   * Safety guardrails and current P2 CRITICAL state strictly dominate prediction.
   */
  public static enforceSafetyDominance(
    currentLevel: RiskLevel,
    preliminaryPredictedLevel: RiskLevel
  ): RiskLevel {
    // If current risk is already CRITICAL, predicted operational level cannot be lower than CRITICAL
    if (currentLevel === 'CRITICAL') {
      return 'CRITICAL';
    }
    return preliminaryPredictedLevel;
  }
}
