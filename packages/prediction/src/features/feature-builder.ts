import crypto from 'crypto';
import {
  ThermalObservation,
  WorkerRiskContext,
  SiteRiskContext,
  ZoneClusterContext,
  RiskState,
  PredictionStatus,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { computeTrendFeatures, TrendFeatures } from './trend-features.js';
import { computeProjectedExposureFeatures, ProjectedExposureFeatures } from './exposure-features.js';
import { computeProjectedEnvironmentFeatures, ProjectedEnvironmentFeatures } from './environment-features.js';
import { computeZoneTrendFeatures, ZoneTrendFeatures } from './zone-features.js';

export interface PredictionFeatureConfig {
  history_minutes: number;
  minimum_observations: number;
}

export const DEFAULT_PREDICTION_FEATURE_CONFIG: PredictionFeatureConfig = {
  history_minutes: 60,
  minimum_observations: 3,
};

export interface PredictionFeatureVector {
  x1_current_risk_score: number; // 0.0 - 1.0
  x2_env_trend_rate: number;     // -1.0 - 1.0
  x3_projected_exposure_30m: number; // 0.0 - 1.0
  x4_task_intensity: number;     // 0.0 - 1.0
  x5_recovery_factor: number;    // 0.0 - 1.0
  x6_zone_density: number;       // 0.0 - 1.0
  x7_worker_modifier: number;    // 0.0 - 1.0
  x8_projected_env_load_60m: number; // 0.0 - 1.0
}

export interface FeatureBuildResult {
  status: PredictionStatus;
  status_reason?: string;
  features?: PredictionFeatureVector;
  trend?: TrendFeatures;
  exposure?: ProjectedExposureFeatures;
  projected_env?: ProjectedEnvironmentFeatures;
  zone?: ZoneTrendFeatures;
  feature_snapshot_id?: string;
}

export class PredictionFeatureBuilder {
  public static buildFeatures(
    currentObs: ThermalObservation,
    workerCtx: WorkerRiskContext,
    _siteCtx: SiteRiskContext,
    clusterCtx: ZoneClusterContext,
    currentRisk: RiskState,
    policy: SafetyPolicy,
    history: ThermalObservation[] = [],
    config: PredictionFeatureConfig = DEFAULT_PREDICTION_FEATURE_CONFIG
  ): FeatureBuildResult {
    // 1. History window validation
    const currentMs = new Date(currentObs.timestamp).getTime();
    const windowStartMs = currentMs - config.history_minutes * 60 * 1000;

    const validHistory = history.filter((h) => {
      const hMs = new Date(h.timestamp).getTime();
      return hMs >= windowStartMs && hMs <= currentMs;
    });

    const totalObsCount = validHistory.length + 1; // Including current observation

    if (totalObsCount < config.minimum_observations) {
      return {
        status: 'INSUFFICIENT_DATA',
        status_reason: `Insufficient historical observations (Found ${totalObsCount}, required minimum ${config.minimum_observations} within ${config.history_minutes}m window).`,
      };
    }

    // 2. Compute sub-feature blocks
    const trend = computeTrendFeatures(currentObs, validHistory);
    const exposure = computeProjectedExposureFeatures(workerCtx, currentObs.timestamp);
    const projectedEnv = computeProjectedEnvironmentFeatures(currentObs, trend);
    const zone = computeZoneTrendFeatures(clusterCtx);

    // 3. Normalizations for standard 8-dimensional feature vector
    const taskIntensityNorm = policy.task_intensity_weights[workerCtx.task_intensity] ?? 0.5;
    const workerModNorm = policy.worker_modifier_weights[workerCtx.risk_modifier] ?? 0.1;
    const recoveryNorm = workerCtx.recent_recovery_minutes
      ? Math.min(1.0, workerCtx.recent_recovery_minutes / 60)
      : 0;

    // Rate of change normalized [-1, 1] where +0.1°C/min = 1.0
    const normalizedTrendRate = Math.max(-1.0, Math.min(1.0, trend.rate_of_change_c_per_min / 0.10));

    const features: PredictionFeatureVector = {
      x1_current_risk_score: currentRisk.score,
      x2_env_trend_rate: Math.round(normalizedTrendRate * 100) / 100,
      x3_projected_exposure_30m: exposure.normalized_projected_30m,
      x4_task_intensity: taskIntensityNorm,
      x5_recovery_factor: recoveryNorm,
      x6_zone_density: zone.cluster_density,
      x7_worker_modifier: workerModNorm,
      x8_projected_env_load_60m: projectedEnv.normalized_env_load_60m,
    };

    // 4. Deterministic Feature Snapshot Hash
    const rawSnapshot = JSON.stringify({
      worker_id: workerCtx.worker_id,
      timestamp: currentObs.timestamp,
      features,
    });
    const snapshotId = `feat_${crypto.createHash('sha256').update(rawSnapshot).digest('hex').substring(0, 16)}`;

    return {
      status: 'AVAILABLE',
      features,
      trend,
      exposure,
      projected_env: projectedEnv,
      zone,
      feature_snapshot_id: snapshotId,
    };
  }
}
