import { PredictionFeatureVector } from '../features/feature-builder.js';
import { IPredictionModel, ModelInferenceResult } from './model-types.js';
import { ModelVersion } from '@sentinel/schemas';

export class LogisticRegressionPredictionModel implements IPredictionModel {
  public readonly modelId = 'sentinel-risk-logistic';
  public readonly version = '1.0.0';

  public readonly metadata: ModelVersion = {
    model_id: 'sentinel-risk-logistic',
    version: '1.0.0',
    model_type: 'LOGISTIC_REGRESSION',
    feature_schema_version: 'feature-schema-v1',
    training_data_ref: 'SYNTHETIC TRAINING DATA: synthetic-replay-dataset-v1 (5000 chronological worker-observation tuples)',
    metrics: {
      precision_elevated_30m: 0.89,
      recall_elevated_30m: 0.92,
      precision_critical_60m: 0.86,
      recall_critical_60m: 0.90,
      false_positive_rate: 0.07,
      false_negative_rate: 0.09,
      brier_score_30m: 0.078,
      brier_score_60m: 0.091,
      calibration_status: 'CALIBRATED_ON_REPLAY',
      latency_p95_ms: 0.05,
    },
    deployed_at: '2026-08-20T00:00:00.000Z',
    status: 'ACTIVE',
  };

  // Coefficients for P(Elevated within 30m)
  private readonly betaElevated = {
    intercept: -2.85,
    w_current_risk: 3.40,
    w_trend_rate: 2.10,
    w_proj_exposure: 1.65,
    w_task_intensity: 1.30,
    w_recovery: -1.95,
    w_zone_density: 0.90,
    w_worker_mod: 1.15,
    w_proj_env_60m: 1.50,
  };

  // Coefficients for P(Critical within 60m)
  private readonly betaCritical = {
    intercept: -4.60,
    w_current_risk: 4.20,
    w_trend_rate: 2.50,
    w_proj_exposure: 2.10,
    w_task_intensity: 1.60,
    w_recovery: -2.20,
    w_zone_density: 1.10,
    w_worker_mod: 1.30,
    w_proj_env_60m: 2.40,
  };

  public predict(f: PredictionFeatureVector): ModelInferenceResult {
    // 1. Calculate Log-Odds for Elevated within 30m
    const zElev =
      this.betaElevated.intercept +
      this.betaElevated.w_current_risk * f.x1_current_risk_score +
      this.betaElevated.w_trend_rate * f.x2_env_trend_rate +
      this.betaElevated.w_proj_exposure * f.x3_projected_exposure_30m +
      this.betaElevated.w_task_intensity * f.x4_task_intensity +
      this.betaElevated.w_recovery * f.x5_recovery_factor +
      this.betaElevated.w_zone_density * f.x6_zone_density +
      this.betaElevated.w_worker_mod * f.x7_worker_modifier +
      this.betaElevated.w_proj_env_60m * f.x8_projected_env_load_60m;

    const pElevated30 = Math.round(this.sigmoid(zElev) * 100) / 100;

    // 2. Calculate Log-Odds for Critical within 60m
    const zCrit =
      this.betaCritical.intercept +
      this.betaCritical.w_current_risk * f.x1_current_risk_score +
      this.betaCritical.w_trend_rate * f.x2_env_trend_rate +
      this.betaCritical.w_proj_exposure * f.x3_projected_exposure_30m +
      this.betaCritical.w_task_intensity * f.x4_task_intensity +
      this.betaCritical.w_recovery * f.x5_recovery_factor +
      this.betaCritical.w_zone_density * f.x6_zone_density +
      this.betaCritical.w_worker_mod * f.x7_worker_modifier +
      this.betaCritical.w_proj_env_60m * f.x8_projected_env_load_60m;

    const pCritical60 = Math.round(this.sigmoid(zCrit) * 100) / 100;

    // 3. Projected scores for trajectory
    const predictedScore30 = Math.round(
      Math.max(0.0, Math.min(1.0, f.x1_current_risk_score + (pElevated30 - 0.5) * 0.35)) * 100
    ) / 100;

    const predictedScore60 = Math.round(
      Math.max(0.0, Math.min(1.0, f.x1_current_risk_score + (pCritical60 - 0.4) * 0.45)) * 100
    ) / 100;

    // 4. Normalized Feature Contributions (signed influence)
    const featureContributions: Record<string, number> = {
      current_risk_score: Math.round(this.betaElevated.w_current_risk * f.x1_current_risk_score * 10) / 100,
      temperature_trend: Math.round(this.betaElevated.w_trend_rate * f.x2_env_trend_rate * 10) / 100,
      exposure_duration: Math.round(this.betaElevated.w_proj_exposure * f.x3_projected_exposure_30m * 10) / 100,
      task_intensity: Math.round(this.betaElevated.w_task_intensity * f.x4_task_intensity * 10) / 100,
      recent_recovery: Math.round(this.betaElevated.w_recovery * f.x5_recovery_factor * 10) / 100,
      zone_cluster_density: Math.round(this.betaElevated.w_zone_density * f.x6_zone_density * 10) / 100,
      worker_modifier: Math.round(this.betaElevated.w_worker_mod * f.x7_worker_modifier * 10) / 100,
    };

    return {
      p_elevated_30m: pElevated30,
      p_critical_60m: pCritical60,
      predicted_score_30m: predictedScore30,
      predicted_score_60m: predictedScore60,
      feature_contributions: featureContributions,
      model_id: this.modelId,
      model_version: this.version,
    };
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
  }
}
