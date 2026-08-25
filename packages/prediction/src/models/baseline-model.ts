import { PredictionFeatureVector } from '../features/feature-builder.js';
import { IPredictionModel, ModelInferenceResult } from './model-types.js';
import { ModelVersion } from '@sentinel/schemas';

export class BaselineDeterministicModel implements IPredictionModel {
  public readonly modelId = 'sentinel-baseline-deterministic';
  public readonly version = '1.0.0';

  public readonly metadata: ModelVersion = {
    model_id: 'sentinel-baseline-deterministic',
    version: '1.0.0',
    model_type: 'BASELINE_DETERMINISTIC',
    feature_schema_version: 'feature-schema-v1',
    training_data_ref: 'deterministic-physics-trajectory-v1',
    metrics: {
      type: 'rule_extrapolation',
      interpretability: 1.0,
    },
    deployed_at: '2026-08-01T00:00:00.000Z',
    status: 'ACTIVE',
  };

  public predict(f: PredictionFeatureVector): ModelInferenceResult {
    const currentRisk = f.x1_current_risk_score;
    const trendContrib = Math.round(f.x2_env_trend_rate * 0.18 * 100) / 100;
    const exposureContrib = Math.round((f.x3_projected_exposure_30m - (currentRisk * 0.5)) * 0.12 * 100) / 100;
    const taskContrib = Math.round(f.x4_task_intensity * 0.08 * 100) / 100;
    const recoveryContrib = Math.round(-f.x5_recovery_factor * 0.15 * 100) / 100;
    const zoneContrib = Math.round(f.x6_zone_density * 0.06 * 100) / 100;

    const delta30 = trendContrib + exposureContrib + taskContrib + recoveryContrib + zoneContrib;

    const score30 = Math.round(Math.max(0.0, Math.min(1.0, currentRisk + delta30)) * 100) / 100;
    const score60 = Math.round(Math.max(0.0, Math.min(1.0, currentRisk + delta30 * 1.75)) * 100) / 100;

    // Map projected score to probability using standard continuous logistic mapping centered at policy thresholds
    // Elevated threshold = 0.50, Critical threshold = 0.85
    const pElevated30 = Math.round(this.sigmoid((score30 - 0.50) * 10) * 100) / 100;
    const pCritical60 = Math.round(this.sigmoid((score60 - 0.85) * 12) * 100) / 100;

    const featureContributions: Record<string, number> = {
      current_risk: currentRisk,
      temperature_trend: trendContrib,
      exposure_duration: exposureContrib,
      task_intensity: taskContrib,
      recent_recovery: recoveryContrib,
      zone_density: zoneContrib,
    };

    return {
      p_elevated_30m: pElevated30,
      p_critical_60m: pCritical60,
      predicted_score_30m: score30,
      predicted_score_60m: score60,
      feature_contributions: featureContributions,
      model_id: this.modelId,
      model_version: this.version,
    };
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
  }
}
