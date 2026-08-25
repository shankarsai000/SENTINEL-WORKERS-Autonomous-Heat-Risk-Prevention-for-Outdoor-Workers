import {
  DerivedEnvironmentFeatures,
  WorkerRiskContext,
  ZoneClusterContext,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { ScoreNormalizer, ScoreBreakdownResult } from './score-normalizer.js';

export interface ContextualScoreCalculationResult {
  score: number; // 0.0 - 1.0
  breakdown: ScoreBreakdownResult;
  all_reason_codes: string[];
}

export function calculateContextualScore(
  env: DerivedEnvironmentFeatures,
  workerCtx: WorkerRiskContext,
  clusterCtx: ZoneClusterContext,
  policy: SafetyPolicy
): ContextualScoreCalculationResult {
  const envComp = ScoreNormalizer.normalizeEnvironment(env, policy);
  const expComp = ScoreNormalizer.normalizeExposure(workerCtx, policy);
  const taskComp = ScoreNormalizer.normalizeTaskIntensity(workerCtx, policy);
  const zoneComp = ScoreNormalizer.normalizeZoneCluster(clusterCtx);
  const modComp = ScoreNormalizer.normalizeWorkerModifier(workerCtx, policy);
  const recComp = ScoreNormalizer.normalizeRecovery(workerCtx);

  const w = policy.scoring_weights;

  // Linear weighted formula with explicit recovery mitigation subtraction
  const rawScore =
    w.environment * envComp.normalized_value +
    w.exposure * expComp.normalized_value +
    w.task_intensity * taskComp.normalized_value +
    w.zone_cluster * zoneComp.normalized_value +
    w.worker_modifier * modComp.normalized_value -
    w.recovery_mitigation * recComp.normalized_value;

  const score = Math.round(Math.max(0.0, Math.min(1.0, rawScore)) * 100) / 100;

  const breakdown: ScoreBreakdownResult = {
    environment: envComp,
    exposure: expComp,
    task_intensity: taskComp,
    zone_cluster: zoneComp,
    worker_modifier: modComp,
    recovery: recComp,
  };

  const reasonCodes = Array.from(
    new Set([
      ...envComp.reason_codes,
      ...expComp.reason_codes,
      ...taskComp.reason_codes,
      ...zoneComp.reason_codes,
      ...modComp.reason_codes,
      ...recComp.reason_codes,
    ])
  );

  return {
    score,
    breakdown,
    all_reason_codes: reasonCodes,
  };
}
