import { PredictionFeatureVector } from '../features/feature-builder.js';
import { ModelVersion } from '@sentinel/schemas';

export interface ModelInferenceResult {
  p_elevated_30m: number; // 0.0 - 1.0
  p_critical_60m: number; // 0.0 - 1.0
  predicted_score_30m: number; // 0.0 - 1.0
  predicted_score_60m: number; // 0.0 - 1.0
  feature_contributions: Record<string, number>;
  model_id: string;
  model_version: string;
}

export interface IPredictionModel {
  readonly modelId: string;
  readonly version: string;
  readonly metadata: ModelVersion;

  predict(features: PredictionFeatureVector): ModelInferenceResult;
}
