import {
  Worker,
  Site,
  ThermalObservation,
  RiskState,
  DecisionEvent,
  WorkerRiskContext,
  ZoneClusterContext,
} from '@sentinel/schemas';
import { SafetyPolicy, PolicyLoader, DEFAULT_DEMO_POLICY } from '@sentinel/policy';
import { buildDerivedEnvironmentFeatures, buildWorkerRiskContext } from './context/context-builder.js';
import { calculateZoneClusterContext } from './context/clustering.js';
import { calculateContextualScore } from './scoring/contextual-score.js';
import { evaluatePolicyRiskLevel } from './guardrails/policy-evaluator.js';
import { GuardrailEngine } from './guardrails/guardrail-engine.js';
import { ConfidenceEngine } from './confidence/confidence-engine.js';
import { RiskStateMachine } from './state/risk-state-machine.js';
import { ExplanationBuilder } from './explanation/explanation-builder.js';
import { RecoveryInterval } from './context/recovery.js';

export interface EvaluateWorkerOptions {
  worker: Worker;
  site: Site;
  observation: ThermalObservation;
  policy?: SafetyPolicy;
  previousRiskState?: RiskState;
  observationHistory?: ThermalObservation[];
  recoveryEvents?: RecoveryInterval[];
  zoneClusterContext?: ZoneClusterContext;
  currentTime?: string;
  isActive?: boolean;
  isUnacknowledgedCritical?: boolean;
}

export interface EvaluateWorkerResult {
  riskState: RiskState;
  decisionEvent: DecisionEvent;
  stateTransition: ReturnType<typeof RiskStateMachine.evaluateTransition>;
}

export interface BatchEvaluationOptions {
  workers: Worker[];
  site: Site;
  observation: ThermalObservation;
  policy?: SafetyPolicy;
  previousStates?: Map<string, RiskState>;
  observationHistory?: ThermalObservation[];
  currentTime?: string;
}

export interface BatchEvaluationResult {
  riskStates: RiskState[];
  decisionEvents: DecisionEvent[];
  failures: Array<{ worker_id: string; error: string }>;
  duration_ms: number;
}

export class ContextualRiskEngine {
  private defaultPolicy: SafetyPolicy;

  constructor(policy?: SafetyPolicy) {
    this.defaultPolicy = policy || PolicyLoader.getPolicy();
  }

  /**
   * Evaluates contextual risk for a single worker.
   */
  public evaluateWorker(options: EvaluateWorkerOptions): EvaluateWorkerResult {
    const {
      worker,
      site,
      observation,
      policy = this.defaultPolicy,
      previousRiskState,
      observationHistory = [],
      recoveryEvents = [],
      currentTime = observation.timestamp || new Date().toISOString(),
      isActive = true,
      isUnacknowledgedCritical = false,
    } = options;

    // 1. Build Derived Contexts
    const envFeatures = buildDerivedEnvironmentFeatures(observation, policy, observationHistory, currentTime);
    const workerCtx: WorkerRiskContext = buildWorkerRiskContext(worker, {
      currentTime,
      recoveryEvents,
      isActive,
    });

    const clusterCtx: ZoneClusterContext = options.zoneClusterContext || {
      zone_id: site.zone_id,
      active_workers_in_zone: site.worker_count,
      elevated_workers_in_zone: 0,
      high_workers_in_zone: 0,
      critical_workers_in_zone: 0,
      cluster_density: 0.0,
    };

    // 2. Calculate Contextual Score & Component Breakdown
    const scoreResult = calculateContextualScore(envFeatures, workerCtx, clusterCtx, policy);

    // 3. Preliminary Risk Level from Policy Bands
    const prelimLevel = evaluatePolicyRiskLevel(scoreResult.score, policy);

    // 4. Hard Safety Guardrails Evaluation
    const guardrailResult = GuardrailEngine.evaluate({
      env: envFeatures,
      workerCtx,
      preliminaryScore: scoreResult.score,
      preliminaryLevel: prelimLevel,
      policy,
      isUnacknowledgedCritical,
    });

    // 5. Confidence & Uncertainty Evaluation
    const confidenceResult = ConfidenceEngine.evaluate(envFeatures, workerCtx, policy);

    // 6. Merge Reason Codes
    const combinedReasonCodes = Array.from(
      new Set([...scoreResult.all_reason_codes, ...guardrailResult.guardrail_flags])
    );

    // 7. State Machine Transition Check
    const stateTransition = RiskStateMachine.evaluateTransition(
      previousRiskState?.level,
      guardrailResult.final_level,
      guardrailResult.override_applied,
      currentTime
    );

    if (stateTransition.transition_reason_codes.length > 0) {
      combinedReasonCodes.push(...stateTransition.transition_reason_codes);
    }

    // 8. Deterministic Explanation Building
    const explanation = ExplanationBuilder.build({
      workerId: worker.worker_id,
      level: guardrailResult.final_level,
      score: guardrailResult.final_score,
      confidence: confidenceResult.confidence,
      reasonCodes: combinedReasonCodes,
      breakdown: scoreResult.breakdown,
    });

    // 9. Assemble Extended RiskState
    const riskState: RiskState = {
      worker_id: worker.worker_id,
      site_id: worker.site_id,
      timestamp: currentTime,
      score: guardrailResult.final_score,
      level: guardrailResult.final_level,
      confidence: confidenceResult.confidence,
      policy_id: policy.policy_id,
      policy_version: policy.version,
      reason_codes: Array.from(new Set(combinedReasonCodes)),
      explanation,
      environment_score: scoreResult.breakdown.environment.normalized_value,
      exposure_score: scoreResult.breakdown.exposure.normalized_value,
      task_score: scoreResult.breakdown.task_intensity.normalized_value,
      zone_score: scoreResult.breakdown.zone_cluster.normalized_value,
      worker_modifier_score: scoreResult.breakdown.worker_modifier.normalized_value,
      recovery_score: scoreResult.breakdown.recovery.normalized_value,
      data_freshness: envFeatures.data_quality,
      missing_features: confidenceResult.missing_features,
      guardrail_flags: guardrailResult.guardrail_flags,
      action_eligibility: guardrailResult.action_eligibility,
      escalation_required: guardrailResult.escalation_required,
      source_observation_ids: [observation.observation_id],
      exposure_duration_mins: workerCtx.exposure_duration_minutes,
    };

    // 10. Generate Auditable DecisionEvent
    const decisionEvent: DecisionEvent = {
      event_id: `dec_${Date.now()}_${worker.worker_id}`,
      timestamp: currentTime,
      worker_id: worker.worker_id,
      actor: 'ContextualRiskEngine',
      input_refs: {
        observation_id: observation.observation_id,
        worker_id: worker.worker_id,
        policy_id: policy.policy_id,
        site_id: worker.site_id,
      },
      risk_score: riskState.score,
      risk_level: riskState.level,
      confidence: riskState.confidence,
      reason_codes: riskState.reason_codes,
      policy_version: policy.version,
      guardrail_result: guardrailResult.override_applied ? 'GUARDRAIL_OVERRIDE' : 'STANDARD_EVALUATION',
      decision: `EVALUATED_RISK_${riskState.level}`,
      explanation: explanation.summary,
    };

    return {
      riskState,
      decisionEvent,
      stateTransition,
    };
  }

  /**
   * Evaluates a batch of workers with zone-clustering and failure isolation.
   */
  public evaluateBatch(options: BatchEvaluationOptions): BatchEvaluationResult {
    const startTime = performance.now();
    const {
      workers,
      site,
      observation,
      policy = this.defaultPolicy,
      previousStates = new Map(),
      observationHistory = [],
      currentTime = observation.timestamp || new Date().toISOString(),
    } = options;

    const riskStates: RiskState[] = [];
    const decisionEvents: DecisionEvent[] = [];
    const failures: Array<{ worker_id: string; error: string }> = [];

    // First pass: gather preliminary worker zone states for cluster density
    const preliminaryZoneStates = workers.map((w) => {
      const prev = previousStates.get(w.worker_id);
      return {
        zone_id: site.zone_id,
        level: prev ? prev.level : ('GREEN' as const),
        active: true,
      };
    });

    const zoneClusterContext = calculateZoneClusterContext(site.zone_id, preliminaryZoneStates);

    // Second pass: evaluate each worker with failure isolation
    for (const worker of workers) {
      try {
        const prev = previousStates.get(worker.worker_id);
        const result = this.evaluateWorker({
          worker,
          site,
          observation,
          policy,
          previousRiskState: prev,
          observationHistory,
          zoneClusterContext,
          currentTime,
          isUnacknowledgedCritical: prev?.level === 'CRITICAL' && prev.escalation_required,
        });

        riskStates.push(result.riskState);
        decisionEvents.push(result.decisionEvent);
      } catch (err: any) {
        failures.push({
          worker_id: worker.worker_id,
          error: err.message || 'RISK_CALCULATION_FAILED',
        });
      }
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      riskStates,
      decisionEvents,
      failures,
      duration_ms: durationMs,
    };
  }
}
