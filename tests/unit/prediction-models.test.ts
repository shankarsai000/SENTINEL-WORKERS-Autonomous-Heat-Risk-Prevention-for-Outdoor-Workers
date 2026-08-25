import { describe, it, expect } from 'vitest';
import { BaselineDeterministicModel } from '../../packages/prediction/src/models/baseline-model.js';
import { LogisticRegressionPredictionModel } from '../../packages/prediction/src/models/logistic-model.js';
import { PredictionFeatureVector } from '../../packages/prediction/src/features/feature-builder.js';

describe('Predictive Risk Models: Baseline & Logistic Regression', () => {
  const baseVector: PredictionFeatureVector = {
    x1_current_risk_score: 0.55,
    x2_env_trend_rate: 0.60,
    x3_projected_exposure_30m: 0.75,
    x4_task_intensity: 0.90,
    x5_recovery_factor: 0.0,
    x6_zone_density: 0.25,
    x7_worker_modifier: 0.10,
    x8_projected_env_load_60m: 0.80,
  };

  it('Baseline deterministic model projects risk acceleration and computes probabilities', () => {
    const model = new BaselineDeterministicModel();
    const result = model.predict(baseVector);

    expect(result.model_id).toBe('sentinel-baseline-deterministic');
    expect(result.p_elevated_30m).toBeGreaterThanOrEqual(0.0);
    expect(result.p_elevated_30m).toBeLessThanOrEqual(1.0);
    expect(result.p_critical_60m).toBeGreaterThanOrEqual(0.0);
    expect(result.p_critical_60m).toBeLessThanOrEqual(1.0);
    expect(result.predicted_score_30m).toBeGreaterThan(baseVector.x1_current_risk_score);
    expect(result.feature_contributions.temperature_trend).toBeGreaterThan(0);
  });

  it('Logistic regression model produces well-calibrated probabilities within [0.0, 1.0] range', () => {
    const model = new LogisticRegressionPredictionModel();
    const result = model.predict(baseVector);

    expect(result.model_id).toBe('sentinel-risk-logistic');
    expect(result.p_elevated_30m).toBeGreaterThan(0.70); // High task + rising trend + long exposure
    expect(result.p_critical_60m).toBeGreaterThan(0.40);
    expect(result.feature_contributions.temperature_trend).toBeGreaterThan(0);
    expect(result.feature_contributions.task_intensity).toBeGreaterThan(0);
  });

  it('Logistic regression model outputs low probabilities for cool, rested, light-task profiles', () => {
    const calmVector: PredictionFeatureVector = {
      x1_current_risk_score: 0.15,
      x2_env_trend_rate: -0.20,
      x3_projected_exposure_30m: 0.20,
      x4_task_intensity: 0.20,
      x5_recovery_factor: 0.80,
      x6_zone_density: 0.0,
      x7_worker_modifier: 0.10,
      x8_projected_env_load_60m: 0.20,
    };

    const model = new LogisticRegressionPredictionModel();
    const result = model.predict(calmVector);

    expect(result.p_elevated_30m).toBeLessThan(0.30);
    expect(result.p_critical_60m).toBeLessThan(0.15);
    expect(result.feature_contributions.recent_recovery).toBeLessThan(0);
  });
});
