import {
  DerivedEnvironmentFeatures,
  WorkerRiskContext,
  ZoneClusterContext,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { REASON_CODES } from './reason-codes.js';

export interface ScoreComponentResult {
  raw_value: number;
  normalized_value: number; // 0.0 - 1.0
  source: string;
  confidence: number;
  reason_codes: string[];
}

export interface ScoreBreakdownResult {
  environment: ScoreComponentResult;
  exposure: ScoreComponentResult;
  task_intensity: ScoreComponentResult;
  zone_cluster: ScoreComponentResult;
  worker_modifier: ScoreComponentResult;
  recovery: ScoreComponentResult;
}

export class ScoreNormalizer {
  /**
   * Normalizes environmental load (based on effective temperature: 0.7 * WetBulb + 0.3 * Ambient)
   */
  public static normalizeEnvironment(
    env: DerivedEnvironmentFeatures,
    _policy: SafetyPolicy
  ): ScoreComponentResult {
    const temp = env.current_temperature;
    const wb = env.current_wet_bulb ?? (temp * 0.75); // Fallback ratio if wet bulb omitted
    const effectiveTemp = 0.7 * wb + 0.3 * temp;

    // Normalization curve: baseline 25°C = 0.0, extreme 45°C = 1.0
    const normalized = Math.max(0, Math.min(1.0, (effectiveTemp - 25) / 20));
    const reasonCodes: string[] = [];

    if (temp >= 42) {
      reasonCodes.push(REASON_CODES.HIGH_THERMAL_LOAD);
    }
    if (env.trend_direction === 'RISING') {
      reasonCodes.push(REASON_CODES.HEAT_RISE);
    }
    if (env.solar_irradiance && env.solar_irradiance >= 800) {
      reasonCodes.push(REASON_CODES.HIGH_SOLAR_EXPOSURE);
    }
    if (env.humidity && env.humidity >= 60) {
      reasonCodes.push(REASON_CODES.ELEVATED_HUMIDITY);
    }

    return {
      raw_value: effectiveTemp,
      normalized_value: Math.round(normalized * 100) / 100,
      source: 'ThermalObservation',
      confidence: env.data_quality === 'STALE' ? 0.6 : env.data_quality === 'AGING' ? 0.8 : 0.95,
      reason_codes: reasonCodes,
    };
  }

  /**
   * Normalizes active exposure duration (0 to 360 mins)
   */
  public static normalizeExposure(
    workerCtx: WorkerRiskContext,
    _policy: SafetyPolicy
  ): ScoreComponentResult {
    const mins = workerCtx.exposure_duration_minutes;
    // 0 mins = 0.0, 360 mins (6h) = 1.0
    const normalized = Math.max(0, Math.min(1.0, mins / 360));
    const reasonCodes: string[] = [];

    if (mins >= 120) {
      reasonCodes.push(REASON_CODES.LONG_EXPOSURE);
    }

    return {
      raw_value: mins,
      normalized_value: Math.round(normalized * 100) / 100,
      source: 'WorkerRiskContext.exposure_duration_minutes',
      confidence: 1.0,
      reason_codes: reasonCodes,
    };
  }

  /**
   * Normalizes task intensity from policy weights
   */
  public static normalizeTaskIntensity(
    workerCtx: WorkerRiskContext,
    policy: SafetyPolicy
  ): ScoreComponentResult {
    const intensity = workerCtx.task_intensity;
    const normalized = policy.task_intensity_weights[intensity] ?? 0.5;
    const reasonCodes: string[] = [];

    if (intensity === 'HEAVY') {
      reasonCodes.push(REASON_CODES.HIGH_TASK_INTENSITY);
    }

    return {
      raw_value: normalized,
      normalized_value: normalized,
      source: 'WorkerRiskContext.task_intensity',
      confidence: 1.0,
      reason_codes: reasonCodes,
    };
  }

  /**
   * Normalizes zone cluster density
   */
  public static normalizeZoneCluster(
    clusterCtx: ZoneClusterContext
  ): ScoreComponentResult {
    const density = clusterCtx.cluster_density;
    const reasonCodes: string[] = [];

    if (density >= 0.4) {
      reasonCodes.push(REASON_CODES.ZONE_CLUSTER_DENSITY);
    }

    return {
      raw_value: density,
      normalized_value: density,
      source: 'ZoneClusterContext.cluster_density',
      confidence: 1.0,
      reason_codes: reasonCodes,
    };
  }

  /**
   * Normalizes worker modifier from policy weights
   */
  public static normalizeWorkerModifier(
    workerCtx: WorkerRiskContext,
    policy: SafetyPolicy
  ): ScoreComponentResult {
    const modifier = workerCtx.risk_modifier;
    const normalized = policy.worker_modifier_weights[modifier] ?? 0.1;
    const reasonCodes: string[] = [];

    if (modifier === 'elevated' || modifier === 'acclimatizing') {
      reasonCodes.push(REASON_CODES.ELEVATED_WORKER_MODIFIER);
    }

    return {
      raw_value: normalized,
      normalized_value: normalized,
      source: 'WorkerRiskContext.risk_modifier',
      confidence: 1.0,
      reason_codes: reasonCodes,
    };
  }

  /**
   * Normalizes recent recovery duration (0 to 60 mins mitigation)
   */
  public static normalizeRecovery(
    workerCtx: WorkerRiskContext
  ): ScoreComponentResult {
    const mins = workerCtx.recent_recovery_minutes ?? 0;
    const normalized = Math.max(0, Math.min(1.0, mins / 60));
    const reasonCodes: string[] = [];

    if (mins > 0) {
      reasonCodes.push(REASON_CODES.RECENT_RECOVERY_APPLIED);
    } else if (workerCtx.exposure_duration_minutes > 120) {
      reasonCodes.push(REASON_CODES.LOW_RECOVERY);
    }

    return {
      raw_value: mins,
      normalized_value: Math.round(normalized * 100) / 100,
      source: 'WorkerRiskContext.recent_recovery_minutes',
      confidence: 1.0,
      reason_codes: reasonCodes,
    };
  }
}
