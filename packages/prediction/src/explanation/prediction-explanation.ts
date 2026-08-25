import { TrendFeatures } from '../features/trend-features.js';
import { ModelInferenceResult } from '../models/model-types.js';
import { RiskState, RiskLevel } from '@sentinel/schemas';

export const PREDICTIVE_REASON_CODES = {
  RISING_THERMAL_TREND: 'RISING_THERMAL_TREND',
  FALLING_THERMAL_TREND: 'FALLING_THERMAL_TREND',
  STABLE_THERMAL_CONDITIONS: 'STABLE_THERMAL_CONDITIONS',
  LONG_EXPOSURE_ACCUMULATION: 'LONG_EXPOSURE_ACCUMULATION',
  HEAVY_TASK_INTENSITY: 'HEAVY_TASK_INTENSITY',
  ELEVATED_ZONE_MOMENTUM: 'ELEVATED_ZONE_MOMENTUM',
  CURRENT_RISK_ELEVATED: 'CURRENT_RISK_ELEVATED',
  EARLY_WARNING_DETERIORATION: 'EARLY_WARNING_DETERIORATION',
  RECOVERY_TRAJECTORY_MITIGATION: 'RECOVERY_TRAJECTORY_MITIGATION',
  DATA_QUALITY_STALE: 'DATA_QUALITY_STALE',
} as const;

export class PredictionExplanationBuilder {
  public static buildReasonCodes(
    trend: TrendFeatures,
    currentRisk: RiskState,
    predictedLevel: RiskLevel,
    inference: ModelInferenceResult,
    earlyWarning: boolean
  ): string[] {
    const reasons: string[] = [];

    if (trend.trend_direction === 'RISING') {
      reasons.push(PREDICTIVE_REASON_CODES.RISING_THERMAL_TREND);
    } else if (trend.trend_direction === 'FALLING') {
      reasons.push(PREDICTIVE_REASON_CODES.FALLING_THERMAL_TREND);
    } else {
      reasons.push(PREDICTIVE_REASON_CODES.STABLE_THERMAL_CONDITIONS);
    }

    if (inference.feature_contributions.exposure_duration && inference.feature_contributions.exposure_duration > 0.08) {
      reasons.push(PREDICTIVE_REASON_CODES.LONG_EXPOSURE_ACCUMULATION);
    }

    if (inference.feature_contributions.task_intensity && inference.feature_contributions.task_intensity > 0.08) {
      reasons.push(PREDICTIVE_REASON_CODES.HEAVY_TASK_INTENSITY);
    }

    if (inference.feature_contributions.recent_recovery && inference.feature_contributions.recent_recovery < -0.05) {
      reasons.push(PREDICTIVE_REASON_CODES.RECOVERY_TRAJECTORY_MITIGATION);
    }

    if (inference.feature_contributions.zone_cluster_density && inference.feature_contributions.zone_cluster_density > 0.08) {
      reasons.push(PREDICTIVE_REASON_CODES.ELEVATED_ZONE_MOMENTUM);
    }

    if (currentRisk.level === 'ELEVATED' || currentRisk.level === 'HIGH') {
      reasons.push(PREDICTIVE_REASON_CODES.CURRENT_RISK_ELEVATED);
    }

    if (earlyWarning) {
      reasons.push(PREDICTIVE_REASON_CODES.EARLY_WARNING_DETERIORATION);
    }

    return Array.from(new Set(reasons));
  }
}
