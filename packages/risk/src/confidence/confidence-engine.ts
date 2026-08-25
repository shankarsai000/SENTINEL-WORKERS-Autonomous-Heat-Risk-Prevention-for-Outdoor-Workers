import { DerivedEnvironmentFeatures, WorkerRiskContext } from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { REASON_CODES } from '../scoring/reason-codes.js';

export interface ConfidenceEvaluationResult {
  confidence: number; // 0.0 - 1.0
  missing_features: string[];
  uncertainty_reasons: string[];
}

export class ConfidenceEngine {
  public static evaluate(
    env: DerivedEnvironmentFeatures,
    workerCtx?: WorkerRiskContext,
    _policy?: SafetyPolicy
  ): ConfidenceEvaluationResult {
    let confidence = 0.95;
    const missingFeatures: string[] = [];
    const uncertaintyReasons: string[] = [];

    // 1. Freshness Assessment
    if (env.data_quality === 'STALE') {
      confidence -= 0.30;
      uncertaintyReasons.push(REASON_CODES.DATA_STALE);
    } else if (env.data_quality === 'AGING') {
      confidence -= 0.12;
      uncertaintyReasons.push(REASON_CODES.DATA_AGING);
    }

    // 2. Field Completeness
    if (env.current_wet_bulb === undefined) {
      confidence -= 0.10;
      missingFeatures.push('wet_bulb_c');
      uncertaintyReasons.push(REASON_CODES.MISSING_ENVIRONMENT_FIELD);
    }

    if (env.humidity === undefined) {
      confidence -= 0.05;
      missingFeatures.push('humidity_pct');
    }

    if (env.solar_irradiance === undefined) {
      confidence -= 0.05;
      missingFeatures.push('solar_irradiance');
    }

    // 3. Worker Context Completeness & Prolonged Shift Uncertainty
    if (workerCtx && workerCtx.recent_recovery_minutes === null && workerCtx.exposure_duration_minutes > 180) {
      confidence -= 0.05;
    }

    confidence = Math.round(Math.max(0.10, Math.min(1.0, confidence)) * 100) / 100;

    return {
      confidence,
      missing_features: missingFeatures,
      uncertainty_reasons: Array.from(new Set(uncertaintyReasons)),
    };
  }
}
